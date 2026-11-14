// Métricas de comportamento no motor em TypeScript, com a configuração de referência (todos os ajustes em 100%) e os
// mesmos limites de tools/check.py. Cada teste reproduz uma sonda de tools/probes/.
import { describe, expect, it } from "vitest";
import { CONFIG_REFERENCE } from "../src/core/config";
import { target } from "../src/core/geometry";
import { rect } from "../src/core/types";
import { run } from "./sim";

const REF = { ...CONFIG_REFERENCE };
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const corr = (a: number[], b: number[]) => {
  const n = Math.min(a.length, b.length), ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n));
  let s1 = 0, s2 = 0, s3 = 0;
  for (let i = 0; i < n; i++) {
    s1 += (a[i] - ma) * (b[i] - mb);
    s2 += (a[i] - ma) ** 2;
    s3 += (b[i] - mb) ** 2;
  }
  return s1 / Math.sqrt(s2 * s3 || 1e-12);
};
const meanCorr = (ser: number[][]) => {
  let t = 0, q = 0;
  for (let a = 0; a < ser.length; a++) for (let b = a + 1; b < ser.length; b++) { t += corr(ser[a], ser[b]); q++; }
  return t / q;
};

describe("comportamento", () => {
  it("quebra: dobras acima de 30° em no máximo 3% das amostras (kinks.py)", () => {
    const st = { inteiros: [0, 0], rompidos: [0, 0] };
    run({
      action: "break", seconds: 10, config: REF,
      sample: (i, { engine }) => {
        if (i <= 30) return;
        for (const s of engine.links[0].strands) {
          if (!s.init) continue;
          const k = s.cut, r = st[k < 0 ? "inteiros" : "rompidos"];
          let mx = 0;
          for (let j = 1; j < engine.NP - 1; j++) {
            if (k >= 0 && (j === k || j === k + 1)) continue;
            const ax = s.x[j] - s.x[j - 1], ay = s.y[j] - s.y[j - 1], bx = s.x[j + 1] - s.x[j], by = s.y[j + 1] - s.y[j];
            const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
            if (la < 0.3 || lb < 0.3) continue;
            mx = Math.max(mx, Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))) * 57.3);
          }
          r[0] += mx > 30 ? 1 : 0;
          r[1]++;
        }
      },
    });
    expect(st.inteiros[0] / st.inteiros[1]).toBeLessThanOrEqual(0.03);
    expect(st.rompidos[0] / st.rompidos[1]).toBeLessThanOrEqual(0.03);
  });

  it("repouso: no máximo 3 cristas por fio (waviness.py)", () => {
    const Z: number[] = [];
    run({
      action: "none", seconds: 8, config: REF,
      sample: (i, { engine }) => {
        if (i <= 120 || i % 10) return;
        const c = engine.links.find((l) => l.id === "chat-api")!;
        for (const s of c.strands) {
          if (!s.init || s.cut >= 0) continue;
          const d: number[] = [];
          for (let j = 2; j < engine.NP - 2; j++) {
            const T = target(engine, s, j / (engine.NP - 1)), q1 = target(engine, s, (j + 1) / (engine.NP - 1)), q0 = target(engine, s, (j - 1) / (engine.NP - 1));
            const tx = q1[0] - q0[0], ty = q1[1] - q0[1], l = Math.hypot(tx, ty) || 1;
            d.push(((s.x[j] - T[0]) * -ty + (s.y[j] - T[1]) * tx) / l);
          }
          const mu = mean(d);
          let z = 0;
          for (let k = 1; k < d.length; k++) if ((d[k] - mu) * (d[k - 1] - mu) < 0) z++;
          Z.push(z / 2);
        }
      },
    });
    expect(mean(Z)).toBeLessThanOrEqual(3);
  });

  it("quebra: as pontas tentam se reencontrar, cada fio no seu ritmo (tips.py)", () => {
    const G: Record<number, number[]> = {};
    run({
      action: "break", seconds: 23, config: REF,
      sample: (i, { engine }) => {
        if (i / 60 < 3) return;
        for (const s of engine.links[0].strands) {
          if (s.cut < 0) continue;
          const k = s.cut;
          (G[s.i] ??= []).push(Math.hypot(s.x[k + 1] - s.x[k], s.y[k + 1] - s.y[k]));
        }
      },
    });
    const ser = Object.values(G);
    const media = mean(ser.map(mean));
    expect(media).toBeGreaterThanOrEqual(8);
    expect(media).toBeLessThanOrEqual(22);
    expect(Math.abs(meanCorr(ser))).toBeLessThanOrEqual(0.4);
    for (const a of ser) expect(Math.min(...a)).toBeLessThan(6);
  });

  it("arraste: o feixe assenta em até 0,5 s (sway.py)", () => {
    const S: number[] = [];
    run({
      action: "none", seconds: 4, config: REF,
      hook: (i, { engine }) => {
        if (i >= 60 && i < 78) engine.setRect("worker", rect(470 + 120 * ((i - 59) / 18), 390, 210, 96));
      },
      sample: (_i, { engine }) => {
        let acc = 0, n = 0;
        for (const s of engine.links[0].strands) {
          if (!s.init || s.cut >= 0) continue;
          for (let j = 2; j < engine.NP - 2; j++) {
            const T = target(engine, s, j / (engine.NP - 1));
            acc += (s.x[j] - T[0]) ** 2 + (s.y[j] - T[1]) ** 2;
            n++;
          }
        }
        S.push(Math.sqrt(acc / Math.max(1, n)));
      },
    });
    const aft = S.slice(78);
    let st = -1;
    for (let k = aft.length - 1; k >= 0; k--) if (aft[k] > 1) { st = k + 1; break; }
    expect(st / 60).toBeGreaterThanOrEqual(0);
    expect(st / 60).toBeLessThanOrEqual(0.5);
  });

  it("em uso: cada fio se mexe sozinho (independence.py)", () => {
    const rows: number[][] = [];
    run({
      action: "flow", seconds: 6, config: REF,
      sample: (i, { engine }) => {
        if (i < Math.round(6 * 60 * 0.35)) return;
        const r: number[] = [];
        for (const s of engine.links[0].strands) {
          if (!s.init || s.cut >= 0) continue;
          const j = Math.floor((engine.NP - 1) * 0.5), T = target(engine, s, j / (engine.NP - 1));
          const dx = s.B!.x - s.A!.x, dy = s.B!.y - s.A!.y, L = Math.hypot(dx, dy);
          r.push(((s.x[j] - T[0]) * -dy + (s.y[j] - T[1]) * dx) / L);
        }
        rows.push(r);
      },
    });
    const ser = rows[0].map((_, k) => rows.map((r) => r[k]));
    expect(Math.abs(meanCorr(ser))).toBeLessThanOrEqual(0.3);
  });
});
