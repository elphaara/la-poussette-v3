import React, { useState, useEffect } from 'react';

export const PousseBoard = ({ ctx, G, moves, playerID }) => {
  const [selected, setSelected] = useState(null);
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
    if (isNaN(seconds) || seconds === null) return "10:00";
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const onClick = (id) => {
    const piece = G.cells[id];
    const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
    const opponentColor = ctx.currentPlayer === '0' ? 'N' : 'B';

    if (selected === null) {
      // 1. Cliquer sur son pion pour le sélectionner
      if (piece && piece.startsWith(myColor)) {
        setSelected(id);
      } 
      // 2. Cliquer sur un pion adverse pour tenter une COMPRESSION
      else if (piece && piece.startsWith(opponentColor)) {
        moves.compressPion(id);
      }
    } else {
      // 3. Cliquer ailleurs pour déplacer le pion sélectionné
      if (selected !== id) {
        moves.playAction(selected, id);
      }
      setSelected(null);
    }
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
      <div style={{ padding: '10px 20px', fontSize: '28px', fontWeight: 'bold', borderRadius: '8px', backgroundColor: ctx.currentPlayer === (isFlipped ? '0' : '1') ? '#2c3e50' : '#f8f9fa', color: ctx.currentPlayer === (isFlipped ? '0' : '1') ? '#fff' : '#adb5bd', border: '2px solid #dee2e6', minWidth: '100px', textAlign: 'center', margin: '10px 0' }}>
        {formatTime(localTimes[isFlipped ? 0 : 1])}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(5, 80px)', gridTemplateRows: 'repeat(5, 80px) 40px', margin: '10px auto', backgroundColor: '#fff', userSelect: 'none' }}>
        {renderBoard()}
      </div>

      <div style={{ padding: '10px 20px', fontSize: '28px', fontWeight: 'bold', borderRadius: '8px', backgroundColor: ctx.currentPlayer === (isFlipped ? '1' : '0') ? '#2c3e50' : '#f8f9fa', color: ctx.currentPlayer === (isFlipped ? '1' : '0') ? '#fff' : '#adb5bd', border: '2px solid #dee2e6', minWidth: '100px', textAlign: 'center', margin: '10px 0' }}>
        {formatTime(localTimes[isFlipped ? 1 : 0])}
      </div>

      <div style={{marginTop: '10px', color: '#7f8c8d', fontStyle: 'italic'}}>
        Astuce : Cliquez sur un pion adverse entouré pour le capturer !
      </div>

      {ctx.gameover && (
        <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#27ae60', color: '#fff', borderRadius: '8px', fontSize: '20px'}}>
          Victoire : {ctx.gameover.winner} !
        </div>
      )}
    </div>
  );
};
