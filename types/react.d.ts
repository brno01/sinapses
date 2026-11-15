import { type CSSProperties, type ReactElement } from "react";
import { type Config, type LinkDef, type LinkState, type Rect, type Sinapses } from "./index";
export type NodeSource = Record<string, HTMLElement | Rect> | ((id: string) => HTMLElement | Rect | null | undefined);
export interface SinapsesCanvasProps {
    /**
     * Nós: um mapa id → elemento/retângulo, ou uma função chamada depois da montagem para cada ponta das ligações.
     * Ligação com ponta sem nó fica de fora.
     */
    nodes: NodeSource;
    links: LinkDef[];
    /** Estado atual de cada ligação; mudar aqui não recria o motor. */
    states?: Record<string, LinkState>;
    config?: Partial<Config>;
    worker?: boolean;
    /**
     * Quadro parado (movimento reduzido): a física assenta num relógio virtual e o canvas mostra um quadro só; desenha
     * de novo quando o estado, os ajustes ou o tamanho mudam.
     */
    still?: boolean;
    className?: string;
    style?: CSSProperties;
    /** Chamado com a instância depois de criada (e de novo a cada recriação); o retorno, se houver, roda no destroy. */
    onReady?: (s: Sinapses) => void | (() => void);
}
/** Quanto tempo virtual o modo parado roda para os fios assentarem (ms). */
export declare const STILL_SETTLE_MS = 1500;
/** Quanto roda de novo depois de uma mudança (ms). */
export declare const STILL_UPDATE_MS = 700;
/**
 * Chave da estrutura: muda quando é preciso recriar o motor (e o canvas, que só vira OffscreenCanvas uma vez).
 * Ordem das ligações não importa; estado não entra.
 */
export declare function structureKey(links: readonly LinkDef[], opts?: {
    still?: boolean;
    worker?: boolean;
    config?: Partial<Config>;
}): string;
/** Caixa com o canvas das ligações. Ocupa o espaço que o estilo der; os nós são medidos em relação ao canvas. */
export declare function SinapsesCanvas(props: SinapsesCanvasProps): ReactElement;
