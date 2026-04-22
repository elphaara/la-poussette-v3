import React, { useState, useEffect } from 'react';

export const PousseBoard = ({ ctx, G, moves, playerID }) => {
  const [selected, setSelected] = useState(null);
  const isFlipped = playerID === '1'; 
  const [localTimes, setLocalTimes] = useState(G.timer || [600, 600]);

  useEffect(() => { if (G.timer) setLocalTimes([...G.timer]); }, [G.timer]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimes(prev => {
        if (!prev || !G.gameStarted || G.gameMode !== 'online') return prev;
        const newTimes = [...prev];
        const active = parseInt(ctx.currentPlayer);
        if (newTimes[active] > 0 && !ctx.gameover) newTimes[active] -= 1;
        return newTimes;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ctx.currentPlayer, ctx.gameover, G.gameStarted, G.gameMode]);

  const formatTime = (s) => {
    const mins = Math.floor(Math.max(0, s) / 60);
    const secs = Math.max(0, s) % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const onClick = (id) => {
    if (selected === null) {
      const piece = G.cells[id];
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (piece && piece.startsWith(myColor)) setSelected(id);
    } else {
      if (selected !== id) moves.playAction(selected, id);
      setSelected(null);
    }
  };

  if (G.gameMode === 'undecided') {
    return (
      <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '40px' }}>La Poussette</h1>
        <button onClick={() => moves.setGameMode('solo')} style={{ width: '250px', padding: '20px', margin: '10px', backgroundColor: '#9b59b6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>
          🤖 Contre l'IA (Solo)
        </button>
        <button onClick={() => moves.setGameMode('online')} style={{ width: '250px', padding: '20px', margin: '10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>
          🌐 Jouer en Ligne
        </button>
      </div>
    );
  }

  const renderPiece = (p) => {
    if (!p) return null;
    const star = { position: 'absolute', fontSize: '20px', color: '#f1c40f', textShadow: '0 0 2px black' };
    if (p === 'B') return <span>⚪</span>;
    if (p === 'N') return <span>⚫</span>;
    if (p.includes('P')) return <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>{p.startsWith('B')?'⚪':'⚫'}</span><span style={star}>⭐</span></div>;
    return null;
  };

  const renderBoard = () => {
    const columns = ['A', 'B', 'C', 'D', 'E'];
    const rowOrder = isFlipped ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    const colOrder = isFlipped ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4];
    let board = [];
    rowOrder.forEach(r => {
      board.push(<div key={`l-${r}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{r + 1}</div>);
      colOrder.forEach(c => {
        const id = r * 5 + c;
        board.push(<div key={id} onClick={() => onClick(id)} style={{ width: '80px', height: '80px', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#fff', boxShadow: selected === id ? 'inset 0 0 0 4px #3498db' : 'none', fontSize: '45px', userSelect:'none' }}>{renderPiece(G.cells[id])}</div>);
      });
    });
    board.push(<div key="corner" />);
    colOrder.forEach(c => board.push(<div key={`b-${c}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{columns[c]}</div>));
    return board;
  };

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'Arial' }}>
      
      {G.gameMode === 'online' && (
        <div style={{ padding: '10px 30px', fontSize: '32px', fontWeight: 'bold', borderRadius: '8px', backgroundColor: ctx.currentPlayer === (isFlipped ? '0' : '1') ? '#2c3e50' : '#f8f9fa', color: ctx.currentPlayer === (isFlipped ? '0' : '1') ? '#fff' : '#adb5bd', border: '2px solid #dee2e6', marginBottom: '15px' }}>
          {formatTime(localTimes[isFlipped ? 0 : 1])}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(5, 80px)', gridTemplateRows: 'repeat(5, 80px) 40px' }}>
        {renderBoard()}
      </div>

      {G.gameMode === 'online' && (
        <div style={{ padding: '10px 30px', fontSize: '32px', fontWeight: 'bold', borderRadius: '8px', backgroundColor: ctx.currentPlayer === (isFlipped ? '1' : '0') ? '#2c3e50' : '#f8f9fa', color: ctx.currentPlayer === (isFlipped ? '1' : '0') ? '#fff' : '#adb5bd', border: '2px solid #dee2e6', marginTop: '15px' }}>
          {formatTime(localTimes[isFlipped ? 1 : 0])}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        {G.gameMode === 'solo' && !ctx.gameover && (
          <button onClick={() => moves.requestAIMove()} style={{ padding: '15px 30px', background: '#34495e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
             Lancer l'IA
          </button>
        )}
      </div>

      {ctx.gameover && <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#27ae60', color: '#fff', borderRadius: '8px', fontSize: '24px'}}>Victoire : {ctx.gameover.winner} !</div>}
    </div>
  );
};
