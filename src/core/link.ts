import { lerp, mb, rgb } from "./math";
import { strandCount } from "./config";
import { attach } from "./geometry";
import { avoid } from "./avoid";
import { createStrands, reset } from "./strand";
import { STATE_COLORS, STATE_PARAMS, isBaseState, type LinkState } from "./states";
import type { Ctx, Link } from "./types";

/** Definição de uma ligação. */
export interface LinkDef {
  id: string;
  from: string;
  to: string;
  /** Quantidade base de fios (multiplicada pelo ajuste Quantidade). */
  strands: number;
  /** Espaçamento entre fios junto aos nós (px). */
  spacing?: number;
  /** Semente: muda a personalidade dos fios. */
  seed?: number;
  state?: LinkState;
}

export function createLink(def: LinkDef, E: Ctx): Link {
  const st = def.state ?? "flow", seed = def.seed ?? 1, R = mb(seed), n = strandCount(def.strands, E.cfg), P = STATE_PARAMS[st];
  const base = isBaseState(st) ? st : "flow";
  const sync = R(), clk = R() * 10;
  const c: Link = {
    id: def.id, a: def.from, b: def.to, n0: def.strands, seed, sp: def.spacing ?? 1.15, ns: n, st, prev: st, base, t0: -99, sync,
    strands: [], ks: P.ks, nz: P.nz, dmp: P.dmp, tr: P.tr, pc: P.pc, am: P.am, col: rgb(STATE_COLORS[st]), hc: rgb(STATE_COLORS[base]),
    dw: [0, 0, 0].map((_, i) => (i < P.n ? 1 : 0)), syn: 0, blk: st === "blocked" ? 1 : 0, ghost: st === "off" ? 1 : 0, dim: 1, hi: 0,
    clk, mv: 0, pA: null, pB: null, dvAct: 0, dv: new Float32Array(97), dvP: null, dvVer: 0, ob: {}, ak: null, nx: 0, ny: 1, gr: false, g: { L: 1 },
  };
  createStrands(c, E.NP);
  return c;
}

/** Aproxima os parâmetros da ligação dos valores do estado atual, de forma exponencial. */
export function ease(E: Ctx, c: Link, dt: number): void {
  const t = STATE_PARAMS[c.st], k = 1 - Math.exp(-dt * 3.2), Ex = (r: number) => 1 - Math.exp(-dt * r), tc = rgb(STATE_COLORS[c.st]);
  c.ks += (t.ks - c.ks) * k;
  c.nz += (t.nz - c.nz) * k;
  c.dmp += (t.dmp - c.dmp) * k;
  c.tr += (t.tr - c.tr) * k;
  c.pc += (t.pc - c.pc) * k;
  c.am += (t.am - c.am) * k;
  for (let i = 0; i < 3; i++) {
    c.dw[i] += ((i < t.n ? 1 : 0) - c.dw[i]) * Ex(i < t.n ? 2.2 : 5);
    c.col[i] += (tc[i] - c.col[i]) * Ex(5);
  }
  c.syn += ((c.st === "busy" ? 1 : 0) - c.syn) * Ex(2);
  c.blk += ((c.st === "blocked" ? 1 : 0) - c.blk) * Ex(3);
  c.ghost += ((c.st === "off" ? 1 : 0) - c.ghost) * Ex(2.5);
  const hover = E.hover, rel = !!hover && (c.a === hover || c.b === hover);
  c.dim += ((hover && !rel ? 0.3 : 1) - c.dim) * Ex(6);
  c.hi += ((rel ? 1 : 0) - c.hi) * Ex(6);
  c.clk += (dt * E.cfg.pfrq) / Math.max(0.3, c.pc);
  // situação própria de cada fio: em teste só alguns sondam, na atualização só alguns atualizam, na anomalia só alguns
  // adoecem; os demais seguem saudáveis, na cor da operação normal
  const hb = rgb(STATE_COLORS[c.base]);
  for (let i = 0; i < 3; i++) c.hc[i] += (hb[i] - c.hc[i]) * Ex(4);
  for (const s of c.strands) {
    const tg = c.st === "testing" ? (s.probe ? 1 : 0) : c.st === "updating" || c.st === "anomaly" ? (s.upd ? 1 : 0) : 1;
    s.sk += (tg - s.sk) * Ex(3);
  }
}

/** Pontas de cada fio nas bordas dos nós, velocidade de arraste, desvio de nós e suavização do estado. */
export function geoC(E: Ctx, c: Link, dt: number): void {
  const ra = E.rects.get(c.a), rb = E.rects.get(c.b);
  if (!ra || !rb) return;
  const ca: [number, number] = [ra.left + ra.width / 2, ra.top + ra.height / 2], cb: [number, number] = [rb.left + rb.width / 2, rb.top + rb.height / 2];
  const k = 1 - Math.exp(-dt * 34);
  // o deslocamento lateral de cada fio é medido do mesmo lado nos dois nós (esquerda do sentido de viagem), então os
  // fios nunca se cruzam perto das bordas
  const a0 = attach(ra, cb, 0), b0 = attach(rb, ca, 0);
  const sA = Math.sign(a0.tx * -a0.ny + a0.ty * a0.nx) || 1, sB = Math.sign(b0.tx * b0.ny - b0.ty * b0.nx) || 1;
  for (const s of c.strands) {
    const a = attach(ra, cb, s.off * sA), b = attach(rb, ca, s.off * sB);
    if (!s.A || !s.B) { s.A = a; s.B = b; }
    else {
      s.A.x = lerp(s.A.x, a.x, k); s.B.x = lerp(s.B.x, b.x, k);
      s.A.y = lerp(s.A.y, a.y, k); s.B.y = lerp(s.B.y, b.y, k);
      s.A.nx = lerp(s.A.nx, a.nx, k); s.B.nx = lerp(s.B.nx, b.nx, k);
      s.A.ny = lerp(s.A.ny, a.ny, k); s.B.ny = lerp(s.B.ny, b.ny, k);
      s.A.tx = lerp(s.A.tx, a.tx, k); s.B.tx = lerp(s.B.tx, b.tx, k);
      s.A.ty = lerp(s.A.ty, a.ty, k); s.B.ty = lerp(s.B.ty, b.ty, k);
    }
  }
  const m = c.strands[Math.floor(c.strands.length / 2)];
  c.g = { L: Math.hypot(m.B!.x - m.A!.x, m.B!.y - m.A!.y) || 1 };
  // velocidade com que os nós da ligação estão sendo movidos (deixa os fios mais firmes e amortecidos durante o arraste)
  const spd = c.pA && c.pB ? (Math.hypot(m.A!.x - c.pA[0], m.A!.y - c.pA[1]) + Math.hypot(m.B!.x - c.pB[0], m.B!.y - c.pB[1])) / Math.max(dt, 1e-3) : 0;
  c.pA = [m.A!.x, m.A!.y];
  c.pB = [m.B!.x, m.B!.y];
  c.mv += (Math.min(spd, 2000) - c.mv) * (1 - Math.exp(-dt * (spd > c.mv ? 14 : 4)));
  avoid(E, c, dt, m);
  ease(E, c, dt);
}

/** Troca o estado da ligação no instante `now` (s). Volta os fios rompidos ao inteiro quando o novo estado é vivo. */
export function go(E: Ctx, c: Link, st: LinkState, now: number): void {
  const pv = c.st;
  c.prev = pv;
  c.st = st;
  if (isBaseState(st)) c.base = st;
  c.t0 = now;
  if (st !== "retract" && st !== "broken" && st !== "off") {
    for (const s of c.strands) if (s.cut >= 0 || pv === "off" || pv === "retract" || pv === "broken") if (s.A) reset(E, s);
  }
  for (const s of c.strands) {
    s.rip = now;
    s.nxt = now + s.dly * 0.8;
  }
}
