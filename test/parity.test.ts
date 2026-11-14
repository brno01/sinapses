// Paridade com a demo antiga: o mesmo cenário tem de produzir as mesmas posições. As fixtures vêm de
// `python3 -I tools/parity_fixtures.py`, que roda a demo de legacy/ num Chrome headless. Math.exp, sin, cos e atan2
// diferem no último bit entre o V8 do Chrome e o do Node, então a comparação usa a assinatura de cada fio com
// tolerância de 0,001 (as somas passam de 10⁴; erro de porta aparece em unidades ou mais).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CONFIG_REFERENCE } from "../src/core/config";
import { rect } from "../src/core/types";
import type { Action } from "../src/core/states";
import { run, signature, signatureDiff, type Scenario } from "./sim";

const fixtures: Record<string, number[][][]> = JSON.parse(
  readFileSync(new URL("./fixtures/legacy-signatures.json", import.meta.url), "utf8"),
);
const TOL = 1e-3;

const check = (key: string, sc: Scenario) => {
  const d = signatureDiff(signature(run(sc).engine), fixtures[key]);
  expect(d, `maior diferença ${d}`).toBeLessThan(TOL);
};

describe("paridade com a demo antiga", () => {
  for (const key of Object.keys(fixtures).filter((k) => /^[a-z]+:\d+$/.test(k))) {
    const [action, sec] = key.split(":");
    it(`${action} por ${sec} s`, () => check(key, { action: action as Action | "none", seconds: +sec }));
  }
  it("quebra com a configuração de referência", () => check("break:6@ref", { action: "break", seconds: 6, config: { ...CONFIG_REFERENCE } }));
  it("teste com 24 pontos por fio", () => check("test:6@np24", { action: "test", seconds: 6, config: { np: 24 } }));
  it("um nó atravessando uma ligação", () => check("obstacle:flow:5", { action: "flow", seconds: 5, rects: { db: rect(470, 150, 210, 96) } }));
  it("arrastando um nó", () =>
    check("drag:none:4", {
      action: "none",
      seconds: 4,
      hook: (i, s) => {
        if (i >= 60 && i < 78) s.engine.setRect("worker", rect(470 + Math.round((120 * (i - 59)) / 18), 390, 210, 96));
      },
    }));
});
