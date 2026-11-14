import type { Config } from "../core/config";
import type { LinkDef } from "../core/link";
import type { Action, LinkState } from "../core/states";
import type { Rect } from "../core/types";
import type { Viewport } from "../render/canvas2d";

export interface InitData {
  view: Viewport;
  nodes: string[];
  links: LinkDef[];
  config: Partial<Config>;
}

export interface InputData {
  ptr?: { x: number; y: number; on: boolean };
  hover?: string | null;
  dragging?: boolean;
  focus?: boolean;
  /** Houve mouse, teclado ou toque agora. */
  activity?: true;
}

/** Comandos da página para o motor (no Worker ou na thread principal). */
export type Command =
  | { t: "rects"; rects: [string, Rect][] }
  | { t: "view"; view: Viewport }
  | { t: "config"; config: Partial<Config> }
  | { t: "act"; id: string; action: Action }
  | { t: "state"; id: string; state: LinkState }
  | { t: "sequence"; id: string; steps: [number, LinkState][] }
  | { t: "input"; input: InputData };

export type ToWorker = { t: "init"; canvas: OffscreenCanvas; init: InitData } | Command | { t: "destroy" };

/** Eventos do motor para a página. */
export type Event = { t: "perf"; ms: number; fps: number } | { t: "state"; id: string; state: LinkState };
