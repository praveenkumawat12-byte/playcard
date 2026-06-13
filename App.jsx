import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Lobby from './Lobby';
import GameTable from './GameTable';
import Showdown from './Showdown';
import { Info, Volume2, VolumeX } from 'lucide-react';

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTick() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDeal() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playSubmit() {
    if (this.muted) return;
    this.init();
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime);
    osc1.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.1);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(1046.50, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.3);
    osc2.stop(this.ctx.currentTime + 0.3);
  }

  playChime() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playBuzz() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.setValueAtTime(100, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

const sounds = new SoundEffects();

export default function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [chat, setChat] = useState([]);
  const [error, setError] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [muted, setMuted] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      setError('');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('room-created', ({ code, player }) => {
      setRoomCode(code);
      setError('');
      sounds.playChime();
    });

    newSocket.on('room-joined', ({ code, player }) => {
      setRoomCode(code);
      setError('');
      sounds.playChime();
    });

    newSocket.on('room-state', (state) => {
      setRoomState(state);
      if (state.status === 'lobby') {
        setMyCards([]);
      }
      if (state.status === 'showdown') {
        sounds.playChime();
      }
    });

    newSocket.on('deal-cards', (cards) => {
      setMyCards(cards);
      sounds.playSubmit();
    });

    newSocket.on('chat-message', (msg) => {
      setChat((prev) => [...prev, msg]);
      sounds.playTick();
    });

    newSocket.on('error-message', (msg) => {
      setError(msg);
      sounds.playBuzz();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    sounds.muted = muted;
  }, [muted]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter a name.');
      return;
    }
    socket.emit('create-room', { name: playerName.trim() });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!joinCodeInput.trim() || joinCodeInput.length !== 6) {
      setError('Please enter a valid 6-digit room code.');
      return;
    }
    socket.emit('join-room', {
      code: joinCodeInput.trim().toUpperCase(),
      name: playerName.trim()
    });
  };

  const handleLeaveRoom = () => {
    window.location.reload();
  };

  const getMyData = () => {
    if (!roomState || !socket) return null;
    return roomState.players.find((p) => p.id === socket.id);
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between z-20 m-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🃏</span>
          <div>
            <h1 className="game-title text-xl font-black tracking-tight leading-none">CHINESE POKER</h1>
            <p className="text-[10px] text-text-secondary tracking-widest uppercase font-bold mt-1">13-Card Multiplayer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {connected ? (
            <span className="flex items-center gap-2 text-xs bg-emerald-500/10 text-accent-success border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
              <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse"></span>
              ONLINE
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs bg-rose-500/10 text-accent-foul border border-rose-500/30 px-3 py-1 rounded-full font-bold">
              <span className="w-2 h-2 rounded-full bg-accent-foul"></span>
              CONNECTING...
            </span>
          )}

          <button
            onClick={() => setMuted(!muted)}
            className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-3 max-w-[1400px] w-full mx-auto justify-center">
        {error && (
          <div className="mx-3 mb-4 bg-rose-500/10 border border-rose-500/30 text-accent-foul px-4 py-3 rounded-xl flex items-center justify-between text-sm glass-panel animate-bounce">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-white hover:text-accent-foul font-black text-lg">×</button>
          </div>
        )}

        {!roomCode ? (
          <div className="container-center">
            <div className="glass-panel glass-panel-neon max-w-md w-full p-8 flex flex-col gap-6 text-center m-3">
              <div>
                <span className="text-6xl animate-pulse block mb-3">🎴</span>
                <h2 className="text-2xl font-black tracking-tight">Welcome to Chinese Poker</h2>
                <p className="text-sm text-text-secondary mt-1">Play with friends over local network or internet</p>
              </div>

              <div className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Your Nickname</label>
                  <input
                    type="text"
                    placeholder="Enter your name..."
                    className="input-text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={14}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <form onSubmit={handleCreateRoom} className="flex flex-col gap-2">
                    <button type="submit" className="btn btn-primary w-full py-3.5">
                      Create Game
                    </button>
                    <p className="text-[10px] text-center text-text-muted">Host a new game room</p>
                  </form>

                  <div className="flex flex-col gap-2">
                    <form onSubmit={handleJoinRoom} className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="ROOM CODE"
                        className="input-text text-center font-bold tracking-widest uppercase py-2.5 text-sm"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.slice(0, 6))}
                      />
                      <button type="submit" className="btn btn-secondary w-full py-2.5 text-sm">
                        Join Game
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex gap-2.5 items-start text-left text-text-muted text-[11px] leading-relaxed">
                <Info size={18} className="flex-shrink-0 text-primary-neon mt-0.5" />
                <span>
                  <strong>Rules Summary:</strong> Arrange 13 cards into three poker hands: Front (3 cards), Middle (5 cards), and Back (5 cards). Back must be stronger than Middle, and Middle stronger than Front, otherwise it's a <strong>foul</strong>!
                </span>
              </div>
            </div>
          </div>
        ) : (
          roomState && (
            <div className="flex-1 flex flex-col">
              {roomState.status === 'lobby' && (
                <Lobby
                  roomState={roomState}
                  myPlayerId={socket.id}
                  chat={chat}
                  sounds={sounds}
                  onToggleReady={() => socket.emit('toggle-ready')}
                  onStartGame={() => socket.emit('start-game')}
                  onSendMessage={(msg) => socket.emit('chat-message', msg)}
                  onLeaveRoom={handleLeaveRoom}
                />
              )}

              {roomState.status === 'playing' && (
                <GameTable
                  roomState={roomState}
                  myPlayerId={socket.id}
                  myDealtCards={myCards}
                  sounds={sounds}
                  onSubmitHand={(arrangement) => socket.emit('submit-hand', arrangement)}
                  onLeaveRoom={handleLeaveRoom}
                />
              )}

              {roomState.status === 'showdown' && (
                <Showdown
                  roomState={roomState}
                  myPlayerId={socket.id}
                  sounds={sounds}
                  onNextRound={() => socket.emit('play-next-round')}
                  onLeaveRoom={handleLeaveRoom}
                />
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}
