import React from 'react';
import { Trophy, ArrowRight, User, RefreshCw, LogOut } from 'lucide-react';

const SUIT_UNICODE = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };

function SmallCard({ card }) {
  if (!card) return null;
  const isRed = card.suit === 'H' || card.suit === 'D';
  const displayRank = card.value === 14 ? 'A' :
                      card.value === 13 ? 'K' :
                      card.value === 12 ? 'Q' :
                      card.value === 11 ? 'J' : card.value;

  return (
    <div className={`playing-card ${isRed ? 'red-suit' : 'black-suit'} !w-[42px] !h-[60px] !p-[0.15rem] !rounded`}>
      <div className="flex justify-between text-[0.65rem] font-bold leading-none">
        <span>{displayRank}</span>
        <span>{SUIT_UNICODE[card.suit]}</span>
      </div>
      <div className="text-center text-sm leading-none mt-1">{SUIT_UNICODE[card.suit]}</div>
    </div>
  );
}

export default function Showdown({
  roomState,
  myPlayerId,
  sounds,
  onNextRound,
  onLeaveRoom
}) {
  const myPlayerState = roomState.players.find(p => p.id === myPlayerId);
  const isHost = myPlayerState?.isHost;

  const renderRowComparison = (rowType, cardsA, labelA, cardsB, labelB, winnerId, idA, idB) => {
    const isWinnerA = winnerId === idA;
    const isWinnerB = winnerId === idB;
    const isTie = winnerId === 'tie';

    return (
      <div className="showdown-hand-item flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
        <div className={`flex items-center gap-2 flex-1 ${isWinnerA ? 'text-accent-success font-bold' : ''}`}>
          <div className="flex gap-1">
            {cardsA.map((c, i) => <SmallCard key={i} card={c} />)}
          </div>
          <span className="text-xs truncate max-w-[130px]" title={labelA}>{labelA}</span>
        </div>

        <div className="text-[10px] font-black text-text-muted px-3 uppercase tracking-wider text-center w-[70px]">
          {isTie ? (
            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded">TIE</span>
          ) : isWinnerA ? (
            <span className="bg-emerald-500/10 text-accent-success border border-emerald-500/20 px-2 py-0.5 rounded">◀ WIN</span>
          ) : (
            <span className="bg-emerald-500/10 text-accent-success border border-emerald-500/20 px-2 py-0.5 rounded">WIN ▶</span>
          )}
        </div>

        <div className={`flex items-center gap-2 flex-1 justify-end text-right ${isWinnerB ? 'text-accent-success font-bold' : ''}`}>
          <span className="text-xs truncate max-w-[130px]" title={labelB}>{labelB}</span>
          <div className="flex gap-1">
            {cardsB.map((c, i) => <SmallCard key={i} card={c} />)}
          </div>
        </div>
      </div>
    );
  };

  const getComparisonsList = () => {
    const list = [];
    if (!roomState.comparisons) return list;

    Object.keys(roomState.comparisons).forEach(key => {
      const comp = roomState.comparisons[key];
      const [idA, idB] = key.split('_');

      const playerA = roomState.players.find(p => p.id === idA);
      const playerB = roomState.players.find(p => p.id === idB);

      if (!playerA || !playerB) return;

      if (idB === myPlayerId) {
        list.push({
          key,
          idA: idB,
          idB: idA,
          nameA: 'You',
          nameB: playerA.name,
          isFoulA: comp.isFoulB,
          isFoulB: comp.isFoulA,
          frontWinner: comp.frontWinner,
          middleWinner: comp.middleWinner,
          backWinner: comp.backWinner,
          frontLabelA: comp.frontLabelB,
          frontLabelB: comp.frontLabelA,
          middleLabelA: comp.middleLabelB,
          middleLabelB: comp.middleLabelA,
          backLabelA: comp.backLabelB,
          backLabelB: comp.backLabelA,
          netPoints: -comp.netPoints,
          handA: playerB.hand,
          handB: playerA.hand
        });
      } else {
        list.push({
          key,
          idA,
          idB,
          nameA: idA === myPlayerId ? 'You' : playerA.name,
          nameB: playerB.name,
          isFoulA: comp.isFoulA,
          isFoulB: comp.isFoulB,
          frontWinner: comp.frontWinner,
          middleWinner: comp.middleWinner,
          backWinner: comp.backWinner,
          frontLabelA: comp.frontLabelA,
          frontLabelB: comp.frontLabelB,
          middleLabelA: comp.middleLabelA,
          middleLabelB: comp.middleLabelB,
          backLabelA: comp.backLabelA,
          backLabelB: comp.backLabelB,
          netPoints: comp.netPoints,
          handA: playerA.hand,
          handB: playerB.hand
        });
      }
    });

    return list.sort((a, b) => {
      const aHasMe = a.idA === myPlayerId || a.idB === myPlayerId;
      const bHasMe = b.idA === myPlayerId || b.idB === myPlayerId;
      if (aHasMe && !bHasMe) return -1;
      if (!aHasMe && bHasMe) return 1;
      return 0;
    });
  };

  const sortedPlayers = [...roomState.players].sort((a, b) => b.totalScore - a.totalScore);
  const topScore = sortedPlayers[0]?.totalScore;

  const comparisons = getComparisonsList();
  
  const myMatchups = comparisons.filter(c => c.idA === myPlayerId || c.idB === myPlayerId);
  const otherMatchups = comparisons.filter(c => c.idA !== myPlayerId && c.idB !== myPlayerId);

  return (
    <div className="showdown-panel">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex flex-col gap-4 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Trophy className="text-accent-gold" size={22} />
            <h3 className="text-lg font-bold">Lobby Leaderboard</h3>
          </div>

          <table className="scoreboard-table">
            <thead>
              <tr>
                <th>Player</th>
                <th className="text-right">Round Pt</th>
                <th className="text-right">Total Score</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p, idx) => (
                <tr key={p.id} className={p.id === myPlayerId ? 'bg-white/[0.02]' : ''}>
                  <td className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-muted">#{idx + 1}</span>
                    <span className="font-bold text-sm">
                      {p.name} {p.id === myPlayerId && '(You)'}
                    </span>
                    {p.totalScore === topScore && p.totalScore > 0 && (
                      <span className="text-[10px]" title="Leader">👑</span>
                    )}
                  </td>
                  <td className={`text-right font-bold text-sm ${p.roundScore > 0 ? 'text-accent-success' : p.roundScore < 0 ? 'text-accent-foul' : ''}`}>
                    {p.roundScore > 0 ? `+${p.roundScore}` : p.roundScore}
                  </td>
                  <td className="text-right font-black text-sm text-primary-neon">
                    {p.totalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex flex-col gap-2">
            {isHost ? (
              <button
                onClick={onNextRound}
                className="btn btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> NEXT ROUND
              </button>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center text-xs text-text-secondary italic">
                Waiting for the Host to launch the next round...
              </div>
            )}
            <button
              onClick={onLeaveRoom}
              className="btn btn-glass w-full py-2 text-xs flex items-center justify-center gap-1.5 text-accent-foul hover:bg-rose-500/5"
            >
              <LogOut size={14} /> LEAVE GAME
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <User className="text-primary-neon" size={22} />
            <h3 className="text-lg font-bold">Hands Showdown</h3>
          </div>

          {myMatchups.map((comp) => (
            <div key={comp.key} className="glass-panel comparison-card flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="font-extrabold text-sm uppercase tracking-wide">
                  Comparison: {comp.nameA} vs {comp.nameB}
                </span>

                <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${comp.netPoints > 0 ? 'bg-emerald-500/10 text-accent-success border border-emerald-500/20' : comp.netPoints < 0 ? 'bg-rose-500/10 text-accent-foul border border-rose-500/20' : 'bg-white/5 border border-white/10 text-text-secondary'}`}>
                  {comp.netPoints > 0 ? `YOU WON +${comp.netPoints} PT` : comp.netPoints < 0 ? `YOU LOST ${comp.netPoints} PT` : 'TIED MATCH'}
                </span>
              </div>

              {comp.isFoulA && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-accent-foul p-2 rounded-lg text-xs font-bold text-center">
                  ⚠️ YOU FOULED (Auto-lost all hands)
                </div>
              )}
              {comp.isFoulB && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-accent-foul p-2 rounded-lg text-xs font-bold text-center">
                  ⚠️ {comp.nameB} FOULED (Auto-lost all hands)
                </div>
              )}

              <div className="flex flex-col gap-2 mt-1">
                {renderRowComparison(
                  'front',
                  comp.handA.front,
                  comp.frontLabelA,
                  comp.handB.front,
                  comp.frontLabelB,
                  comp.frontWinner,
                  comp.idA,
                  comp.idB
                )}
                {renderRowComparison(
                  'middle',
                  comp.handA.middle,
                  comp.middleLabelA,
                  comp.handB.middle,
                  comp.middleLabelB,
                  comp.middleWinner,
                  comp.idA,
                  comp.idB
                )}
                {renderRowComparison(
                  'back',
                  comp.handA.back,
                  comp.backLabelA,
                  comp.handB.back,
                  comp.backLabelB,
                  comp.backWinner,
                  comp.idA,
                  comp.idB
                )}
              </div>
            </div>
          ))}

          {otherMatchups.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider pl-1 mt-2">Other Matchups</span>
              {otherMatchups.map((comp) => (
                <div key={comp.key} className="glass-panel p-4 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs font-bold border-b border-white/5 pb-2">
                    <span className="text-text-secondary uppercase">{comp.nameA} vs {comp.nameB}</span>
                    <span className={comp.netPoints > 0 ? 'text-accent-success' : comp.netPoints < 0 ? 'text-accent-foul' : ''}>
                      {comp.netPoints > 0 ? `${comp.nameA} +${comp.netPoints} Pt` : `${comp.nameB} +${Math.abs(comp.netPoints)} Pt`}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Front: {comp.frontLabelA} vs {comp.frontLabelB}</span>
                      <span className="font-bold">{comp.frontWinner === 'tie' ? 'Tie' : roomState.players.find(p => p.id === comp.frontWinner)?.name}</span>
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Middle: {comp.middleLabelA} vs {comp.middleLabelB}</span>
                      <span className="font-bold">{comp.middleWinner === 'tie' ? 'Tie' : roomState.players.find(p => p.id === comp.middleWinner)?.name}</span>
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>Back: {comp.backLabelA} vs {comp.backLabelB}</span>
                      <span className="font-bold">{comp.backWinner === 'tie' ? 'Tie' : roomState.players.find(p => p.id === comp.backWinner)?.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
