export declare const TAU: number;
export declare const clamp: (x: number, a?: number, b?: number) => number;
export declare const lerp: (a: number, b: number, t: number) => number;
export declare const fr: (x: number) => number;
/** Suavização cúbica (smoothstep) sem limitar a entrada: chame com valores em [0, 1]. */
export declare const sm: (t: number) => number;
/** Entrada e saída cúbicas. */
export declare const eio: (t: number) => number;
/** Saída com leve passada do alvo (usada no envelope dos tentáculos). */
export declare const eob: (r: number) => number;
/** Gerador pseudoaleatório determinístico (mulberry32). */
export declare const mb: (seed: number) => (() => number);
/** Hash pseudoaleatório em [0, 1) a partir de dois números. */
export declare const hsh: (a: number, b: number) => number;
/** Cor RGB como lista de 3 números (0–255, podem ser fracionários durante as transições). */
export type Color = number[];
export declare const rgb: (hex: string) => Color;
export declare const lite: (c: Color, k: number) => Color;
export declare const mixc: (a: Color, b: Color, t: number) => Color;
