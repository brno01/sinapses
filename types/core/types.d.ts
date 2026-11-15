import type { Color } from "./math";
import type { Config } from "./config";
import type { BaseState, LinkState } from "./states";
/** Retângulo de um nó em pixels CSS da área do canvas. */
export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}
export declare const rect: (left: number, top: number, width: number, height: number) => Rect;
/** Ponto de saída de um fio na borda de um nó: posição, normal da borda e tangente. */
export interface Anchor {
    x: number;
    y: number;
    nx: number;
    ny: number;
    tx: number;
    ty: number;
}
/** Tentáculo: um trecho do fio se projeta para fora do fluxo, se contorce e recolhe. `tk` mira um fio saudável. */
export interface Tendril {
    tk: number | null;
    spot: boolean;
    t0: number;
    dur: number;
    uc: number;
    wid: number;
    amp: number;
    side: number;
    rt: number;
    hd: number;
    wr: number;
    tw: number;
    f1: number;
    f2: number;
    p1: number;
    p2: number;
    dr: number;
    fk: number;
    ln: number;
    /** Já encostou no fio saudável (contágio disparado). */
    cd?: number;
}
/** Contágio num fio saudável, no ponto onde um fio doente encostou. */
export interface Infection {
    uc: number;
    t0: number;
    hold: number;
    w: number;
}
/** Esporo solto durante uma atualização. */
export interface Spore {
    x: number;
    y: number;
    vx: number;
    vy: number;
    t0: number;
    life: number;
    col: Color;
}
export interface ObstacleGeometry {
    dp: Float32Array;
    dn: Float32Array;
    Dp: number;
    Dn: number;
    hit: boolean;
    blocked: boolean;
}
/** Outro nó atravessando uma ligação: lado do desvio (v), alvo (tgt) e quanto os fios se agarram (g). */
export interface Obstacle {
    v: number;
    tgt: number;
    g: number;
    rect: Rect;
    geo?: ObstacleGeometry;
}
/** Um fio: corda de NP pontos com personalidade própria. */
export interface Strand {
    i: number;
    /** Deslocamento lateral no meio do feixe. */
    a: number;
    /** Deslocamento lateral junto aos nós. */
    off: number;
    w: number;
    ph: number[];
    om: number[];
    rate: number;
    pph: number;
    dly: number;
    cutF: number;
    stf: number;
    rs: number;
    wf: number[];
    wk: number[];
    wa: number;
    fd: number;
    rec: number;
    probe: boolean;
    pp: number;
    al: number;
    side: number;
    rip: number;
    met: number;
    /** Continua ligado quando a ligação quebra. */
    keep: boolean;
    /** Quanto o fio está na situação do estado (1) ou saudável (0). */
    sk: number;
    inf: Infection[];
    cc: Link;
    td: Tendril[];
    nxt: number;
    upd: boolean;
    rnd: () => number;
    init: boolean;
    cut: number;
    cutT: number;
    contract: number;
    gap: number;
    x: Float64Array;
    y: Float64Array;
    px: Float64Array;
    py: Float64Array;
    alive: boolean[];
    /** Posições no passo anterior (ax/ay) e no atual (bx/by), para interpolar o desenho. */
    ax: Float64Array;
    ay: Float64Array;
    bx: Float64Array;
    by: Float64Array;
    /** Posições interpoladas usadas pelo desenho. */
    dx: Float64Array;
    dy: Float64Array;
    A: Anchor | null;
    B: Anchor | null;
    rl: Float64Array | null;
    cA: Float64Array | null;
    cB: Float64Array | null;
    tgx: Float64Array | null;
    tgy: Float64Array | null;
    tnx: Float64Array | null;
    tny: Float64Array | null;
    tkey: Float64Array | null;
    /** A forma-alvo guardada vale. */
    tok: boolean;
    Lt: number;
}
/** Uma ligação entre dois nós: um feixe de fios e o estado em transição suave. */
export interface Link {
    id: string;
    a: string;
    b: string;
    n0: number;
    seed: number;
    sp: number;
    ns: number;
    st: LinkState;
    prev: LinkState;
    base: BaseState;
    t0: number;
    sync: number;
    strands: Strand[];
    ks: number;
    nz: number;
    dmp: number;
    tr: number;
    pc: number;
    am: number;
    col: Color;
    hc: Color;
    dw: number[];
    syn: number;
    blk: number;
    ghost: number;
    dim: number;
    hi: number;
    clk: number;
    mv: number;
    pA: number[] | null;
    pB: number[] | null;
    dvAct: number;
    dv: Float32Array;
    dvP: Float32Array | null;
    dvVer: number;
    ob: Record<string, Obstacle>;
    ak: number[] | null;
    nx: number;
    ny: number;
    gr: boolean;
    g: {
        L: number;
    };
}
/** O que as funções do núcleo precisam do motor. */
export interface Ctx {
    cfg: Config;
    NP: number;
    /** Tempo da física no passo atual (s). */
    tn: number;
    spores: Spore[];
    ptr: {
        x: number;
        y: number;
        on: boolean;
    };
    dragging: boolean;
    hover: string | null;
    links: Link[];
    /** Ids dos nós na ordem em que foram declarados. */
    nodeIds: string[];
    rects: Map<string, Rect>;
}
