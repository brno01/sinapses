import { clamp } from "./math";
import { CONFIG_DEFAULT, sanitizeConfig, strandCount, type Config } from "./config";
import { createLink, geoC, go, type LinkDef } from "./link";
import { step } from "./physics";
import { createStrands } from "./strand";
import type { Action, LinkState } from "./states";
import type { Ctx, Link, Rect, Spore } from "./types";

export interface EngineOptions {
  /** Ids dos nós, na ordem em que aparecem (a ordem define a prioridade no desvio). */
  nodes: string[];
  links: LinkDef[];
  config?: Partial<Config>;
}

interface Timer {
  due: number;
  link: Link;
  fn: (nowMs: number) => void;
}

/**
 * Motor: nós, ligações e física. Não conhece DOM nem canvas; o tempo entra em milissegundos (`nowMs`) para que as
 * sequências (ligar, desligar, testar...) disparem no mesmo quadro em qualquer ambiente.
 */
export class Engine implements Ctx {
  cfg: Config;
  NP: number;
  tn = 0;
  spores: Spore[] = [];
  ptr = { x: -999, y: -999, on: false };
  dragging = false;
  hover: string | null = null;
  links: Link[];
  nodeIds: string[];
  rects = new Map<string, Rect>();
  /** Chamado sempre que uma ligação troca de estado. */
  onState: ((link: Link) => void) | null = null;
  private timers: Timer[] = [];

  constructor(o: EngineOptions) {
    this.cfg = sanitizeConfig(o.config ?? {}, CONFIG_DEFAULT);
    this.NP = this.cfg.np;
    this.nodeIds = [...o.nodes];
    this.links = o.links.map((d) => createLink(d, this));
  }

  link(id: string): Link | undefined {
    return this.links.find((c) => c.id === id);
  }

  setRect(id: string, r: Rect): void {
    this.rects.set(id, { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  }

  /** Aplica ajustes. Quantidade de fios e pontos por fio recriam só os fios afetados. */
  setConfig(partial: Partial<Config>): void {
    const prev = this.cfg;
    this.cfg = sanitizeConfig({ ...prev, ...partial }, prev);
    if (this.cfg.np !== prev.np) {
      this.NP = this.cfg.np;
      this.rebuild(true);
    } else if (this.cfg.nmul !== prev.nmul) this.rebuild(false);
  }

  private rebuild(all: boolean): void {
    for (const c of this.links) {
      const n = strandCount(c.n0, this.cfg);
      if (all || n !== c.ns) {
        c.ns = n;
        createStrands(c, this.NP);
      }
    }
  }

  /** Troca o estado de uma ligação na hora, cancelando sequências pendentes. */
  setState(id: string, st: LinkState, nowMs: number): void {
    const c = this.link(id);
    if (!c) return;
    this.stop(c);
    this.go(c, st, nowMs);
  }

  /** Sequência de estados: cada passo é [atraso em ms a partir de agora, estado]. Cancela a sequência anterior. */
  sequence(id: string, steps: [number, LinkState][], nowMs: number): void {
    const c = this.link(id);
    if (!c) return;
    this.stop(c);
    for (const [ms, st] of steps) {
      if (ms <= 0) this.go(c, st, nowMs);
      else this.later(c, nowMs, ms, (t) => this.go(c, st, t));
    }
  }

  /** Ações dos botões. Ligar e desligar são sequências; teste, atualização e anomalia voltam a "em uso" sozinhos. */
  act(id: string, a: Action, nowMs: number): void {
    const c = this.link(id);
    if (!c) return;
    this.stop(c);
    const dead = c.st === "off" || c.st === "broken" || c.st === "retract";
    const live: Partial<Record<Action, LinkState>> = { idle: "idle", flow: "flow", busy: "busy", test: "testing", upd: "updating", anom: "anomaly", block: "blocked" };
    if (a === "on") {
      this.go(c, "unfurl", nowMs);
      this.later(c, nowMs, 4000, (t) => this.go(c, "idle", t));
    } else if (a === "off") {
      this.go(c, "retract", nowMs);
      this.later(c, nowMs, 4800, (t) => this.go(c, "off", t));
    } else if (a === "break") this.go(c, "broken", nowMs);
    else {
      const t = live[a];
      if (!t) return;
      if (dead) {
        this.go(c, "unfurl", nowMs);
        this.later(c, nowMs, 3900, (x) => this.go(c, t, x));
      } else {
        this.go(c, t, nowMs);
        if (a === "test") this.later(c, nowMs, 7500, (x) => this.go(c, "flow", x));
        if (a === "upd") this.later(c, nowMs, 11000, (x) => this.go(c, "flow", x));
        if (a === "anom") this.later(c, nowMs, 9000, (x) => this.go(c, "flow", x));
      }
    }
  }

  private go(c: Link, st: LinkState, nowMs: number): void {
    go(this, c, st, nowMs / 1000);
    this.onState?.(c);
  }

  private later(c: Link, nowMs: number, ms: number, fn: (nowMs: number) => void): void {
    this.timers.push({ due: nowMs + ms, link: c, fn });
  }

  private stop(c: Link): void {
    this.timers = this.timers.filter((t) => t.link !== c);
  }

  /** Dispara as sequências vencidas. */
  runTimers(nowMs: number): void {
    for (let q = this.timers.length - 1; q >= 0; q--) {
      const t = this.timers[q];
      if (t && t.due <= nowMs) {
        this.timers.splice(q, 1);
        t.fn(nowMs);
      }
    }
  }

  /** Pontas, desvio e suavização de todas as ligações. */
  geometry(dt: number): void {
    for (const c of this.links) geoC(this, c, dt);
  }

  /** Um passo fixo da física em todas as ligações. */
  step(time: number, dt: number): void {
    for (const c of this.links) step(this, c, time, dt);
  }

  /** Marcas que dependem do quadro desenhado: fim do crescimento ao ligar (dispara a ondulação) e esporos vencidos. */
  frameMarks(time: number): void {
    for (const c of this.links) {
      if (c.st !== "unfurl") continue;
      const ts = time - c.t0;
      for (const s of c.strands) {
        if (!s.A || !s.init) continue;
        const d = clamp((ts - s.dly * 0.6) / (2.2 / s.rs));
        if (d >= 1) {
          if (!s.met) { s.met = 1; s.rip = time; }
        } else s.met = 0;
      }
    }
    for (let i = this.spores.length - 1; i >= 0; i--) if (time - this.spores[i].t0 > this.spores[i].life) this.spores.splice(i, 1);
  }

  /** Nada se movendo rápido: sem arraste, tentáculos, esporos ou mudança de estado recente. */
  quiet(time: number): boolean {
    if (this.dragging || this.spores.length) return false;
    for (const c of this.links) {
      if (time - c.t0 < 6 || c.mv > 1) return false;
      for (const s of c.strands) if (s.td.length) return false;
    }
    return true;
  }
}

