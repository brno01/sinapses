// Modo de teste da demo (?test=...): relógio virtual na thread principal, para checagens reproduzíveis num Chrome
// headless (tools/check_demo.py). O resultado vai em JSON num <pre id="mt">.
//   ?test=run&act=break&sec=8&hz=60      simula e mede erros, desenhos por segundo e repouso
//   ?test=panel                          exercita a janela de ajustes
// Parâmetros comuns: cfg=<json> (ajustes), act=<ação>|all-<ação>|none, sec, hz (taxa do monitor simulado).
import type { Action, LinkDef, Sinapses } from "../src/index";

export function runTest(s: Sinapses, kind: string, q: URLSearchParams, links: LinkDef[]): void {
  const errs: string[] = [];
  addEventListener("error", (e) => errs.push(e.message));
  const out = (v: unknown) => document.body.insertAdjacentHTML("beforeend", `<pre id="mt">${JSON.stringify(v)}</pre>`);
  const loop = s.runner!.loop, E = s.runner!.engine;
  const act = q.get("act") ?? "none", sec = +(q.get("sec") ?? 3), hz = +(q.get("hz") ?? 60);
  let t = 0;
  try {
    for (let i = 0; i < 30; i++) s.advance((t += 1000 / 60));
    if (act.startsWith("all-")) for (const l of links) s.act(l.id, act.slice(4) as Action);
    else if (act !== "none") s.act("api-worker", act as Action);
    const N = Math.round(sec * hz);
    let d0 = loop.nDraw;
    for (let i = 0; i < N; i++) {
      s.advance((t += 1000 / hz));
      if (i === N - Math.round(2 * hz)) d0 = loop.nDraw;
    }
    if (kind === "panel") return out({ ...panelCheck(s, links), erros: errs });
    out({ erros: errs, desenhosPorS: (loop.nDraw - d0) / 2, repouso: loop.calm, fios: E.links.reduce((a, c) => a + c.strands.length, 0), estado: s.state("api-worker") });
  } catch (e) {
    out({ erros: [...errs, String(e)] });
  }
}

function panelCheck(s: Sinapses, _links: LinkDef[]) {
  const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
  const fire = (el: HTMLInputElement, v: number) => {
    el.value = String(v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const E = s.runner!.engine, cnt = () => E.links.reduce((a, c) => a + c.strands.length, 0), sel = $("cfgPre") as unknown as HTMLSelectElement;
  const pick = (v: string) => {
    sel.value = v;
    sel.dispatchEvent(new Event("change"));
  };
  const L: Record<string, unknown> = { inicio: { preset: sel.value, fios: cnt() } };
  fire($("c_nmul"), 1);
  L.quantidade = { nmul: s.config.nmul, rotulo: $("o_nmul").textContent, fios: cnt(), preset: sel.value, marcado: $("c_nmul").closest(".row")!.classList.contains("mod") };
  $("c_avd").click();
  L.chave = { avd: s.config.avd, aria: $("c_avd").getAttribute("aria-checked") };
  (document.querySelector('[data-np="24"]') as HTMLButtonElement).click();
  L.pontos = { np: s.config.np, NP: E.NP, nos: E.links[0].strands[0].ax.length };
  fire($("c_life"), 0.5);
  $("c_life").closest(".row")!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  L.duploClique = { life: s.config.life };
  pick("muitos");
  L.muitos = { preset: sel.value, nmul: s.config.nmul, fios: cnt() };
  pick("padrao");
  L.padrao = { preset: sel.value, fios: cnt(), NP: E.NP };
  $("cfgMin").click();
  L.recolher = { min: document.getElementById("cfg")!.classList.contains("min"), aria: $("cfgMin").getAttribute("aria-expanded") };
  $("cfgMin").click();
  const B = document.getElementById("cfgB")!;
  L.janela = { fimPx: Math.round(document.getElementById("cfg")!.getBoundingClientRect().bottom), conteudo: B.scrollHeight, visivel: B.clientHeight };
  return L;
}
