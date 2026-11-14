# sinapses

<!-- Gerado por dev-project em 2026-11-14 e preenchido. Mantenha curto (< 200 linhas): só o que o Claude não descobre sozinho lendo o código. -->

## Visão geral
- Área: personal
- O que é: fios animados em canvas 2D que ligam nós de uma interface e mostram o estado de cada ligação (repouso, uso, teste, anomalia, quebra, bloqueio...). Biblioteca genérica (`createSinapses`) com física e desenho num Web Worker, mais uma demo. Nada de nomes de produtos ou serviços reais na demo.

## Stack
- TypeScript estrito, Vite (demo em `demo/`), Vitest. npm (lockfile `package-lock.json`). Sem dependências em tempo de execução.
- Ferramentas de navegador: Python 3 só com a biblioteca padrão (`python3 -I`) + Chrome headless (headless shell do Playwright em `~/.cache/ms-playwright`, ou `CHROME=<caminho>`); a checagem do Worker usa Playwright via `uv`.

## Comandos
| Ação | Comando |
|---|---|
| Instalar | `npm install` |
| Demo (dev) | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Testes (paridade + comportamento) | `npm test` |
| Build | `npm run build` |
| Demo nova no navegador | `npm run check:demo` |
| Demo original no navegador (~2 min) | `npm run check:legacy` |
| Regenerar assinaturas da demo original | `npm run fixtures` |
| Custo por quantidade de fios (demo original) | `CORES=2,3 python3 -I tools/sweep.py` |

## Estrutura
- `src/core/` — motor sem DOM (Node, Worker ou thread principal). `Engine` recebe tempo em ms.
- `src/render/canvas2d.ts` — desenho; `src/runtime/` — laço, `Runner`, protocolo e Worker; `src/index.ts` — API.
- `demo/` — página Vite; `?test=run|panel` roda com relógio virtual na thread principal; `?smoke=<ms>` relata o Worker.
- `legacy/index.html` — demo original em arquivo único: referência de comportamento.
- `test/` — `parity.test.ts` (assinaturas da demo original em `test/fixtures/`) e `metrics.test.ts`.
- `tools/` — harness e sondas da demo original (`probe.sh`, `shot.sh`, `check.py`, `sweep.py`) e `check_demo.py`.

## Convenções
- Branch padrão: `master`. Trabalhe em branches de feature.
- Textos da interface e comentários em português; código e commits em inglês.
- Mudou física ou desenho? Rode `npm test` e `npm run check:demo`, e capture a demo para olhar.
- A física do núcleo segue a ordem das contas da demo original: não reordene expressões nem chamadas ao gerador `mb` sem regenerar as fixtures e explicar por quê. Mudança intencional de comportamento: altere `legacy/` igual (ou aceite a divergência), rode `npm run fixtures` e confira as métricas.
- Otimização que não pode mudar nada: compare `signature()`/`positionsHash()` do `test/sim.ts` antes e depois.

## Cuidados
- Paridade usa tolerância (0,001 nas somas por fio): `Math.exp/sin/cos/atan2` diferem no último bit entre o V8 do Chrome e o do Node.
- Redefinir `canvas.width/height` apaga o desenho: o renderer só faz isso quando o tamanho muda.
- O Worker não roda com relógio virtual (`--virtual-time-budget`); a checagem dele usa tempo real (Playwright).
- O harness e as sondas da demo original dependem de trechos exatos de `legacy/index.html` e dos globais `C`, `NP`, `CFG`, `CFG_DEF`, `setCfg`, `step`, `draw`, `geoC`, `avoid`, `target`, `act`, `by`, `nDraw`, `calm`.
- Medições de custo oscilam com a carga da máquina: `CORES` com núcleos rápidos, menor de várias rodadas, versões comparadas na mesma sessão.
- Valores salvos no navegador (`localStorage` `sinapses-cfg`) têm prioridade sobre o padrão; o preset "Padrão" volta ao padrão.
