import React, { useState, useEffect, useRef } from 'react';
import { Users, Copy, Check, Send, Play, LogOut } from 'lucide-react';

export default function Lobby({
  roomState,
  myPlayerId,
  chat,
  sounds,
  onToggleReady,
  onStartGame,
  onSendMessage,
  onLeaveRoom
}) {
  const [copied, setCopied] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    sounds.playTick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    onSendMessage(messageInput.trim());
    setMessageInput('');
  };

  const myPlayer = roomState.players.find(p => p.id === myPlayerId);
  const isHost = myPlayer?.isHost;

  const otherPlayers = roomState.players.filter(p => !p.isHost);
  const canStart = roomState.players.length >= 2 && otherPlayers.every(p => p.ready);

  return (
    <div className="lobby-grid">
      {/* Players List Panel */}
      <div className="glass-panel lobby-players-card">
        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Users className="text-primary-neon" size={24} />
            <h2 className="text-xl font-bold tracking-tight">Game Room Lobby</h2>
          </div>
          <span className="text-xs font-bold text-text-secondary bg-white/5 px-3 py-1.5 rounded-lg">
            {roomState.players.length} / 4 PLAYERS
          </span>
        </div>

        {/* Room Code Display */}
        <div className="bg-black/35 rounded-2xl p-4 border border-white/5 flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Lobby Join Code</p>
            <p className="text-2xl font-black tracking-widest text-primary-neon">{roomState.code}</p>
          </div>
          <button
            onClick={copyRoomCode}
            className="btn btn-glass py-2 px-3 flex items-center gap-1.5 text-xs font-bold"
          >
            {copied ? (
              <>
                <Check size={14} className="text-accent-success" /> COPIED!
              </>
            ) : (
              <>
                <Copy size={14} /> COPY CODE
              </>
            )}
          </button>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto pr-1">
          {roomState.players.map((p) => (
            <div key={p.id} className={`player-item ${p.id === myPlayerId ? 'is-me' : ''}`}>
              <div className="player-avatar">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="player-info">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{p.name}</span>
                  {p.id === myPlayerId && (
                    <span className="text-[9px] bg-primary-neon/15 text-primary-neon border border-primary-neon/30 px-1.5 py-0.5 rounded font-black uppercase">
                      YOU
                    </span>
                  )}
                  {p.isHost && (
                    <span className="text-[9px] bg-accent-gold/15 text-accent-gold border border-accent-gold/30 px-1.5 py-0.5 rounded font-black uppercase">
                      HOST
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {p.isHost ? 'Configuring match...' : (p.ready ? 'Ready to play' : 'Waiting...')}
                </p>
              </div>

              {/* Status Indicator */}
              <div>
                {p.isHost ? (
                  <span className="status-badge bg-amber-500/10 text-accent-gold border border-amber-500/30">
                    Host
                  </span>
                ) : p.ready ? (
                  <span className="status-badge status-ready">Ready</span>
                ) : (
                  <span className="status-badge status-waiting">Waiting</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-white/5 pt-4 mt-4 flex gap-3">
          <button onClick={onLeaveRoom} className="btn btn-glass px-4 py-3 text-accent-foul hover:bg-rose-500/5 hover:border-rose-500/20" title="Leave room">
            <LogOut size={18} />
          </button>

          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className="btn btn-primary flex-1 py-3"
            >
              <Play size={18} /> START GAME
            </button>
          ) : (
            <button
              onClick={onToggleReady}
              className={`btn flex-1 py-3 ${myPlayer?.ready ? 'btn-glass text-accent-gold' : 'btn-secondary'}`}
            >
              {myPlayer?.ready ? 'UNREADY' : 'I AM READY'}
            </button>
          )}
        </div>
      </div>

      {/* Lobby Chat Panel */}
      <div className="glass-panel chat-panel">
        <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-sm text-text-secondary uppercase tracking-wider">Lobby Chat</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary-neon animate-pulse"></span>
        </div>

        {/* Chat History */}
        <div className="chat-messages">
          {chat.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-muted italic">
              No messages yet. Say hello!
            </div>
          ) : (
            chat.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.sender === 'System' ? 'system' : ''}`}
              >
                {msg.sender !== 'System' && (
                  <p className="chat-sender">{msg.sender}</p>
                )}
                <p className="text-white text-sm break-all leading-snug">{msg.text}</p>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="chat-input-area">
          <input
            type="text"
            placeholder="Type a message..."
            className="input-text flex-1 py-2 text-sm"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            maxLength={100}
          />
          <button type="submit" className="btn btn-primary px-3 py-2">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
