/* OZAK ROYAL CHESS — game.js : محرك قواعد الشطرنج + الذكاء الاصطناعي (Minimax + Alpha-Beta)
   لا يعتمد على أي مكتبة خارجية. اللوحة: 64 خانة، الفهرس 0 = a8 ، 63 = h1. */
(function (g) {
  'use strict';
  const V = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
  const KD = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]; // 0-3 مستقيم، 4-7 قطري
  const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  class Chess {
    constructor() { this.reset(); }
    reset() {
      const back = 'RNBQKBNR';
      this.b = new Array(64).fill(null);
      for (let c = 0; c < 8; c++) {
        this.b[c] = 'b' + back[c]; this.b[8 + c] = 'bP';
        this.b[48 + c] = 'wP'; this.b[56 + c] = 'w' + back[c];
      }
      this.turn = 'w'; this.cr = 15; this.ep = -1; this.half = 0; this.full = 1;
      this.hist = []; this.keys = [this.key()];
    }
    key() { return this.b.map(x => x || '-').join('') + this.turn + this.cr + this.ep; }

    gen(col, caps) {
      const out = [], b = this.b, opp = col === 'w' ? 'b' : 'w';
      for (let i = 0; i < 64; i++) {
        const p = b[i]; if (!p || p[0] !== col) continue;
        const t = p[1], r = i >> 3, c = i & 7;
        if (t === 'P') {
          const d = col === 'w' ? -1 : 1, sr = col === 'w' ? 6 : 1, pr = col === 'w' ? 0 : 7, r1 = r + d;
          const add = (to, cap, ep) => {
            if ((to >> 3) === pr) for (const q of 'QRBN') out.push({ f: i, t: to, p, c: cap, pr: q });
            else out.push({ f: i, t: to, p, c: cap, ep });
          };
          if (!caps && !b[r1 * 8 + c]) {
            add(r1 * 8 + c, null);
            if (r === sr && !b[(r + 2 * d) * 8 + c]) out.push({ f: i, t: (r + 2 * d) * 8 + c, p, c: null, dp: 1 });
          }
          for (const dc of [-1, 1]) {
            const cc = c + dc; if (cc < 0 || cc > 7) continue;
            const to = r1 * 8 + cc, x = b[to];
            if (x && x[0] === opp) add(to, x);
            else if (to === this.ep) add(to, b[r * 8 + cc], true);
          }
          continue;
        }
        if (t === 'N' || t === 'K') {
          const list = t === 'N' ? KD : KG;
          for (const [dr, dc] of list) {
            const rr = r + dr, cc = c + dc; if (!inB(rr, cc)) continue;
            const x = b[rr * 8 + cc];
            if (x && x[0] === col) continue;
            if (caps && !x) continue;
            out.push({ f: i, t: rr * 8 + cc, p, c: x });
          }
          if (t === 'K' && !caps) {
            const row = col === 'w' ? 7 : 0, ks = col === 'w' ? 1 : 4, qs = col === 'w' ? 2 : 8;
            if (i === row * 8 + 4 && !this.attacked(i, opp)) {
              if ((this.cr & ks) && !b[row * 8 + 5] && !b[row * 8 + 6] && b[row * 8 + 7] === col + 'R' && !this.attacked(row * 8 + 5, opp))
                out.push({ f: i, t: row * 8 + 6, p, c: null, cs: 'K' });
              if ((this.cr & qs) && !b[row * 8 + 3] && !b[row * 8 + 2] && !b[row * 8 + 1] && b[row * 8] === col + 'R' && !this.attacked(row * 8 + 3, opp))
                out.push({ f: i, t: row * 8 + 2, p, c: null, cs: 'Q' });
            }
          }
          continue;
        }
        const from = t === 'R' ? 0 : t === 'B' ? 4 : 0, to = t === 'R' ? 4 : 8;
        for (let k = from; k < to; k++) {
          const [dr, dc] = KG[k]; let rr = r + dr, cc = c + dc;
          while (inB(rr, cc)) {
            const x = b[rr * 8 + cc];
            if (x) { if (x[0] === opp) out.push({ f: i, t: rr * 8 + cc, p, c: x }); break; }
            if (!caps) out.push({ f: i, t: rr * 8 + cc, p, c: null });
            rr += dr; cc += dc;
          }
        }
      }
      return out;
    }

    attacked(s, by) {
      const b = this.b, r = s >> 3, c = s & 7;
      const pr = r + (by === 'w' ? 1 : -1);
      if (pr >= 0 && pr < 8) for (const dc of [-1, 1]) { const cc = c + dc; if (cc >= 0 && cc < 8 && b[pr * 8 + cc] === by + 'P') return true; }
      for (const [dr, dc] of KD) { const rr = r + dr, cc = c + dc; if (inB(rr, cc) && b[rr * 8 + cc] === by + 'N') return true; }
      for (const [dr, dc] of KG) { const rr = r + dr, cc = c + dc; if (inB(rr, cc) && b[rr * 8 + cc] === by + 'K') return true; }
      for (let k = 0; k < 8; k++) {
        const [dr, dc] = KG[k], diag = k >= 4; let rr = r + dr, cc = c + dc;
        while (inB(rr, cc)) {
          const x = b[rr * 8 + cc];
          if (x) { if (x[0] === by) { const t = x[1]; if (t === 'Q' || (diag ? t === 'B' : t === 'R')) return true; } break; }
          rr += dr; cc += dc;
        }
      }
      return false;
    }
    kingSq(col) { for (let i = 0; i < 64; i++) if (this.b[i] === col + 'K') return i; return -1; }
    inCheck(col) { const k = this.kingSq(col); return k >= 0 && this.attacked(k, col === 'w' ? 'b' : 'w'); }

    make(m) {
      const b = this.b, col = m.p[0], u = { cr: this.cr, ep: this.ep, half: this.half, full: this.full };
      b[m.f] = null;
      if (m.ep) b[(m.f >> 3) * 8 + (m.t & 7)] = null;
      b[m.t] = m.pr ? col + m.pr : m.p;
      if (m.cs) { const row = m.f >> 3; if (m.cs === 'K') { b[row * 8 + 5] = b[row * 8 + 7]; b[row * 8 + 7] = null; } else { b[row * 8 + 3] = b[row * 8]; b[row * 8] = null; } }
      if (m.p[1] === 'K') this.cr &= col === 'w' ? ~3 : ~12;
      for (const s of [m.f, m.t]) { if (s === 63) this.cr &= ~1; else if (s === 56) this.cr &= ~2; else if (s === 7) this.cr &= ~4; else if (s === 0) this.cr &= ~8; }
      this.ep = m.dp ? (m.f + m.t) / 2 : -1;
      this.half = (m.p[1] === 'P' || m.c) ? 0 : this.half + 1;
      if (col === 'b') this.full++;
      this.turn = col === 'w' ? 'b' : 'w';
      return u;
    }
    undo(m, u) {
      const b = this.b, col = m.p[0];
      b[m.f] = m.p;
      if (m.ep) { b[m.t] = null; b[(m.f >> 3) * 8 + (m.t & 7)] = m.c; } else b[m.t] = m.c;
      if (m.cs) { const row = m.f >> 3; if (m.cs === 'K') { b[row * 8 + 7] = b[row * 8 + 5]; b[row * 8 + 5] = null; } else { b[row * 8] = b[row * 8 + 3]; b[row * 8 + 3] = null; } }
      this.cr = u.cr; this.ep = u.ep; this.half = u.half; this.full = u.full; this.turn = col;
    }
    legal(caps) {
      const col = this.turn, res = [];
      for (const m of this.gen(col, caps)) { const u = this.make(m); if (!this.inCheck(col)) res.push(m); this.undo(m, u); }
      return res;
    }
    move(m) { const u = this.make(m); this.hist.push({ m, u }); this.keys.push(this.key()); }
    undoLast() { const h = this.hist.pop(); if (h) { this.undo(h.m, h.u); this.keys.pop(); } }
    insufficient() {
      const rest = this.b.filter(x => x && x[1] !== 'K').map(x => x[1]);
      return rest.length === 0 || (rest.length === 1 && (rest[0] === 'N' || rest[0] === 'B'));
    }
    status() {
      const mv = this.legal(), chk = this.inCheck(this.turn);
      if (!mv.length) return chk ? 'checkmate' : 'stalemate';
      if (this.half >= 100 || this.insufficient()) return 'draw';
      const k = this.keys[this.keys.length - 1];
      if (this.keys.filter(x => x === k).length >= 3) return 'draw';
      return chk ? 'check' : 'play';
    }
    perft(d) { if (!d) return 1; let n = 0; for (const m of this.legal()) { const u = this.make(m); n += this.perft(d - 1); this.undo(m, u); } return n; }
  }

  /* ---------------- الذكاء الاصطناعي ---------------- */
  function levelInfo(n) {
    const depth = n <= 20 ? 1 : n <= 50 ? 2 : n <= 99 ? 3 : 4;
    const rnd = n <= 20 ? 0.6 - (n - 1) * 0.028 : n <= 50 ? 0.12 - (n - 21) * 0.004 : 0;
    const titles = ['المبتدئ', 'الحارس', 'الفارس', 'القائد', 'الوزير', 'الأمير', 'الملك', 'الإمبراطور'];
    const title = n === 100 ? 'الإمبراطور الأعظم' : titles[Math.min(7, Math.floor((n - 1) / 13))];
    return { n, depth, rnd: Math.max(0, rnd), fog: n >= 80, title };
  }

  class AI {
    constructor(game) { this.g = game; }
    evalSide() {
      const b = this.g.b; let s = 0, queens = 0, wk = 0, bk = 0;
      for (let i = 0; i < 64; i++) {
        const p = b[i]; if (!p) continue;
        const col = p[0], t = p[1], r = i >> 3, c = i & 7, w = col === 'w';
        const adv = w ? 7 - r : r, cen = (3.5 - Math.abs(c - 3.5)) + (3.5 - Math.abs(r - 3.5));
        let v = V[t];
        if (t === 'P') v += adv * 6 + (c === 3 || c === 4 ? adv * 4 : 0);
        else if (t === 'N') v += cen * 8;
        else if (t === 'B') v += cen * 4;
        else if (t === 'R') v += adv === 6 ? 15 : 0;
        else if (t === 'Q') { v += cen * 2; queens++; }
        else if (t === 'K') { if (w) wk = cen; else bk = cen; }
        s += w ? v : -v;
      }
      const k = queens ? -8 : 8; s += (wk - bk) * k;
      return this.g.turn === 'w' ? s : -s;
    }
    order(ms) {
      for (const m of ms) m.s = (m.c ? 10 * V[m.c[1]] - V[m.p[1]] / 10 + 1000 : 0) + (m.pr ? 800 : 0);
      return ms.sort((a, b) => b.s - a.s);
    }
    quiesce(alpha, beta, qd) {
      const stand = this.evalSide();
      if (qd >= 4) return stand;
      if (stand >= beta) return beta;
      if (stand > alpha) alpha = stand;
      const g = this.g;
      for (const m of this.order(g.legal(true))) {
        const u = g.make(m), s = -this.quiesce(-beta, -alpha, qd + 1); g.undo(m, u);
        if (s >= beta) return beta; if (s > alpha) alpha = s;
      }
      return alpha;
    }
    search(depth, alpha, beta, ply) {
      if ((++this.nodes & 2047) === 0 && Date.now() > this.deadline) this.abort = true;
      if (this.abort) return 0;
      const g = this.g;
      if (depth <= 0) {
        if (ply < 14 && g.inCheck(g.turn)) depth = 1; // امتداد الكش
        else return this.useQ ? this.quiesce(alpha, beta, 0) : this.evalSide();
      }
      const ms = g.legal();
      if (!ms.length) return g.inCheck(g.turn) ? -99000 + ply : 0;
      for (const m of this.order(ms)) {
        const u = g.make(m), s = -this.search(depth - 1, -beta, -alpha, ply + 1); g.undo(m, u);
        if (this.abort) return 0;
        if (s >= beta) return beta; if (s > alpha) alpha = s;
      }
      return alpha;
    }
    pick(level) {
      const g = this.g, L = levelInfo(level), moves = g.legal();
      if (!moves.length) return null;
      if (Math.random() < L.rnd) return moves[Math.floor(Math.random() * moves.length)];
      this.useQ = L.depth >= 3; this.abort = false; this.nodes = 0;
      this.deadline = Date.now() + (L.depth >= 4 ? 4500 : L.depth === 3 ? 2200 : 1000);
      const noise = level <= 50 ? 6 : 1; let best = moves[0], ord = this.order(moves.slice());
      for (let d = 1; d <= L.depth; d++) {
        let bm = null, alpha = -Infinity;
        for (const m of ord) {
          const u = g.make(m), s = -this.search(d - 1, -Infinity, -alpha, 1) + Math.random() * noise; g.undo(m, u);
          if (this.abort) break;
          if (s > alpha) { alpha = s; bm = m; }
        }
        if (this.abort || !bm) break;
        best = bm; ord = [bm].concat(ord.filter(x => x !== bm));
      }
      return best;
    }
  }

  g.Chess = Chess; g.AI = AI; g.levelInfo = levelInfo;
  if (typeof module !== 'undefined') module.exports = { Chess, AI, levelInfo };
})(typeof window !== 'undefined' ? window : globalThis);
