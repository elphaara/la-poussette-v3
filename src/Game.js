import { INVALID_MOVE } from 'boardgame.io/dist/cjs/core.js';

// =============================================================================
// Encodage des pièces (chaîne de caractères, comme dans l'ancien jeu) :
//   'B'   = Blanc standard       'N'   = Noir standard
//   'BO'  = Blanc Ortho (+)      'NO'  = Noir Ortho (+)
//   'BD'  = Blanc Diago (x)      'ND'  = Noir Diago (x)
//   'BA'  = Blanc Astral         'NA'  = Noir Astral
//   null  = case vide
//
// Index de case = r * 5 + c, avec c = colonne (0=A..4=E), r = ligne (0=ligne1..4=ligne5)
// =============================================================================

const SIZE = 5;

const ORTHO_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ALL_DIRS = [...ORTHO_DIRS, ...DIAG_DIRS];

function idx(c, r) { return r * SIZE + c; }
function colOf(i) { return i % SIZE; }
function rowOf(i) { return Math.floor(i / SIZE); }
function inBounds(c, r) { return c >= 0 && c < SIZE && r >= 0 && r < SIZE; }

function pieceColor(p) { return p ? p[0] : null; } // 'B' ou 'N'
function pieceType(p) {
  // 'B' -> standard, 'BO' -> ortho, 'BD' -> diago, 'BA' -> astral
  if (!p || p.length === 1) return 'standard';
  if (p[1] === 'O') return 'ortho';
  if (p[1] === 'D') return 'diago';
  if (p[1] === 'A') return 'astral';
  return 'standard';
}
function makePiece(color, type) {
  if (type === 'standard') return color;
  if (type === 'ortho') return color + 'O';
  if (type === 'diago') return color + 'D';
  if (type === 'astral') return color + 'A';
  return color;
}

// -----------------------------------------------------------------------
// Génération des specs de mouvement (direction, distance) selon le type
// -----------------------------------------------------------------------
function movementSpecs(type) {
  const specs = ALL_DIRS.map((d) => [d, 1]);
  if (type === 'ortho') ORTHO_DIRS.forEach((d) => specs.push([d, 2]));
  else if (type === 'diago') DIAG_DIRS.forEach((d) => specs.push([d, 2]));
  else if (type === 'astral') ALL_DIRS.forEach((d) => specs.push([d, 2]));
  return specs;
}

// Chemin libre entre src et dst (en ligne droite, sans pion intermédiaire)
function pathIsClear(cells, c0, r0, c1, r1) {
  const dc = c1 - c0, dr = r1 - r0;
  const stepC = dc === 0 ? 0 : Math.sign(dc);
  const stepR = dr === 0 ? 0 : Math.sign(dr);
  const dist = Math.max(Math.abs(dc), Math.abs(dr));
  for (let i = 1; i < dist; i++) {
    if (cells[idx(c0 + stepC * i, r0 + stepR * i)] !== null) return false;
  }
  return true;
}

// Vérifie que les cases de destination d'un pion poussé sont valides
// (vides si sur le plateau ; seule la DERNIÈRE peut être hors plateau = élimination)
function pushDestinationsValid(cells, destinations) {
  for (let i = 0; i < destinations.length; i++) {
    const [c, r] = destinations[i];
    if (inBounds(c, r)) {
      if (cells[idx(c, r)] !== null) return false;
    } else if (i !== destinations.length - 1) {
      return false;
    }
  }
  return true;
}

// -----------------------------------------------------------------------
// Liste de toutes les actions légales pour un pion donné à la position `from`
// Chaque action : { kind: 'move'|'push', from, to, enemyFrom?, enemyToList? }
// -----------------------------------------------------------------------
function actionsForPiece(cells, from, history) {
  const piece = cells[from];
  if (!piece) return [];
  const color = pieceColor(piece);
  const type = pieceType(piece);
  const c0 = colOf(from), r0 = rowOf(from);
  const actions = [];
  const seen = new Set();

  for (const [[dc, dr], dist] of movementSpecs(type)) {
    // 1) Déplacement simple
    const dc1 = c0 + dc * dist, dr1 = r0 + dr * dist;
    if (inBounds(dc1, dr1)) {
      const to = idx(dc1, dr1);
      if (cells[to] === null && pathIsClear(cells, c0, r0, dc1, dr1)) {
        const key = `move|${to}`;
        if (!seen.has(key)) {
          seen.add(key);
          actions.push({ kind: 'move', from, to });
        }
      }
    }

    // 2) Poussée directe
    const adjC = c0 + dc, adjR = r0 + dr;
    if (inBounds(adjC, adjR)) {
      const adj = idx(adjC, adjR);
      const adjPiece = cells[adj];
      if (adjPiece && pieceColor(adjPiece) !== color) {
        if (dist === 1) {
          const pushedTo = [adjC + dc, adjR + dr];
          if (pushDestinationsValid(cells, [pushedTo])) {
            const simulated = simulatePush(cells, from, adj, adj, [pushedTo]);
            if (!wouldRestorePrevious(simulated, history)) {
              const key = `push1|${adj}`;
              if (!seen.has(key)) {
                seen.add(key);
                actions.push({ kind: 'push', from, to: adj, enemyFrom: adj, enemyToList: [pushedTo] });
              }
            }
          }
        } else if (dist === 2) {
          const moverDest = [c0 + dc * 2, r0 + dr * 2];
          const enemyDest1 = [adjC + dc, adjR + dr];
          const enemyDest2 = [adjC + dc * 2, adjR + dr * 2];
          if (
            moverDest[0] === enemyDest1[0] && moverDest[1] === enemyDest1[1] &&
            pushDestinationsValid(cells, [enemyDest1, enemyDest2])
          ) {
            const to = idx(moverDest[0], moverDest[1]);
            const simulated = simulatePush(cells, from, adj, to, [enemyDest1, enemyDest2]);
            if (!wouldRestorePrevious(simulated, history)) {
              const key = `push2|${to}`;
              if (!seen.has(key)) {
                seen.add(key);
                actions.push({ kind: 'push', from, to, enemyFrom: adj, enemyToList: [enemyDest1, enemyDest2] });
              }
            }
          }
        }
      }
    }

    // 3) Élan (distance 1 case vide, puis ennemi)
    if (dist === 2) {
      const midC = c0 + dc, midR = r0 + dr;
      const farC = c0 + dc * 2, farR = r0 + dr * 2;
      if (inBounds(midC, midR) && inBounds(farC, farR)) {
        const mid = idx(midC, midR);
        const far = idx(farC, farR);
        if (cells[mid] === null && cells[far] && pieceColor(cells[far]) !== color) {
          const enemyDest = [farC + dc, farR + dr];
          if (pushDestinationsValid(cells, [enemyDest])) {
            const simulated = simulatePush(cells, from, far, far, [enemyDest]);
            if (!wouldRestorePrevious(simulated, history)) {
              const key = `elan|${far}`;
              if (!seen.has(key)) {
                seen.add(key);
                actions.push({ kind: 'push', from, to: far, enemyFrom: far, enemyToList: [enemyDest] });
              }
            }
          }
        }
      }
    }
  }

  return actions;
}

// Simule une poussée sur une copie du plateau (utilisé pour tester la règle
// "interdiction de restaurer la position précédente")
function simulatePush(cells, from, enemyFrom, moverTo, enemyToList) {
  const sim = cells.slice();
  const mover = sim[from];
  const enemy = sim[enemyFrom];
  sim[from] = null;
  sim[enemyFrom] = null;
  const finalEnemy = enemyToList[enemyToList.length - 1];
  if (inBounds(finalEnemy[0], finalEnemy[1])) {
    sim[idx(finalEnemy[0], finalEnemy[1])] = enemy;
  }
  sim[moverTo] = mover;
  return sim;
}

function wouldRestorePrevious(simulatedCells, history) {
  if (!history) return false;
  return simulatedCells.every((v, i) => v === history[i]);
}

// -----------------------------------------------------------------------
// Compression : teste les 12 configurations du règlement
// (4 sandwichs + 4 "Y" config A + 4 "Y" config B)
// -----------------------------------------------------------------------
function isValidCompression(cells, targetIdx, attackerColor) {
  const target = cells[targetIdx];
  if (!target || pieceColor(target) === attackerColor) return false;

  const c = colOf(targetIdx), r = rowOf(targetIdx);
  const at = (dc, dr) => {
    if (!inBounds(c + dc, r + dr)) return false;
    const p = cells[idx(c + dc, r + dr)];
    return !!p && pieceColor(p) === attackerColor;
  };

  const aN = at(0, -1), aS = at(0, 1), aE = at(1, 0), aW = at(-1, 0);
  const aNE = at(1, -1), aNW = at(-1, -1), aSE = at(1, 1), aSW = at(-1, 1);

  // Sandwich (2 pions alignés de part et d'autre)
  if ((aN && aS) || (aE && aW) || (aSE && aNW) || (aNE && aSW)) return true;
  // Y config A : 1 orthogonal + 2 diagonaux opposés
  if ((aN && aSE && aSW) || (aS && aNE && aNW) || (aE && aNW && aSW) || (aW && aNE && aSE)) return true;
  // Y config B : 1 diagonal + 2 orthogonaux opposés
  if ((aNE && aS && aW) || (aNW && aS && aE) || (aSE && aN && aW) || (aSW && aN && aE)) return true;

  return false;
}

// -----------------------------------------------------------------------
// Promotion : niveau 1 (standard -> ortho/diago au choix du joueur) et
// niveau 2 ("retour aux sources" -> astral, automatique)
// -----------------------------------------------------------------------
function needsPromotionChoice(cells, position) {
  const p = cells[position];
  if (!p || pieceType(p) !== 'standard') return false;
  const color = pieceColor(p);
  const row = rowOf(position);
  if (color === 'B' && row === 4) return true;
  if (color === 'N' && row === 0) return true;
  return false;
}

function applyAutoPromotion(cells, position) {
  const p = cells[position];
  if (!p) return;
  const color = pieceColor(p);
  const type = pieceType(p);
  const row = rowOf(position);

  if (type === 'ortho' || type === 'diago') {
    if (color === 'B' && row === 0) cells[position] = makePiece('B', 'astral');
    else if (color === 'N' && row === 4) cells[position] = makePiece('N', 'astral');
  }
}

// -----------------------------------------------------------------------
// Conditions de victoire
// -----------------------------------------------------------------------
function checkEliminationWinner(cells) {
  let white = 0, black = 0;
  for (const p of cells) {
    if (p) { if (pieceColor(p) === 'B') white++; else black++; }
  }
  if (white === 0) return 'N';
  if (black === 0) return 'B';
  return null;
}

function checkAstralWinner(cells, playerAboutToMoveColor) {
  // "au début de son tour" : on vérifie pour le joueur dont c'est le tour
  if (playerAboutToMoveColor === 'B') {
    const p = cells[idx(2, 4)]; // C5
    if (p === 'BA') return 'B';
  } else {
    const p = cells[idx(2, 0)]; // C1
    if (p === 'NA') return 'N';
  }
  return null;
}

function positionKey(cells) {
  return cells.map((c) => c || '_').join(',');
}

// =============================================================================
// Définition du jeu boardgame.io
// =============================================================================

export const PousseJeu = {
  name: 'poussette',
  minPlayers: 2,
  maxPlayers: 2,

  setup: () => ({
    cells: Array(25).fill(null).map((_, i) => {
      const r = rowOf(i);
      if (r === 0) return 'B';
      if (r === 4) return 'N';
      return null;
    }),
    history: null,              // plateau juste avant le dernier coup (anti-répétition de poussée)
    positionCounts: {},         // clé de position -> nombre d'occurrences (nul au bout de 3)
    pendingPromotion: null,     // { position } si une promotion niveau 1 est en attente de choix
    gameWinner: null,           // 'B' ou 'N'
    gameDraw: false,
    timer: [600, 600],
    gameStarted: false,
    lastTimestamp: Date.now(),
  }),

  turn: {
    // NB : pas de minMoves/maxMoves ici, volontairement. Avec maxMoves: 1,
    // boardgame.io termine automatiquement le tour dès que UN move est joué
    // — y compris playAction quand celui-ci amène un pion sur sa ligne de
    // promotion et laisse G.pendingPromotion en attente. Le tour passait
    // alors à l'adversaire AVANT que choosePromotion ait pu être joué par
    // le bon joueur, ce qui affichait le dialogue de promotion chez le
    // mauvais joueur (qui ne pouvait évidemment pas cliquer dessus, son
    // move étant rejeté car ce n'était plus son tour).
    //
    // La fin de tour est désormais entièrement pilotée à la main via
    // events.endTurn() dans finalizeTurn() : un coup normal (move/push/
    // compression) termine le tour immédiatement, mais un coup qui
    // déclenche une promotion laisse le tour ouvert pour que le MÊME
    // joueur puisse ensuite jouer choosePromotion avant que la main ne
    // passe à l'adversaire.
    onBegin: ({ G }) => {
      if (G.gameStarted) G.lastTimestamp = Date.now();
      G.preMoveState = G.cells.slice();
    },
    onEnd: ({ G }) => {
      G.history = G.preMoveState;
    },
  },

  moves: {
    // from / to sont des index 0-24
    playAction: ({ G, ctx, events }, from, to) => {
      if (G.pendingPromotion) return INVALID_MOVE; // un choix de promotion est en attente

      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      const piece = G.cells[from];
      if (!piece || pieceColor(piece) !== myColor) return INVALID_MOVE;

      const legalActions = actionsForPiece(G.cells, from, G.history);
      const action = legalActions.find((a) => a.to === to);
      if (!action) return INVALID_MOVE;

      const nextCells = G.cells.slice();
      const movedPositions = [];

      if (action.kind === 'move') {
        nextCells[action.to] = nextCells[action.from];
        nextCells[action.from] = null;
        movedPositions.push(action.to);
      } else {
        // push
        const mover = nextCells[action.from];
        const enemy = nextCells[action.enemyFrom];
        nextCells[action.from] = null;
        nextCells[action.enemyFrom] = null;
        const finalEnemyPos = action.enemyToList[action.enemyToList.length - 1];
        if (inBounds(finalEnemyPos[0], finalEnemyPos[1])) {
          const enemyIdx = idx(finalEnemyPos[0], finalEnemyPos[1]);
          nextCells[enemyIdx] = enemy;
          movedPositions.push(enemyIdx);
        }
        nextCells[action.to] = mover;
        movedPositions.push(action.to);
      }

      G.cells = nextCells;

      // Promotions : niveau 2 (automatique) tout de suite ; niveau 1
      // (choix Ortho/Diago) ne propose un choix interactif que pour les
      // pions DU JOUEUR ACTIF. Un pion ADVERSE peut être amené sur sa
      // propre ligne de promotion par une poussée ou un élan : dans ce cas
      // (rare), boardgame.io ne permettrait pas à l'adversaire de
      // soumettre un move hors de son tour, donc on applique une
      // spécialisation par défaut (Diago) automatiquement plutôt que de
      // bloquer la partie. Seul le joueur qui vient de jouer reçoit le
      // choix interactif, et seulement pour ses propres pièces.
      let promotionPending = false;
      for (const pos of movedPositions) {
        if (!G.cells[pos]) continue;
        if (needsPromotionChoice(G.cells, pos)) {
          const pieceOwner = pieceColor(G.cells[pos]);
          if (pieceOwner === myColor) {
            G.pendingPromotion = { position: pos };
            promotionPending = true;
          } else {
            // Pion adverse poussé sur sa ligne de promotion : choix par
            // défaut automatique (pas de blocage de partie possible).
            G.cells[pos] = makePiece(pieceOwner, 'diago');
          }
        } else {
          applyAutoPromotion(G.cells, pos);
        }
      }

      updateTimer(G, ctx, parseInt(ctx.currentPlayer, 10));

      if (!promotionPending) {
        finalizeTurn(G, ctx, events);
      }
      // Si une promotion est en attente, le tour ne se termine pas tout de
      // suite : on attend le move `choosePromotion` du même joueur.
    },

    choosePromotion: ({ G, ctx, events }, chosenType) => {
      if (!G.pendingPromotion) return INVALID_MOVE;
      if (chosenType !== 'ortho' && chosenType !== 'diago') return INVALID_MOVE;

      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      const { position } = G.pendingPromotion;
      const piece = G.cells[position];
      if (!piece || pieceColor(piece) !== myColor) return INVALID_MOVE;

      G.cells[position] = makePiece(myColor, chosenType);
      G.pendingPromotion = null;

      finalizeTurn(G, ctx, events);
    },

    compressPion: ({ G, ctx, events }, targetPos) => {
      if (G.pendingPromotion) return INVALID_MOVE;

      const myColor = ctx.currentPlayer === '0' ? 'B' : 'N';
      if (!isValidCompression(G.cells, targetPos, myColor)) return INVALID_MOVE;

      const nextCells = G.cells.slice();
      nextCells[targetPos] = null;
      G.cells = nextCells;

      updateTimer(G, ctx, parseInt(ctx.currentPlayer, 10));

      // Une compression ne déclenche jamais de promotion (elle ne fait que
      // retirer un pion), donc le tour se termine toujours immédiatement
      // après — sauf si la partie est déjà terminée (élimination/nul/
      // victoire astrale détectés dans finalizeTurnAfterAction).
      finalizeTurnAfterAction(G, ctx);
      if (!G.gameWinner && !G.gameDraw) {
        events.endTurn();
      }
    },
  },

  endIf: ({ G }) => {
    if (G.timer[0] <= 0) return { winner: 'Noirs' };
    if (G.timer[1] <= 0) return { winner: 'Blancs' };
    if (G.gameWinner === 'B') return { winner: 'Blancs' };
    if (G.gameWinner === 'N') return { winner: 'Noirs' };
    if (G.gameDraw) return { draw: true };
  },
};

// -----------------------------------------------------------------------
// Helpers internes (timer, fin de tour, conditions de victoire)
// -----------------------------------------------------------------------

function updateTimer(G, ctx, player) {
  const now = Date.now();
  if (!G.gameStarted) {
    G.gameStarted = true;
    G.timer[player] += 5;
  } else {
    const elapsed = Math.floor((now - G.lastTimestamp) / 1000);
    G.timer[player] -= elapsed;
    G.timer[player] += 5;
  }
  G.lastTimestamp = now;
}

// Appelé une fois le coup (move/push) ET une éventuelle promotion réglés :
// vérifie élimination, répétition, puis passe la main, puis vérifie la
// victoire astrale pour le joueur qui devient actif.
function finalizeTurn(G, ctx, events) {
  finalizeTurnAfterAction(G, ctx);
  if (!G.gameWinner && !G.gameDraw) {
    events.endTurn();
  }
}

function finalizeTurnAfterAction(G, ctx) {
  const elimWinner = checkEliminationWinner(G.cells);
  if (elimWinner) {
    G.gameWinner = elimWinner;
    return;
  }

  const key = positionKey(G.cells);
  G.positionCounts[key] = (G.positionCounts[key] || 0) + 1;
  if (G.positionCounts[key] >= 3) {
    G.gameDraw = true;
    return;
  }

  // Détermine le joueur qui va devenir actif après ce coup, pour la
  // vérification de victoire astrale "au début de son tour".
  const nextColor = ctx.currentPlayer === '0' ? 'N' : 'B';
  const astralWinner = checkAstralWinner(G.cells, nextColor);
  if (astralWinner) {
    G.gameWinner = astralWinner;
  }
}
