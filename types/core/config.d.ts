export declare const POINTS_OPTIONS: readonly [24, 36, 48, 64];
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
export declare const CONFIG_DEFAULT: Readonly<Config>;
/** Todos os ajustes em 100%: base estável para medições e testes, independente do padrão escolhido. */
export declare const CONFIG_REFERENCE: Readonly<Config>;
/**
 * Presets. "Muitos fios · 60 fps" é o padrão com 106 fios (Quantidade 350%); medido num notebook Intel de 13ª geração,
 * núcleo rápido, sem GPU: ~4,4 ms em uso, ~6,4 ms na anomalia e ~8,7 ms testando (o estado mais pesado).
 */
export declare const PRESETS: {
    padrao: {
        label: string;
        config: {
            pspd: number;
            pfrq: number;
            pdot: number;
            nmul: number;
            wid: number;
            spr: number;
            ops: number;
            glo: number;
            sat: number;
            life: number;
            wav: number;
            wln: number;
            sway: number;
            tdl: number;
            avd: boolean;
            np: PointsPerStrand;
        };
    };
    muitos: {
        label: string;
        config: {
            pspd: number;
            pfrq: number;
            pdot: number;
            wid: number;
            spr: number;
            ops: number;
            glo: number;
            sat: number;
            life: number;
            wav: number;
            wln: number;
            sway: number;
            tdl: number;
            avd: boolean;
            np: PointsPerStrand;
            nmul: number;
        };
    };
};
export type PresetId = keyof typeof PRESETS;
/** Mescla valores vindos de fora (por exemplo, salvos no navegador): só aceita chaves conhecidas com o tipo certo. */
export declare function sanitizeConfig(input: unknown, base?: Readonly<Config>): Config;
/** Quantidade de fios de uma ligação com base `n0` para os ajustes atuais. */
export declare const strandCount: (n0: number, cfg: Readonly<Config>) => number;
export declare const configEquals: (a: Readonly<Config>, b: Readonly<Config>) => boolean;
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
export declare const CONTROL_SECTIONS: {
    title: string;
    controls: ControlSpec[];
}[];
