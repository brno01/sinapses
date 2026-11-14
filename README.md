# Sinapses

Fios animados que ligam os nós de uma interface e mostram, pelo movimento, o estado de cada ligação. Cada ligação é um feixe de fios finos; cada fio tem física própria, então o feixe parece vivo sem ficar barulhento. Tudo é desenhado num único `<canvas>` 2D, sem bibliotecas.

A demo em `demo/index.html` tem quatro nós genéricos (API, Worker, Chat, Banco), botões para cada estado e uma janela de ajustes ao vivo.

## Abrir a demo

Não há build nem dependências: abra o arquivo no navegador.

```bash
xdg-open demo/index.html
```

Arraste os tiles para ver o desvio e o balanço dos fios, escolha uma ligação no seletor e use os botões de estado.

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
| Quebrada | quase todos os fios se rompem; as pontas seguem o caminho do feixe e tentam se reencontrar (quase encostam, faíscam, recuam); 2 ou 3 continuam ligados, falhando |
| Bloqueada | feixe cinza com cadeado no centro; pulsos vermelhos se desfazem em faíscas antes dele |
| Desligada | só um traço fantasma entre os nós |

Quando um nó passa por cima de uma ligação, o feixe desvia até o último instante; se não há por onde passar, os fios se agarram ao nó e soltam depois.

## Janela de ajustes

Fica no canto direito da demo; arrasta pelo título e recolhe pela seta. Os valores ficam salvos no navegador (`localStorage`, chave `sinapses-cfg`). Duplo clique numa linha volta aquele controle ao padrão. "Copiar ajustes" copia o JSON dos valores.

| Grupo | Controles |
|---|---|
| Pulsos | velocidade, frequência, tamanho |
| Fios | quantidade, espessura, abertura do feixe, início da abertura, brilho, saturação |
| Movimento | vida própria, ondulação, comprimento da onda, balanço ao arrastar, tentáculos, desviar dos nós |
| Física | pontos por fio (24, 36, 48 ou 64) |

Presets no rodapé:

- **Padrão**: 76 fios, 48 pontos por fio.
- **Muitos fios · 60 fps**: 106 fios, 48 pontos, demais ajustes do padrão.

O cabeçalho da janela mostra o custo de cada quadro e quantos quadros são desenhados por segundo.

## Como funciona

- **Física por fio:** cada fio é uma corda de 48 nós (verlet), presa na borda dos dois nós. Uma mola puxa cada ponto para a forma-alvo: uma curva de Bézier com o deslocamento lateral do feixe (fechado nas pontas, aberto no meio). Restrições de comprimento por segmento (8 iterações por passo) mantêm a corda inteira sem zigue-zague.
- **Forma-alvo guardada:** a forma-alvo, as normais e os comprimentos de repouso de cada fio só são recalculados quando algo de que dependem muda (pontas, direção da ligação, abertura, desvio de nós) ou quando o fio tem tentáculos. O desvio de nós também só é recalculado quando um nó se mexe.
- **Vida própria:** cada fio sorteia rigidez, ritmo, fase e amortecimento próprios, então os fios não se mexem juntos.
- **Estados:** os parâmetros de cada estado (rigidez, ruído, amortecimento, ritmo dos pulsos, opacidade) mudam suavemente, sem saltos. Tentáculos, contágio, rompimento e reencontro são eventos por fio.
- **Desvio:** os outros nós empurram o feixe para o lado de menor desvio; nenhum ponto do fio entra num nó obstáculo.
- **Desenho:** cada fio é uma fita de largura variável preenchida com gradiente, mais uma passada larga e fraca por baixo, que suaviza a borda. O canvas usa no mínimo 2× a densidade de pixels.
- **Ritmo:** a física roda em passos fixos de 1/60 s. O desenho fica limitado a 60 quadros por segundo e cai para 30 em repouso total (janela sem foco ou nada se movendo rápido).

## Verificação

As ferramentas em `tools/` rodam a demo num Chrome headless com relógio virtual, então as medições são reproduzíveis. Elas precisam de Python 3 (só a biblioteca padrão) e de um Chrome ou Chromium: o headless shell do Playwright em `~/.cache/ms-playwright` é encontrado sozinho; em outro lugar, defina `CHROME`.

```bash
python3 -I tools/check.py                          # verificação de regressão completa (~2 min)
tools/probe.sh kinks.py break:10                   # uma sonda: <sonda> <ação:segundos> [ajustes-json]
tools/probe.sh cost.py test:6 '{"nmul":3,"tdl":1}' # custo por quadro com ajustes
tools/shot.sh break:8 out/quebra.png               # captura 1440×900
CORES=2,3 python3 -I tools/sweep.py                # custo por quantidade de fios, com ajuste linear
```

| Sonda | Mede |
|---|---|
| `errors.py` | erros de JavaScript e custo médio por quadro |
| `kinks.py` | dobras: maior ângulo entre segmentos e fração acima de 30° |
| `waviness.py` | ondulação: desvio lateral e cristas por fio |
| `tips.py` | quebra: distância entre as pontas, tentativas de reencontro, independência |
| `sway.py` | balanço depois de arrastar um nó e tempo para assentar |
| `independence.py` | quanto cada fio se mexe sozinho em uso |
| `cost.py` | custo por quadro: layout, desvio, física e desenho |
| `positions.py` | impressão digital das posições (para otimizações que não podem mudar nada) |
| `fps.py` | desenhos e passos por segundo num monitor simulado (`HZ`, `FOCUS`) |
| `panel.py` | controles, presets e encaixe da janela de ajustes |

## Desempenho

Custo por quadro, medido num notebook com CPU Intel de 13ª geração, preso nos núcleos rápidos, Chrome headless sem GPU (menor tempo de 5 rodadas):

| Fios | Em uso | Anomalia | Testando |
|---|---|---|---|
| 76 | 3,1 ms | 4,8 ms | 6,1 ms |
| 90 | 3,8 ms | 5,4 ms | 7,3 ms |
| 106 | 4,4 ms | 6,4 ms | 8,7 ms |
| 120 | 5,0 ms | 7,0 ms | 10,3 ms |

Cada fio custa ~0,04 ms por quadro em uso e ~0,09 ms em teste; no teste, ~70% do custo é desenho. Para manter 60 quadros por segundo com folga (≤ 12 ms), cabem ~140 fios no estado mais pesado. Os números variam com a carga da máquina: compare versões sempre na mesma sessão (`tools/sweep.py`). Com GPU, o desenho costuma custar menos.

## Próximos passos

- Separar o motor em TypeScript, com uma API do tipo `createSinapses(canvas, { nodes, links })` e `link.setState("broken")`, e transformar as sondas em testes.
- Rodar física e desenho num Web Worker com `OffscreenCanvas`.
- Um componente React que receba nós e estados por props.

## Licença

A definir.
