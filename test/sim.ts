// Simulador sem navegador: reproduz a cadência do harness da demo antiga (tools/harness.py) para comparar o motor em
// TypeScript com ela e para medir comportamento nos testes.
import { Engine } from "../src/core/engine";
import { rect, type Rect } from "../src/core/types";
import { Loop } from "../src/runtime/loop";
import type { Action } from "../src/core/states";
import type { Config } from "../src/core/config";
import type { LinkDef } from "../src/core/link";

export const NODE_RECTS: Record<string, Rect> = {
  api: rect(90, 200, 210, 96),
  worker: rect(470, 390, 210, 96),
  chat: rect(870, 190, 210, 96),
  db: rect(870, 420, 210, 96),
};

export const LINKS: LinkDef[] = [
  { id: "api-worker", from: "api", to: "worker", strands: 9, spacing: 1.15, seed: 5, state: "flow" },
  { id: "worker-db", from: "worker", to: "db", strands: 7, spacing: 1.15, seed: 9, state: "idle" },
  { id: "chat-api", from: "chat", to: "api", strands: 8, spacing: 1.15, seed: 13, state: "flow" },
  { id: "worker-chat", from: "worker", to: "chat", strands: 6, spacing: 1.15, seed: 21, state: "idle" },
];

export interface Scenario {
  action?: Action | "none";
  seconds: number;
  config?: Partial<Config>;
  rects?: Partial<Record<string, Rect>>;
  /** Chamado depois de cada quadro i da fase principal (como o __hook das sondas). */
  hook?: (i: number, sim: Sim) => void;
  /** Chamado depois de cada quadro i da fase principal, para medir. */
  sample?: (i: number, sim: Sim) => void;
}

export interface Sim {
  engine: Engine;
  loop: Loop;
  t: number;
}

/** Roda um cenário: 30 quadros de aquecimento, a ação na ligação api-worker e `seconds` de simulação a 60 quadros/s. */
export function run(sc: Scenario): Sim {
  const engine = new Engine({ nodes: Object.keys(NODE_RECTS), links: LINKS, config: sc.config });
  for (const [id, r] of Object.entries({ ...NODE_RECTS, ...sc.rects })) if (r) engine.setRect(id, r);
  const loop = new Loop(engine, null, 0);
  const sim: Sim = { engine, loop, t: 0 };
  for (let i = 0; i < 30; i++) {
    sim.t += 1000 / 60;
    loop.frame(sim.t);
  }
  if (sc.action && sc.action !== "none") engine.act("api-worker", sc.action, sim.t);
  const N = Math.round(sc.seconds * 60);
  for (let i = 0; i < N; i++) {
    sim.t += 1000 / 60;
    loop.frame(sim.t);
    sc.hook?.(i, sim);
    sc.sample?.(i, sim);
  }
  return sim;
}

/** Mesma impressão digital da sonda tools/probes/positions.py. */
export function positionsHash(engine: Engine): { hash: number; nos: number } {
  let h = 0, n = 0;
  for (const c of engine.links)
    for (const s of c.strands)
      for (let j = 0; j < engine.NP; j++) {
        h = (h * 31 + Math.round(s.x[j] * 1e6)) % 2147483647;
        h = (h * 31 + Math.round(s.y[j] * 1e6)) % 2147483647;
        n++;
      }
  return { hash: h, nos: n };
}

/** Mesma assinatura da sonda tools/probes/signature.py: por fio, [Σx, Σy, Σx·j, Σy·j]. */
export function signature(engine: Engine): number[][][] {
  return engine.links.map((c) =>
    c.strands.map((s) => {
      let a = 0, b = 0, cx = 0, cy = 0;
      for (let j = 0; j < engine.NP; j++) {
        a += s.x[j];
        b += s.y[j];
        cx += s.x[j] * j;
        cy += s.y[j] * j;
      }
      return [a, b, cx, cy].map((v) => Math.round(v * 1e6) / 1e6);
    }),
  );
}

/** Maior diferença absoluta entre duas assinaturas (Infinity se a forma não bate). */
export function signatureDiff(a: number[][][], b: number[][][]): number {
  if (a.length !== b.length) return Infinity;
  let mx = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return Infinity;
    for (let j = 0; j < a[i].length; j++) for (let k = 0; k < 4; k++) mx = Math.max(mx, Math.abs(a[i][j][k] - b[i][j][k]));
  }
  return mx;
}
