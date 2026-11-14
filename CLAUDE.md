# sinapses

<!-- Gerado por dev-project em 2026-11-14 e preenchido. Mantenha curto (< 200 linhas): só o que o Claude não descobre sozinho lendo o código. -->

## Visão geral
- Área: personal
- O que é: fios animados em canvas 2D que ligam nós de uma interface e mostram o estado de cada ligação (repouso, uso, teste, anomalia, quebra, bloqueio...). Projeto genérico: nada de nomes de produtos ou serviços reais na demo.

## Stack
- Demo: um único `demo/index.html` com HTML, CSS e JavaScript puros. Sem build e sem dependências.
- Ferramentas de verificação: Python 3 só com a biblioteca padrão (rodar com `python3 -I`) + Chrome/Chromium headless (headless shell do Playwright em `~/.cache/ms-playwright`, ou `CHROME=<caminho>`).

## Comandos
| Ação | Comando |
|---|---|
| Abrir a demo | `xdg-open demo/index.html` |
| Testes (regressão, ~2 min) | `python3 -I tools/check.py` |
| Uma sonda | `tools/probe.sh <sonda.py> <ação:segundos> [ajustes-json]` |
| Captura 1440×900 | `tools/shot.sh <ação:segundos> out/x.png [ajustes-json]` |
| Custo por quantidade de fios | `CORES=2,3 python3 -I tools/sweep.py` |

## Estrutura
- `demo/` — a demo (motor, desenho, estados e janela de ajustes num arquivo só).
- `tools/harness.py` — gera uma cópia da demo com relógio virtual; o hash `#<ação>:<segundos>` escolhe o cenário (`all-<ação>` aplica a todas as ligações).
- `tools/probes/` — sondas: cada uma insere código na cópia e imprime um JSON em `<pre id="mt">`.
- `tools/check.py` — roda as sondas com a configuração de referência (tudo em 100%) e falha fora dos limites.

## Convenções
- Branch padrão: `master`. Trabalhe em branches de feature.
- Textos da interface e comentários em português; commits em inglês.
- O código da demo é compacto de propósito (funções curtas de nome curto); siga o estilo existente.
- Antes de concluir uma mudança na demo, rode `python3 -I tools/check.py`. Para otimizações que não podem mudar o comportamento, compare `tools/probe.sh positions.py <ação:seg>` antes e depois: a impressão digital tem de ser idêntica.
- Ao mudar o visual, capture com `tools/shot.sh` e olhe a imagem.

## Cuidados
- O harness e as sondas dependem de trechos exatos da demo: um único `<script>`, `if(location.hash){`, `size();cap();requestAnimationFrame(frame);` e dos globais `C`, `NP`, `CFG`, `CFG_DEF`, `setCfg`, `step`, `draw`, `geoC`, `avoid`, `target`, `act`, `by`, `nDraw`, `calm`. Se renomear, atualize `tools/`.
- As ligações e os nós de teste usam os ids `api`, `worker`, `chat`, `db` e `api-worker`, `worker-db`, `chat-api`, `worker-chat`; várias sondas olham para `api-worker` e `chat-api`.
- Medições de custo oscilam muito com a máquina ocupada: use `CORES` com núcleos rápidos e o menor de várias rodadas. O headless não usa GPU, então o desenho sai mais caro que num navegador comum.
- Valores salvos no navegador (`localStorage` `sinapses-cfg`) têm prioridade sobre um novo padrão em `CFG_DEF`; para ver o padrão novo, use o preset "Padrão".
