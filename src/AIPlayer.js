/**
 * AIPlayer.js — Moteur MCTS (Monte Carlo Tree Search) en JavaScript.
 *
 * Complètement indépendant de boardgame.io et de Game.js.
 * S'utilise uniquement côté client dans Board.jsx pour le mode solo contre l'IA.
 * Le jeu en ligne (multijoueur) n'est pas du tout affecté.
 *
 * Usage :
 *   import { chooseMCTSAction } from './AIPlayer.js';
 *   const action = chooseMCTSAction(cells, history, aiColor, timeBudgetMs);
 *   // action = { kind: 'playAction', from, to }
 *             | { kind: 'compressPion', target }
 *             | { kind: 'choosePromotion', type }
 *             | null
 */

// =============================================================================
// CONSTANTES (dupliquées ici pour indépendance totale vis-à-vis de Game.js)
// =============================================================================

const SIZE = 5;
const ORTHO_DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
const DIAG_DIRS  = [[1,1],[1,-1],[-1,1],[-1,-1]];
const ALL_DIRS   = [...ORTHO_DIRS, ...DIAG_DIRS];

const PIECE_VALUE = { standard: 100, ortho: 160, diago: 160, astral: 260 };
const UCB_C = 1.5;
const MAX_ROLLOUT = 100;

function idx(c, r) { return r * SIZE + c; }
function col(i)    { return i % SIZE; }
function row(i)    { return Math.floor(i / SIZE); }
function inB(c, r) { return c >= 0 && c < SIZE && r >= 0 && r < SIZE; }

function pcol(p) { return p ? p[0] : null; }   // 'B' ou 'N'
function ptyp(p) {
  if (!p || p.length === 1) return 'standard';
  if (p[1] === 'O') return 'ortho';
  if (p[1] === 'D') return 'diago';
  if (p[1] === 'A') return 'astral';
  return 'standard';
}
function opp(color) { return color === 'B' ? 'N' : 'B'; }

function specs(p) {
  const t = ptyp(p);
  const s = ALL_DIRS.map(d => [d, 1]);
  if (t === 'ortho')  ORTHO_DIRS.forEach(d => s.push([d, 2]));
  if (t === 'diago')  DIAG_DIRS.forEach(d => s.push([d, 2]));
  if (t === 'astral') ALL_DIRS.forEach(d => s.push([d, 2]));
  return s;
}

// =============================================================================
// GÉNÉRATION DES COUPS (représentation interne légère)
// Chaque coup : { kind, from?, to?, enemyFrom?, enemyFinalRC?, target?, type? }
// =============================================================================

function pathClear(cells, c0, r0, c1, r1) {
  const dc = c1-c0, dr = r1-r0;
  const sc = dc===0?0:Math.sign(dc), sr = dr===0?0:Math.sign(dr);
  const dist = Math.max(Math.abs(dc), Math.abs(dr));
  for (let i = 1; i < dist; i++)
    if (cells[idx(c0+sc*i, r0+sr*i)] !== null) return false;
  return true;
}

function pushOK(cells, dests) {
  for (let i = 0; i < dests.length; i++) {
    const [c, r] = dests[i];
    if (inB(c, r)) { if (cells[idx(c,r)] !== null) return false; }
    else if (i !== dests.length-1) return false;
  }
  return true;
}

function wouldRestore(cells, history, fp, md, ep, ed) {
  if (!history) return false;
  const sim = cells.slice();
  const mover = sim[fp]; sim[fp] = null;
  const enemy = sim[ep]; sim[ep] = null;
  const [fc, fr] = ed[ed.length-1];
  if (inB(fc, fr)) sim[idx(fc,fr)] = enemy;
  sim[md] = mover;
  return sim.every((v, i) => v === history[i]);
}

function genMovesForPiece(cells, from, history) {
  const p = cells[from];
  if (!p) return [];
  const color = pcol(p);
  const c0 = col(from), r0 = row(from);
  const moves = []; const seen = new Set();

  for (const [[dc,dr], dist] of specs(p)) {
    const dc1 = c0+dc*dist, dr1 = r0+dr*dist;
    if (inB(dc1,dr1)) {
      const to = idx(dc1,dr1);
      if (cells[to] === null && pathClear(cells,c0,r0,dc1,dr1)) {
        const k = `m${to}`;
        if (!seen.has(k)) { seen.add(k); moves.push({kind:'move',from,to}); }
      }
    }
    const ac=c0+dc, ar=r0+dr;
    if (inB(ac,ar)) {
      const adj = idx(ac,ar); const ap = cells[adj];
      if (ap && pcol(ap) !== color) {
        if (dist===1) {
          const ed = [[ac+dc,ar+dr]];
          if (pushOK(cells,ed) && !wouldRestore(cells,history,from,adj,adj,ed)) {
            const k = `p1${adj}`;
            if (!seen.has(k)) { seen.add(k); moves.push({kind:'push',from,to:adj,enemyFrom:adj,enemyDests:ed}); }
          }
        } else if (dist===2) {
          const md = idx(c0+dc*2,r0+dr*2);
          const e1=[ac+dc,ar+dr], e2=[ac+dc*2,ar+dr*2];
          if (md===idx(e1[0],e1[1]) && pushOK(cells,[e1,e2]) && !wouldRestore(cells,history,from,md,adj,[e1,e2])) {
            const k = `p2${md}`;
            if (!seen.has(k)) { seen.add(k); moves.push({kind:'push',from,to:md,enemyFrom:adj,enemyDests:[e1,e2]}); }
          }
        }
      }
    }
    if (dist===2) {
      const mc=c0+dc,mr=r0+dr,ec=c0+dc*2,er=r0+dr*2;
      if (inB(mc,mr)&&inB(ec,er)) {
        const mid=idx(mc,mr),ep_=idx(ec,er);
        if (cells[mid]===null && cells[ep_] && pcol(cells[ep_])!==color) {
          const ed=[[ec+dc,er+dr]];
          if (pushOK(cells,ed)&&!wouldRestore(cells,history,from,ep_,ep_,ed)) {
            const k=`el${ep_}`;
            if (!seen.has(k)) { seen.add(k); moves.push({kind:'push',from,to:ep_,enemyFrom:ep_,enemyDests:ed}); }
          }
        }
      }
    }
  }
  return moves;
}

function isValidComp(cells, target, attackerColor) {
  const p = cells[target];
  if (!p || pcol(p) === attackerColor) return false;
  const c=col(target),r=row(target);
  const at=(dc,dr)=>{ const p2=cells[idx(c+dc,r+dr)]; return !!p2&&pcol(p2)===attackerColor; };
  if((at(1,0)&&at(-1,0))||(at(0,1)&&at(0,-1))||(at(1,1)&&at(-1,-1))||(at(1,-1)&&at(-1,1))) return true;
  for(const cfg of [[[0,-1],[1,1],[-1,1]],[[0,1],[1,-1],[-1,-1]],[[1,0],[-1,-1],[-1,1]],[[-1,0],[1,-1],[1,1]]])
    if(cfg.every(([dc,dr])=>at(dc,dr))) return true;
  for(const cfg of [[[1,-1],[0,1],[-1,0]],[[-1,-1],[0,1],[1,0]],[[1,1],[0,-1],[-1,0]],[[-1,1],[0,-1],[1,0]]])
    if(cfg.every(([dc,dr])=>at(dc,dr))) return true;
  return false;
}

function genAllMoves(cells, color, history) {
  const comps=[], pushes=[], moves_=[];
  for (let i=0;i<25;i++) {
    const p=cells[i];
    if (p && pcol(p)===color) {
      for (const a of genMovesForPiece(cells,i,history)) {
        (a.kind==='push' ? pushes : moves_).push(a);
      }
    }
    if (p && pcol(p)!==color && isValidComp(cells,i,color))
      comps.push({kind:'comp',target:i});
  }
  return [...comps, ...pushes, ...moves_];
}

// =============================================================================
// APPLICATION D'UN COUP (retourne un nouveau tableau de 25 cases)
// =============================================================================

function applyPromo(cells, pos) {
  const p = cells[pos]; if (!p) return;
  const r_ = row(pos);
  if (ptyp(p)==='standard') {
    if (pcol(p)==='B'&&r_===4) cells[pos]=p[0]+'O';
    else if (pcol(p)==='N'&&r_===0) cells[pos]=p[0]+'O';
  } else if (ptyp(p)==='ortho'||ptyp(p)==='diago') {
    if (pcol(p)==='B'&&r_===0) cells[pos]=p[0]+'A';
    else if (pcol(p)==='N'&&r_===4) cells[pos]=p[0]+'A';
  }
}

function applyMove(cells, move) {
  const nb = cells.slice();
  if (move.kind==='move') {
    nb[move.to]=nb[move.from]; nb[move.from]=null; applyPromo(nb,move.to);
  } else if (move.kind==='push') {
    const mover=nb[move.from]; const enemy=nb[move.enemyFrom];
    nb[move.from]=null; nb[move.enemyFrom]=null;
    const [fc,fr]=move.enemyDests[move.enemyDests.length-1];
    if(inB(fc,fr)) { nb[idx(fc,fr)]=enemy; applyPromo(nb,idx(fc,fr)); }
    nb[move.to]=mover; applyPromo(nb,move.to);
  } else if (move.kind==='comp') {
    nb[move.target]=null;
  }
  return nb;
}

function getWinner(cells, colorToPlay) {
  let wc=0,bc=0;
  for(const p of cells) { if(p) { if(pcol(p)==='B') wc++; else bc++; } }
  if(wc===0) return 'N'; if(bc===0) return 'B';
  if(colorToPlay==='B') { const p=cells[idx(2,4)]; if(p==='BA') return 'B'; }
  else { const p=cells[idx(2,0)]; if(p==='NA') return 'N'; }
  return null;
}

// =============================================================================
// MCTS
// =============================================================================

class MCTSNode {
  constructor(cells, color, history, move=null, parent=null) {
    this.cells   = cells;
    this.color   = color;
    this.history = history;
    this.move    = move;
    this.parent  = parent;
    this.children = [];
    this._untried = null;
    this.wins   = 0;
    this.visits = 0;
    this.terminal = false;
  }

  untried() {
    if (this._untried === null) {
      const w = getWinner(this.cells, this.color);
      if (w !== null) { this.terminal=true; this._untried=[]; }
      else {
        const ms = genAllMoves(this.cells, this.color, this.history);
        if (!ms.length) this.terminal=true;
        this._untried = ms;
      }
    }
    return this._untried;
  }

  fullyExpanded() { return this.untried().length === 0; }

  ucb1(parentVisits) {
    if (this.visits===0) return Infinity;
    return this.wins/this.visits + UCB_C*Math.sqrt(Math.log(parentVisits)/this.visits);
  }

  bestChild() { return this.children.reduce((b,c)=>c.ucb1(this.visits)>b.ucb1(this.visits)?c:b); }

  expand() {
    const ut = this.untried();
    if (!ut.length) return null;
    // Priorité aux compressions lors de l'expansion
    const comps = ut.filter(m=>m.kind==='comp');
    const move = comps.length ? comps[Math.floor(Math.random()*comps.length)]
                              : ut[Math.floor(Math.random()*ut.length)];
    ut.splice(ut.indexOf(move), 1);
    const nb = applyMove(this.cells, move);
    const child = new MCTSNode(nb, opp(this.color), this.cells, move, this);
    this.children.push(child);
    return child;
  }

  backprop(result, rootColor) {
    this.visits++;
    // result = 1 si rootColor a gagné
    this.wins += (this.color !== rootColor) ? result : 1-result;
    if (this.parent) this.parent.backprop(result, rootColor);
  }
}

function guidedRollout(cells, color, history) {
  let cur=color, prev=history, board=cells.slice();
  for (let d=0;d<MAX_ROLLOUT;d++) {
    const w=getWinner(board,cur); if(w!==null) return w;
    const ms=genAllMoves(board,cur,prev); if(!ms.length) return null;
    const comps=ms.filter(m=>m.kind==='comp');
    let move;
    if (comps.length) {
      move=comps[Math.floor(Math.random()*comps.length)];
    } else {
      const pushes=ms.filter(m=>m.kind==='push');
      const pool=[...pushes,...pushes,...pushes,...ms.filter(m=>m.kind==='move')];
      move=pool[Math.floor(Math.random()*pool.length)];
    }
    const nb=applyMove(board,move);
    prev=board; board=nb; cur=opp(cur);
  }
  // Timeout : compter le matériel
  let wv=0,bv=0;
  for(const p of board) if(p) { if(pcol(p)==='B') wv+=PIECE_VALUE[ptyp(p)]; else bv+=PIECE_VALUE[ptyp(p)]; }
  return wv>bv?'B':bv>wv?'N':null;
}

// =============================================================================
// POINT D'ENTRÉE PUBLIC
// =============================================================================

/**
 * Choisit le meilleur coup pour `aiColor` dans la position donnée.
 *
 * @param {Array}  cells        - tableau G.cells (25 cases, format de Game.js)
 * @param {Array}  history      - G.history (tableau 25 cases ou null)
 * @param {string} aiColor      - '0' (Blancs) ou '1' (Noirs)
 * @param {number} timeBudgetMs - budget en millisecondes (défaut 3500)
 * @returns {{ kind, from?, to?, target?, promotionType? } | null}
 */
export function chooseMCTSAction(cells, history, aiColor, timeBudgetMs = 3500) {
  const color = aiColor === '0' ? 'B' : 'N';
  const allMoves = genAllMoves(cells, color, history);
  if (!allMoves.length) return null;

  // Compression immédiate → toujours jouer, pas besoin de réfléchir
  const comps = allMoves.filter(m => m.kind === 'comp');
  if (comps.length) {
    const best = comps.reduce((b, c) => {
      const bv = cells[b.target] ? PIECE_VALUE[ptyp(cells[b.target])] : 0;
      const cv = cells[c.target] ? PIECE_VALUE[ptyp(cells[c.target])] : 0;
      return cv > bv ? c : b;
    });
    return { kind: 'compressPion', target: best.target };
  }

  // MCTS
  const root = new MCTSNode(cells.slice(), color, history);
  const deadline = Date.now() + timeBudgetMs;
  let rollouts = 0;

  while (Date.now() < deadline) {
    // Sélection
    let node = root;
    while (!node.terminal && node.fullyExpanded() && node.children.length)
      node = node.bestChild();

    // Expansion
    if (!node.terminal && !node.fullyExpanded()) {
      const child = node.expand();
      if (child) node = child;
    }

    // Simulation
    let w;
    if (node.terminal) {
      w = getWinner(node.cells, node.color);
    } else {
      w = guidedRollout(node.cells, node.color, node.history);
    }
    const result = w === color ? 1 : w === null ? 0.5 : 0;

    // Backprop
    node.backprop(result, color);
    rollouts++;
  }

  if (!root.children.length) {
    // Aucun rollout — jouer le premier coup disponible
    return _toGameFormat(allMoves[0]);
  }

  // Coup le plus visité = choix final
  const best = root.children.reduce((b, c) => c.visits > b.visits ? c : b);
  return _toGameFormat(best.move);
}

/**
 * Choisit Ortho ou Diago pour la promotion.
 * Simple heuristique : maximise la mobilité depuis la position actuelle.
 */
export function chooseMCTSPromotion(cells, pos, aiColor) {
  const color = aiColor === '0' ? 'B' : 'N';
  let bestType = 'ortho', bestScore = -1;
  for (const type of ['ortho', 'diago']) {
    const test = cells.slice();
    test[pos] = color + (type === 'ortho' ? 'O' : 'D');
    const sc = genMovesForPiece(test, pos, null).length;
    if (sc > bestScore) { bestScore = sc; bestType = type; }
  }
  return bestType;
}

function _toGameFormat(move) {
  if (!move) return null;
  if (move.kind === 'move')  return { kind: 'playAction', from: move.from, to: move.to };
  if (move.kind === 'push')  return { kind: 'playAction', from: move.from, to: move.to };
  if (move.kind === 'comp')  return { kind: 'compressPion', target: move.target };
  return null;
}
