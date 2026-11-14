// Ajustes visuais e de comportamento. Cada valor numérico é um multiplicador (1 = 100%) lido pela física e pelo
// desenho a cada quadro; mudar um ajuste não exige recriar nada, exceto a quantidade de fios e os pontos por fio.

export const POINTS_OPTIONS = [24, 36, 48, 64] as const;
export type PointsPerStrand = (typeof POINTS_OPTIONS)[number];

export interface Config {
  /** Velocidade dos pulsos. */
  pspd: number;
  /** Frequência dos pulsos. */
  pfrq: number;
  /** Tamanho dos pontinhos. */
  pdot: number;
  /** Quantidade de fios (multiplica a quantidade base de cada ligação). */
  nmul: number;
  /** Espessura dos fios. */
  wid: number;
  /** Abertura do feixe no meio do caminho. */
  spr: number;
  /** Onde o feixe começa a abrir, como fração do caminho a partir de cada nó (0–0,4). */
  ops: number;
  /** Brilho (opacidade dos fios, pontinhos e borda suave). */
  glo: number;
  /** Saturação das cores. */
  sat: number;
  /** Vida própria: quanto cada fio se mexe por conta própria. */
  life: number;
  /** Altura das ondas ao longo de cada fio. */
  wav: number;
  /** Comprimento das ondas. */
  wln: number;
  /** Balanço depois de arrastar um nó. */
  sway: number;
  /** Tamanho e frequência dos tentáculos (teste, atualização, anomalia). */
  tdl: number;
  /** Desviar dos outros nós. */
  avd: boolean;
  /** Pontos por fio. */
  np: PointsPerStrand;
}

export const CONFIG_DEFAULT: Readonly<Config> = Object.freeze({
  pspd: 2, pfrq: 1.6, pdot: 1, nmul: 2.5, wid: 1.6, spr: 0.7, ops: 0.1, glo: 1.1, sat: 1.75,
  life: 2.5, wav: 0.8, wln: 3, sway: 1.1, tdl: 1.6, avd: true, np: 48,
});

/** Todos os ajustes em 100%: base estável para medições e testes, independente do padrão escolhido. */
export const CONFIG_REFERENCE: Readonly<Config> = Object.freeze({
  pspd: 1, pfrq: 1, pdot: 1, nmul: 1, wid: 1, spr: 1, ops: 0, glo: 1, sat: 1,
  life: 1, wav: 1, wln: 1, sway: 1, tdl: 1, avd: true, np: 48,
});

/**
 * Presets. "Muitos fios · 60 fps" é o padrão com 106 fios (Quantidade 350%); medido num notebook Intel de 13ª geração,
 * núcleo rápido, sem GPU: ~4,4 ms em uso, ~6,4 ms na anomalia e ~8,7 ms testando (o estado mais pesado).
 */
export const PRESETS = {
  padrao: { label: "Padrão", config: { ...CONFIG_DEFAULT } },
  muitos: { label: "Muitos fios · 60 fps", config: { ...CONFIG_DEFAULT, nmul: 3.5 } },
} satisfies Record<string, { label: string; config: Config }>;
export type PresetId = keyof typeof PRESETS;

/** Mescla valores vindos de fora (por exemplo, salvos no navegador): só aceita chaves conhecidas com o tipo certo. */
export function sanitizeConfig(input: unknown, base: Readonly<Config> = CONFIG_DEFAULT): Config {
  const out: Config = { ...base };
  if (input && typeof input === "object") {
    const src = input as Record<string, unknown>;
    for (const k of Object.keys(base) as (keyof Config)[]) {
      if (typeof src[k] === typeof base[k]) (out as unknown as Record<string, unknown>)[k] = src[k];
    }
  }
  if (!(POINTS_OPTIONS as readonly number[]).includes(out.np)) out.np = 48;
  return out;
}

/** Quantidade de fios de uma ligação com base `n0` para os ajustes atuais. */
export const strandCount = (n0: number, cfg: Readonly<Config>): number => Math.max(2, Math.round(n0 * cfg.nmul));

export const configEquals = (a: Readonly<Config>, b: Readonly<Config>): boolean =>
  (Object.keys(CONFIG_DEFAULT) as (keyof Config)[]).every((k) => a[k] === b[k]);

export type NumericKey = Exclude<keyof Config, "avd" | "np">;

export interface ControlSpec {
  key: NumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
  /** "pct" mostra 100%; "strands" mostra o total de fios. */
  format: "pct" | "strands";
  hint?: string;
}

/** Controles da janela de ajustes, em seções. */
export const CONTROL_SECTIONS: { title: string; controls: ControlSpec[] }[] = [
  {
    title: "Pulsos",
    controls: [
      { key: "pspd", label: "Velocidade", min: 0.3, max: 3, step: 0.05, format: "pct" },
      { key: "pfrq", label: "Frequência", min: 0.3, max: 3, step: 0.05, format: "pct" },
      { key: "pdot", label: "Tamanho", min: 0.5, max: 2.5, step: 0.05, format: "pct" },
    ],
  },
  {
    title: "Fios",
    controls: [
      { key: "nmul", label: "Quantidade", min: 0.3, max: 5, step: 0.05, format: "strands" },
      { key: "wid", label: "Espessura", min: 0.4, max: 2.5, step: 0.05, format: "pct" },
      { key: "spr", label: "Abertura", min: 0, max: 2, step: 0.05, format: "pct" },
      { key: "ops", label: "Início", min: 0, max: 0.4, step: 0.01, format: "pct", hint: "Onde o feixe começa a se abrir, contando de cada nó." },
      { key: "glo", label: "Brilho", min: 0.3, max: 1.6, step: 0.05, format: "pct" },
      { key: "sat", label: "Saturação", min: 0, max: 2, step: 0.05, format: "pct" },
    ],
  },
  {
    title: "Movimento",
    controls: [
      { key: "life", label: "Vida própria", min: 0, max: 5, step: 0.05, format: "pct", hint: "Em 0%, o feixe anda junto, como um traço só." },
      { key: "wav", label: "Ondulação", min: 0, max: 3, step: 0.05, format: "pct" },
      { key: "wln", label: "Comprimento", min: 0.4, max: 6, step: 0.05, format: "pct", hint: "Altura e comprimento das ondas ao longo de cada fio." },
      { key: "sway", label: "Balanço", min: 0.3, max: 3, step: 0.05, format: "pct" },
      { key: "tdl", label: "Tentáculos", min: 0, max: 2, step: 0.05, format: "pct" },
    ],
  },
];
