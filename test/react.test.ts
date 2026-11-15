// @vitest-environment jsdom
import { StrictMode, createElement } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkDef, LinkState, SinapsesOptions } from "../src/index";

interface Fake {
  canvas: HTMLCanvasElement;
  opts: SinapsesOptions;
  setState: ReturnType<typeof vi.fn>;
  setConfig: ReturnType<typeof vi.fn>;
  advance: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}
const made: Fake[] = [];

vi.mock("../src/index", async (orig) => {
  const real = await orig<typeof import("../src/index")>();
  return {
    ...real,
    createSinapses: (canvas: HTMLCanvasElement, opts: SinapsesOptions) => {
      const states = new Map(opts.links.map((l) => [l.id, l.state ?? "flow"]));
      const f: Fake = { canvas, opts, setState: vi.fn((id: string, st: LinkState) => states.set(id, st)), setConfig: vi.fn(), advance: vi.fn(), destroy: vi.fn() };
      made.push(f);
      return { mode: "main", config: {}, runner: null, state: (id: string) => states.get(id), act: vi.fn(), setState: f.setState, sequence: vi.fn(),
        setConfig: f.setConfig, setDragging: vi.fn(), measure: vi.fn(), on: () => () => {}, advance: f.advance, destroy: f.destroy };
    },
  };
});

const { SinapsesCanvas, structureKey, STILL_SETTLE_MS } = await import("../src/react");

const el = (id: string) => {
  const d = document.createElement("div");
  d.id = id;
  document.body.appendChild(d);
  return d;
};
const LINKS: LinkDef[] = [
  { id: "a-b", from: "a", to: "b", strands: 4, state: "idle" },
  { id: "b-c", from: "b", to: "c", strands: 3 },
];

beforeEach(() => {
  made.length = 0;
  document.body.innerHTML = "";
});
afterEach(cleanup);

describe("structureKey", () => {
  it("ignores order and state", () => {
    const k1 = structureKey(LINKS);
    const k2 = structureKey([{ ...LINKS[1], state: "broken" }, LINKS[0]]);
    expect(k1).toBe(k2);
  });
  it("changes with ends, strand count, structural config and still mode", () => {
    const k = structureKey(LINKS);
    expect(structureKey([{ ...LINKS[0], to: "c" }, LINKS[1]])).not.toBe(k);
    expect(structureKey([{ ...LINKS[0], strands: 5 }, LINKS[1]])).not.toBe(k);
    expect(structureKey(LINKS, { config: { nmul: 2 } })).not.toBe(k);
    expect(structureKey(LINKS, { config: { glo: 2 } })).toBe(k);
    expect(structureKey(LINKS, { still: true })).not.toBe(k);
    expect(structureKey(LINKS, { obstacles: ["x", "y"] })).toBe(structureKey(LINKS, { obstacles: ["y", "x", "x"] }));
    expect(structureKey(LINKS, { obstacles: ["x"] })).not.toBe(k);
  });
});

describe("SinapsesCanvas", () => {
  it("creates one engine with the links whose two ends exist, on a canvas inside the box", () => {
    const nodes = { a: el("a"), b: el("b") };
    const { container } = render(createElement(SinapsesCanvas, { nodes, links: LINKS }));
    expect(made).toHaveLength(1);
    expect(made[0].opts.links.map((l) => l.id)).toEqual(["a-b"]);
    expect(Object.keys(made[0].opts.nodes).sort()).toEqual(["a", "b"]);
    expect(container.querySelector("[data-sinapses] > canvas")).toBe(made[0].canvas);
    expect(made[0].canvas.getAttribute("aria-hidden")).toBe("true");
  });

  it("adds resolvable obstacles as nodes (the strands go around them), never as link ends", () => {
    const nodes = { a: el("a"), b: el("b"), x: el("x") };
    render(createElement(SinapsesCanvas, { nodes, links: LINKS, obstacles: ["x", "gone", "a"] }));
    expect(Object.keys(made[0].opts.nodes).sort()).toEqual(["a", "b", "x"]);
    expect(made[0].opts.links.map((l) => l.id)).toEqual(["a-b"]);
  });

  it("resolves nodes through a function after mount", () => {
    const nodes = { a: el("a"), b: el("b"), c: el("c") };
    render(createElement(SinapsesCanvas, { nodes: (id: string) => nodes[id as keyof typeof nodes], links: LINKS }));
    expect(made[0].opts.links.map((l) => l.id)).toEqual(["a-b", "b-c"]);
  });

  it("uses the given states at creation and sends only changes later, without recreating", () => {
    const nodes = { a: el("a"), b: el("b"), c: el("c") };
    const { rerender } = render(createElement(SinapsesCanvas, { nodes, links: LINKS, states: { "a-b": "broken" } }));
    expect(made[0].opts.links.find((l) => l.id === "a-b")?.state).toBe("broken");
    expect(made[0].setState).not.toHaveBeenCalled();
    rerender(createElement(SinapsesCanvas, { nodes, links: LINKS, states: { "a-b": "broken", "b-c": "blocked" } }));
    expect(made).toHaveLength(1);
    expect(made[0].setState).toHaveBeenCalledTimes(1);
    expect(made[0].setState).toHaveBeenCalledWith("b-c", "blocked");
    rerender(createElement(SinapsesCanvas, { nodes, links: [...LINKS], states: { "a-b": "broken", "b-c": "blocked" } }));
    expect(made[0].setState).toHaveBeenCalledTimes(1);
  });

  it("recreates on a new structure with a fresh canvas and destroys the old one", () => {
    const nodes = { a: el("a"), b: el("b"), c: el("c") };
    const { rerender, container } = render(createElement(SinapsesCanvas, { nodes, links: LINKS }));
    rerender(createElement(SinapsesCanvas, { nodes, links: [LINKS[0]] }));
    expect(made).toHaveLength(2);
    expect(made[0].destroy).toHaveBeenCalledTimes(1);
    expect(made[1].canvas).not.toBe(made[0].canvas);
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("passes non-structural config changes through setConfig", () => {
    const nodes = { a: el("a"), b: el("b") };
    const { rerender } = render(createElement(SinapsesCanvas, { nodes, links: LINKS, config: { glo: 1 } }));
    expect(made[0].setConfig).not.toHaveBeenCalled();
    rerender(createElement(SinapsesCanvas, { nodes, links: LINKS, config: { glo: 0.5 } }));
    expect(made).toHaveLength(1);
    expect(made[0].setConfig).toHaveBeenCalledWith({ glo: 0.5 });
  });

  it("destroys on unmount and calls the onReady cleanup", () => {
    const nodes = { a: el("a"), b: el("b") };
    const off = vi.fn();
    const { unmount } = render(createElement(SinapsesCanvas, { nodes, links: LINKS, onReady: () => off }));
    unmount();
    expect(made[0].destroy).toHaveBeenCalledTimes(1);
    expect(off).toHaveBeenCalledTimes(1);
  });

  it("survives StrictMode: every engine gets its own canvas and only one stays alive", () => {
    const nodes = { a: el("a"), b: el("b") };
    const { container } = render(createElement(StrictMode, null, createElement(SinapsesCanvas, { nodes, links: LINKS })));
    expect(made.length).toBeGreaterThanOrEqual(1);
    expect(new Set(made.map((m) => m.canvas)).size).toBe(made.length);
    expect(made.filter((m) => m.destroy.mock.calls.length === 0)).toHaveLength(1);
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("still mode: manual clock, settles once, and draws again only when something changes", () => {
    const nodes = { a: el("a"), b: el("b") };
    const { rerender } = render(createElement(SinapsesCanvas, { nodes, links: LINKS, still: true }));
    const f = made[0];
    expect(f.opts.manual).toBe(true);
    const settled = f.advance.mock.calls.length;
    expect(settled).toBeGreaterThanOrEqual(Math.floor(STILL_SETTLE_MS / (1000 / 60)));
    const last = f.advance.mock.calls.at(-1)![0] as number;
    expect(last).toBeGreaterThanOrEqual(STILL_SETTLE_MS - 1);
    rerender(createElement(SinapsesCanvas, { nodes, links: LINKS, still: true }));
    expect(f.advance.mock.calls.length).toBe(settled);
    rerender(createElement(SinapsesCanvas, { nodes, links: LINKS, still: true, states: { "a-b": "broken" } }));
    expect(f.advance.mock.calls.length).toBeGreaterThan(settled);
    // relógio sempre para a frente
    const times = f.advance.mock.calls.map((c) => c[0] as number);
    expect(times.every((t, i) => i === 0 || t > times[i - 1])).toBe(true);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(f.advance.mock.calls.length).toBeGreaterThan(times.length);
  });

  it("animated mode never touches the manual clock", () => {
    const nodes = { a: el("a"), b: el("b") };
    render(createElement(SinapsesCanvas, { nodes, links: LINKS }));
    expect(made[0].opts.manual).toBe(false);
    expect(made[0].advance).not.toHaveBeenCalled();
  });
});
