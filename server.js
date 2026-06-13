import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkFoul, evaluateHand } from './pokerEvaluator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files from the Vite build directory 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for SPA routing (returns index.html for any unrecognized path)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Memory storage for active rooms
const rooms = {};

// Helper to generate a unique 6-digit room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms[code]); // Ensure uniqueness
  return code;
}

// Helper to generate a standard 52-card deck and shuffle it
function createDeck() {
  const suits = ['H', 'D', 'C', 'S'];
  const deck = [];
  for (const suit of suits) {
    for (let value = 2; value <= 14; value++) {
      deck.push({ suit, value });
    }
  }
  
  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. Create Room
  socket.on('create-room', ({ name }) => {
    const code = generateRoomCode();
    rooms[code] = {
      code,
      status: 'lobby', // 'lobby' | 'playing' | 'showdown'
      players: [],
      deck: [],
      round: 0,
      history: []
    };

    const player = {
      id: socket.id,
      name: name || 'Host',
      isHost: true,
      ready: false,
      submitted: false,
      cards: [], // Dealt cards (hidden from others)
      hand: { front: [], middle: [], back: [] }, // Submitted hands
      roundScore: 0,
      totalScore: 0
    };

    rooms[code].players.push(player);
    socket.join(code);
    socket.emit('room-created', { code, player });
    io.to(code).emit('room-state', getPublicRoomState(code));
    console.log(`Room ${code} created by player ${player.name}`);
  });

  // 2. Join Room
  socket.on('join-room', ({ code, name }) => {
    const cleanCode = code?.toUpperCase().trim();
    const room = rooms[cleanCode];

    if (!room) {
      socket.emit('error-message', 'Room not found.');
      return;
    }

    if (room.status !== 'lobby') {
      socket.emit('error-message', 'Game has already started in this room.');
      return;
    }

    if (room.players.length >= 4) {
      socket.emit('error-message', 'Room is full (max 4 players).');
      return;
    }

    const player = {
      id: socket.id,
      name: name || `Player ${room.players.length + 1}`,
      isHost: false,
      ready: false,
      submitted: false,
      cards: [],
      hand: { front: [], middle: [], back: [] },
      roundScore: 0,
      totalScore: 0
    };

    room.players.push(player);
    socket.join(cleanCode);
    socket.emit('room-joined', { code: cleanCode, player });
    io.to(cleanCode).emit('room-state', getPublicRoomState(cleanCode));
    io.to(cleanCode).emit('chat-message', {
      sender: 'System',
      text: `${player.name} has joined the room.`
    });
    console.log(`Player ${player.name} joined room ${cleanCode}`);
  });

  // 3. Toggle Ready
  socket.on('toggle-ready', () => {
    const { roomCode, player } = findSocketPlayer(socket.id);
    if (!roomCode || !player) return;

    player.ready = !player.ready;
    io.to(roomCode).emit('room-state', getPublicRoomState(roomCode));
  });

  // 4. Start Game (Host only)
  socket.on('start-game', () => {
    const { roomCode, player, room } = findSocketPlayer(socket.id);
    if (!roomCode || !room || !player || !player.isHost) return;

    // Check if we have at least 2 players
    if (room.players.length < 2) {
      socket.emit('error-message', 'Need at least 2 players to start.');
      return;
    }

    // Check if everyone (except host maybe, or everyone) is ready
    const allReady = room.players.filter(p => !p.isHost).every(p => p.ready);
    if (!allReady) {
      socket.emit('error-message', 'Waiting for all players to be ready.');
      return;
    }

    // Initialize Game
    room.status = 'playing';
    room.round += 1;
    const deck = createDeck();
    room.deck = deck;

    // Deal 13 cards to each player
    room.players.forEach((p, idx) => {
      p.cards = deck.slice(idx * 13, (idx + 1) * 13);
      p.submitted = false;
      p.hand = { front: [], middle: [], back: [] };
      p.roundScore = 0;

      // Emit private card deal to each specific client
      io.to(p.id).emit('deal-cards', p.cards);
    });

    io.to(roomCode).emit('room-state', getPublicRoomState(roomCode));
    io.to(roomCode).emit('chat-message', {
      sender: 'System',
      text: `Round ${room.round} started! Cards have been dealt.`
    });
  });

  // 5. Submit Hand Arrangement
  socket.on('submit-hand', ({ front, middle, back }) => {
    const { roomCode, player, room } = findSocketPlayer(socket.id);
    if (!roomCode || !room || !player || room.status !== 'playing') return;

    // Basic size validation
    if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
      socket.emit('error-message', 'Invalid hand size. Must be 3, 5, and 5 cards.');
      return;
    }

    // Check if cards actually belong to player's hand (anti-cheat)
    const dealtCardsSet = new Set(player.cards.map(c => `${c.value}${c.suit}`));
    const submittedCards = [...front, ...middle, ...back];
    
    const isValidDeals = submittedCards.every(c => dealtCardsSet.has(`${c.value}${c.suit}`));
    if (!isValidDeals || submittedCards.length !== 13) {
      socket.emit('error-message', 'Cards submitted do not match dealt cards.');
      return;
    }

    player.hand = { front, middle, back };
    player.submitted = true;

    io.to(roomCode).emit('room-state', getPublicRoomState(roomCode));
    io.to(roomCode).emit('chat-message', {
      sender: 'System',
      text: `${player.name} has set their cards.`
    });

    // Check if ALL players in the room have submitted
    const allSubmitted = room.players.every(p => p.submitted);
    if (allSubmitted) {
      processShowdown(room);
    }
  });

  // 6. Chat Message
  socket.on('chat-message', (text) => {
    const { roomCode, player } = findSocketPlayer(socket.id);
    if (!roomCode || !player) return;

    io.to(roomCode).emit('chat-message', {
      sender: player.name,
      text: text
    });
  });

  // 7. Restart Game / Play Next Round (Host only)
  socket.on('play-next-round', () => {
    const { roomCode, player, room } = findSocketPlayer(socket.id);
    if (!roomCode || !room || !player || !player.isHost) return;

    if (room.status !== 'showdown') return;

    // Reset player round status, keep total scores
    room.status = 'lobby';
    room.players.forEach(p => {
      p.ready = false;
      p.submitted = false;
      p.cards = [];
      p.hand = { front: [], middle: [], back: [] };
      p.roundScore = 0;
    });

    io.to(roomCode).emit('room-state', getPublicRoomState(roomCode));
  });

  // 8. Disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const { roomCode, player, room } = findSocketPlayer(socket.id);
    
    if (roomCode && room && player) {
      // Remove player
      room.players = room.players.filter(p => p.id !== socket.id);
      
      io.to(roomCode).emit('chat-message', {
        sender: 'System',
        text: `${player.name} has left the room.`
      });

      if (room.players.length === 0) {
        // If room is empty, delete it
        delete rooms[roomCode];
        console.log(`Room ${roomCode} deleted as it is empty.`);
      } else {
        // If host left, assign new host
        if (player.isHost) {
          room.players[0].isHost = true;
          io.to(roomCode).emit('chat-message', {
            sender: 'System',
            text: `${room.players[0].name} is now the host.`
          });
        }
        
        // If game was playing, reset to lobby
        if (room.status !== 'lobby') {
          room.status = 'lobby';
          room.players.forEach(p => {
            p.ready = false;
            p.submitted = false;
            p.cards = [];
            p.hand = { front: [], middle: [], back: [] };
            p.roundScore = 0;
          });
          io.to(roomCode).emit('chat-message', {
            sender: 'System',
            text: `A player disconnected. The game has been reset to the lobby.`
          });
        }

        io.to(roomCode).emit('room-state', getPublicRoomState(roomCode));
      }
    }
  });
});

/**
 * Searches rooms to find which room and player a socket ID belongs to.
 */
function findSocketPlayer(socketId) {
  for (const code of Object.keys(rooms)) {
    const room = rooms[code];
    const player = room.players.find(p => p.id === socketId);
    if (player) {
      return { roomCode: code, player, room };
    }
  }
  return { roomCode: null, player: null, room: null };
}

/**
 * Strips private details (like dealt cards or sets of cards before showdown)
 * to prevent cheating by looking at state packets.
 */
function getPublicRoomState(code) {
  const room = rooms[code];
  if (!room) return null;

  return {
    code: room.code,
    status: room.status,
    round: room.round,
    players: room.players.map(p => {
      const isShowdown = room.status === 'showdown';
      return {
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        ready: p.ready,
        submitted: p.submitted,
        roundScore: p.roundScore,
        totalScore: p.totalScore,
        // Hide hands unless it's showdown
        hand: isShowdown ? p.hand : { frontCount: p.hand.front.length, middleCount: p.hand.middle.length, backCount: p.hand.back.length },
        cardsCount: p.cards.length
      };
    }),
    comparisons: room.status === 'showdown' ? room.comparisons : null
  };
}

/**
 * Evaluates submitted hands, compares all player pairs, and assigns round scores.
 */
function processShowdown(room) {
  room.status = 'showdown';

  const n = room.players.length;
  // Initialize comparison logs
  // Structure: comparisons = { "playerIdA_playerIdB": { frontWinner, middleWinner, backWinner, netPoints } }
  const comparisons = {};

  // Evaluate each player's hand beforehand
  const evaluations = room.players.map(p => {
    const isFoul = checkFoul(p.hand.front, p.hand.middle, p.hand.back);
    return {
      playerId: p.id,
      name: p.name,
      isFoul,
      frontEval: evaluateHand(p.hand.front),
      middleEval: evaluateHand(p.hand.middle),
      backEval: evaluateHand(p.hand.back)
    };
  });

  // Compare every player with every other player (pairwise)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pA = evaluations[i];
      const pB = evaluations[j];

      let frontWin = 0;  // 1: A wins, -1: B wins, 0: Tie
      let middleWin = 0;
      let backWin = 0;

      let netA = 0; // Net points for player A from this matchup

      if (pA.isFoul && pB.isFoul) {
        // Both fouled, 0 points
        frontWin = 0;
        middleWin = 0;
        backWin = 0;
        netA = 0;
      } else if (pA.isFoul) {
        // A fouled, B did not. B wins all three hands!
        frontWin = -1;
        middleWin = -1;
        backWin = -1;
        netA = -6; // Scoop penalty (3 points + 3 scoop bonus = 6 points)
      } else if (pB.isFoul) {
        // B fouled, A did not. A wins all three hands!
        frontWin = 1;
        middleWin = 1;
        backWin = 1;
        netA = 6; // Scoop reward
      } else {
        // Neither fouled, compare normally
        // Compare Front (A vs B)
        const frontDiff = pA.frontEval.score - pB.frontEval.score;
        frontWin = frontDiff > 0 ? 1 : (frontDiff < 0 ? -1 : 0);

        // Compare Middle
        const middleDiff = pA.middleEval.score - pB.middleEval.score;
        middleWin = middleDiff > 0 ? 1 : (middleDiff < 0 ? -1 : 0);

        // Compare Back
        const backDiff = pA.backEval.score - pB.backEval.score;
        backWin = backDiff > 0 ? 1 : (backDiff < 0 ? -1 : 0);

        // Calculate net hands won
        const handsWonByA = (frontWin === 1 ? 1 : 0) + (middleWin === 1 ? 1 : 0) + (backWin === 1 ? 1 : 0);
        const handsWonByB = (frontWin === -1 ? 1 : 0) + (middleWin === -1 ? 1 : 0) + (backWin === -1 ? 1 : 0);

        netA = handsWonByA - handsWonByB;

        // Check for Scoop (sweep)
        if (handsWonByA === 3) {
          netA += 3; // +3 scoop bonus, total +6
        } else if (handsWonByB === 3) {
          netA -= 3; // -3 scoop bonus, total -6
        }
      }

      // Record comparison sheet
      const compKey = `${pA.playerId}_${pB.playerId}`;
      comparisons[compKey] = {
        pAName: pA.name,
        pBName: pB.name,
        isFoulA: pA.isFoul,
        isFoulB: pB.isFoul,
        frontWinner: frontWin === 1 ? pA.playerId : (frontWin === -1 ? pB.playerId : 'tie'),
        middleWinner: middleWin === 1 ? pA.playerId : (middleWin === -1 ? pB.playerId : 'tie'),
        backWinner: backWin === 1 ? pA.playerId : (backWin === -1 ? pB.playerId : 'tie'),
        frontLabelA: pA.frontEval.label,
        frontLabelB: pB.frontEval.label,
        middleLabelA: pA.middleEval.label,
        middleLabelB: pB.middleEval.label,
        backLabelA: pA.backEval.label,
        backLabelB: pB.backEval.label,
        netPoints: netA // Net points for player A vs player B
      };

      // Add to running round scores
      const playerObjA = room.players.find(p => p.id === pA.playerId);
      const playerObjB = room.players.find(p => p.id === pB.playerId);
      
      playerObjA.roundScore += netA;
      playerObjB.roundScore -= netA;
    }
  }

  // Update total scores
  room.players.forEach(p => {
    p.totalScore += p.roundScore;
  });

  room.comparisons = comparisons;

  io.to(room.code).emit('room-state', getPublicRoomState(room.code));
  io.to(room.code).emit('chat-message', {
    sender: 'System',
    text: `All cards submitted! Entering showdown.`
  });
}

// Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
