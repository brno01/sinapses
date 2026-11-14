import { TAU, clamp, eio, lerp } from "./math";
import { TENDRIL_PARAMS, bz, target, tdOff } from "./geometry";
import { brGap, cutIdx, reset } from "./strand";
import type { Ctx, Link } from "./types";

/** Um passo fixo da física (normalmente 1/60 s) para todos os fios de uma ligação. */
export function step(E: Ctx, c: Link, time: number, dt: number): void {
  void dt;
  const st = c.st, ts = time - c.t0, NP = E.NP, cfg = E.cfg;
  E.tn = time;
  for (const s of c.strands) {
    if (!s.A || !s.B) continue;
    if (!s.init) reset(E, s);
    if (st === "off") continue;
    const cdt = st === "retract" ? 0.8 + s.dly * 0.55 : 0.3 + s.dly * 0.55;
    if (s.cut < 0 && (st === "retract" || st === "broken") && ts > cdt && !(st === "broken" && s.keep)) {
      const k = cutIdx(s, st, NP);
      s.cut = k;
      s.alive[k] = false;
      s.cutT = time;
      for (let j = 0; j < NP; j++) {
        const isA = j <= k, an = isA ? s.A : s.B, f = (isA ? j : NP - 1 - j) / Math.max(1, isA ? k : NP - 2 - k);
        const vx = an.x - s.x[j], vy = an.y - s.y[j], L = Math.hypot(vx, vy) || 1, mag = (st === "broken" ? 0.06 : 0.2) * s.rec * Math.pow(f, 1.5);
        s.px[j] = s.x[j] - (vx / L) * mag;
        s.py[j] = s.y[j] - (vy / L) * mag;
      }
    }
    // comprimento de repouso de cada segmento = distância entre nós vizinhos da forma-alvo (o espaçamento do alvo não
    // é uniforme; um comprimento único forçava zigue-zague junto aos nós)
    const rl = s.rl || (s.rl = new Float64Array(NP - 1)), brk = st === "broken" && s.cut >= 0;
    if (brk) {
      s.tok = false;
      // quebrada: cada metade segue o caminho do feixe intacto até perto do corte; a folga entre as pontas abre e fecha
      const TX = s.tgx || (s.tgx = new Float64Array(NP)), TY = s.tgy || (s.tgy = new Float64Array(NP)), k = s.cut, g = brGap(s, time);
      const wA = 0.5 + 0.22 * Math.sin(time * 0.37 + s.ph[0]), um = (k + 0.5) / (NP - 1), Lt = s.Lt || c.g.L;
      const uA = Math.max(0.05, um - (g * wA) / Lt), uB = Math.min(0.95, um + (g * (1 - wA)) / Lt);
      s.gap = g;
      for (let j = 0; j < NP; j++) {
        const t = target(E, s, j <= k ? (j / k) * uA : uB + ((j - k - 1) / (NP - 2 - k)) * (1 - uB));
        TX[j] = t[0];
        TY[j] = t[1];
      }
      let sl = 0;
      for (let j = 0; j < NP - 1; j++) {
        const d = Math.hypot(TX[j + 1] - TX[j], TY[j + 1] - TY[j]);
        sl += d;
        rl[j] = j === k ? 0 : d;
      }
      s.Lt = sl;
    } else {
      // forma-alvo de cada nó (posição, normal e comprimentos de repouso): calculada uma vez e reaproveitada enquanto
      // nada de que ela depende muda (pontas do fio, direção da ligação, abertura e início do feixe, desvio de nós) e o
      // fio não tem tentáculos
      const A = s.A, B = s.B, K = s.tkey || (s.tkey = new Float64Array(13));
      const kv = [A.x, A.y, A.nx, A.ny, B.x, B.y, B.nx, B.ny, cfg.spr, cfg.ops, c.dvVer || 0, c.nx, c.ny];
      let ok = s.tok && !s.td.length;
      if (ok) for (let q = 0; q < 13; q++) if (K[q] !== kv[q]) { ok = false; break; }
      if (!ok) {
        const TX = s.tgx || (s.tgx = new Float64Array(NP)), TY = s.tgy || (s.tgy = new Float64Array(NP));
        const NX = s.tnx || (s.tnx = new Float64Array(NP)), NY = s.tny || (s.tny = new Float64Array(NP));
        let tp = target(E, s, 0), sl = 0;
        TX[0] = tp[0];
        TY[0] = tp[1];
        for (let j = 1; j < NP; j++) {
          const t = target(E, s, j / (NP - 1));
          TX[j] = t[0];
          TY[j] = t[1];
          rl[j - 1] = Math.hypot(t[0] - tp[0], t[1] - tp[1]);
          sl += rl[j - 1];
          tp = t;
        }
        s.Lt = sl;
        for (let j = 1; j < NP - 1; j++) {
          const u = j / (NP - 1), q1 = bz(s, Math.min(1, u + 0.01)), q0 = bz(s, Math.max(0, u - 0.01)), tl = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1;
          NX[j] = -(q1[1] - q0[1]) / tl;
          NY[j] = (q1[0] - q0[0]) / tl;
        }
        K.set(kv);
        s.tok = !s.td.length;
      }
    }
    const cA = s.cA || (s.cA = new Float64Array(NP)), cB = s.cB || (s.cB = new Float64Array(NP));
    for (let k = 1; k < NP; k++) {
      cA[k] = cA[k - 1] + rl[k - 1];
      cB[k] = cB[k - 1] + rl[NP - 1 - k];
    }
    s.td = s.td.filter((e) => time - e.t0 <= e.dur);
    s.inf = s.inf.filter((f) => time - f.t0 < f.hold + 2.2);
    // o fio doente encostou no saudável: o contágio começa no ponto de contato
    for (const e of s.td) {
      if (e.tk != null && !e.cd && (time - e.t0) / e.dur > e.rt) {
        e.cd = 1;
        const h = s.cc.strands[e.tk];
        h.inf.push({ uc: e.uc, t0: time, hold: (e.hd - e.rt) * e.dur, w: 0.05 + 0.05 * s.rnd() });
        h.rip = time;
      }
    }
    const TP = TENDRIL_PARAMS[st];
    if (s.cut < 0 && cfg.tdl > 0.02 && TP && TP.el(s) && time >= s.nxt) {
      const q = TP, r = s.rnd, R2 = (a: [number, number]) => a[0] + (a[1] - a[0]) * r();
      let sp = r() < (q.spot || 0);
      let tk: number | null = null;
      if (st === "anomaly" && !sp && s.td.some((e) => e.tk != null)) sp = true;
      if (st === "anomaly" && !sp) {
        const hs = c.strands.filter((t) => !t.upd);
        if (hs.length) {
          const far = hs.filter((t) => Math.abs(t.i - s.i) >= 2), pool = far.length ? far : hs;
          tk = pool[Math.floor(r() * pool.length)].i;
        }
      }
      // a ordem das chamadas a r() segue a demo original: não reordene
      const dur = tk != null ? R2([2.8, 3.8]) : R2(q.dur) * (sp ? 1.3 : 1);
      const uc = 0.28 + 0.44 * r();
      const wid = sp ? 0.035 : tk != null ? R2([0.1, 0.16]) : R2(q.wid);
      const amp = Math.min(R2(q.amp), c.g.L * 0.3) * (sp ? 0.12 : 1) * cfg.tdl;
      const side = r() < 0.5 ? -1 : 1;
      const rt = tk != null ? R2([0.22, 0.3]) : R2(q.rt);
      const hd = tk != null ? R2([0.72, 0.8]) : R2(q.hd);
      const wr = R2(q.wr), tw = R2(q.tw), f1 = 2.2 + r() * 2.4, f2 = 0.5 + r() * 0.7, p1 = r() * TAU, p2 = r() * TAU;
      const dr = 0.035 + 0.05 * r(), fk = r(), ln = (r() - 0.5) * 1.6;
      s.td.push({ tk, spot: sp, t0: time, dur, uc, wid, amp, side, rt, hd, wr, tw, f1, f2, p1, p2, dr, fk, ln });
      s.nxt = time + R2(q.iv) / clamp(cfg.tdl, 0.5, 2);
    }
    if (TP && TP.emit) {
      for (const e of s.td) {
        const x = (time - e.t0) / e.dur;
        if (x > e.rt && x < e.hd && s.rnd() < TP.emit) {
          const j = clamp(Math.round(e.uc * (NP - 1)), 2, NP - 3), b = bz(s, j / (NP - 1));
          const dx = s.x[j] - b[0], dy = s.y[j] - b[1], l = Math.hypot(dx, dy) || 1, v = 14 + 16 * s.rnd(), pw = (s.rnd() - 0.5) * 14;
          E.spores.push({ x: s.x[j], y: s.y[j], vx: (dx / l) * v - (dy / l) * pw, vy: (dy / l) * v + (dx / l) * pw, t0: time, life: 1 + 0.8 * s.rnd(), col: c.col.slice() });
        }
      }
    }
    s.contract = st === "retract" && s.cut >= 0 ? eio(clamp((time - s.cutT - 0.35 - s.dly * 0.2) / (1.7 / s.rs))) : 0;
    const free = s.cut >= 0, rage = time - s.rip - s.i * 0.035, mvk = clamp(c.mv / 250);
    const dmpm = clamp(1 - (1 - lerp(Math.pow(c.dmp, 3), 0.8, clamp(c.mv / 200))) / cfg.sway, 0.5, 0.993);
    for (let j = 1; j < NP - 1; j++) {
      const u = j / (NP - 1);
      let fx = 0, fy = 0;
      if (free && brk) {
        const isA = j <= s.cut, idx = isA ? j : NP - 1 - j, cnt = isA ? s.cut : NP - 2 - s.cut, f = idx / Math.max(1, cnt);
        const TX = s.tgx!, TY = s.tgy!, j0 = j - 1, j1 = j + 1;
        let tx = TX[j1] - TX[j0], ty = TY[j1] - TY[j0];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        // a ponta procura a outra: oscila de lado mais quando está longe e se alinha quando chega perto
        const te = time - s.cutT, gr = clamp(s.gap / 24);
        const srch = (1 + 2.6 * gr) * (0.6 + 0.5 * s.wa) * Math.pow(f, 2.2) * Math.sin(time * (1.3 + 0.7 * s.rs) + s.ph[isA ? 3 : 2] + f * 1.6);
        const wv = (0.5 + 1.2 * s.wa) * Math.pow(f, 1.3) * (Math.sin(time * s.wf[0] * 2.4 - f * s.wk[0] * TAU + s.ph[0]) + 0.5 * Math.sin(time * s.wf[1] * 3 - f * s.wk[1] * TAU + s.ph[1]));
        const trm = 0.7 * (1 - clamp(s.gap / 7)) * Math.pow(f, 4) * Math.sin(time * 19 + s.ph[isA ? 2 : 3]);
        const lat = (srch + wv) * cfg.life + trm;
        const kp = (0.035 + 0.1 * Math.exp(-te * 2.2)) * (0.8 + 0.4 * s.stf) * (1 - 0.3 * f) * (1 + 2 * mvk);
        fx = kp * (TX[j] - ty * lat - s.x[j]);
        fy = kp * (TY[j] + tx * lat - s.y[j]);
        const dd = lerp(lerp(0.9, 0.962, clamp(te / 1.2)), 0.84, clamp(c.mv / 200)), vx = (s.x[j] - s.px[j]) * dd, vy = (s.y[j] - s.py[j]) * dd;
        s.px[j] = s.x[j];
        s.py[j] = s.y[j];
        s.x[j] += vx + fx;
        s.y[j] += vy + fy;
        continue;
      }
      if (free) {
        // desligando: cada metade recolhe pairando, esticada na direção de saída do seu nó
        const isA = j <= s.cut, an = isA ? s.A : s.B, idx = isA ? j : NP - 1 - j, cnt = isA ? s.cut : NP - 2 - s.cut, f = idx / Math.max(1, cnt);
        const len = (isA ? cA[idx] : cB[idx]) * 0.985, lat = s.a * 0.12 * (1 - 0.85 * f);
        const Tx = an.x + an.nx * len + an.tx * lat, Ty = an.y + an.ny * len + an.ty * lat;
        const kp = (0.02 + 0.13 * Math.exp(-(time - s.cutT) * 2.6)) * (0.8 + 0.4 * s.stf) * (1 - 0.5 * f) * (1 + 2 * mvk);
        const Wp = (1.5 + 4 * s.wa) * Math.pow(f, 1.4) * cfg.life;
        const wv = Wp * (Math.sin(time * s.wf[0] * 3 - f * s.wk[0] * TAU + s.ph[0]) + 0.5 * Math.sin(time * s.wf[1] * 3.7 - f * s.wk[1] * TAU + s.ph[1]));
        fx = kp * (Tx - s.x[j]) + kp * wv * an.tx;
        fy = kp * (Ty - s.y[j]) + kp * wv * an.ty;
        const dd = lerp(lerp(0.93, s.fd, clamp((time - s.cutT) / 1.4)), 0.84, clamp(c.mv / 200)), vx = (s.x[j] - s.px[j]) * dd, vy = (s.y[j] - s.py[j]) * dd;
        s.px[j] = s.x[j];
        s.py[j] = s.y[j];
        s.x[j] += vx + fx;
        s.y[j] += vy + fy;
        continue;
      }
      const T0 = s.tgx![j], T1 = s.tgy![j], nx = s.tnx![j], ny = s.tny![j];
      const tdv = s.td.length ? tdOff(E, s, u, time) : null, act = tdv ? tdv[2] : 0, wt = tdv ? Math.min(1, tdv[5]) : 0;
      const ksj = c.ks * lerp(1 + (s.stf - 1) * Math.min(1, cfg.life), 1, mvk) * (1 + 2.2 * Math.min(1, act)) * (1 + 4 * wt) * (1 + (1.5 * mvk) / cfg.sway) * (1 + 2 * c.dvAct);
      const dl = lerp(dmpm, 0.7, wt);
      fx += (T0 - s.x[j]) * ksj;
      fy += (T1 - s.y[j]) * ksj;
      const env = Math.pow(Math.sin(Math.PI * u), 1.2), Ap = c.nz * 8 * s.wa * env * ksj * cfg.life * cfg.wav;
      const wv = Ap * (Math.sin(time * s.wf[0] * 3 - ((u * s.wk[0]) / cfg.wln) * TAU + s.ph[0]) + 0.5 * Math.sin(time * s.wf[1] * 3.7 - ((u * s.wk[1]) / cfg.wln) * TAU + s.ph[1]));
      fx += nx * wv;
      fy += ny * wv;
      if (st === "broken" && s.keep) {
        const jj = 0.03 * cfg.life * Math.sin(Math.PI * u) * Math.sin(time * 11 + u * 14 + s.ph[0]) * (0.5 + 0.5 * Math.sin(time * 1.7 + s.ph[1]));
        fx += nx * jj;
        fy += ny * jj;
      }
      // ondulação suave em mudança de estado: percorre o feixe e se apaga
      if (rage > 0 && rage < 2.4) {
        const amp = 0.1 * Math.min(1, cfg.life) * Math.exp(-2 * rage) * Math.sin(Math.PI * u) * Math.sin(TAU * (u * 1.3 - rage * 1.1));
        fx += nx * amp;
        fy += ny * amp;
      }
      // o mouse afasta os fios de leve; a mola da forma os traz de volta
      if (E.ptr.on && !E.dragging) {
        const ddx = s.x[j] - E.ptr.x, ddy = s.y[j] - E.ptr.y, d2 = ddx * ddx + ddy * ddy;
        if (d2 < 4900) {
          const d = Math.sqrt(d2) || 1, kk = 1 - d / 70;
          fx += (ddx / d) * kk * kk * 0.5;
          fy += (ddy / d) * kk * kk * 0.5;
        }
      }
      const vx = (s.x[j] - s.px[j]) * dl, vy = (s.y[j] - s.py[j]) * dl;
      s.px[j] = s.x[j];
      s.py[j] = s.y[j];
      s.x[j] += vx + fx;
      s.y[j] += vy + fy;
    }
    s.x[0] = s.A.x;
    s.y[0] = s.A.y;
    s.x[NP - 1] = s.B.x;
    s.y[NP - 1] = s.B.y;
    // restrições de comprimento: 8 iterações para fios inteiros (medido: mesma qualidade que 16), 10 para metades soltas
    for (let it = 0; it < (free ? 10 : 8); it++) {
      for (let j = 0; j < NP - 1; j++) {
        if (!s.alive[j]) continue;
        const dx = s.x[j + 1] - s.x[j], dy = s.y[j + 1] - s.y[j], d = Math.hypot(dx, dy) || 1e-6, diff = (d - rl[j]) / d;
        let w0 = j === 0 ? 0 : 0.5, w1 = j + 1 === NP - 1 ? 0 : 0.5;
        if (j === 0) w1 = 1;
        if (j + 1 === NP - 1) w0 = 1;
        s.x[j] += dx * diff * w0;
        s.y[j] += dy * diff * w0;
        s.x[j + 1] -= dx * diff * w1;
        s.y[j + 1] -= dy * diff * w1;
      }
      s.x[0] = s.A.x;
      s.y[0] = s.A.y;
      s.x[NP - 1] = s.B.x;
      s.y[NP - 1] = s.B.y;
    }
    // nenhum ponto de um fio inteiro fica dentro de um nó obstáculo: sai pelo lado do desvio
    if (!free) {
      for (const id in c.ob) {
        const o = c.ob[id];
        if (o.g > 0.5 || !o.rect) continue;
        const r = o.rect, e = 5, L0 = r.left - e, R0 = r.right + e, T0 = r.top - e, B0 = r.bottom + e, sg = o.v >= 0 ? 1 : -1;
        for (let j = 1; j < NP - 1; j++) {
          const x = s.x[j], y = s.y[j];
          if (x > L0 && x < R0 && y > T0 && y < B0) {
            let lo = -1e9, hi = 1e9;
            for (const [o1, d, a0, a1] of [[x, c.nx, L0, R0], [y, c.ny, T0, B0]]) {
              if (Math.abs(d) > 1e-6) {
                let q1 = (a0 - o1) / d, q2 = (a1 - o1) / d;
                if (q1 > q2) [q1, q2] = [q2, q1];
                lo = Math.max(lo, q1);
                hi = Math.min(hi, q2);
              }
            }
            const t = sg > 0 ? hi : lo;
            if (Math.abs(t) < 400) {
              const X2 = x + c.nx * t, Y2 = y + c.ny * t;
              s.x[j] = X2;
              s.y[j] = Y2;
              s.px[j] = lerp(s.px[j], X2, 0.6);
              s.py[j] = lerp(s.py[j], Y2, 0.6);
            }
          }
        }
      }
    }
    s.ax.set(s.bx);
    s.ay.set(s.by);
    s.bx.set(s.x);
    s.by.set(s.y);
  }
}
