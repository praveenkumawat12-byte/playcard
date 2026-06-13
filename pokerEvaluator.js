// Poker Hand Evaluator and Auto-Sorter for Chinese Poker
// Suits: 'H' (Hearts), 'D' (Diamonds), 'C' (Clubs), 'S' (Spades)
// Values: 2-14 (11=J, 12=Q, 13=K, 14=A)

const SUIT_VALUES = { 'H': 4, 'D': 3, 'C': 2, 'S': 1 };
const SUIT_LABELS = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
const RANK_LABELS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

/**
 * Evaluates a 5-card poker hand.
 * Returns { rankValue, values, label, score }
 */
export function evaluate5CardHand(cards) {
  if (cards.length !== 5) {
    throw new Error('5 cards required for evaluation');
  }

  // Sort cards descending by value, then by suit value
  const sortedCards = [...cards].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return SUIT_VALUES[b.suit] - SUIT_VALUES[a.suit];
  });

  const ranks = sortedCards.map(c => c.value);
  const suits = sortedCards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  // Check normal straight
  const uniqueRanks = [...new Set(ranks)];
  if (uniqueRanks.length === 5) {
    if (ranks[0] - ranks[4] === 4) {
      isStraight = true;
      straightHigh = ranks[0];
    } else if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
      // Ace-low straight (5-4-3-2-A)
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Count frequencies
  const freqMap = {};
  ranks.forEach(r => { freqMap[r] = (freqMap[r] || 0) + 1; });

  const sortedFreq = Object.keys(freqMap)
    .map(r => ({ rank: parseInt(r), count: freqMap[r] }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

  const counts = sortedFreq.map(sf => sf.count);
  const freqRanks = sortedFreq.map(sf => sf.rank);

  let rankValue = 0; // 0: High Card, 1: Pair, 2: Two Pair, etc.
  let values = [];
  let label = '';

  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      rankValue = 9; // Royal Flush
      values = [14, 13, 12, 11, 10];
      label = 'Royal Flush';
    } else {
      rankValue = 8; // Straight Flush
      values = [straightHigh, straightHigh - 1, straightHigh - 2, straightHigh - 3, straightHigh - 4];
      label = `Straight Flush (${RANK_LABELS[straightHigh]} High)`;
    }
  } else if (counts[0] === 4) {
    rankValue = 7; // Four of a Kind
    values = [freqRanks[0], freqRanks[1]];
    label = `Four of a Kind (${RANK_LABELS[freqRanks[0]]}s)`;
  } else if (counts[0] === 3 && counts[1] === 2) {
    rankValue = 6; // Full House
    values = [freqRanks[0], freqRanks[1]];
    label = `Full House (${RANK_LABELS[freqRanks[0]]}s over ${RANK_LABELS[freqRanks[1]]}s)`;
  } else if (isFlush) {
    rankValue = 5; // Flush
    values = [...ranks];
    label = `Flush (${RANK_LABELS[ranks[0]]} High)`;
  } else if (isStraight) {
    rankValue = 4; // Straight
    values = [straightHigh, straightHigh - 1, straightHigh - 2, straightHigh - 3, straightHigh - 4];
    label = `Straight (${RANK_LABELS[straightHigh]} High)`;
  } else if (counts[0] === 3) {
    rankValue = 3; // Three of a Kind
    values = [freqRanks[0], freqRanks[1], freqRanks[2]];
    label = `Three of a Kind (${RANK_LABELS[freqRanks[0]]}s)`;
  } else if (counts[0] === 2 && counts[1] === 2) {
    rankValue = 2; // Two Pair
    values = [freqRanks[0], freqRanks[1], freqRanks[2]];
    label = `Two Pair (${RANK_LABELS[freqRanks[0]]}s & ${RANK_LABELS[freqRanks[1]]}s)`;
  } else if (counts[0] === 2) {
    rankValue = 1; // One Pair
    values = [freqRanks[0], freqRanks[1], freqRanks[2], freqRanks[3]];
    label = `Pair of ${RANK_LABELS[freqRanks[0]]}s`;
  } else {
    rankValue = 0; // High Card
    values = [...ranks];
    label = `High Card ${RANK_LABELS[ranks[0]]}`;
  }

  // Calculate tie-breaker score based on suits of the highest rank cards
  const primaryRank = freqRanks[0];
  const primaryCards = sortedCards.filter(c => c.value === primaryRank);
  const primarySuitVal = SUIT_VALUES[primaryCards[0].suit];

  // Mathematically calculate hand strength score in Base-15
  let score = rankValue * 759375; // 15^5
  let baseMultiplier = 50625; // 15^4
  for (let i = 0; i < 5; i++) {
    const val = values[i] || 0;
    score += val * baseMultiplier;
    baseMultiplier /= 15;
  }
  score += primarySuitVal * 0.001;

  return { rankValue, values, label, score, cards: sortedCards };
}

/**
 * Evaluates a 3-card poker hand (Front hand).
 * Only High Card, Pair, and Three of a Kind are valid.
 * Returns { rankValue, values, label, score }
 */
export function evaluate3CardHand(cards) {
  if (cards.length !== 3) {
    throw new Error('3 cards required for evaluation');
  }

  // Sort cards descending by value, then by suit value
  const sortedCards = [...cards].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return SUIT_VALUES[b.suit] - SUIT_VALUES[a.suit];
  });

  const ranks = sortedCards.map(c => c.value);

  // Count frequencies
  const freqMap = {};
  ranks.forEach(r => { freqMap[r] = (freqMap[r] || 0) + 1; });

  const sortedFreq = Object.keys(freqMap)
    .map(r => ({ rank: parseInt(r), count: freqMap[r] }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

  const counts = sortedFreq.map(sf => sf.count);
  const freqRanks = sortedFreq.map(sf => sf.rank);

  let rankValue = 0; // Maps to standard ranking: 0: High Card, 1: One Pair, 3: Three of a Kind
  let values = [];
  let label = '';

  if (counts[0] === 3) {
    rankValue = 3; // Three of a Kind
    values = [freqRanks[0], 0, 0, 0, 0];
    label = `Three of a Kind (${RANK_LABELS[freqRanks[0]]}s)`;
  } else if (counts[0] === 2) {
    rankValue = 1; // One Pair
    values = [freqRanks[0], freqRanks[1], 0, 0, 0];
    label = `Pair of ${RANK_LABELS[freqRanks[0]]}s`;
  } else {
    rankValue = 0; // High Card
    values = [ranks[0], ranks[1], ranks[2], 0, 0];
    label = `High Card ${RANK_LABELS[ranks[0]]}`;
  }

  // Suit tie-breaker for primary card
  const primaryRank = freqRanks[0];
  const primaryCards = sortedCards.filter(c => c.value === primaryRank);
  const primarySuitVal = SUIT_VALUES[primaryCards[0].suit];

  // Calculate score mapping to the same scale as 5-card hands (with trailing 0s for values 3 and 4)
  let score = rankValue * 759375; // 15^5
  score += values[0] * 50625; // 15^4
  score += values[1] * 3375;  // 15^3
  score += values[2] * 225;   // 15^2
  score += primarySuitVal * 0.001;

  return { rankValue, values, label, score, cards: sortedCards };
}

/**
 * General evaluator helper that routes based on card count.
 */
export function evaluateHand(cards) {
  if (cards.length === 5) {
    return evaluate5CardHand(cards);
  } else if (cards.length === 3) {
    return evaluate3CardHand(cards);
  } else {
    return { rankValue: -1, values: [], label: 'Invalid Hand Size', score: -1 };
  }
}

/**
 * Checks if the arrangement is a foul.
 * Chinese Poker rule: Back >= Middle >= Front
 */
export function checkFoul(frontCards, middleCards, backCards) {
  if (frontCards.length !== 3 || middleCards.length !== 5 || backCards.length !== 5) {
    return true; // Incomplete hands are considered invalid/foul
  }

  const frontEval = evaluate3CardHand(frontCards);
  const middleEval = evaluate5CardHand(middleCards);
  const backEval = evaluate5CardHand(backCards);

  const fScore = Math.floor(frontEval.score);
  const mScore = Math.floor(middleEval.score);
  const bScore = Math.floor(backEval.score);

  return (fScore > mScore || mScore > bScore);
}

/**
 * Compares two hands of the same size.
 * Returns > 0 if handA wins, < 0 if handB wins, 0 if tie.
 */
export function compareHands(handA, handB) {
  const evalA = evaluateHand(handA);
  const evalB = evaluateHand(handB);
  return evalA.score - evalB.score;
}

/**
 * Automatically sorts 13 cards into the strongest possible valid (non-fouled) configuration.
 */
export function autoSort13Cards(cards) {
  if (cards.length !== 13) {
    throw new Error('Auto-sort requires exactly 13 cards');
  }

  // Pre-sort cards descending
  const sorted = [...cards].sort((a, b) => b.value - a.value);

  let bestSet = null;
  let bestScore = -1;

  // Helper to generate combinations of indices
  function getCombinations(arr, k) {
    const results = [];
    function helper(temp, start) {
      if (temp.length === k) {
        results.push([...temp]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        temp.push(arr[i]);
        helper(temp, i + 1);
        temp.pop();
      }
    }
    helper([], 0);
    return results;
  }

  const allIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const backCombinations = getCombinations(allIndices, 5);

  for (let bIndices of backCombinations) {
    const backCards = bIndices.map(idx => sorted[idx]);
    const backEval = evaluate5CardHand(backCards);

    const remainingIndices = allIndices.filter(idx => !bIndices.includes(idx));
    const middleCombinations = getCombinations(remainingIndices, 5);

    for (let mIndices of middleCombinations) {
      const middleCards = mIndices.map(idx => sorted[idx]);
      const middleEval = evaluate5CardHand(middleCards);

      const bScoreFloor = Math.floor(backEval.score);
      const mScoreFloor = Math.floor(middleEval.score);

      if (mScoreFloor > bScoreFloor) {
        continue; // Middle is stronger than Back, which is a foul! Skip.
      }

      // Front hand is the remaining 3 cards
      const frontIndices = remainingIndices.filter(idx => !mIndices.includes(idx));
      const frontCards = frontIndices.map(idx => sorted[idx]);
      const frontEval = evaluate3CardHand(frontCards);

      const fScoreFloor = Math.floor(frontEval.score);
      if (fScoreFloor > mScoreFloor) {
        continue; // Front is stronger than Middle, which is a foul! Skip.
      }

      const layoutScore = backEval.score * 1000000 + middleEval.score * 1000 + frontEval.score;

      if (layoutScore > bestScore) {
        bestScore = layoutScore;
        bestSet = {
          front: frontCards,
          middle: middleCards,
          back: backCards
        };
      }
    }
  }

  if (!bestSet) {
    bestSet = {
      front: [sorted[10], sorted[11], sorted[12]],
      middle: [sorted[5], sorted[6], sorted[7], sorted[8], sorted[9]],
      back: [sorted[0], sorted[1], sorted[2], sorted[3], sorted[4]]
    };
  }

  return bestSet;
}
