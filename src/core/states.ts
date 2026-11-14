// Estados de uma ligação: parâmetros de física e de pulso, cores e rótulos.

export const LINK_STATES = [
  "idle", "flow", "busy", "testing", "updating", "anomaly", "unfurl", "retract", "broken", "blocked", "off",
] as const;
export type LinkState = (typeof LINK_STATES)[number];

/** Estados de operação normal; a cor "saudável" dos fios vem do último deles. */
export type BaseState = "idle" | "flow" | "busy";
export const isBaseState = (s: LinkState): s is BaseState => s === "idle" || s === "flow" || s === "busy";

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

// Cada ligação se aproxima destes valores de forma exponencial, sem saltos.
export const STATE_PARAMS: Record<LinkState, StateParams> = {
  updating: { ks: 0.06, nz: 0.05, dmp: 0.95, tr: 0.9, pc: 1.7, n: 2, am: 0.6 },
  anomaly: { ks: 0.07, nz: 0.1, dmp: 0.94, tr: 0.6, pc: 0.9, n: 3, am: 0.78 },
  idle: { ks: 0.05, nz: 0.07, dmp: 0.955, tr: 1.7, pc: 6, n: 1, am: 0.5 },
  flow: { ks: 0.055, nz: 0.06, dmp: 0.957, tr: 1.0, pc: 2.4, n: 2, am: 0.5 },
  busy: { ks: 0.09, nz: 0.02, dmp: 0.94, tr: 0.7, pc: 1.1, n: 3, am: 0.8 },
  testing: { ks: 0.05, nz: 0.07, dmp: 0.955, tr: 1.2, pc: 3.4, n: 1, am: 0.5 },
  unfurl: { ks: 0.05, nz: 0.07, dmp: 0.955, tr: 1.5, pc: 4, n: 0, am: 0.5 },
  retract: { ks: 0.04, nz: 0.06, dmp: 0.95, tr: 1.5, pc: 4, n: 0, am: 0.5 },
  broken: { ks: 0.045, nz: 0.12, dmp: 0.95, tr: 1.5, pc: 2.2, n: 2, am: 0.9 },
  blocked: { ks: 0.2, nz: 0, dmp: 0.9, tr: 1.4, pc: 2.6, n: 1, am: 0.32 },
  off: { ks: 0.2, nz: 0, dmp: 0.9, tr: 1.5, pc: 4, n: 0, am: 0 },
};

export const STATE_COLORS: Record<LinkState, string> = {
  idle: "#59C37A", flow: "#4FD1E8", busy: "#F2C94C", testing: "#7C8CFF", updating: "#E879F9", anomaly: "#C6F432",
  unfurl: "#3DDC84", retract: "#FF9F43", broken: "#FF4B4B", blocked: "#8D8D92", off: "#6F6F76",
};

export const STATE_LABELS: Record<LinkState, string> = {
  idle: "Repouso", flow: "Em uso", busy: "Operação", testing: "Testando", updating: "Atualizando", anomaly: "Anomalia",
  unfurl: "Ligando", retract: "Desligando", broken: "Quebrada", blocked: "Bloqueada", off: "Desligada",
};

export const STATE_CAPTIONS: Record<LinkState, string> = {
  updating: "tentáculos finos saem do fluxo, se contorcem, se ramificam na ponta e voltam; esporos se soltam e somem.",
  anomaly: "os fios doentes se esticam até fios saudáveis, se prendem a eles e o contágio se espalha no ponto de contato; depois soltam. Pontos anômalos brotam ramificações.",
  idle: "feixe calmo; um pontinho cruza de vez em quando.",
  flow: "pontinhos rápidos e frequentes cruzam o feixe.",
  busy: "o feixe aperta e os pontinhos vêm em ondas, rápidos.",
  testing: "só alguns fios testam; lançam tentáculos que se ramificam em vários níveis para sondar e depois recolhem.",
  unfurl: "os fios crescem dos dois nós, se encontram e uma ondulação suave percorre o feixe.",
  retract: "o fio afina num ponto, se solta e cada metade recolhe pairando.",
  broken: "a maioria dos fios afina e se rompe; as pontas soltas seguem o caminho do feixe e tentam se reencontrar: quase encostam, faíscam e recuam. Poucos continuam ligados, falhando, e os pulsos de cada lado tentam se encontrar.",
  blocked: "feixe cinza; pulsos vermelhos se dispersam em faíscas antes do cadeado.",
  off: "só um traço fantasma entre os nós.",
};

/** Ações de alto nível (as dos botões da demo). Algumas são sequências: ligar → repouso, desligar → desligada. */
export const ACTIONS = ["on", "off", "test", "upd", "anom", "busy", "flow", "break", "block", "idle"] as const;
export type Action = (typeof ACTIONS)[number];
