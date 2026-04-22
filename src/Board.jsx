import React, { useState, useEffect } from 'react';

export const PousseBoard = ({ ctx, G, moves, playerID }) => {
  const [selected, setSelected] = useState(null);
  
  // Détermine si on affiche le plateau à l'envers (pour le joueur Noir)
  const isFlipped = playerID === '1'; 

  // --- LOGIQUE DU TIMER VISUEL ---
  const [localTimes, setLocalTimes] = useState(G.timer || [600, 600]);

  // Synchronisation avec les données du serveur
  useEffect(() => {
    if (G.timer) {
      setLocalTimes([...G.timer]);
    }
  }, [G.timer]);

  // Décompte chaque seconde (sauf en mode IA)
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimes(prev => {
        // On arrête le chrono si : pas de données, jeu non lancé, ou mode IA activé
        if (!prev || !G.gameStarted || G.isAI) return prev; 

        const newTimes = [...prev];
        const active = parseInt(ctx.currentPlayer);
        
        if (newTimes[active] > 0 && !ctx.gameover) {
          newTimes[active] -= 1;
        }
        return newTimes;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [ctx.currentPlayer, ctx.gameover, G.gameStarted, G.isAI]);

  // Formatage du temps MM:SS
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
      if (selected !== id) {
        moves.playAction(selected, id);
      }
      setSelected(null);
    }
  };

  // --- STYLE DES PIÈCES (Normales et Promues) ---
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
    
    // BP = Blanc Promu, NP = Noir Promu
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

  // --- CONSTRUCTION DE LA GRILLE ---
  const renderBoard = () => {
    const columns = ['A', 'B', 'C', 'D', 'E'];
    // Ordre des lignes et colonnes selon la perspective du joueur
    const rowOrder = isFlipped ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    const colOrder = isFlipped ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4];
    
    let board = [];

    rowOrder.forEach(r => {
      // Coordonnée chiffre (à gauche)
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
              // Bordure bleue quand on sélectionne une pièce
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

    // Dernière ligne : Coordonnées lettres
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

  // --- STYLE DES BOXES DE TEMPS ---
  const clockBoxStyle = (playerIdx) => {
    const isActive = ctx.currentPlayer === String(playerIdx);
    return {
      padding: '10px 30px',
      fontSize: '32px',
      fontWeight: 'bold',
      borderRadius: '8px',
      // Bleu foncé si c'est à son tour, gris clair sinon
      backgroundColor: isActive ? '#2c3e50' : '#f8f9fa',
      color: isActive ? '#fff' : '#adb5bd',
      border: isActive ? '2px solid #3498db' : '2px solid #dee2e6',
      margin: '15px',
      minWidth: '120px',
      textAlign: 'center',
      transition: 'all 0.3s',
      // On cache complètement si on est en mode IA
      display: G.isAI ? 'none' : 'block'
    };
  };

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Timer de l'adversaire */}
      <div style={clockBoxStyle(isFlipped ? 0 : 1)}>
        {formatTime(localTimes[isFlipped ? 0 : 1])}
      </div>

      {/* Plateau de jeu 5x5 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '40px repeat(5, 80px)', 
        gridTemplateRows: 'repeat(5, 80px) 40px',
        backgroundColor: '#fff'
      }}>
        {renderBoard()}
      </div>

      {/* Ton Timer */}
      <div style={clockBoxStyle(isFlipped ? 1 : 0)}>
        {formatTime(localTimes[isFlipped ? 1 : 0])}
      </div>

      {/* Zone de contrôle IA */}
      <div style={{ marginTop: '20px' }}>
        {!G.isAI ? (
          <button 
            onClick={() => moves.toggleAI()} 
            style={{ padding: '12px 24px', background: '#9b59b6', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🤖 Jouer contre l'IA (Sans Timer)
          </button>
        ) : (
          <div style={{ textAlign: 'center' }}>
             <p style={{ color: '#9b59b6', fontWeight: 'bold', marginBottom: '10px' }}>MODE IA ACTIVÉ</p>
             {/* Le bouton pour forcer l'ordinateur à jouer son coup */}
             <button 
                onClick={() => {/* L'IA s'active via boardgame.io automatiquement ou via ce bouton */}} 
                style={{ padding: '10px 20px', background: '#34495e', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
             >
               Lancer l'IA
             </button>
          </div>
        )}
      </div>

      {/* Victoire */}
      {ctx.gameover && (
        <div style={{ marginTop: '20px', padding: '15px 40px', backgroundColor: '#27ae60', color: '#fff', borderRadius: '8px', fontSize: '24px', fontWeight: 'bold' }}>
          Victoire : {ctx.gameover.winner} !
        </div>
      )}
    </div>
  );
};
