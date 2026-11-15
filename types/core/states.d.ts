export declare const LINK_STATES: readonly ["idle", "flow", "busy", "testing", "updating", "anomaly", "unfurl", "retract", "broken", "blocked", "off"];
export type LinkState = (typeof LINK_STATES)[number];
/** Estados de operação normal; a cor "saudável" dos fios vem do último deles. */
export type BaseState = "idle" | "flow" | "busy";
export declare const isBaseState: (s: LinkState) => s is BaseState;
export interface StateParams {
    /** Rigidez da mola que puxa cada ponto para a forma-alvo. */
    ks: number;
    /** Ruído (ondas próprias de cada fio). */
    nz: number;
    /** Amortecimento. */
    dmp: number;
    /** Tempo que um pulso leva para cruzar (s). */
    tr: number;
    /** Período entre pulsos (s). */
    pc: number;
    /** Quantos pulsos por fio (0–3). */
    n: number;
    /** Opacidade do feixe. */
    am: number;
}
export declare const STATE_PARAMS: Record<LinkState, StateParams>;
export declare const STATE_COLORS: Record<LinkState, string>;
export declare const STATE_LABELS: Record<LinkState, string>;
export declare const STATE_CAPTIONS: Record<LinkState, string>;
/** Ações de alto nível (as dos botões da demo). Algumas são sequências: ligar → repouso, desligar → desligada. */
export declare const ACTIONS: readonly ["on", "off", "test", "upd", "anom", "busy", "flow", "break", "block", "idle"];
export type Action = (typeof ACTIONS)[number];
