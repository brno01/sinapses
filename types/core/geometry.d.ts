import type { Config } from "./config";
import type { LinkState } from "./states";
import type { Anchor, Ctx, Rect, Strand, Tendril } from "./types";
/** Ponto de saída na borda do retângulo `r`, na direção do ponto `to`, deslocado `off` ao longo da borda. */
export declare function attach(r: Rect, to: [number, number], off: number): Anchor;
/** Curva de Bézier do fio entre as duas pontas, saindo perpendicular às bordas. */
export declare function bz(s: Strand, u: number): [number, number];
/** Envelope da abertura do feixe: fechado junto aos nós até `cfg.ops` (fração do caminho), aberto no meio. */
export declare function openEnv(u: number, cfg: Config): number;
/** Forma-alvo do ponto `u` (0–1) do fio: curva + abertura do feixe + desvio de nós + tentáculos. */
export declare function target(E: Ctx, s: Strand, u: number, notd?: boolean): [number, number];
export interface TendrilParams {
    /** Fração dos tentáculos que viram pontos anômalos pequenos com ramificação. */
    spot?: number;
    /** Quais fios participam. */
    el: (s: Strand) => boolean;
    iv: [number, number];
    amp: [number, number];
    wid: [number, number];
    dur: [number, number];
    rt: [number, number];
    hd: [number, number];
    wr: [number, number];
    tw: [number, number];
    /** Chance por passo de soltar um esporo. */
    emit: number;
}
export declare const TENDRIL_PARAMS: Partial<Record<LinkState, TendrilParams>>;
/** Envelope de um tentáculo ao longo da vida (x de 0 a 1): sai, se mantém e recolhe. */
export declare function tdEnv(x: number, e: Tendril): number;
/**
 * Deslocamento dos tentáculos no ponto `u`: [normal, tangente, peso, puxão x, puxão y, peso dos tentáculos que miram
 * outro fio]. Com `needV`, calcula o puxão em direção ao fio saudável mirado.
 */
export declare function tdOff(E: Ctx, s: Strand, u: number, tn: number, needV?: boolean): [number, number, number, number, number, number];
