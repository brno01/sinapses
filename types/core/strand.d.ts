import type { LinkState } from "./states";
import type { Ctx, Link, Strand } from "./types";
/** Cria os fios de uma ligação. A mesma semente gera os mesmos fios para a mesma quantidade. */
export declare function createStrands(c: Link, NP: number): void;
/** Põe o fio inteiro de volta na forma-alvo, parado. */
export declare function reset(E: Ctx, s: Strand): void;
/** Segmento onde o fio se rompe ao desligar ou quebrar. */
export declare const cutIdx: (s: Strand, st: LinkState, NP: number) => number;
/**
 * Folga entre as pontas de um fio quebrado: abre no rompimento; depois, a cada tentativa, as pontas se aproximam,
 * quase encostam, falham e recuam um pouco (cada tentativa chega a uma distância diferente).
 */
export declare function brGap(s: Strand, time: number): number;
