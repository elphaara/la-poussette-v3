import React, { useState, useEffect } from 'react';

export const PousseBoard = ({ ctx, G, moves, playerID }) => {
  const [selected, setSelected] = useState(null);
  const isFlipped = playerID === '1'; 

  // --- LOGIQUE DU TIMER VISUEL ---
  // Initialisation sécurisée
  const [localTimes, setLocalTimes] = useState(G.timer || [600, 600]);

  useEffect(() => {
    // Dès que le serveur envoie un nouveau G.timer, on écrase le temps local
    if (G.timer) {
      setLocalTimes([...G.timer]);
    }
  }, [G.timer]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimes(prev => {
        if (!prev) return [600, 600];
        const newTimes = [...prev];
        const active = parseInt(ctx.currentPlayer);
        if (newTimes[active] > 0 && !ctx.gameover) {
          newTimes[active] -= 1;
        }
        return newTimes;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [ctx.currentPlayer, ctx.gameover]);

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return "10:00";
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const onClick = (id) => {
    if (selected === null) {
      const piece = G.cells[id];
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (piece && piece.startsWith(myColor)) setSelected(id);
    } else {
      moves.playAction(selected, id);
      setSelected(null);
    }
  };

  // --- STYLES ---
  const boardStyle = {
    display: 'grid',
    gridTemplateColumns: '40px repeat(5, 80px)',
    gridTemplateRows: 'repeat(5, 80px) 40px',
    margin: '10px auto',
    width: 'fit-content',
    backgroundColor: '#fff',
    userSelect: 'none'
  };

  const clockStyle = (playerIndex) => {
    const isActive = ctx.currentPlayer === String(playerIndex);
    return {
      padding: '10px 20px',
      fontSize: '28px',
      fontWeight: 'bold',
      borderRadius: '8px',
      backgroundColor: isActive ? '#2c3e50' : '#f8f9fa',
      color: isActive ? '#fff' : '#adb5bd',
      border: isActive ? '2px solid #3498db' : '2px solid #dee2e6',
      minWidth: '100px',
      textAlign: 'center',
      margin: '10px 0',
      transition: 'all 0.2s'
    };
  };

  const renderPiece = (p) => {
    if (!p) return null;
    const star = { position: 'absolute', fontSize: '20px', color: '#f1c40f', textShadow: '0 0 2px black' };
    if (p === 'B') return <span>⚪</span>;
    if (p === 'N') return <span>⚫</span>;
    if (p === 'BP') return <div style={{display:'flex', alignItems:'center', justifyContent:'center'}}><span>⚪</span><span style={star}>⭐</span></div>;
    if (p === 'NP') return <div style={{display:'flex', alignItems:'center', justifyContent:'center'}}><span>⚫</span><span style={star}>⭐</span></div>;
    return null;
  };

  const renderBoard = () => {
    let board = [];
    const rowOrder = isFlipped ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    const colOrder = isFlipped ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4];
    rowOrder.forEach(r => {
      board.push(<div key={`l-${r}`} style={{display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>{r + 1}</div>);
      colOrder.forEach(c => {
        const id = r * 5 + c;
        board.push(
          <div key={id} onClick={() => onClick(id)} style={{
            width: '80px', height: '80px', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: selected === id ? 'inset 0 0 0 4px #3498db' : 'none', fontSize: '45px', backgroundColor: '#fff'
          }}>
            {renderPiece(G.cells[id])}
          </div>
        );
      });
    });
    board.push(<div key="empty" />);
    colOrder.forEach(c => board.push(<div key={`b-${c}`} style={{display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>{['A','B','C','D','E'][c]}</div>));
    return board;
  };

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Chrono Adversaire */}
      <div style={clockStyle(isFlipped ? 0 : 1)}>
        {formatTime(localTimes[isFlipped ? 0 : 1])}
      </div>

      <div style={boardStyle}>
        {renderBoard()}
      </div>

      {/* Ton Chrono */}
      <div style={clockStyle(isFlipped ? 1 : 0)}>
        {formatTime(localTimes[isFlipped ? 1 : 0])}
      </div>

      {ctx.gameover && (
        <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#27ae60', color: '#fff', borderRadius: '8px', fontSize: '20px'}}>
          Victoire : {ctx.gameover.winner} !
        </div>
      )}
    </div>
  );
};
