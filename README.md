# Sinapses

[![ci](https://github.com/brno01/sinapses/actions/workflows/ci.yml/badge.svg)](https://github.com/brno01/sinapses/actions/workflows/ci.yml)
[![security](https://github.com/brno01/sinapses/actions/workflows/security.yml/badge.svg)](https://github.com/brno01/sinapses/actions/workflows/security.yml)

Fios animados que ligam os nós de uma interface e mostram, pelo movimento, o estado de cada ligação. Cada ligação é um feixe de fios finos; cada fio tem física própria, então o feixe parece vivo sem ficar barulhento. Tudo é desenhado num `<canvas>` 2D, sem dependências em tempo de execução, e a física e o desenho rodam num Web Worker para não disputar a thread principal com a interface.

## Estado e requisitos

Em uso pessoal. Publicado como pacote privado `@brno01/sinapses` no GitHub Packages a cada tag `v*`. Requer Node 22.12 ou mais novo (o CI usa o 24) e npm; a verificação inclui Vitest 5 e jsdom 31, que não rodam no Node 20.

## Demo

```bash
npm install
npm run dev        # abre a demo em http://localhost:5173
```

A demo tem quatro nós genéricos (API, Worker, Chat, Banco), botões para cada estado e uma janela de ajustes ao vivo. Arraste os nós para ver o desvio e o balanço dos fios. A versão original em arquivo único continua em `legacy/index.html` (abre direto no navegador) como referência de comportamento.

## Usar num projeto

O pacote é publicado como `@brno01/sinapses` no GitHub Packages, que é privado: para instalar, o projeto precisa de um token com o escopo `read:packages`. No `.npmrc` do projeto:

```
@brno01:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @brno01/sinapses
```

O pacote exporta o código-fonte TypeScript (`src/index.ts`); um projeto com Vite importa direto.

```ts
import { createSinapses } from "@brno01/sinapses";

const s = createSinapses(canvas, {
  nodes: { api: elApi, worker: elWorker },        // elementos (medidos a cada quadro) ou retângulos
  links: [{ id: "api-worker", from: "api", to: "worker", strands: 9, state: "flow" }],
  config: { nmul: 3 },                            // ajustes parciais; o resto vem do padrão
});

s.act("api-worker", "test");                      // ações: on, off, test, upd, anom, busy, flow, break, block, idle
s.setState("api-worker", "broken");               // estado direto
s.sequence("api-worker", [[0, "retract"], [4800, "off"], [5600, "unfurl"]]);
s.setConfig({ life: 2 });
s.setDragging(true);                              // um nó está sendo arrastado
s.on("perf", ({ ms, fps }) => {});
s.on("state", ({ id, state }) => {});
s.destroy();
```

O canvas deve cobrir a área dos nós (as posições são relativas a ele). Com `worker: false`, tudo roda na thread principal; sem suporte a `OffscreenCanvas`, isso acontece sozinho. `s.mode` diz onde está rodando.

### Em React (`@brno01/sinapses/react`)

```ts
import { SinapsesCanvas } from "@brno01/sinapses/react";

<SinapsesCanvas
  className="camada"                       // a caixa ocupa o espaço que o estilo der; o canvas a preenche
  nodes={(id) => refs.current.get(id)}     // mapa id → elemento/retângulo, ou função chamada depois da montagem
  links={links}                            // ligação com ponta sem nó fica de fora
  obstacles={outrosIds}                    // outros nós de que os fios desviam (sem ligação própria)
  states={{ "api-worker": "broken" }}      // muda o estado sem recriar o motor
  config={{ sat: 0.9 }}                    // ajustes; `nmul` e `np` recriam
  still={reduzirMovimento}                 // quadro parado: assenta e desenha um quadro; de novo só quando algo muda
/>
```

- O motor (e o canvas, que vira `OffscreenCanvas` uma vez só) é recriado quando muda a estrutura: pontas, quantidade de fios, semente, espaçamento, obstáculos, `nmul`, `np`, `still` ou `worker` (`structureKey`). Estado e demais ajustes passam sem recriar.
- O canvas é criado dentro de um efeito, então funciona no `StrictMode`.
- `still` usa o relógio manual: bom para `prefers-reduced-motion: reduce`. Redesenha quando muda o estado, os ajustes ou o tamanho do canvas ou de um nó.
- `react` é dependência opcional (peer). Sem JSX no componente: não exige configuração de compilação.

O pacote aponta os tipos para `types/` (condição `types` do `exports`): projetos com regras de TypeScript mais estritas não checam o código-fonte. Mudou a API? `npm run types` (o teste `types.test.ts` acusa tipos velhos).

## Estados de uma ligação

| Estado | O que os fios fazem |
|---|---|
| Repouso | feixe calmo; um pontinho cruza de vez em quando |
| Em uso | pontinhos rápidos e frequentes |
| Operação | o feixe aperta e os pontinhos vêm em ondas |
| Testando | alguns fios lançam tentáculos que se ramificam em até 3 níveis e recolhem |
| Atualizando | tentáculos finos saem do fluxo, se contorcem e soltam esporos |
| Anomalia | fios doentes se esticam até fios saudáveis, se prendem e o contágio se espalha no ponto de contato |
| Ligando | os fios crescem dos dois nós e se encontram no meio |
| Desligando | cada fio afina num ponto, se solta e as metades recolhem pairando |
| Quebrada | quase todos os fios se rompem; as pontas seguem o caminho do feixe e tentam se reencontrar; 2 ou 3 continuam ligados, falhando |
| Bloqueada | feixe cinza com cadeado no centro; pulsos vermelhos se desfazem em faíscas antes dele |
| Desligada | só um traço fantasma entre os nós |

Quando um nó passa por cima de uma ligação, o feixe desvia até o último instante; se não há por onde passar, os fios se agarram ao nó e soltam depois.

## Ajustes

`CONTROL_SECTIONS` descreve os controles (rótulo, limites, passo) e a demo monta a janela a partir dele. Os valores ficam salvos no navegador (`sinapses-cfg`).

| Grupo | Controles |
|---|---|
| Pulsos | velocidade, frequência, tamanho |
| Fios | quantidade, espessura, abertura do feixe, início da abertura, brilho, saturação |
| Movimento | vida própria, ondulação, comprimento da onda, balanço ao arrastar, tentáculos, desviar dos nós |
| Física | pontos por fio (24, 36, 48 ou 64) |

Presets: **Padrão** (76 fios na demo) e **Muitos fios · 60 fps** (106 fios).

## Como funciona

- **Física por fio:** cada fio é uma corda de 48 pontos (verlet), presa na borda dos dois nós. Uma mola puxa cada ponto para a forma-alvo: uma curva de Bézier com o deslocamento lateral do feixe (fechado nas pontas, aberto no meio). Restrições de comprimento por segmento (8 iterações por passo) mantêm a corda inteira.
- **Vida própria:** cada fio sorteia rigidez, ritmo, fase e amortecimento, então os fios não se mexem juntos.
- **Estados:** os parâmetros de cada estado mudam suavemente, sem saltos; tentáculos, contágio, rompimento e reencontro são eventos por fio.
- **Forma-alvo guardada:** forma-alvo, normais e comprimentos de repouso só são recalculados quando algo de que dependem muda ou quando o fio tem tentáculos. O desvio de nós também só é recalculado quando um nó se mexe.
- **Ritmo:** a física roda em passos fixos de 1/60 s; o desenho fica limitado a 60 quadros por segundo e cai para 30 em repouso total.
- **Worker:** `createSinapses` transfere o canvas para um Web Worker (`OffscreenCanvas`). A página só mede os nós e repassa mouse, foco e hover.

## Estrutura

- `src/core/` — motor sem DOM: estados, ajustes, geometria, fios, desvio, física, ligações e o `Engine`.
- `src/render/canvas2d.ts` — desenho (fitas, pulsos, tentáculos, agarre, cadeado, esporos).
- `src/runtime/` — laço de quadros, `Runner` (motor + desenho), protocolo e ponto de entrada do Worker.
- `src/index.ts` — `createSinapses`, a API pública; `src/react.ts` — `SinapsesCanvas` (subpath `sinapses/react`).
- `types/` — declarações geradas (`npm run types`), lidas por quem usa o pacote.
- `demo/` — a demo em Vite e o modo de teste (`?test=run|panel`, relógio virtual).
- `legacy/` — a demo original em arquivo único.
- `test/` — Vitest: paridade com a demo original e métricas de comportamento.
- `tools/` — harness e sondas da demo original, checagem da demo nova, varredura de custo.

## Verificação

```bash
npm ci
npm run typecheck
npm run types         # regenera types/ depois de mudar a API
npm test               # componente React, tipos publicados, com a demo original (15 cenários) e comportamento (dobras, ondulação, quebra, arraste, independência)
npm run check:demo     # demo nova num Chrome headless: 11 estados sem erro, 60/30 fps, janela de ajustes, Worker de verdade
npm run check:legacy   # demo original: a mesma bateria de sondas (~2 min)
npm run fixtures       # regenera as assinaturas da demo original usadas na paridade
npm run build          # typecheck e build da demo
```

No GitHub, todo PR e todo push na `master` rodam três workflows:
- `ci`: `npm ci`, `npm run typecheck`, `npm test` e `npm run build`, no Node 24. As checagens de navegador (`check:demo`, `check:legacy`) ficam de fora: precisam de Chrome e do Playwright.
- `security`: segredos, dependências vulneráveis, análise estática, shellcheck e os próprios workflows. Uma falha na `master` abre uma issue `security-scan`.
- `claude`: revisor sob demanda; comente `@claude` num PR ou numa issue, ou rode o workflow à mão para uma auditoria que abre issues. Só o dono do repositório consegue acioná-lo.

As checagens de navegador usam um Chrome ou Chromium headless: o headless shell do Playwright em `~/.cache/ms-playwright` é encontrado sozinho; em outro lugar, defina `CHROME`. A checagem do Worker usa o Playwright para Python via `uv`.

A paridade compara cada fio por uma assinatura (somas das posições) com tolerância de 0,001: `Math.exp`, `sin`, `cos` e `atan2` diferem no último bit entre o V8 do Chrome e o do Node, então a igualdade bit a bit entre ambientes não existe. Um erro de porta aparece com diferença de unidades ou dezenas.

## Desempenho

Custo por quadro, medido num notebook com CPU Intel de 13ª geração, preso nos núcleos rápidos, Chrome headless sem GPU (menor tempo de 5 rodadas, `CORES=2,3 python3 -I tools/sweep.py`):

| Fios | Em uso | Anomalia | Testando |
|---|---|---|---|
| 76 | 3,1 ms | 4,8 ms | 6,1 ms |
| 90 | 3,8 ms | 5,4 ms | 7,3 ms |
| 106 | 4,4 ms | 6,4 ms | 8,7 ms |
| 120 | 5,0 ms | 7,0 ms | 10,3 ms |

No teste, ~70% do custo é desenho. Com o Worker, esse custo sai da thread principal. Os números variam com a carga da máquina: compare versões sempre na mesma sessão.

## Próximos passos

- Paleta de estados configurável (hoje `STATE_COLORS` é fixo).
- Acrescentar e remover ligações sem recriar o motor.

## Licença

Repositório privado, todos os direitos reservados. Veja [LICENSE](LICENSE).
