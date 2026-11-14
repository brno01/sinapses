# Plano: motor em TypeScript rodando num Worker

**Status (14/11/2026): fases 1 a 7 concluídas.** Núcleo portado com paridade (15 cenários dentro da tolerância; uma
mutação de 0,1% numa constante gera diferença de ~20), métricas de comportamento no Vitest, desenho, laço, Worker com
volta automática para a thread principal, demo nova em Vite com modo de teste e checagem de navegador. Igualdade bit a
bit entre Chrome e Node se mostrou impossível (`Math.exp/sin/cos/atan2` diferem no último bit entre versões do V8), por
isso a paridade usa assinaturas com tolerância. Próximo: componente React.

## Contexto
A demo (`demo/index.html`) é um arquivo único: física, desenho, estados e janela de ajustes misturados com o DOM. Para usar os fios em outros projetos (por exemplo, um app React), o motor precisa virar uma biblioteca com API, sem DOM no núcleo, e rodar física e desenho num Web Worker (`OffscreenCanvas`) para não disputar a thread principal com a interface. A demo atual é a referência visual e de comportamento: as medições de `tools/` definem o que não pode mudar.

## Stack
A mesma do `cerberus/web`: npm, TypeScript estrito, Vite (biblioteca + página da demo) e Vitest.

## Estrutura
```
src/
  core/          sem DOM; roda em Node, no Worker ou na thread principal
    math.ts      clamp, sm, eio, eob, fr, lerp, gerador mb, hsh, cores (rgb, mixc, lite)
    config.ts    Config, padrão, presets e a especificação dos controles (rótulos e limites)
    states.ts    estados de ligação, parâmetros por estado, cores, parâmetros de tentáculos
    geometry.ts  attach, bz, openEnv, target, lockAt
    strand.ts    criação dos fios, reset, cutIdx, brGap
    avoid.ts     desvio de nós + versão do desvio
    physics.ts   passo da física (corte, tentáculos, contágio, reencontro, molas, restrições, projeção)
    link.ts      ligação: suavização dos parâmetros, troca de estado, sequências (ligar, desligar, testar...)
    engine.ts    Engine: nós, ligações, entradas (retângulos, ponteiro, hover, arraste, foco), passos de 1/60 s
  render/
    canvas2d.ts  desenho (fitas, pontinhos, ramificações, dedos, pulsos da quebra, agarre, cadeado, esporos, recorte dos nós)
    loop.ts      laço de quadros: física fixa, desenho a 60/30, repouso, custo
  worker/
    protocol.ts  mensagens tipadas entre a página e o Worker
    worker.ts    Engine + desenho num OffscreenCanvas
  index.ts       createSinapses(canvas, opções): API pública; usa o Worker quando dá, senão a thread principal
demo/            página Vite com a API (mesmos nós, botões e janela de ajustes)
legacy/          a demo atual em arquivo único, como referência até a paridade
test/            Vitest: métricas das sondas e paridade com a demo antiga
tools/           harness e sondas (passam a apontar para legacy/) + checagem de navegador da demo nova
```

## API (rascunho)
```ts
const s = createSinapses(canvas, {
  nodes: { api: elA, worker: elB },               // elementos (a página mede) ou retângulos
  links: [{ id: "api-worker", from: "api", to: "worker", strands: 9, state: "flow" }],
  config: { nmul: 3 },                            // parcial; o resto vem do padrão
  worker: true,                                    // false força a thread principal
});
s.setState("api-worker", "broken");               // estado direto
s.act("api-worker", "on");                         // sequência: ligar → repouso, desligar → desligada...
s.setConfig({ life: 2 });
s.on("perf", ({ ms, fps }) => {});
s.on("state", ({ link, state }) => {});
s.destroy();
```
A página mede os elementos a cada quadro (barato) e envia só o que mudou; ponteiro, hover, arraste e foco vão por eventos.

## Fases (cada uma termina verificada)
1. **Esqueleto:** `package.json` (npm), `tsconfig` estrito, Vite (lib + demo), Vitest. Comandos `npm run typecheck|test|build|dev` funcionando.
2. **Núcleo sem DOM:** porte função a função, preservando a ordem das contas e o gerador de números. Os `setTimeout` das sequências viram uma agenda no relógio do motor (determinística). Teste de paridade: a mesma cena na demo antiga (Chrome headless) e no núcleo (Node) deve dar a mesma impressão digital de posições; se a ordem das contas impedir a igualdade bit a bit, vale a equivalência das métricas.
3. **Métricas como testes:** dobras, ondulação, pontas na quebra, balanço e independência no Vitest, com os limites do `tools/check.py`.
4. **Desenho e laço** na thread principal: 60/30 quadros por segundo, repouso total, custo.
5. **Worker:** `OffscreenCanvas`, protocolo tipado e volta automática para a thread principal quando não houver suporte.
6. **Demo nova** em Vite usando a API, com a janela de ajustes gerada da especificação dos controles. Checagem no navegador: erros nos 11 estados, fps, painel, Worker produzindo quadros.
7. **Documentação:** README (API), CLAUDE.md (comandos) e `tools/check.py` chamando os testes e as checagens de navegador.

Depois deste plano: um componente React fino em volta da API.

## Riscos
- Paridade bit a bit pode falhar por diferenças pequenas na ordem das contas; nesse caso, a equivalência das métricas é o critério.
- O Worker não roda com o relógio virtual; nele, a checagem é de fumaça (quadros saindo, sem erro, captura de tela).

## Verificação
- `npm run typecheck && npm test && npm run build`
- `python3 -I tools/check.py` (demo antiga e nova)
- Capturas da demo nova comparadas com a antiga em uso, quebra e teste.
