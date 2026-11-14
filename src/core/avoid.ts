import { clamp, sm } from "./math";
import { bz } from "./geometry";
import type { Ctx, Link, Rect, Strand } from "./types";

/**
 * Desvio de obstáculos: os outros nós empurram o feixe para o lado de menor desvio; se não há por onde desviar, os
 * fios tentam se agarrar ao nó. A geometria só é recalculada quando a ligação ou algum nó muda de lugar; parado,
 * reaproveita o resultado guardado (a suavização do lado e do agarre continua rodando).
 */
export function avoid(E: Ctx, c: Link, dt: number, m: Strand): void {
  const K = 96, A = m.A!, B = m.B!;
  let Tx = B.x - A.x, Ty = B.y - A.y;
  const Lc = Math.hypot(Tx, Ty) || 1;
  Tx /= Lc;
  Ty /= Lc;
  const Nx = -Ty, Ny = Tx;
  c.nx = Nx;
  c.ny = Ny;
  c.dv.fill(0);
  if (!E.cfg.avd) {
    c.ob = {};
    c.gr = false;
    c.dvAct = 0;
    dvBump(c);
    return;
  }
  const hw = 22, mg = 16, gs: [string, Rect][] = [], key = [A.x, A.y, A.nx, A.ny, B.x, B.y, B.nx, B.ny];
  for (const id of E.nodeIds) {
    if (id === c.a || id === c.b) continue;
    const r = E.rects.get(id);
    if (!r) continue;
    gs.push([id, r]);
    key.push(r.left, r.top, r.right, r.bottom);
  }
  const same = !!c.ak && c.ak.length === key.length && key.every((v, i) => v === c.ak![i]);
  c.ak = key;
  let P: [number, number][] | null = null;
  for (const [id, r] of gs) {
    const o = c.ob[id] || (c.ob[id] = { v: 0, tgt: 1, g: 0, rect: r });
    o.rect = r;
    if (!same || !o.geo) {
      if (!P) {
        P = [];
        for (let k = 0; k <= K; k++) P.push(bz(m, k / K));
      }
      const L0 = r.left - mg - hw, R0 = r.right + mg + hw, T0 = r.top - mg - hw, B0 = r.bottom + mg + hw;
      const rp = new Float32Array(K + 1), rn = new Float32Array(K + 1);
      for (let k = 0; k <= K; k++) {
        const p = P[k];
        let lo = -1e9, hi = 1e9;
        // interseção da reta p + s*N com o retângulo inflado (método das lajes)
        for (const [o1, d, a0, a1] of [[p[0], Nx, L0, R0], [p[1], Ny, T0, B0]]) {
          if (Math.abs(d) < 1e-6) {
            if (o1 < a0 || o1 > a1) { lo = 1e9; hi = -1e9; }
          } else {
            let s1 = (a0 - o1) / d, s2 = (a1 - o1) / d;
            if (s1 > s2) [s1, s2] = [s2, s1];
            lo = Math.max(lo, s1);
            hi = Math.min(hi, s2);
          }
        }
        if (lo < 0 && hi > 0) { rp[k] = hi; rn[k] = -lo; }
      }
      const dil = (a: Float32Array): Float32Array => {
        const out = new Float32Array(K + 1), Rr = 46;
        for (let k = 0; k <= K; k++) {
          let best = 0;
          for (let j = 0; j <= K; j++) {
            if (a[j] <= 0) continue;
            const d = (Math.abs(k - j) / K) * Lc, v = a[j] * (1 - sm(clamp(d / Rr)));
            if (v > best) best = v;
          }
          out[k] = best;
        }
        return out;
      };
      const dp = dil(rp), dn = dil(rn);
      let Dp = 0, Dn = 0;
      for (let k = 0; k <= K; k++) { Dp = Math.max(Dp, rp[k]); Dn = Math.max(Dn, rn[k]); }
      const hit = Dp > 0 || Dn > 0;
      const ins = (q: { x: number; y: number }, e: number) => q.x > r.left - e && q.x < r.right + e && q.y > r.top - e && q.y < r.bottom + e;
      const blocked = hit && (Math.min(Dp, Dn) > 260 || ins(A, 10) || ins(B, 10));
      o.geo = { dp, dn, Dp, Dn, hit, blocked };
    }
    const { dp, dn, Dp, Dn, hit, blocked } = o.geo!;
    if (hit) {
      if (Dp < Dn - 12) o.tgt = 1;
      else if (Dn < Dp - 12) o.tgt = -1;
    }
    o.v += (o.tgt - o.v) * (1 - Math.exp(-dt * 6));
    o.g += ((blocked ? 1 : 0) - o.g) * (1 - Math.exp(-dt * 4));
    const wgt = 1 - o.g;
    for (let k = 0; k <= K; k++) {
      const u = k / K, e = sm(clamp(u / 0.025)) * sm(clamp((1 - u) / 0.025));
      c.dv[k] += wgt * e * (((1 + o.v) / 2) * dp[k] - ((1 - o.v) / 2) * dn[k]);
    }
  }
  c.gr = Object.values(c.ob).some((o) => o.g > 0.04);
  let mx = 0;
  for (let k = 0; k <= K; k++) mx = Math.max(mx, Math.abs(c.dv[k]));
  c.dvAct += (clamp(mx / 30) - c.dvAct) * (1 - Math.exp(-dt * 8));
  dvBump(c);
}

/** Número de versão do desvio da ligação: sobe só quando algum valor muda (a forma-alvo guardada depende dele). */
export function dvBump(c: Link): void {
  const p = c.dvP || (c.dvP = new Float32Array(97));
  for (let k = 0; k < 97; k++) {
    if (p[k] !== c.dv[k]) {
      p.set(c.dv);
      c.dvVer = (c.dvVer || 0) + 1;
      return;
    }
  }
}
