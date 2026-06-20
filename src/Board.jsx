import React, { useState, useEffect } from 'react';

// =============================================================================
// Symboles des pièces : disque plein = standard, + = ortho, x = diago,
// + et x superposés = astral. On dessine ça en CSS/SVG simple plutôt qu'avec
// des émojis, pour bien distinguer les 4 types au coup d'œil.
// =============================================================================

function pieceColorOf(p) { return p ? p[0] : null; } // 'B' ou 'N'
function pieceTypeOf(p) {
  if (!p || p.length === 1) return 'standard';
  if (p[1] === 'O') return 'ortho';
  if (p[1] === 'D') return 'diago';
  if (p[1] === 'A') return 'astral';
  return 'standard';
}

function PieceSymbol({ type, isWhite }) {
  // Couleur du trait : contraste avec le disque (noir sur pion blanc, blanc sur pion noir)
  const lineColor = isWhite ? '#1a1a1a' : '#ffffff';
  if (type === 'standard') return null;

  return (
    <svg width="34" height="34" viewBox="0 0 34 34" style={{ position: 'absolute', pointerEvents: 'none' }}>
      {(type === 'ortho' || type === 'astral') && (
        <>
          <line x1="17" y1="6" x2="17" y2="28" stroke={lineColor} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="6" y1="17" x2="28" y2="17" stroke={lineColor} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}
      {(type === 'diago' || type === 'astral') && (
        <>
          <line x1="8" y1="8" x2="26" y2="26" stroke={lineColor} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="8" y1="26" x2="26" y2="8" stroke={lineColor} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function Piece({ piece }) {
  if (!piece) return null;
  const isWhite = pieceColorOf(piece) === 'B';
  const type = pieceTypeOf(piece);
  return (
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: '50%',
        background: isWhite ? '#ffffff' : '#222222',
        border: '2px solid #000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      <PieceSymbol type={type} isWhite={isWhite} />
    </div>
  );
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E'];

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
      setLocalTimes((prev) => {
        if (!prev || !G.gameStarted) return prev;
        const newTimes = [...prev];
        const active = parseInt(ctx.currentPlayer, 10);
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

  const isMyTurn = ctx.currentPlayer === playerID;
  const pendingPromotion = G.pendingPromotion;

  const onClick = (id) => {
    if (!isMyTurn || pendingPromotion) return;

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

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'Arial' }}>

      {/* Timer Adversaire */}
      <div style={{ padding: '10px 20px', fontSize: '28px', fontWeight: 'bold', borderRadius: '8px', backgroundColor: ctx.currentPlayer === (isFlipped ? '0' : '1') ? '#2c3e50' : '#f8f9fa', color: ctx.currentPlayer === (isFlipped ? '0' : '1') ? '#fff' : '#adb5bd', border: '2px solid #dee2e6', minWidth: '100px', textAlign: 'center', margin: '10px 0' }}>
        {formatTime(localTimes[isFlipped ? 0 : 1])}
      </div>

      {/* Grille de repérage A-E / 1-5 */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(5, 80px)', gridTemplateRows: 'repeat(5, 80px) 40px', margin: '10px auto', userSelect: 'none' }}>
        {(isFlipped ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0]).map((r) => (
          <React.Fragment key={r}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{r + 1}</div>
            {(isFlipped ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4]).map((c) => {
              const id = r * 5 + c;
              const isAstralTargetCell = id === 22 || id === 2; // C5 (2,4)=idx22, C1 (2,0)=idx2
              return (
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
                    cursor: isMyTurn && !pendingPromotion ? 'pointer' : 'default',
                    backgroundColor: isAstralTargetCell ? '#fff3cd' : '#fff',
                    boxShadow: selected === id ? 'inset 0 0 0 4px #3498db' : (isCompressMode ? 'inset 0 0 0 4px #e74c3c' : 'none'),
                  }}
                >
                  <Piece piece={G.cells[id]} />
                </div>
              );
            })}
          </React.Fragment>
        ))}
        <div />
        {(isFlipped ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4]).map((c) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{COL_LABELS[c]}</div>
        ))}
      </div>

      {/* Ton Timer */}
      <div style={{ padding: '10px 20px', fontSize: '28px', fontWeight: 'bold', borderRadius: '8px', backgroundColor: ctx.currentPlayer === (isFlipped ? '1' : '0') ? '#2c3e50' : '#f8f9fa', color: ctx.currentPlayer === (isFlipped ? '1' : '0') ? '#fff' : '#adb5bd', border: '2px solid #dee2e6', minWidth: '100px', textAlign: 'center', margin: '10px 0' }}>
        {formatTime(localTimes[isFlipped ? 1 : 0])}
      </div>

      <button
        onClick={() => { setIsCompressMode(!isCompressMode); setSelected(null); }}
        disabled={!isMyTurn || !!pendingPromotion}
        style={{
          marginTop: '20px',
          padding: '15px 30px',
          fontSize: '18px',
          fontWeight: 'bold',
          backgroundColor: isCompressMode ? '#e74c3c' : '#34495e',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: (isMyTurn && !pendingPromotion) ? 'pointer' : 'not-allowed',
          opacity: (isMyTurn && !pendingPromotion) ? 1 : 0.5,
        }}
      >
        {isCompressMode ? 'ANNULER COMPRESSION' : '💥 COMPRESSION'}
      </button>

      <div style={{ marginTop: '14px', fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '420px' }}>
        Disque plein = pion simple &nbsp;|&nbsp; + = Ortho &nbsp;|&nbsp; × = Diago &nbsp;|&nbsp; + et × = Astral
      </div>

      {/* Dialogue de choix de promotion (Ortho ou Diago), affiché uniquement
          pour le joueur concerné quand une promotion niveau 1 est en attente. */}
      {pendingPromotion && isMyTurn && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', textAlign: 'center', maxWidth: '360px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0 }}>Votre pion atteint la ligne opposée</h3>
            <p style={{ color: '#555' }}>Choisissez sa spécialisation :</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '18px' }}>
              <button
                onClick={() => moves.choosePromotion('ortho')}
                style={{ flex: 1, padding: '16px 10px', fontSize: '16px', fontWeight: 'bold', background: '#2c3e50', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Ortho (+)<br /><span style={{ fontWeight: 'normal', fontSize: '12px' }}>2 cases orthogonales</span>
              </button>
              <button
                onClick={() => moves.choosePromotion('diago')}
                style={{ flex: 1, padding: '16px 10px', fontSize: '16px', fontWeight: 'bold', background: '#2c3e50', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Diago (×)<br /><span style={{ fontWeight: 'normal', fontSize: '12px' }}>2 cases diagonales</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPromotion && !isMyTurn && (
        <div style={{ marginTop: '16px', padding: '10px 18px', background: '#fff3cd', borderRadius: '8px', color: '#664d03' }}>
          En attente du choix de promotion de l'adversaire…
        </div>
      )}

      {ctx.gameover && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#27ae60', color: '#fff', borderRadius: '8px', fontSize: '20px' }}>
          {ctx.gameover.draw ? 'Match nul !' : `Victoire : ${ctx.gameover.winner} !`}
        </div>
      )}
    </div>
  );
};
