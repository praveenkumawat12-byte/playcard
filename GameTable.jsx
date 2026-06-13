import React, { useState, useEffect } from 'react';
import { checkFoul, evaluate3CardHand, evaluate5CardHand, autoSort13Cards } from './pokerEvaluator';
import { ShieldAlert, RefreshCw, Send, Zap, BookOpen, LogOut } from 'lucide-react';

const SUIT_UNICODE = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };

function Card({ card, onClick, isSelected }) {
  if (!card) return null;
  const isRed = card.suit === 'H' || card.suit === 'D';
  const displayRank = card.value === 14 ? 'A' :
                      card.value === 13 ? 'K' :
                      card.value === 12 ? 'Q' :
                      card.value === 11 ? 'J' : card.value;

  return (
    <div
      onClick={onClick}
      className={`playing-card deal-anim ${isRed ? 'red-suit' : 'black-suit'} ${isSelected ? 'selected' : ''}`}
    >
      <div className="card-top-left">
        <span>{displayRank}</span>
        <span className="text-sm">{SUIT_UNICODE[card.suit]}</span>
      </div>
      <div className="card-center-suit">{SUIT_UNICODE[card.suit]}</div>
      <div className="card-bottom-right">
        <span>{displayRank}</span>
        <span className="text-sm">{SUIT_UNICODE[card.suit]}</span>
      </div>
    </div>
  );
}

export default function GameTable({
  roomState,
  myPlayerId,
  myDealtCards,
  sounds,
  onSubmitHand,
  onLeaveRoom
}) {
  const [frontRow, setFrontRow] = useState([]);
  const [middleRow, setMiddleRow] = useState([]);
  const [backRow, setBackRow] = useState([]);
  const [activeRow, setActiveRow] = useState('back');
  const [showRules, setShowRules] = useState(false);

  const myPlayerState = roomState.players.find(p => p.id === myPlayerId);
  const [handCards, setHandCards] = useState([]);

  useEffect(() => {
    setHandCards([...myDealtCards]);
    setFrontRow([]);
    setMiddleRow([]);
    setBackRow([]);
  }, [myDealtCards]);

  const handleCardClickInHand = (card, idx) => {
    sounds.playTick();
    let rowMax = activeRow === 'front' ? 3 : 5;
    let currentRow = activeRow === 'front' ? frontRow :
                     activeRow === 'middle' ? middleRow : backRow;

    if (currentRow.length >= rowMax) {
      if (backRow.length < 5) {
        setActiveRow('back');
        setBackRow([...backRow, card]);
      } else if (middleRow.length < 5) {
        setActiveRow('middle');
        setMiddleRow([...middleRow, card]);
      } else if (frontRow.length < 3) {
        setActiveRow('front');
        setFrontRow([...frontRow, card]);
      }
    } else {
      if (activeRow === 'front') setFrontRow([...frontRow, card]);
      else if (activeRow === 'middle') setMiddleRow([...middleRow, card]);
      else setBackRow([...backRow, card]);
    }

    setHandCards(handCards.filter((_, i) => i !== idx));
  };

  const handleCardClickInSlot = (card, row, idx) => {
    sounds.playTick();
    setHandCards([...handCards, card]);
    if (row === 'front') {
      setFrontRow(frontRow.filter((_, i) => i !== idx));
      setActiveRow('front');
    } else if (row === 'middle') {
      setMiddleRow(middleRow.filter((_, i) => i !== idx));
      setActiveRow('middle');
    } else {
      setBackRow(backRow.filter((_, i) => i !== idx));
      setActiveRow('back');
    }
  };

  const handleClear = () => {
    sounds.playTick();
    setHandCards([...myDealtCards]);
    setFrontRow([]);
    setMiddleRow([]);
    setBackRow([]);
    setActiveRow('back');
  };

  const handleAutoSort = () => {
    if (myDealtCards.length !== 13) return;
    try {
      sounds.playSubmit();
      const sorted = autoSort13Cards(myDealtCards);
      setFrontRow(sorted.front);
      setMiddleRow(sorted.middle);
      setBackRow(sorted.back);
      setHandCards([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = () => {
    if (frontRow.length !== 3 || middleRow.length !== 5 || backRow.length !== 5) return;
    if (checkFoul(frontRow, middleRow, backRow)) {
      sounds.playBuzz();
      return;
    }
    sounds.playSubmit();
    onSubmitHand({ front: frontRow, middle: middleRow, back: backRow });
  };

  const getRowLabel = (row, cards) => {
    if (row === 'front') {
      if (cards.length < 3) return 'Incomplete';
      return evaluate3CardHand(cards).label;
    } else {
      if (cards.length < 5) return 'Incomplete';
      return evaluate5CardHand(cards).label;
    }
  };

  const isFoul = frontRow.length === 3 && middleRow.length === 5 && backRow.length === 5 && checkFoul(frontRow, middleRow, backRow);

  const renderOpponents = () => {
    const players = roomState.players;
    const myIndex = players.findIndex(p => p.id === myPlayerId);
    
    const orderedPlayers = [...players.slice(myIndex), ...players.slice(0, myIndex)];
    const opponents = orderedPlayers.slice(1);

    return opponents.map((opp, idx) => {
      let slotClass = '';
      if (opponents.length === 1) {
        slotClass = 'slot-top';
      } else if (opponents.length === 2) {
        slotClass = idx === 0 ? 'slot-left' : 'slot-right';
      } else {
        slotClass = idx === 0 ? 'slot-left' : idx === 1 ? 'slot-top' : 'slot-right';
      }

      return (
        <div key={opp.id} className={`opponent-bubble ${opp.submitted ? 'submitted' : (opp.ready ? 'ready' : '')} ${slotClass}`}>
          <div className="w-8 h-8 rounded-full bg-secondary-neon flex items-center justify-center font-bold text-sm text-[#0c081e]">
            {opp.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-black leading-none">{opp.name}</p>
            <p className="text-[9px] text-text-secondary mt-1 font-bold">
              {opp.submitted ? 'SUBMITTED' : 'ARRANGING...'}
            </p>
          </div>
        </div>
      );
    });
  };

  if (myPlayerState?.submitted) {
    return (
      <div className="container-center">
        <div className="glass-panel glass-panel-neon max-w-md w-full p-8 text-center flex flex-col items-center gap-6 m-3">
          <div className="relative">
            <span className="text-6xl block animate-bounce">⏳</span>
            <span className="w-3 h-3 rounded-full bg-primary-neon absolute top-0 right-0 animate-ping"></span>
          </div>
          <div>
            <h2 className="text-2xl font-black">Waiting for Friends</h2>
            <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
              Your hand has been locked and submitted to the table. We are waiting for the remaining players to arrange their cards.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5 w-full flex flex-col gap-2">
            <p className="text-[10px] text-left text-text-muted font-bold uppercase tracking-wider">Submission Status</p>
            {roomState.players.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm py-1">
                <span className="font-medium text-text-secondary">{p.name} {p.id === myPlayerId && '(You)'}</span>
                <span className={`text-xs font-bold ${p.submitted ? 'text-accent-success' : 'text-amber-400'}`}>
                  {p.submitted ? 'Locked In ✓' : 'Sorting Cards...'}
                </span>
              </div>
            ))}
          </div>
          <button onClick={onLeaveRoom} className="btn btn-glass w-full py-2 text-xs flex items-center justify-center gap-1.5 text-accent-foul hover:bg-rose-500/5">
            <LogOut size={14} /> LEAVE GAME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="poker-table-area">
      <div className="poker-table">
        <div className="opponent-slots">
          {renderOpponents()}
        </div>

        <div className="text-center pointer-events-none opacity-20 flex flex-col items-center max-w-sm">
          <h3 className="font-black text-2xl tracking-widest text-[#9ed3bd] uppercase">Chinese Poker Table</h3>
          <p className="text-xs mt-2 text-[#9ed3bd]">BACK 🡒 MIDDLE 🡒 FRONT</p>
        </div>

        <div className="hand-setup-panel absolute">
          {isFoul && (
            <div className="foul-banner">
              <ShieldAlert size={18} />
              <span className="text-xs">
                FOUL HAND ARRANGEMENT! Back hand must be stronger than Middle, which must be stronger than Front.
              </span>
            </div>
          )}

          <div className="card-slots-container">
            {/* Front Row (3 Slots) */}
            <div className={`card-row ${activeRow === 'front' ? 'border-primary-neon/50 bg-white/[0.04]' : ''}`} onClick={() => setActiveRow('front')}>
              <div className="row-label">Front (3)</div>
              <div className="card-slots">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="flex-shrink-0">
                    {frontRow[idx] ? (
                      <Card
                        card={frontRow[idx]}
                        onClick={(e) => { e.stopPropagation(); handleCardClickInSlot(frontRow[idx], 'front', idx); }}
                      />
                    ) : (
                      <div className="empty-slot">Front #{idx + 1}</div>
                    )}
                  </div>
                ))}
                <div className={`hand-badge ${frontRow.length === 3 ? 'active-rank' : 'text-text-muted'}`}>
                  {getRowLabel('front', frontRow)}
                </div>
              </div>
            </div>

            {/* Middle Row (5 Slots) */}
            <div className={`card-row ${activeRow === 'middle' ? 'border-primary-neon/50 bg-white/[0.04]' : ''}`} onClick={() => setActiveRow('middle')}>
              <div className="row-label">Middle (5)</div>
              <div className="card-slots">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex-shrink-0">
                    {middleRow[idx] ? (
                      <Card
                        card={middleRow[idx]}
                        onClick={(e) => { e.stopPropagation(); handleCardClickInSlot(middleRow[idx], 'middle', idx); }}
                      />
                    ) : (
                      <div className="empty-slot">Middle #{idx + 1}</div>
                    )}
                  </div>
                ))}
                <div className={`hand-badge ${middleRow.length === 5 ? 'active-rank' : 'text-text-muted'}`}>
                  {getRowLabel('middle', middleRow)}
                </div>
              </div>
            </div>

            {/* Back Row (5 Slots) */}
            <div className={`card-row ${activeRow === 'back' ? 'border-primary-neon/50 bg-white/[0.04]' : ''}`} onClick={() => setActiveRow('back')}>
              <div className="row-label">Back (5)</div>
              <div className="card-slots">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex-shrink-0">
                    {backRow[idx] ? (
                      <Card
                        card={backRow[idx]}
                        onClick={(e) => { e.stopPropagation(); handleCardClickInSlot(backRow[idx], 'back', idx); }}
                      />
                    ) : (
                      <div className="empty-slot">Back #{idx + 1}</div>
                    )}
                  </div>
                ))}
                <div className={`hand-badge ${backRow.length === 5 ? 'active-rank' : 'text-text-muted'}`}>
                  {getRowLabel('back', backRow)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="user-hand-panel">
        <div className="flex justify-between items-center px-2">
          <div className="flex gap-2">
            <button
              onClick={handleAutoSort}
              className="btn btn-glass py-2 px-3 text-xs flex items-center gap-1.5 border-yellow-500/20 text-accent-gold hover:bg-yellow-500/5 font-black"
              title="Auto-fill with strongest possible layout"
            >
              <Zap size={14} className="fill-accent-gold" /> AUTO-SORT
            </button>
            <button
              onClick={handleClear}
              className="btn btn-glass py-2 px-3 text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={12} /> CLEAR
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowRules(!showRules)}
              className="btn btn-glass py-2 px-3 text-xs flex items-center gap-1.5"
            >
              <BookOpen size={12} /> RULES HELP
            </button>
            <button
              onClick={handleSubmit}
              disabled={frontRow.length !== 3 || middleRow.length !== 5 || backRow.length !== 5 || isFoul}
              className="btn btn-primary py-2 px-6 text-xs flex items-center gap-1.5 font-bold"
            >
              <Send size={12} /> LOCK IN ARRANGEMENT
            </button>
          </div>
        </div>

        <div className="cards-in-hand">
          {handCards.length === 0 ? (
            <div className="w-full flex items-center justify-center text-xs text-text-muted italic">
              All cards have been placed on the table slots.
            </div>
          ) : (
            handCards.map((card, idx) => (
              <Card
                key={`${card.value}${card.suit}-${idx}`}
                card={card}
                onClick={() => handleCardClickInHand(card, idx)}
              />
            ))
          )}
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRules(false)}>
          <div className="glass-panel glass-panel-neon max-w-lg w-full p-6 flex flex-col gap-4 text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-lg font-bold text-primary-neon flex items-center gap-2">
                <BookOpen size={18} /> Chinese Poker Rules & Strength
              </h3>
              <button onClick={() => setShowRules(false)} className="text-xl text-text-secondary hover:text-white">&times;</button>
            </div>
            
            <div className="text-sm text-text-secondary flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-1">
              <p>
                Each player gets <strong>13 cards</strong> and must divide them into three rows:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1">
                <li><strong>Back Row (5 cards)</strong>: Must be your strongest poker hand.</li>
                <li><strong>Middle Row (5 cards)</strong>: Must be weaker or equal to your Back row.</li>
                <li><strong>Front Row (3 cards)</strong>: Must be your weakest row. (Straight/Flush do not count).</li>
              </ul>
              
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-accent-foul font-medium text-xs leading-relaxed">
                <strong>⚠️ FOUL WARNING:</strong> If Front &gt; Middle or Middle &gt; Back, it is a foul! A fouled player automatically loses all 3 hands to all non-fouled opponents (losing 6 points total to each).
              </div>

              <h4 className="font-bold text-white mt-1">Hand Ranking (Standard Poker):</h4>
              <p className="text-xs">
                Royal Flush &gt; Straight Flush &gt; Four of a Kind &gt; Full House &gt; Flush &gt; Straight &gt; Three of a Kind &gt; Two Pair &gt; One Pair &gt; High Card.
              </p>

              <h4 className="font-bold text-white mt-1">Scoring details (1-6 method):</h4>
              <p className="text-xs leading-relaxed">
                You compare Front-to-Front, Middle-to-Middle, and Back-to-Back against every opponent. Each won hand earns you +1 point. If you win all 3 hands against a single opponent, you get a **Scoop sweep** (+3 bonus points, making it +6 points total!).
              </p>
            </div>
            <button onClick={() => setShowRules(false)} className="btn btn-secondary w-full py-2.5 mt-2">CLOSE RULES</button>
          </div>
        </div>
      )}
    </div>
  );
}
