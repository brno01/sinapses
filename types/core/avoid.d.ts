import type { Ctx, Link, Strand } from "./types";
/**
 * Desvio de obstáculos: os outros nós empurram o feixe para o lado de menor desvio; se não há por onde desviar, os
 * fios tentam se agarrar ao nó. A geometria só é recalculada quando a ligação ou algum nó muda de lugar; parado,
 * reaproveita o resultado guardado (a suavização do lado e do agarre continua rodando).
 */
export declare function avoid(E: Ctx, c: Link, dt: number, m: Strand): void;
/** Número de versão do desvio da ligação: sobe só quando algum valor muda (a forma-alvo guardada depende dele). */
export declare function dvBump(c: Link): void;
