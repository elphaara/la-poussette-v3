import React, { useState, useEffect } from 'react';

export const PousseBoard = ({ ctx, G, moves, playerID }) => {
  const [selected, setSelected] = useState(null);
  const isFlipped = playerID === '1'; 

  // --- LOGIQUE DU TIMER VISUEL ---
  const [localTimes, setLocalTimes] = useState(G.timer || [600, 600]);

  // Synchronisation avec le serveur
  useEffect(() => {
    if (G.timer) {
      setLocalTimes([...G.timer]);
    }
  }, [G.timer]);

  // Compte à rebours local
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimes(prev => {
        // Le temps ne descend pas si le jeu n'a pas commencé
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

  // Formatage propre du temps
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return "10:00";
    }
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const onClick = (id) => {
    if (selected === null) {
      const piece = G.cells[id];
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (piece && piece.startsWith(myColor)) {
        setSelected(id);
      }
    } else {
      // On ne joue que si on clique sur une case différente
      if (selected !== id) {
        moves.playAction(selected, id);
      }
      setSelected(null);
    }
  };

  // --- STYLE DES PIÈCES ---
  const renderPiece = (p) => {
    if (!p) return null;
    const starStyle = { 
      position: 'absolute', 
      fontSize: '20px', 
      color: '#f1c40f', 
      textShadow: '0 0 2px black' 
    };

    if (p === 'B') return <span>⚪</span>;
    if (p === 'N') return <span>⚫</span>;
    
    // Pions promus : Rond + Étoile dorée
    if (p === 'BP') return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>⚪</span><span style={starStyle}>⭐</span>
      </div>
    );
    if (p === 'NP') return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>⚫</span><span style={starStyle}>⭐</span>
      </div>
    );
    return null;
  };

  // --- RENDU DU PLATEAU ---
  const renderBoard = () => {
    const columns = ['A', 'B', 'C', 'D', 'E'];
    const rowOrder = isFlipped ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    const colOrder = isFlipped ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4];
    
    let board = [];

    rowOrder.forEach(r => {
      // Chiffre à gauche (Colonne de coordonnées)
      board.push(
        <div key={`l-${r}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
          {r + 1}
        </div>
      );
      
      colOrder.forEach(c => {
        const id = r * 5 + c;
        board.push(
          <div 
            key={id} 
            onClick={() => onClick(id)} 
            style={{
              width: '80px',
              height: '80px',
              border: '1px solid #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: '#fff',
              boxShadow: selected === id ? 'inset 0 0 0 4px #3498db' : 'none',
              fontSize: '45px',
              userSelect: 'none'
            }}
          >
            {renderPiece(G.cells[id])}
          </div>
        );
      });
    });

    // Ligne du bas (Lettres de coordonnées)
    board.push(<div key="corner" />);
    colOrder.forEach(c => {
      board.push(
        <div key={`b-${c}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
          {columns[c]}
        </div>
      );
    });

    return board;
  };

  // --- STYLE DES CLOCKS ---
  const clockBoxStyle = (playerIdx) => {
    const isActive = ctx.currentPlayer === String(playerIdx);
    return {
      padding: '10px 30px',
      fontSize: '32px',
      fontWeight: 'bold',
      borderRadius: '8px',
      backgroundColor: isActive ? '#2c3e50' : '#f8f9fa',
      color: isActive ? '#fff' : '#adb5bd',
      border: isActive ? '2px solid #3498db' : '2px solid #dee2e6',
      margin: '15px',
      minWidth: '120px',
      textAlign: 'center',
      transition: 'all 0.3s'
    };
  };

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Timer de l'adversaire (en haut) */}
      <div style={clockBoxStyle(isFlipped ? 0 : 1)}>
        {formatTime(localTimes[isFlipped ? 0 : 1])}
      </div>

      {/* Plateau de jeu */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '40px repeat(5, 80px)', 
        gridTemplateRows: 'repeat(5, 80px) 40px',
        backgroundColor: '#fff'
      }}>
        {renderBoard()}
      </div>

      {/* Ton Timer (en bas) */}
      <div style={clockBoxStyle(isFlipped ? 1 : 0)}>
        {formatTime(localTimes[isFlipped ? 1 : 0])}
      </div>

      {/* Message de victoire */}
      {ctx.gameover && (
        <div style={{
          marginTop: '20px',
          padding: '15px 40px',
          backgroundColor: '#27ae60',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '24px',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          Victoire : {ctx.gameover.winner} !
        </div>
      )}

      {!G.gameStarted && !ctx.gameover && (
        <div style={{ marginTop: '10px', color: '#888', fontStyle: 'italic' }}>
          La partie commence au premier coup des Blancs
        </div>
      )}
    </div>
  );
};
