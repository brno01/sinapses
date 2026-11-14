import { TAU, clamp, eio, fr, hsh, lerp, mb, sm } from "./math";
import { target } from "./geometry";
import type { LinkState } from "./states";
import type { Ctx, Link, Strand } from "./types";

/** Cria os fios de uma ligação. A mesma semente gera os mesmos fios para a mesma quantidade. */
export function createStrands(c: Link, NP: number): void {
  const R = mb(c.seed);
  R();
  R();
  const n = c.ns, seed = c.seed, sp = c.sp * Math.pow(c.n0 / n, 0.6);
  c.strands = [];
  for (let i = 0; i < n; i++) {
    // a ordem das chamadas a R() define a personalidade de cada fio: não reordene
    const w = 0.7 + R() * 0.6;
    const ph = [R() * TAU, R() * TAU, R() * TAU, R() * TAU];
    const om = [0.3 + R() * 0.25, 0.6 + R() * 0.4, 0.25 + R() * 0.25, 0.3 + R() * 0.3];
    const rate = 0.85 + R() * 0.4, pph = R(), dly = R() * 1.3, cutF = 0.32 + R() * 0.36, stf = 0.55 + R() * 0.9, rs = 0.8 + R() * 0.45;
    const wf = [0.3 + R() * 0.5, 0.55 + R() * 0.7], wk = [0.8 + R() * 1.6, 1.5 + R() * 2];
    const wa = 0.6 + R() * 0.9, fd = 0.982 + R() * 0.012, rec = 0.6 + R() * 0.8, probe = R() < 0.45, pp = R() * 3, al = 0.55 + R() * 0.4;
    const side = R() < 0.5 ? 1 : -1;
    // na quebra continuam ligados só 2 fios (3 a partir de 12 fios na ligação), espalhados pelo feixe
    const kc = n >= 12 ? 3 : 2;
    let keep = false;
    for (let j = 0; j < kc; j++) if (Math.floor(((j + 0.3) * n) / kc) === i) keep = true;
    const upd = R() < 0.4;
    c.strands.push({
      i, a: (i - (n - 1) / 2) * sp * 3.8, off: (i - (n - 1) / 2) * sp, w, ph, om, rate, pph, dly, cutF, stf, rs, wf, wk, wa, fd, rec,
      probe, pp, al, side, rip: -99, met: 0, keep, sk: 1, inf: [], cc: c, td: [], nxt: 0, upd, rnd: mb(seed * 131 + i + 7),
      init: false, cut: -1, cutT: 0, contract: 0, gap: 0,
      x: new Float64Array(NP), y: new Float64Array(NP), px: new Float64Array(NP), py: new Float64Array(NP), alive: new Array<boolean>(NP).fill(true),
      ax: new Float64Array(NP), ay: new Float64Array(NP), bx: new Float64Array(NP), by: new Float64Array(NP), dx: new Float64Array(NP), dy: new Float64Array(NP),
      A: null, B: null, rl: null, cA: null, cB: null, tgx: null, tgy: null, tnx: null, tny: null, tkey: null, tok: false, Lt: 0,
    });
  }
}

/** Põe o fio inteiro de volta na forma-alvo, parado. */
export function reset(E: Ctx, s: Strand): void {
  const NP = E.NP;
  for (let j = 0; j < NP; j++) {
    const t = target(E, s, j / (NP - 1));
    s.x[j] = s.px[j] = t[0];
    s.y[j] = s.py[j] = t[1];
    s.alive[j] = true;
    s.ax[j] = s.bx[j] = t[0];
    s.ay[j] = s.by[j] = t[1];
  }
  s.cut = -1;
  s.contract = 0;
  s.met = 0;
  s.init = true;
  s.tok = false;
}

/** Segmento onde o fio se rompe ao desligar ou quebrar. */
export const cutIdx = (s: Strand, st: LinkState, NP: number): number =>
  clamp(Math.round((st === "broken" ? 0.42 + s.cutF * 0.2 : s.cutF) * (NP - 1)), 6, NP - 9);

/**
 * Folga entre as pontas de um fio quebrado: abre no rompimento; depois, a cada tentativa, as pontas se aproximam,
 * quase encostam, falham e recuam um pouco (cada tentativa chega a uma distância diferente).
 */
export function brGap(s: Strand, time: number): number {
  const te = time - s.cutT, gx = 18 + 9 * fr(s.pph * 5.1);
  if (te < 0.55) return gx * sm(te / 0.55);
  const P = 2.6 + 1.8 * fr(s.pph * 7.3), z = (te - 0.55) / P, n = Math.floor(z), x = z - n;
  const gm = 1.2 + 4.5 * hsh(n + s.pph * 31, s.i), gh = 9 + 5 * hsh(n + 0.5 + s.pph * 31, s.i);
  if (x < 0.5) return lerp(gx, gm, eio(x / 0.5));
  if (x < 0.68) return gm;
  if (x < 0.78) return lerp(gm, gh, sm((x - 0.68) / 0.1));
  return lerp(gh, gx, sm((x - 0.78) / 0.22));
}
