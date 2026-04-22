import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';

export const PousseJeu = {
  name: 'poussette',
  minPlayers: 2,
  maxPlayers: 2,
  
  setup: () => ({
    cells: [
      'B', 'B', 'B', 'B', 'B', 
      null, null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
      'N', 'N', 'N', 'N', 'N', 
    ],
    history: null,
    timer: [600, 600], // 10 minutes
    lastTimestamp: Date.now(),
  }),

  turn: {
    minMoves: 1,
    maxMoves: 1,
    onBegin: ({ G }) => { 
      // On synchronise le début du tour pour le calcul du temps
      G.lastTimestamp = Date.now();
      G.preMoveState = [...G.cells]; 
    },
    onEnd: ({ G }) => {
      G.history = [...G.preMoveState]; 
    }
  },

  moves: {
    playAction: ({ G, ctx }, from, to) => {
      // 1. Calcul immédiat du temps consommé
      const now = Date.now();
      const player = parseInt(ctx.currentPlayer);
      const elapsed = Math.floor((now - G.lastTimestamp) / 1000);

      // 2. Vérifications de validité du coup
      if (!G.cells[from]) return INVALID_MOVE;
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (!G.cells[from].startsWith(myColor)) return INVALID_MOVE;
      
      const isPromoted = G.cells[from].includes('P');
      const diffX = (to % 5) - (from % 5);
      const diffY = Math.floor(to / 5) - Math.floor(from / 5);
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      
      const isEightDirections = (absX === absY) || (diffX === 0) || (diffY === 0);
      if (!isEightDirections) return INVALID_MOVE;

      const dist = Math.max(absX, absY);
      const dirX = Math.sign(diffX);
      const dirY = Math.sign(diffY);
      const opponent = ctx.currentPlayer === '0' ? 'N' : 'B';

      if (dist > 2 || (dist === 2 && !isPromoted)) return INVALID_MOVE;
      const midPos = dist === 2 ? getTargetPos(from, dirX, dirY, 1) : null;

      let nextCells = [...G.cells];

      // Logique des mouvements
      if (dist === 1 && G.cells[to] && G.cells[to].startsWith(opponent)) {
        const victimTarget = getTargetPos(to, dirX, dirY, 1);
        if (!isOffBoard(victimTarget) && G.cells[victimTarget] !== null) return INVALID_MOVE;
        executePush(nextCells, from, to, victimTarget);
      }
      else if (dist === 2 && G.cells[to] === null && G.cells[midPos] && G.cells[midPos].startsWith(opponent)) {
        const victimTarget = getTargetPos(midPos, dirX, dirY, 2);
        if (!isOffBoard(victimTarget) && G.cells[victimTarget] !== null) return INVALID_MOVE;
        executePush(nextCells, from, to, victimTarget, midPos);
      }
      else if (dist === 2 && G.cells[to] && G.cells[to].startsWith(opponent) && G.cells[midPos] === null) {
        const victimTarget = getTargetPos(to, dirX, dirY, 1);
        if (!isOffBoard(victimTarget) && G.cells[victimTarget] !== null) return INVALID_MOVE;
        executePush(nextCells, from, to, victimTarget);
      }
      else if (G.cells[to] === null && (dist === 1 || (dist === 2 && G.cells[midPos] === null))) {
        nextCells[to] = nextCells[from];
        nextCells[from] = null;
        checkPromotion(nextCells, to);
      }
      else return INVALID_MOVE;

      if (G.history && nextCells.every((val, index) => val === G.history[index])) {
        return INVALID_MOVE;
      }

      // --- SI LE COUP EST VALIDE : MISE À JOUR DU TIMER ---
      G.cells = nextCells;
      G.timer[player] -= elapsed;
      G.timer[player] += 5; // Bonus de 5 secondes 🚀
      G.lastTimestamp = now; // On reset pour le prochain joueur
    },

    compressPion: ({ G, ctx }, victimPos) => {
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (!isCompressed(G, victimPos, myColor)) return INVALID_MOVE;
      G.cells[victimPos] = null;
    }
  },

  endIf: ({ G }) => {
    if (G.timer[0] <= 0) return { winner: 'Noirs' };
    if (G.timer[1] <= 0) return { winner: 'Blancs' };
    if (!G.cells.some(c => c && c.startsWith('N'))) return { winner: 'Blancs' };
    if (!G.cells.some(c => c && c.startsWith('B'))) return { winner: 'Noirs' };
  },
};

// Fonctions utilitaires (Inchangées)
function executePush(cells, from, to, victimTo, mid = null) {
  const attacker = cells[from];
  const victim = cells[mid || to];
  cells[from] = null;
  cells[mid || to] = null;
  if (!isOffBoard(victimTo)) cells[victimTo] = victim;
  cells[to] = attacker;
  checkPromotion(cells, to);
  if (!isOffBoard(victimTo)) checkPromotion(cells, victimTo);
}
function getTargetPos(pos, dx, dy, dist) {
  const x = (pos % 5) + dx * dist;
  const y = Math.floor(pos / 5) + dy * dist;
  return (x < 0 || x > 4 || y < 0 || y > 4) ? -1 : y * 5 + x;
}
function isOffBoard(pos) { return pos === -1; }
function checkPromotion(cells, pos) {
  const row = Math.floor(pos / 5);
  if (cells[pos] === 'B' && row === 4) cells[pos] = 'BP';
  if (cells[pos] === 'N' && row === 0) cells[pos] = 'NP';
}
function isCompressed(G, v, p) {
  const x = v % 5; const y = Math.floor(v / 5);
  const ortho = [[1,0], [-1,0], [0,1], [0,-1]];
  const diag = [[1,1], [1,-1], [-1,1], [-1,-1]];
  const check = (dx, dy) => {
    const target = getAt(G, x+dx, y+dy);
    return target && target.startsWith(p);
  };
  const sandwich = [...ortho, ...diag].some(([dx, dy]) => check(dx, dy) && check(-dx, -dy));
  const configA = ortho.some(([ox, oy]) => check(ox, oy) && diag.filter(([dx, dy]) => check(dx, dy)).length >= 2);
  const configB = diag.some(([dx, dy]) => check(dx, dy) && ortho.filter(([ox, oy]) => check(ox, oy)).length >= 2);
  return sandwich || configA || configB;
}
function getAt(G, x, y) {
  if (x < 0 || x > 4 || y < 0 || y > 4) return null;
  return G.cells[y * 5 + x];
}
