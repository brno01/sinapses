// Funções numéricas pequenas usadas por todo o motor. A ordem das contas segue a demo original (legacy/),
// para que o mesmo cenário produza exatamente as mesmas posições.

export const TAU = Math.PI * 2;

export const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const fr = (x: number): number => x - Math.floor(x);

/** Suavização cúbica (smoothstep) sem limitar a entrada: chame com valores em [0, 1]. */
export const sm = (t: number): number => t * t * (3 - 2 * t);

/** Entrada e saída cúbicas. */
export const eio = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Saída com leve passada do alvo (usada no envelope dos tentáculos). */
export const eob = (r: number): number => {
  const q = r - 1;
  return 1 + 2.4 * q * q * q + 1.4 * q * q;
};

/** Gerador pseudoaleatório determinístico (mulberry32). */
export const mb = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Hash pseudoaleatório em [0, 1) a partir de dois números. */
export const hsh = (a: number, b: number): number => fr(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453);

/** Cor RGB como lista de 3 números (0–255, podem ser fracionários durante as transições). */
export type Color = number[];

export const rgb = (hex: string): Color => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const lite = (c: Color, k: number): Color => c.map((v) => Math.round(v + (255 - v) * k));
export const mixc = (a: Color, b: Color, t: number): Color => a.map((v, i) => v + (b[i] - v) * t);
