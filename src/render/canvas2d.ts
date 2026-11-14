import { TAU, clamp, eio, fr, lerp, lite, mixc, rgb, sm, type Color } from "../core/math";
import { tdEnv, tdOff } from "../core/geometry";
import { cutIdx } from "../core/strand";
import type { Engine } from "../core/engine";
import type { Link, Strand } from "../core/types";
import type { FrameRenderer } from "../runtime/loop";

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export interface Viewport {
  /** Largura e altura em pixels CSS. */
  width: number;
  height: number;
  /** Densidade de pixels do monitor; o canvas usa no mínimo 2× para suavizar fios mais finos que um pixel. */
  dpr: number;
}

const RED = lite(rgb("#FF4B4B"), 0.35);
const prof = (u: number) => 0.22 + 0.78 * Math.pow(Math.sin(Math.PI * clamp(u)), 0.6);

interface RibbonOpts {
  fa?: number;
  fb?: number;
  tl?: number;
  neck?: { u: number; k: number };
}

/** Desenha as ligações num canvas 2D. Cada fio é uma fita de largura variável com borda suave. */
export class Canvas2DRenderer implements FrameRenderer {
  private ctx: Ctx2D;
  private scale = 2;
  private E!: Engine;
  private dots = 0;
  /** Raio dos cantos dos nós (o desenho não entra neles). */
  nodeRadius = 14;

  constructor(private canvas: AnyCanvas, private view: Viewport) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    this.ctx = ctx as Ctx2D;
    this.resize(view);
  }

  resize(view: Viewport): void {
    const scale = Math.max(2, Math.min(3, view.dpr || 1)), w = Math.round(view.width * scale), h = Math.round(view.height * scale);
    this.view = view;
    this.scale = scale;
    // redefinir o tamanho apaga o canvas: só faz isso quando ele mudou de fato
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  draw(E: Engine, time: number, fa: number): number {
    this.E = E;
    this.dots = 0;
    const ctx = this.ctx, NP = E.NP, cfg = E.cfg, W = this.view.width, H = this.view.height;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    for (const id of E.nodeIds) {
      const r = E.rects.get(id);
      if (r) ctx.roundRect(r.left, r.top, r.width, r.height, this.nodeRadius);
    }
    ctx.clip("evenodd");
    for (const c of E.links) {
      const ts = time - c.t0, st = c.st, linkCol = c.col, dm = c.dim * (1 + 0.3 * c.hi);
      for (const s of c.strands) {
        if (!s.A || !s.B || !s.init) continue;
        const col = mixc(c.hc, c.col, s.sk), hot = lite(col, 0.55);
        if (st !== "off" || c.am > 0.01) for (let j = 0; j < NP; j++) { s.dx[j] = lerp(s.ax[j], s.bx[j], fa); s.dy[j] = lerp(s.ay[j], s.by[j], fa); }
        s.dx[0] = s.A.x; s.dy[0] = s.A.y; s.dx[NP - 1] = s.B.x; s.dy[NP - 1] = s.B.y;
        let wd = 1.05 * s.w * cfg.wid, al = s.al * c.am * dm * cfg.glo;
        if (c.ghost > 0.01) {
          ctx.strokeStyle = this.rg(col, 0.11 * c.ghost * s.al * c.dim);
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(s.A.x, s.A.y); ctx.lineTo(s.B.x, s.B.y); ctx.stroke();
        }
        if (st === "off") continue;
        if (st === "unfurl") {
          // ligando: os fios crescem dos dois nós e se encontram no meio
          const d = clamp((ts - s.dly * 0.6) / (2.2 / s.rs)), f = 0.5 * eio(d);
          if (d >= 1) this.ribbon(c, s, 0, 1, col, al, wd, {}, time);
          else {
            this.ribbon(c, s, 0, f, col, al, wd, { fb: 1 }, time);
            this.ribbon(c, s, 1 - f, 1, col, al, wd, { fa: 1 }, time);
            if (f > 0.012) {
              const a1 = 0.8 * clamp(f * 14) * c.dim * (1 - sm(clamp((f - 0.28) / 0.2))), g = Math.max(0, f - 0.018);
              this.dot(this.pos(s, g), 0.65, hot, a1);
              this.dot(this.pos(s, 1 - g), 0.65, hot, a1);
            }
          }
          continue;
        }
        if (s.cut >= 0) {
          this.drawCut(c, s, col, hot, al, wd, time);
          continue;
        }
        if (st === "broken" && s.keep) {
          wd *= 0.8;
          al *= 0.55 + 0.45 * sm(0.5 + 0.5 * Math.sin(time * 5.3 + s.ph[2]) * Math.sin(time * 1.3 + s.ph[0]));
        }
        const neck = st === "retract" || (st === "broken" && !s.keep)
          ? { u: (cutIdx(s, st, NP) + 0.5) / (NP - 1), k: sm(clamp(ts / (st === "retract" ? 0.8 + s.dly * 0.55 : 0.3 + s.dly * 0.55))) }
          : null;
        this.ribbon(c, s, 0, 1, col, al, wd, neck ? { neck } : {}, time);
        if (s.td.length) this.fingers(s, c, hot, time, c.dim);
        if (c.gr) this.grips(c, s, time);
        this.pulses(c, s, hot, time);
      }
      if (c.blk > 0.02) this.lock(c, linkCol);
    }
    for (const q of E.spores) {
      const age = time - q.t0;
      if (age > q.life) continue;
      const k = 1 - age / q.life, e = 1 - Math.pow(1 - clamp(age / 1.6), 2);
      this.dot([q.x + q.vx * e * 1.2, q.y + q.vy * e * 1.2], 0.6, lite(q.col, 0.5), 0.8 * k * k);
    }
    ctx.restore();
    return this.dots;
  }

  // saturação aplicada em toda cor desenhada: mantém a luminância e afasta (ou aproxima) cada canal do cinza
  private rg(c: Color, a: number): string {
    const k = this.E.cfg.sat;
    if (k === 1) return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], f = (v: number) => Math.max(0, Math.min(255, L + (v - L) * k)) | 0;
    return `rgba(${f(c[0])},${f(c[1])},${f(c[2])},${a})`;
  }

  /** Ponto `u` (0–1) do fio desenhado, por spline Catmull-Rom sobre as posições interpoladas. */
  private pos(s: Strand, u: number): [number, number] {
    const X = s.dx, Y = s.dy, n = this.E.NP - 1, x = clamp(u) * n, i = Math.min(n - 1, Math.floor(x)), t = x - i, t2 = t * t, t3 = t2 * t;
    const g = (k: number) => Math.max(0, Math.min(n, k)), a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2);
    return [
      0.5 * (2 * X[b] + (-X[a] + X[c]) * t + (2 * X[a] - 5 * X[b] + 4 * X[c] - X[d]) * t2 + (-X[a] + 3 * X[b] - 3 * X[c] + X[d]) * t3),
      0.5 * (2 * Y[b] + (-Y[a] + Y[c]) * t + (2 * Y[a] - 5 * Y[b] + 4 * Y[c] - Y[d]) * t2 + (-Y[a] + 3 * Y[b] - 3 * Y[c] + Y[d]) * t3),
    ];
  }

  /** Contágio no ponto `u` de um fio saudável. */
  private infAt(s: Strand, u: number, tn: number): number {
    let v = 0;
    for (const f of s.inf) {
      const a = tn - f.t0, am = sm(clamp(a / 0.5)) * (1 - sm(clamp((a - f.hold) / 1.6))), sp = f.w + 0.07 * sm(clamp(a / Math.max(0.5, f.hold)));
      v += am * Math.exp(-Math.pow((u - f.uc) / sp, 2));
    }
    return Math.min(1, v);
  }

  /** Fita contínua de largura variável entre s0 e s1 (um único polígono por trecho, sem emendas). */
  private ribbon(c: Link, s: Strand, s0: number, s1: number, col: Color, a: number, wd: number, o: RibbonOpts, time: number): void {
    if (s1 - s0 < 0.004 || a < 0.004) return;
    const ctx = this.ctx, M = Math.max(8, Math.ceil(((s1 - s0) * c.g.L) / 4)), X: number[] = [], Y: number[] = [], TX: number[] = [], TY: number[] = [], Wd: number[] = [];
    const TL = o.tl || 0.1;
    for (let j = 0; j <= M; j++) { const p = this.pos(s, s0 + ((s1 - s0) * j) / M); X.push(p[0]); Y.push(p[1]); }
    for (let j = 0; j <= M; j++) {
      const u = s0 + ((s1 - s0) * j) / M, a0 = Math.max(0, j - 1), b0 = Math.min(M, j + 1);
      const tx = X[b0] - X[a0], ty = Y[b0] - Y[a0], l = Math.hypot(tx, ty) || 1;
      TX.push(tx / l); TY.push(ty / l);
      let tip = 1;
      if (o.fa) tip = Math.min(tip, clamp((u - s0) / TL));
      if (o.fb) tip = Math.min(tip, clamp((s1 - u) / TL));
      let w = wd * prof(u) * (0.1 + 0.9 * sm(tip)) * 0.5;
      if (s.td.length) w *= 1 + 0.9 * Math.min(1.2, tdOff(this.E, s, u, time)[2]);
      if (o.neck) w *= 1 - 0.9 * o.neck.k * Math.exp(-Math.pow((u - o.neck.u) / 0.05, 2));
      Wd.push(Math.max(0.09, w));
    }
    const path = (k: number) => {
      ctx.beginPath();
      ctx.moveTo(X[0] - TY[0] * Wd[0] * k, Y[0] + TX[0] * Wd[0] * k);
      for (let j = 1; j <= M; j++) ctx.lineTo(X[j] - TY[j] * Wd[j] * k, Y[j] + TX[j] * Wd[j] * k);
      for (let j = M; j >= 0; j--) ctx.lineTo(X[j] + TY[j] * Wd[j] * k, Y[j] - TX[j] * Wd[j] * k);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(X[0], Y[0], X[M], Y[M]);
    for (let k = 0; k <= 16; k++) {
      const u = s0 + ((s1 - s0) * k) / 16, ef = Math.min(clamp(u / 0.05), clamp((1 - u) / 0.05));
      let tp = 1;
      if (o.fa) tp = Math.min(tp, clamp((u - s0) / TL));
      if (o.fb) tp = Math.min(tp, clamp((s1 - u) / TL));
      const ic = s.inf.length ? this.infAt(s, u, time) : 0;
      g.addColorStop(k / 16, this.rg(ic > 0.01 ? mixc(col, c.col, ic * 0.9) : col, a * (0.2 + 0.8 * sm(ef)) * (0.25 + 0.75 * sm(tp))));
    }
    // borda suave: uma passada mais larga e bem fraca por baixo da principal (tira o serrilhado de fios sub-pixel)
    ctx.fillStyle = g;
    ctx.globalAlpha = Math.min(1, 0.2 * this.E.cfg.glo);
    path(2.6);
    ctx.fill();
    ctx.globalAlpha = 1;
    path(1);
    ctx.fill();
  }

  private dot(p: [number, number], r: number, col: Color, a: number): void {
    a *= this.E.cfg.glo;
    r *= this.E.cfg.pdot;
    if (a < 0.01) return;
    this.dots++;
    const ctx = this.ctx;
    ctx.fillStyle = this.rg(col, a * 0.14);
    ctx.beginPath(); ctx.arc(p[0], p[1], r * 2.3, 0, TAU); ctx.fill();
    ctx.fillStyle = this.rg(col, a);
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
  }

  /** Pontinhos dos pulsos: pequenos e rápidos, movimento contínuo. No bloqueio, viram faíscas vermelhas antes do cadeado. */
  private pulses(c: Link, s: Strand, hot: Color, time: number): void {
    const cfg = this.E.cfg, st = c.st;
    const po = lerp(s.pph, c.sync + s.i * 0.012, c.syn), ftr = clamp(c.tr / cfg.pspd / (c.pc / cfg.pfrq), 0.05, 0.95);
    for (let k = 0; k < 3; k++) {
      const w = c.dw[k];
      if (w < 0.02) continue;
      const phi = fr(c.clk * s.rate + po + k * lerp(0.37, 0.1, c.syn));
      if (phi >= ftr) continue;
      const x = phi / ftr, u = x * 0.65 + 0.35 * sm(x), ef = Math.min(clamp(u / 0.07), clamp((1 - u) / 0.07));
      let a = w * sm(ef) * (0.55 + 0.45 * s.al) * c.dim * (1 + 0.25 * c.hi);
      if (st === "broken" && s.keep) {
        if (fr(time * 0.8 + s.pph * 3 + k * 0.3) > 0.5) continue;
        a *= 0.5 + 0.5 * Math.sin(time * 13 + s.ph[3]);
      }
      let dc = hot;
      const P0 = this.pos(s, u);
      if (c.blk > 0.01) {
        if (c.blk > 0.5 && u > 0.52) continue;
        const fo = sm(clamp((u - 0.38) / 0.14));
        a *= 1 - c.blk * fo;
        dc = mixc(hot, RED, c.blk);
        if (u > 0.3 && c.blk > 0.2) {
          const Q = this.pos(s, Math.min(1, u + 0.012)), tx = Q[0] - P0[0], ty = Q[1] - P0[1], tl = Math.hypot(tx, ty) || 1;
          for (let q = 0; q < 3; q++) {
            const of = (((q * 37 + s.i * 13 + k * 7) % 10) - 4.5) / 4.5, sp2 = sm(clamp((u - 0.34) / 0.18)) * 8 * of;
            this.dot([P0[0] - (ty / tl) * sp2 + (tx / tl) * sp2 * 0.3, P0[1] + (tx / tl) * sp2 + (ty / tl) * sp2 * 0.3], 0.42, dc, 0.55 * c.blk * (1 - fo) * w * sm(clamp((u - 0.3) / 0.06)));
          }
        }
      }
      this.dot(P0, 0.5 + 0.28 * s.w, dc, a);
    }
  }

  /** Fio rompido: cada metade é uma curva própria; na quebra, as pontas tentam se reencontrar. */
  private drawCut(c: Link, s: Strand, col: Color, hot: Color, al: number, wd: number, time: number): void {
    const NP = this.E.NP, st = c.st;
    const rr = st === "retract" ? s.contract : 0, cu = (s.cut / (NP - 1)) * (1 - rr), cu2 = (s.cut + 1) / (NP - 1) + (1 - (s.cut + 1) / (NP - 1)) * rr;
    const fade = st === "retract" ? 1 - rr * rr : 1, br = st === "broken" ? 0.8 + 0.2 * Math.sin(time * 0.8 + s.ph[2]) : 1, a2 = al * fade * br;
    if (fade <= 0.02) return;
    const OX = s.dx, OY = s.dy, k = s.cut;
    // os vizinhos além do corte são extrapolados, sem puxar a ponta para o outro lado
    const AX = new Float64Array(NP), AY = new Float64Array(NP), BX = new Float64Array(NP), BY = new Float64Array(NP);
    for (let j = 0; j < NP; j++) {
      if (j <= k) { AX[j] = OX[j]; AY[j] = OY[j]; } else { AX[j] = OX[k] + (OX[k] - OX[k - 1]) * (j - k); AY[j] = OY[k] + (OY[k] - OY[k - 1]) * (j - k); }
      if (j >= k + 1) { BX[j] = OX[j]; BY[j] = OY[j]; } else { BX[j] = OX[k + 1] + (OX[k + 1] - OX[k + 2]) * (k + 1 - j); BY[j] = OY[k + 1] + (OY[k + 1] - OY[k + 2]) * (k + 1 - j); }
    }
    const brk = st === "broken";
    s.dx = AX; s.dy = AY;
    this.ribbon(c, s, 0, cu, col, a2, wd, brk ? { fb: 1, tl: 0.045 } : { fb: 1 }, time);
    if (brk) {
      const tA: [number, number] = [OX[k], OY[k]], tB: [number, number] = [OX[k + 1], OY[k + 1]];
      let gx = tB[0] - tA[0], gy = tB[1] - tA[1];
      const gl = Math.hypot(gx, gy) || 1;
      gx /= gl; gy /= gl;
      const lim = Math.max(1, gl * 0.5 - 1);
      this.seekDots(c, s, hot, time, true, cu, tA, [gx, gy], 0, lim);
      s.dx = BX; s.dy = BY;
      this.ribbon(c, s, cu2, 1, col, a2, wd, { fa: 1, tl: 0.045 }, time);
      this.seekDots(c, s, hot, time, false, cu2, tB, [-gx, -gy], 0.5, lim);
      // quase encostou: um fiapo treme entre as pontas e uma faísca pisca no meio, mas não segura
      if (gl < 6) {
        const q = 1 - gl / 6, fl = 0.5 + 0.5 * Math.sin(time * 23 + s.ph[3]) * Math.sin(time * 7.1 + s.ph[1]);
        const Mp: [number, number] = [(tA[0] + tB[0]) / 2, (tA[1] + tB[1]) / 2];
        if (gl < 3.5) {
          const ctx = this.ctx;
          ctx.strokeStyle = this.rg(hot, a2 * 0.55 * q * fl);
          ctx.lineWidth = 0.3;
          ctx.beginPath(); ctx.moveTo(tA[0], tA[1]); ctx.lineTo(tB[0], tB[1]); ctx.stroke();
        }
        this.dot(Mp, 0.5, hot, a2 * 0.9 * q * q * fl);
      }
    } else {
      s.dx = BX; s.dy = BY;
      this.ribbon(c, s, cu2, 1, col, a2, wd, { fa: 1 }, time);
    }
    s.dx = OX; s.dy = OY;
  }

  /** Pulsos de cada metade rompida correm até a ponta e tentam alcançar a outra metade. */
  private seekDots(c: Link, s: Strand, hot: Color, time: number, isA: boolean, uEnd: number, tip: [number, number], dir: [number, number], ph: number, lim: number): void {
    for (let k = 0; k < 2; k++) {
      const w = c.dw[k];
      if (w < 0.02) continue;
      const x = fr(c.clk * s.rate * 0.8 + s.pph + k * 0.5 + ph), T = 0.78;
      let p: [number, number], al = w;
      if (x < T) {
        const q = sm(x / T), u = isA ? uEnd * q : 1 - (1 - uEnd) * q;
        p = this.pos(s, u);
        al *= sm(isA ? clamp(u / 0.07) : clamp((1 - u) / 0.07));
      } else {
        const l = (x - T) / (1 - T), d = Math.min(24 * l * (1 - 0.35 * l), lim);
        p = [tip[0] + dir[0] * d + Math.sin(time * 9 + s.ph[1]) * dir[1] * 1.4, tip[1] + dir[1] * d - Math.sin(time * 9 + s.ph[1]) * dir[0] * 1.4];
        al *= Math.pow(1 - l, 1.6) * (0.65 + 0.35 * Math.sin(time * 18 + s.ph[2]));
      }
      this.dot(p, 0.5 + 0.28 * s.w, hot, al * 0.85 * s.al * c.dim);
    }
  }

  private branch(P: [number, number], ang: number, len: number, depth: number, time: number, seed: number, k: number, col: Color, a: number, hot: Color, bf: number): void {
    if (k < 0.03) return;
    const ctx = this.ctx, dx = Math.cos(ang), dy = Math.sin(ang), w = Math.sin(time * (1.3 + (seed % 1)) + seed * 7) * len * 0.32, L = len * k;
    const Ex = P[0] + dx * L, Ey = P[1] + dy * L, Cx = P[0] + dx * L * 0.55 - dy * w * k, Cy = P[1] + dy * L * 0.55 + dx * w * k;
    ctx.lineCap = "round";
    ctx.lineWidth = 0.3 + 0.14 * depth;
    ctx.strokeStyle = this.rg(col, a * (0.5 + 0.12 * depth));
    ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.quadraticCurveTo(Cx, Cy, Ex, Ey); ctx.stroke();
    if (depth > 0 && k > 0.3) {
      const kc = clamp((k - 0.3) / 0.7);
      const kids = bf === 3 ? [[0.4, 1, 0.6], [0.65, -1, 0.52], [0.9, 1, 0.4]] : [[0.5, 1, 0.62], [0.82, -1, 0.5]];
      for (const [t, sg, fl] of kids) {
        const v = 1 - t;
        this.branch([v * v * P[0] + 2 * v * t * Cx + t * t * Ex, v * v * P[1] + 2 * v * t * Cy + t * t * Ey], ang + sg * (0.75 + 0.3 * Math.sin(seed * 3 + t * 5 + time * 0.7)), len * fl, depth - 1, time, seed * 1.7 + sg + t, kc, col, a, hot, bf);
      }
    } else if (depth === 0) {
      ctx.fillStyle = this.rg(hot, a * 0.9);
      ctx.beginPath(); ctx.arc(Ex, Ey, 0.5, 0, TAU); ctx.fill();
    }
  }

  /** Ramificações na ponta de cada tentáculo; na anomalia, os dedos apontam para o fio saudável e o abraçam ao encostar. */
  private fingers(s: Strand, c: Link, hot: Color, time: number, dm: number): void {
    const cfg = this.E.cfg, scol = mixc(c.hc, c.col, s.sk), st = c.st;
    for (const e of s.td) {
      const age = time - e.t0;
      if (age < 0 || age > e.dur) continue;
      const ex = tdEnv(age / e.dur, e), k0 = clamp((ex - (e.spot ? 0.15 : 0.45)) / 0.55);
      if (k0 < 0.02) continue;
      const uc = clamp(e.uc + e.dr * Math.sin(time * e.f2 + e.p2), 0.05, 0.95), P = this.pos(s, uc), Q = this.pos(s, uc + 0.012), O = this.pos(s, uc - 0.012);
      const tx = Q[0] - O[0], ty = Q[1] - O[1], l = Math.hypot(tx, ty) || 1;
      let base = Math.atan2((tx / l) * e.side, (-ty / l) * e.side), near = false;
      if (e.tk != null) {
        const Pt = this.pos(s.cc.strands[e.tk], uc), dd = Math.hypot(Pt[0] - P[0], Pt[1] - P[1]);
        if (dd > 4) base = Math.atan2(Pt[1] - P[1], Pt[0] - P[0]);
        else { base = Math.atan2(ty, tx); near = true; }
      }
      const dep = (st === "testing" ? 3 : st === "anomaly" ? 1 : st === "updating" ? 1 : 0) + (e.spot ? 1 : 0);
      const nf = e.tk != null ? 2 + Math.floor(e.fk * 2) : e.spot ? 2 + Math.floor(e.fk * 2) : st === "testing" ? 2 + Math.floor(e.fk * 2.5) : 1 + Math.floor(e.fk * 2.6);
      const fa = 0.8 * k0 * dm;
      const len0 = (8 + 10 * e.fk) * Math.sqrt(cfg.tdl) * (e.spot ? 1.15 : 1) * (st === "testing" ? 1.15 : 1) * (e.tk != null ? 0.7 : 1);
      for (let k = 0; k < nf; k++) {
        this.branch([P[0], P[1]], base + (k - (nf - 1) / 2) * (near ? 1.4 : 0.9) + Math.sin(time * e.f1 * 0.9 + k * 2.1 + e.p1) * 0.3, len0, e.tk != null ? Math.min(dep, 1) : dep, time, e.fk * 100 + k * 13, k0, scol, fa, hot, st === "testing" ? 3 : 2);
      }
      if (near) this.dot(P, 0.9, hot, 0.7 * k0 * dm);
    }
  }

  /** Quando um nó cobre a ligação e não há por onde desviar, os fios se agarram à borda dele. */
  private grips(c: Link, s: Strand, time: number): void {
    const ctx = this.ctx, NP = this.E.NP;
    for (const id in c.ob) {
      const o = c.ob[id];
      if (o.g < 0.04) continue;
      const r = o.rect, ins = (x: number, y: number) => x > r.left && x < r.right && y > r.top && y < r.bottom;
      for (let j = 0; j < NP - 1; j++) {
        const a = ins(s.dx[j], s.dy[j]), b = ins(s.dx[j + 1], s.dy[j + 1]);
        if (a === b) continue;
        let lo: [number, number] = [s.dx[j], s.dy[j]], hi: [number, number] = [s.dx[j + 1], s.dy[j + 1]];
        for (let it = 0; it < 7; it++) {
          const md: [number, number] = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
          if (ins(md[0], md[1]) === a) lo = md; else hi = md;
        }
        const Pt = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2], dl = Pt[0] - r.left, dr = r.right - Pt[0], dt = Pt[1] - r.top, db = r.bottom - Pt[1], mn = Math.min(dl, dr, dt, db);
        let nx = 0, ny = 0;
        if (mn === dl) nx = -1; else if (mn === dr) nx = 1; else if (mn === dt) ny = -1; else ny = 1;
        const nf = 1 + ((s.i + j) % 2);
        for (let k = 0; k < nf; k++) {
          const sg = (s.i + k) % 2 ? 1 : -1, gp = o.g * (0.5 + 0.5 * Math.sin(time * 1.8 + s.ph[0] + k * 1.9));
          const len = (7 + 17 * (((s.i * 7 + k * 3) % 5) / 4)) * (0.35 + 0.65 * gp), tx = -ny * sg, ty = nx * sg;
          const Ex = Pt[0] + tx * len + nx * 0.5, Ey = Pt[1] + ty * len + ny * 0.5, Cx = Pt[0] + nx * (2.5 + 3 * gp) + tx * len * 0.5, Cy = Pt[1] + ny * (2.5 + 3 * gp) + ty * len * 0.5;
          ctx.lineCap = "round";
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = this.rg(c.col, 0.8 * o.g * c.dim);
          ctx.beginPath(); ctx.moveTo(Pt[0] + nx * 0.6, Pt[1] + ny * 0.6); ctx.quadraticCurveTo(Cx, Cy, Ex, Ey); ctx.stroke();
          this.dot([Ex, Ey], 0.55, lite(c.col, 0.5), 0.9 * o.g * c.dim);
        }
      }
    }
  }

  /** Cadeado no centro do feixe: na seção transversal que passa pelo meio do fio central, a meio caminho entre os fios mais externos. */
  private lockAt(c: Link): [number, number] | null {
    const s0 = c.strands[Math.floor(c.strands.length / 2)];
    if (!s0.init) return null;
    const m = this.pos(s0, 0.5), p1 = this.pos(s0, 0.51), p0 = this.pos(s0, 0.49);
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    let lo = 1e9, hi = -1e9;
    for (const s of c.strands) {
      if (!s.init) continue;
      let pu: [number, number] | null = null, pd = 0;
      for (let i = 0; i <= 40; i++) {
        const p = this.pos(s, 0.2 + (0.6 * i) / 40), d = (p[0] - m[0]) * tx + (p[1] - m[1]) * ty;
        if (pu && pd <= 0 !== d < 0) {
          const t = pd / (pd - d || 1e-9), o = (lerp(pu[0], p[0], t) - m[0]) * nx + (lerp(pu[1], p[1], t) - m[1]) * ny;
          lo = Math.min(lo, o); hi = Math.max(hi, o);
          break;
        }
        pu = p; pd = d;
      }
    }
    if (lo > hi) return m;
    const o = (lo + hi) / 2;
    return [m[0] + nx * o, m[1] + ny * o];
  }

  private lock(c: Link, col: Color): void {
    const m = this.lockAt(c);
    if (!m) return;
    const ctx = this.ctx, a = c.blk;
    ctx.fillStyle = `rgba(23,23,26,${0.95 * a})`;
    ctx.strokeStyle = this.rg(col, 0.85 * a);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(m[0], m[1], 11, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = this.rg(col, 0.85 * a);
    ctx.fillRect(m[0] - 5, m[1] - 2, 10, 7);
    ctx.beginPath(); ctx.arc(m[0], m[1] - 2, 3, Math.PI, 0); ctx.stroke();
  }
}
