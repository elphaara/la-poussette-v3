import React, { useState, useEffect } from 'react';

export const PousseBoard = ({ ctx, G, moves, playerID }) => {
  const [selected, setSelected] = useState(null);
  const [isCompressMode, setIsCompressMode] = useState(false);
  const isFlipped = playerID === '1'; 

  const [localTimes, setLocalTimes] = useState(G.timer || [600, 600]);

  useEffect(() => {
    if (G.timer) setLocalTimes([...G.timer]);
  }, [G.timer]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimes(prev => {
        if (!prev || !G.gameStarted) return prev;
        const newTimes = [...prev];
        const active = parseInt(ctx.currentPlayer);
        if (newTimes[active] > 0 && !ctx.gameover) {
          newTimes[active] -= 1;
        }
        return newTimes;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ctx.currentPlayer, ctx.gameover, G.gameStarted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const onClick = (id) => {
    const piece = G.cells[id];
    const opponentColor = ctx.currentPlayer === '0' ? 'N' : 'B';

    if (isCompressMode) {
      if (piece && piece.startsWith(opponentColor)) {
        moves.compressPion(id);
      }
      setIsCompressMode(false);
      setSelected(null);
      return;
    }

    if (selected === null) {
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (piece && piece.startsWith(myColor)) setSelected(id);
    } else {
      if (selected !== id) moves.playAction(selected, id);
      setSelected(null);
    }
  };

  const renderPiece = (p) => {
    if (!p) return null;
    const star = { position: 'absolute', fontSize: '20px', color: '#f1c40f', textShadow: '0 0 2px black' };
    if (p === 'B') return <span>⚪</span>;
    if (p === 'N') return <span>⚫</span>;
    if (p.includes('P')) return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>{p.startsWith('B') ? '⚪' : '⚫'}</span><span style={star}>⭐</span>
      </div>
    );
    return null;
  };

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'Arial' }}>
      
      {/* Timer Adversaire */}
      <div style={{ padding: '10px 20px', fontSize: '28px', fontWeight: 'bold', borderRadius: '8px', backgroundColor: ctx.currentPlayer === (isFlipped ? '0' : '1') ? '#2c3e50' : '#f8f9fa', color: ctx.currentPlayer === (isFlipped ? '0' : '1') ? '#fff' : '#adb5bd', border: '2px solid #dee2e6', minWidth: '100px', textAlign: 'center', margin: '10px 0' }}>
        {formatTime(localTimes[isFlipped ? 0 : 1])}
      </div>

      {/* Grille de repérage A-E / 1-5 [cite: 3] */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(5, 80px)', gridTemplateRows: 'repeat(5, 80px) 40px', margin: '10px auto', userSelect: 'none' }}>
        {(isFlipped ? [0,1,2,3,4] : [4,3,2,1,0]).map(r => (
          <React.Fragment key={r}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>{r + 1}</div>
            {(isFlipped ? [4,3,2,1,0] : [0,1,2,3,4]).map(c => (
              <div key={r*5+c} onClick={() => onClick(r*5+c)} style={{ width: '80px', height: '80px', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#fff', boxShadow: selected === r*5+c ? 'inset 0 0 0 4px #3498db' : (isCompressMode ? 'inset 0 0 0 4px #e74c3c' : 'none'), fontSize: '45px' }}>
                {renderPiece(G.cells[r*5+c])}
              </div>
            ))}
          </React.Fragment>
        ))}
        <div />
        {(isFlipped ? [4,3,2,1,0] : [0,1,2,3,4]).map(c => (
          <div key={c} style={{display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>{['A','B','C','D','E'][c]}</div>
        ))}
      </div>

      {/* Ton Timer */}
      <div style={{ padding: '10px 20px', fontSize: '28px', fontWeight: 'bold', borderRadius: '8px', backgroundColor: ctx.currentPlayer === (isFlipped ? '1' : '0') ? '#2c3e50' : '#f8f9fa', color: ctx.currentPlayer === (isFlipped ? '1' : '0') ? '#fff' : '#adb5bd', border: '2px solid #dee2e6', minWidth: '100px', textAlign: 'center', margin: '10px 0' }}>
        {formatTime(localTimes[isFlipped ? 1 : 0])}
      </div>

      <button onClick={() => {setIsCompressMode(!isCompressMode); setSelected(null);}} style={{ marginTop: '20px', padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', backgroundColor: isCompressMode ? '#e74c3c' : '#34495e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        {isCompressMode ? "ANNULER COMPRESSION" : "💥 COMPRESSION"}
      </button>

      {ctx.gameover && <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#27ae60', color: '#fff', borderRadius: '8px', fontSize: '20px'}}>Victoire : {ctx.gameover.winner} !</div>}
    </div>
  );
};
