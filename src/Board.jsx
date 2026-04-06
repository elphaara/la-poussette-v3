import React, { useState, useEffect } from 'react'; //

export function PousseBoard({ ctx, G, moves }) {
  const [selected, setSelected] = useState(null);
  const [actionMode, setActionMode] = useState('move');

  // NOUVEAU : Remet l'action par défaut ('move') au début de CHAQUE tour
  useEffect(() => {
    // Cette fonction s'exécute quand ctx.turn change
    setActionMode('move');
    setSelected(null); // On désélectionne aussi par précaution
  }, [ctx.turn]); // Surveillance du numéro de tour

  const onClick = (id) => {
    const myPawn = ctx.currentPlayer === '0' ? 'B' : 'N';
    const opponent = ctx.currentPlayer === '0' ? 'N' : 'B';

    // Mode COMPRESSION (Action manuelle)
    if (actionMode === 'compress') {
      if (G.cells[id] && G.cells[id].startsWith(opponent)) {
        moves.compressPion(id); // Action unique : le tour s'arrêtera ici
      }
      return; // On arrête là pour cette action
    }

    // Mode NORMAL (Sélection -> Mouvement/Poussée)
    if (selected === null) {
      if (G.cells[id] && G.cells[id].startsWith(myPawn)) setSelected(id);
    } else {
      if (id === selected) {
        setSelected(null); // Désélection
      } else {
        // Envoie toujours les deux positions, le moteur décide de l'action
        // Cela gère le déplacement simple, l'élan, et les deux types de poussée
        moves.playAction(selected, id); 
        setSelected(null); // Le tour s'arrête ici après l'action validée
      }
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>La Poussette V3</h1>
      <h3 style={{ color: ctx.currentPlayer === '0' ? '#333' : '#666', borderBottom: '2px solid' + (ctx.currentPlayer === '0' ? '#fff' : '#000') }}>
        Tour : {ctx.currentPlayer === '0' ? 'Blancs (⚪)' : 'Noirs (⚫)'}
      </h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button onClick={() => setActionMode('move')} style={{
          padding: '10px 20px', fontSize: '16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #333',
          backgroundColor: actionMode === 'move' ? '#ffeb3b' : '#eee', // Jaune si sélectionné
          fontWeight: actionMode === 'move' ? 'bold' : 'normal',
        }}>
          🕹️ Déplacer / Pousser
        </button>
        <button onClick={() => setActionMode('compress')} style={{
          padding: '10px 20px', fontSize: '16px', borderRadius: '8px', cursor: 'pointer', marginLeft: '10px', border: '1px solid #333',
          backgroundColor: actionMode === 'compress' ? '#ffeb3b' : '#eee', // Jaune si sélectionné
          fontWeight: actionMode === 'compress' ? 'bold' : 'normal',
        }}>
          💥 Compresser
        </button>
      </div>

      <div style={{ display: 'inline-block', border: '5px solid #444', borderRadius: '4px', backgroundColor: '#bbb', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
        {Array(5).fill().map((_, i) => (
          <div key={4-i} style={{ display: 'flex' }}>
            {Array(5).fill().map((_, j) => {
              const id = 5 * (4-i) + j;
              const isSelected = selected === id;
              const cellValue = G.cells[id];
              const isPromoted = cellValue && cellValue.includes('P');

              return (
                <div key={id} onClick={() => onClick(id)} style={{
                  width: '75px', height: '75px', border: '1px solid #666',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '50px', cursor: 'pointer', position: 'relative',
                  backgroundColor: isSelected ? '#fff3cd' : ((id + (4-i)) % 2 === 0 ? '#eee' : '#ddd') // Damier
                }}>
                  {cellValue && (cellValue.startsWith('B') ? '⚪' : '⚫')}
                  
                  {/* ÉTOILE CENTRÉE ET JAUNE (GOLD) */}
                  {isPromoted && 
                    <span style={{
                      position:'absolute', 
                      fontSize:'28px', 
                      color:'gold', // Jaune
                      top: '50%', // Centré verticalement
                      left: '50%', // Centré horizontalement
                      transform: 'translate(-50%, -50%)', // Ajustement exact au centre
                      pointerEvents: 'none', // Clique au travers de l'étoile
                    }}>⭐</span>
                  }
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {ctx.gameover && <div style={{marginTop: '20px', fontSize: '28px', color: '#27ae60', fontWeight: 'bold', padding: '10px', backgroundColor: '#e9f7ef', borderRadius: '8px'}}>🏆 Victoire : {ctx.gameover.winner} !</div>}
    </div>
  );
}