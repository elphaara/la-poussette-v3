import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';

export const PousseJeu = {
  name: 'poussette',
  minPlayers: 2,
  maxPlayers: 2,
  
  setup: () => ({
    cells: Array(25).fill(null).map((_, i) => (i < 5 ? 'B' : i > 19 ? 'N' : null)),
    history: null,
    timer: [600, 600],
    gameStarted: false,
    isAI: false, // <-- Mode IA désactivé par défaut (pour le mode en ligne)
    lastTimestamp: Date.now(),
  }),

  turn: {
    minMoves: 1,
    maxMoves: 1,
    onBegin: ({ G }) => { 
      if (G.gameStarted && !G.isAI) G.lastTimestamp = Date.now();
      G.preMoveState = [...G.cells]; 
    },
    onEnd: ({ G }) => { G.history = [...G.preMoveState]; }
  },

  moves: {
    // Action pour activer l'IA et couper le timer
    toggleAI: ({ G }) => {
      G.isAI = true;
      G.gameStarted = true; // On bypass l'attente du premier coup
    },

    playAction: ({ G, ctx }, from, to) => {
      const now = Date.now();
      const player = parseInt(ctx.currentPlayer);

      // --- LOGIQUE DE VALIDATION (Tes 160 lignes de règles) ---
      if (!G.cells[from]) return INVALID_MOVE;
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (!G.cells[from].startsWith(myColor)) return INVALID_MOVE;
      
      const isPromoted = G.cells[from].includes('P');
      const diffX = (to % 5) - (from % 5);
      const diffY = Math.floor(to / 5) - Math.floor(from / 5);
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      
      if (!( (absX === absY) || (diffX === 0) || (diffY === 0) )) return INVALID_MOVE;

      const dist = Math.max(absX, absY);
      const dirX = Math.sign(diffX);
      const dirY = Math.sign(diffY);
      const opponent = ctx.currentPlayer === '0' ? 'N' : 'B';

      if (dist > 2 || (dist === 2 && !isPromoted)) return INVALID_MOVE;
      const midPos = dist === 2 ? getTargetPos(from, dirX, dirY, 1) : null;

      let nextCells = [...G.cells];

      if (dist === 1 && G.cells[to] && G.cells[to].startsWith(opponent)) {
        const vTo = getTargetPos(to, dirX, dirY, 1);
        if (!isOffBoard(vTo) && G.cells[vTo] !== null) return INVALID_MOVE;
        executePush(nextCells, from, to, vTo);
      }
      else if (dist === 2 && G.cells[to] === null && G.cells[midPos] && G.cells[midPos].startsWith(opponent)) {
        const vTo = getTargetPos(midPos, dirX, dirY, 2);
        if (!isOffBoard(vTo) && G.cells[vTo] !== null) return INVALID_MOVE;
        executePush(nextCells, from, to, vTo, midPos);
      }
      else if (dist === 2 && G.cells[to] && G.cells[to].startsWith(opponent) && G.cells[midPos] === null) {
        const vTo = getTargetPos(to, dirX, dirY, 1);
        if (!isOffBoard(vTo) && G.cells[vTo] !== null) return INVALID_MOVE;
        executePush(nextCells, from, to, vTo);
      }
      else if (G.cells[to] === null && (dist === 1 || (dist === 2 && G.cells[midPos] === null))) {
        nextCells[to] = nextCells[from];
        nextCells[from] = null;
        checkPromotion(nextCells, to);
      }
      else return INVALID_MOVE;

      if (G.history && nextCells.every((val, index) => val === G.history[index])) return INVALID_MOVE;

      // --- GESTION DU TIMER (Uniquement si pas en mode IA) ---
      if (!G.isAI) {
        if (!G.gameStarted) {
          G.gameStarted = true;
          G.timer[player] += 5;
        } else {
          const elapsed = Math.floor((now - G.lastTimestamp) / 1000);
          G.timer[player] -= elapsed;
          G.timer[player] += 5;
        }
      }

      G.cells = nextCells;
      G.lastTimestamp = Date.now();
    },

    compressPion: ({ G, ctx }, v) => {
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (!isCompressed(G, v, myColor)) return INVALID_MOVE;
      G.cells[v] = null;
    }
  },

  // --- L'IA (MCTS) ---
  ai: {
    enumerate: (G, ctx) => {
      const moves = [];
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      const isPromoted = (p) => p.includes('P');

      for (let i = 0; i < 25; i++) {
        if (G.cells[i] && G.cells[i].startsWith(myColor)) {
          const dists = isPromoted(G.cells[i]) ? [1, 2] : [1];
          const dirs = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]];
          
          dirs.forEach(([dx, dy]) => {
            dists.forEach(d => {
              const x = (i % 5) + dx * d;
              const y = Math.floor(i / 5) + dy * d;
              if (x >= 0 && x < 5 && y >= 0 && y < 5) {
                moves.push({ move: 'playAction', args: [i, y * 5 + x] });
              }
            });
          });
        }
      }
      return moves;
    }
  },

  endIf: ({ G }) => {
    if (!G.isAI) {
      if (G.timer[0] <= 0) return { winner: 'Noirs' };
      if (G.timer[1] <= 0) return { winner: 'Blancs' };
    }
    if (!G.cells.some(c => c && c.startsWith('N'))) return { winner: 'Blancs' };
    if (!G.cells.some(c => c && c.startsWith('B'))) return { winner: 'Noirs' };
  },
};

// Fonctions utilitaires (executePush, getTargetPos, isCompressed, etc. - GARDE LES TIENNES ICI)
function executePush(cells, from, to, vTo, mid = null) {
  const atk = cells[from]; const vic = cells[mid || to];
  cells[from] = null; cells[mid || to] = null;
  if (vTo !== -1) cells[vTo] = vic;
  cells[to] = atk;
  checkPromotion(cells, to);
  if (vTo !== -1) checkPromotion(cells, vTo);
}
function getTargetPos(p, dx, dy, d) {
  const x = (p % 5) + dx * d; const y = Math.floor(p / 5) + dy * d;
  return (x < 0 || x > 4 || y < 0 || y > 4) ? -1 : y * 5 + x;
}
function isOffBoard(p) { return p === -1; }
function checkPromotion(cells, p) {
  const row = Math.floor(p / 5);
  if (cells[p] === 'B' && row === 4) cells[p] = 'BP';
  if (cells[p] === 'N' && row === 0) cells[p] = 'NP';
}
function isCompressed(G, v, p) {
  const x = v % 5; const y = Math.floor(v / 5);
  const check = (dx, dy) => {
    const nx = x+dx; const ny = y+dy;
    if (nx<0||nx>4||ny<0||ny>4) return null;
    const t = G.cells[ny*5+nx];
    return t && t.startsWith(p);
  };
  const ortho = [[1,0], [-1,0], [0,1], [0,-1]];
  const diag = [[1,1], [1,-1], [-1,1], [-1,-1]];
  const sandwich = [...ortho, ...diag].some(([dx, dy]) => check(dx, dy) && check(-dx, -dy));
  const configA = ortho.some(([ox, oy]) => check(ox, oy) && diag.filter(([dx, dy]) => check(dx, dy)).length >= 2);
  const configB = diag.some(([dx, dy]) => check(dx, dy) && ortho.filter(([ox, oy]) => check(ox, oy)).length >= 2);
  return sandwich || configA || configB;
}
