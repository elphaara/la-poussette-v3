import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';

export const PousseJeu = {
  name: 'poussette',
  minPlayers: 2,
  maxPlayers: 2,
  // Configuration initiale [cite: 2, 4, 5]
  setup: () => ({
    cells: [
      'B', 'B', 'B', 'B', 'B', 
      null, null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
      'N', 'N', 'N', 'N', 'N', 
    ],
    history: null,
  }),

  // Gestion des tours et règle de la poussée inverse [cite: 16, 28]
  turn: {
    minMoves: 1,
    maxMoves: 1,
    onBegin: ({ G }) => { G.preMoveState = [...G.cells]; },
    onEnd: ({ G }) => { G.history = [...G.preMoveState]; }
  },

  moves: {
    // Actions de déplacement et de poussée [cite: 17, 20]
    playAction: ({ G, ctx }, from, to) => {
      if (!G.cells[from]) return INVALID_MOVE;
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (!G.cells[from].startsWith(myColor)) return INVALID_MOVE;
      
      const isPromoted = G.cells[from].includes('P');
      const dist = getDistance(from, to);
      const diffX = (to % 5) - (from % 5);
      const diffY = Math.floor(to / 5) - Math.floor(from / 5);
      const dirX = Math.sign(diffX);
      const dirY = Math.sign(diffY);
      const opponent = ctx.currentPlayer === '0' ? 'N' : 'B';

      // Validation des distances [cite: 18, 19]
      if (dist > 2 || (dist === 2 && !isPromoted)) return INVALID_MOVE;
      const midPos = dist === 2 ? getTargetPos(from, dirX, dirY, 1) : null;

      let nextCells = [...G.cells];

      // 1. Poussée normale [cite: 24]
      if (dist === 1 && G.cells[to] && G.cells[to].startsWith(opponent)) {
        const victimTarget = getTargetPos(to, dirX, dirY, 1);
        if (!isOffBoard(victimTarget) && G.cells[victimTarget] !== null) return INVALID_MOVE;
        executePush(nextCells, from, to, victimTarget);
      }
      
      // 2. Poussée de 2 cases (Promu) [cite: 26]
      else if (dist === 2 && G.cells[to] === null && G.cells[midPos] && G.cells[midPos].startsWith(opponent)) {
        const victimTarget = getTargetPos(midPos, dirX, dirY, 2);
        if (!isOffBoard(victimTarget) && G.cells[victimTarget] !== null) return INVALID_MOVE;
        executePush(nextCells, from, to, victimTarget, midPos);
      }

      // 3. Élan (Promu) [cite: 27]
      else if (dist === 2 && G.cells[to] && G.cells[to].startsWith(opponent) && G.cells[midPos] === null) {
        const victimTarget = getTargetPos(to, dirX, dirY, 1);
        if (!isOffBoard(victimTarget) && G.cells[victimTarget] !== null) return INVALID_MOVE;
        executePush(nextCells, from, to, victimTarget);
      }

      // 4. Déplacement simple
      else if (G.cells[to] === null && (dist === 1 || (dist === 2 && G.cells[midPos] === null))) {
        nextCells[to] = nextCells[from];
        nextCells[from] = null;
        checkPromotion(nextCells, to);
      }
      else return INVALID_MOVE;

      // Test de la règle de la poussée inverse (Ko) [cite: 28]
      if (G.history && nextCells.every((val, index) => val === G.history[index])) {
        return INVALID_MOVE;
      }

      G.cells = nextCells;
    },

    // Action de capture manuelle [cite: 29]
    compressPion: ({ G, ctx }, victimPos) => {
      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (!isCompressed(G, victimPos, myColor)) return INVALID_MOVE;
      G.cells[victimPos] = null;
    }
  },

  // Condition de victoire [cite: 8]
  endIf: ({ G }) => {
    if (!G.cells.some(c => c && c.startsWith('N'))) return { winner: 'Blancs' };
    if (!G.cells.some(c => c && c.startsWith('B'))) return { winner: 'Noirs' };
  },
};

// --- LOGIQUE MATHÉMATIQUE ---

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

function getDistance(f, t) {
  return Math.max(Math.abs((f % 5) - (t % 5)), Math.abs(Math.floor(f / 5) - Math.floor(t / 5)));
}

function getTargetPos(pos, dx, dy, dist) {
  const x = (pos % 5) + dx * dist;
  const y = Math.floor(pos / 5) + dy * dist;
  return (x < 0 || x > 4 || y < 0 || y > 4) ? -1 : y * 5 + x;
}

function isOffBoard(pos) { return pos === -1; }

function checkPromotion(cells, pos) {
  const row = Math.floor(pos / 5);
  // Promotion ligne 5 pour Blancs, ligne 1 pour Noirs [cite: 11, 12, 13]
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
  // Sandwich et Y [cite: 31, 32, 33, 34]
  const sandwich = [...ortho, ...diag].some(([dx, dy]) => check(dx, dy) && check(-dx, -dy));
  const configA = ortho.some(([ox, oy]) => check(ox, oy) && diag.filter(([dx, dy]) => check(dx, dy)).length >= 2);
  const configB = diag.some(([dx, dy]) => check(dx, dy) && ortho.filter(([ox, oy]) => check(ox, oy)).length >= 2);
  return sandwich || configA || configB;
}

function getAt(G, x, y) {
  if (x < 0 || x > 4 || y < 0 || y > 4) return null;
  return G.cells[y * 5 + x];
}