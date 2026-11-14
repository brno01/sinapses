import { clamp, eio, eob, lerp, sm } from "./math";
import type { Config } from "./config";
import type { LinkState } from "./states";
import type { Anchor, Ctx, Rect, Strand, Tendril } from "./types";

/** Ponto de saída na borda do retângulo `r`, na direção do ponto `to`, deslocado `off` ao longo da borda. */
export function attach(r: Rect, to: [number, number], off: number): Anchor {
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = to[0] - cx, dy = to[1] - cy;
  const tx = r.width / 2 / Math.abs(dx || 1e-9), ty = r.height / 2 / Math.abs(dy || 1e-9), t = Math.min(tx, ty);
  const bx = cx + dx * t, by = cy + dy * t;
  let nx: number, ny: number, tx_: number, ty_: number;
  if (tx < ty) { nx = dx > 0 ? 1 : -1; ny = 0; tx_ = 0; ty_ = 1; } else { nx = 0; ny = dy > 0 ? 1 : -1; tx_ = 1; ty_ = 0; }
  const half = (tx < ty ? r.height : r.width) / 2 - 14, o = clamp(off, -half, half);
  return { x: bx + tx_ * o, y: by + ty_ * o, nx, ny, tx: tx_, ty: ty_ };
}

/** Curva de Bézier do fio entre as duas pontas, saindo perpendicular às bordas. */
export function bz(s: Strand, u: number): [number, number] {
  const A = s.A!, B = s.B!, D = Math.hypot(B.x - A.x, B.y - A.y), k = 0.32 * D;
  const p1x = A.x + A.nx * k, p1y = A.y + A.ny * k, p2x = B.x + B.nx * k, p2y = B.y + B.ny * k;
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * A.x + b * p1x + c * p2x + d * B.x, a * A.y + b * p1y + c * p2y + d * B.y];
}

/** Envelope da abertura do feixe: fechado junto aos nós até `cfg.ops` (fração do caminho), aberto no meio. */
export function openEnv(u: number, cfg: Config): number {
  const a = cfg.ops, w = Math.max(0.06, Math.min(0.42, 0.5 - a));
  return sm(clamp((u - a) / w)) * sm(clamp((1 - u - a) / w));
}

/** Forma-alvo do ponto `u` (0–1) do fio: curva + abertura do feixe + desvio de nós + tentáculos. */
export function target(E: Ctx, s: Strand, u: number, notd?: boolean): [number, number] {
  const p = bz(s, u), q = bz(s, Math.min(1, u + 0.01)), r = bz(s, Math.max(0, u - 0.01));
  const tx = q[0] - r[0], ty = q[1] - r[1], L = Math.hypot(tx, ty) || 1;
  let off = s.a * 1.1 * E.cfg.spr * openEnv(u, E.cfg);
  const to = !notd && s.td.length ? tdOff(E, s, u, E.tn, true) : null;
  // o deslocamento nunca passa de meio raio de curvatura do lado de dentro da curva (evita cantos e laços)
  const h = 0.03, a = bz(s, Math.max(0, u - h)), c = bz(s, Math.min(1, u + h));
  const cr = (p[0] - a[0]) * (c[1] - p[1]) - (p[1] - a[1]) * (c[0] - p[0]);
  if (Math.abs(cr) > 1e-6 && off * cr > 0) {
    const R = (Math.hypot(p[0] - a[0], p[1] - a[1]) * Math.hypot(c[0] - p[0], c[1] - p[1]) * Math.hypot(c[0] - a[0], c[1] - a[1])) / (2 * Math.abs(cr));
    if (Math.abs(off) > 0.5 * R) off = Math.sign(off) * 0.5 * R;
  }
  const cc = s.cc, fu = clamp(u) * 96, i0 = Math.min(95, Math.floor(fu));
  const D = lerp(cc.dv[i0], cc.dv[i0 + 1], fu - i0), dX = cc.nx * D, dY = cc.ny * D;
  if (to) {
    const nw = Math.max(1, to[5]);
    return [
      p[0] - (ty / L) * (off + to[0]) + (tx / L) * to[1] + dX + to[3] / nw,
      p[1] + (tx / L) * (off + to[0]) + (ty / L) * to[1] + dY + to[4] / nw,
    ];
  }
  return [p[0] - (ty / L) * off + dX, p[1] + (tx / L) * off + dY];
}

// ---- tentáculos (simbionte): um trecho do fio se projeta para fora do fluxo, se contorce, ramifica na ponta e recolhe ----

export interface TendrilParams {
  /** Fração dos tentáculos que viram pontos anômalos pequenos com ramificação. */
  spot?: number;
  /** Quais fios participam. */
  el: (s: Strand) => boolean;
  iv: [number, number];
  amp: [number, number];
  wid: [number, number];
  dur: [number, number];
  rt: [number, number];
  hd: [number, number];
  wr: [number, number];
  tw: [number, number];
  /** Chance por passo de soltar um esporo. */
  emit: number;
}

export const TENDRIL_PARAMS: Partial<Record<LinkState, TendrilParams>> = {
  testing: { el: (s) => s.probe, iv: [2.6, 4], amp: [26, 52], wid: [0.06, 0.09], dur: [3.2, 4.4], rt: [0.24, 0.32], hd: [0.66, 0.74], wr: [3, 5], tw: [4, 7], emit: 0 },
  updating: { spot: 0.3, el: (s) => s.upd, iv: [2.6, 4.2], amp: [30, 54], wid: [0.05, 0.08], dur: [3.2, 4.2], rt: [0.2, 0.3], hd: [0.72, 0.8], wr: [2.5, 5], tw: [3, 6], emit: 0.006 },
  anomaly: { spot: 0.25, el: (s) => s.upd, iv: [1.2, 2.4], amp: [44, 86], wid: [0.04, 0.07], dur: [1.4, 2.0], rt: [0.12, 0.2], hd: [0.5, 0.62], wr: [4, 8], tw: [5, 9], emit: 0.012 },
};

/** Envelope de um tentáculo ao longo da vida (x de 0 a 1): sai, se mantém e recolhe. */
export function tdEnv(x: number, e: Tendril): number {
  if (x < e.rt) return e.tk != null ? eio(x / e.rt) : eob(x / e.rt);
  if (x < e.hd) return 1 + 0.05 * Math.sin(x * 22 + e.p1);
  return 1 - eio(clamp((x - e.hd) / (1 - e.hd)));
}

/**
 * Deslocamento dos tentáculos no ponto `u`: [normal, tangente, peso, puxão x, puxão y, peso dos tentáculos que miram
 * outro fio]. Com `needV`, calcula o puxão em direção ao fio saudável mirado.
 */
export function tdOff(E: Ctx, s: Strand, u: number, tn: number, needV?: boolean): [number, number, number, number, number, number] {
  let n = 0, t = 0, w = 0, vx = 0, vy = 0, wt = 0;
  for (const e of s.td) {
    const age = tn - e.t0;
    if (age < 0 || age > e.dur) continue;
    const ex = tdEnv(age / e.dur, e), uc = e.uc + e.dr * Math.sin(tn * e.f2 + e.p2), d = (u - uc) / e.wid;
    const g = Math.exp(-Math.pow(Math.abs(d), e.tk != null ? 2 : 1.7));
    if (g < 0.005) continue;
    if (e.tk != null) {
      wt += ex * g;
      if (needV) {
        const a0 = target(E, s, u, true), b0 = target(E, s.cc.strands[e.tk], u, true);
        vx += ex * g * (b0[0] - a0[0]);
        vy += ex * g * (b0[1] - a0[1]);
      }
      n += ex * g * e.wr * 0.4 * Math.sin(tn * e.f1 - d * 1.8 + e.p1);
    } else n += e.side * ex * g * (e.amp * (1 + 0.18 * Math.sin(tn * e.f1 * 0.7 + e.p1)) + e.wr * Math.sin(tn * e.f1 - d * 1.8 + e.p1));
    t += ex * g * (e.tw * Math.sin(tn * e.f1 * 1.3 - d * 2.4 + e.p2) + e.ln * e.amp * 0.45);
    w += ex * g;
  }
  return [n, t, w, vx, vy, wt];
}
