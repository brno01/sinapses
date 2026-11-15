import type { Ctx, Link } from "./types";
/** Um passo fixo da física (normalmente 1/60 s) para todos os fios de uma ligação. */
export declare function step(E: Ctx, c: Link, time: number, dt: number): void;
