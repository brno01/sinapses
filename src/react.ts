// Componente React fino em volta de createSinapses. Sem JSX: quem usa não precisa configurar nada para compilar.
import { createElement, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactElement } from "react";
import { createSinapses, type Config, type LinkDef, type LinkState, type Rect, type Sinapses } from "./index";

export type NodeSource = Record<string, HTMLElement | Rect> | ((id: string) => HTMLElement | Rect | null | undefined);

export interface SinapsesCanvasProps {
  /**
   * Nós: um mapa id → elemento/retângulo, ou uma função chamada depois da montagem para cada ponta das ligações.
   * Ligação com ponta sem nó fica de fora.
   */
  nodes: NodeSource;
  links: LinkDef[];
  /**
   * Outros nós (ids resolvidos por `nodes`) de que os fios desviam, sem ligação própria. Sem isto, um feixe passa por
   * cima de qualquer elemento que não seja ponta de ligação.
   */
  obstacles?: readonly string[];
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
export const STILL_SETTLE_MS = 1500;
/** Quanto roda de novo depois de uma mudança (ms). */
export const STILL_UPDATE_MS = 700;
const FRAME_MS = 1000 / 60;

/** Ajustes que só valem na criação (mudam a quantidade de fios ou de pontos). */
const STRUCTURAL: (keyof Config)[] = ["nmul", "np"];

/**
 * Chave da estrutura: muda quando é preciso recriar o motor (e o canvas, que só vira OffscreenCanvas uma vez).
 * Ordem das ligações não importa; estado não entra.
 */
export function structureKey(
  links: readonly LinkDef[],
  opts: { still?: boolean; worker?: boolean; config?: Partial<Config>; obstacles?: readonly string[] } = {},
): string {
  const ls = links.map((l) => [l.id, l.from, l.to, l.strands, l.spacing ?? null, l.seed ?? null]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const cfg = STRUCTURAL.map((k) => opts.config?.[k] ?? null);
  const obs = [...new Set(opts.obstacles ?? [])].sort();
  return JSON.stringify([ls, cfg, !!opts.still, opts.worker ?? null, obs]);
}

function resolve(nodes: NodeSource, id: string): HTMLElement | Rect | null {
  const v = typeof nodes === "function" ? nodes(id) : nodes[id];
  return v ?? null;
}

/** Caixa com o canvas das ligações. Ocupa o espaço que o estilo der; os nós são medidos em relação ao canvas. */
export function SinapsesCanvas(props: SinapsesCanvasProps): ReactElement {
  const { links, still, worker, config, obstacles, className, style } = props;
  const key = structureKey(links, { still, worker, config, obstacles });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inst = useRef<Sinapses | null>(null);
  const latest = useRef(props);
  latest.current = props;
  // quadro parado: relógio virtual da instância atual
  const clock = useRef(0);

  const settle = (ms: number) => {
    const s = inst.current;
    if (!s || !latest.current.still) return;
    const end = clock.current + ms;
    while (clock.current < end) {
      clock.current += FRAME_MS;
      s.advance(clock.current);
    }
  };

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const p = latest.current;
    // canvas novo a cada criação: ele só pode virar OffscreenCanvas uma vez (e o StrictMode monta duas)
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    box.appendChild(canvas);
    const nodes: Record<string, HTMLElement | Rect> = {};
    const usable: LinkDef[] = [];
    for (const l of p.links) {
      const a = resolve(p.nodes, l.from), b = resolve(p.nodes, l.to);
      if (!a || !b) continue;
      nodes[l.from] = a;
      nodes[l.to] = b;
      usable.push({ ...l, state: p.states?.[l.id] ?? l.state });
    }
    // obstáculos só valem se houver alguma ligação (sem ligação, não há o que desviar)
    if (usable.length) {
      for (const id of p.obstacles ?? []) {
        if (id in nodes) continue;
        const v = resolve(p.nodes, id);
        if (v) nodes[id] = v;
      }
    }
    const s = createSinapses(canvas, { nodes, links: usable, config: p.config, worker: p.worker, manual: !!p.still });
    inst.current = s;
    clock.current = 0;
    const cleanup = p.onReady?.(s);
    let ro: ResizeObserver | null = null;
    const onResize = () => settle(STILL_UPDATE_MS);
    if (p.still) {
      settle(STILL_SETTLE_MS);
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(onResize);
        ro.observe(canvas);
        for (const v of Object.values(nodes)) if (typeof (v as HTMLElement).getBoundingClientRect === "function") ro.observe(v as HTMLElement);
      }
      window.addEventListener("resize", onResize);
    }
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      if (typeof cleanup === "function") cleanup();
      s.destroy();
      canvas.remove();
      if (inst.current === s) inst.current = null;
    };
    // a estrutura decide quando recriar; o resto é lido de `latest`
  }, [key]);

  // estados: só o que mudou desde o último envio
  const sent = useRef<Record<string, LinkState>>({});
  useEffect(() => {
    const s = inst.current;
    if (!s) return;
    let changed = false;
    for (const l of links) {
      const want = props.states?.[l.id];
      if (!want) continue;
      const cur = sent.current[l.id] ?? s.state(l.id);
      if (cur !== want) {
        s.setState(l.id, want);
        changed = true;
      }
      sent.current[l.id] = want;
    }
    if (changed) settle(STILL_UPDATE_MS);
  });
  useLayoutEffect(() => {
    sent.current = {};
  }, [key]);

  // ajustes não estruturais
  const cfgKey = JSON.stringify(config ?? {});
  const firstCfg = useRef(true);
  useEffect(() => {
    if (firstCfg.current) {
      firstCfg.current = false;
      return;
    }
    if (config) {
      inst.current?.setConfig(config);
      settle(STILL_UPDATE_MS);
    }
  }, [cfgKey]);

  return createElement("div", { ref: boxRef, className, style, "aria-hidden": true, "data-sinapses": "" });
}
