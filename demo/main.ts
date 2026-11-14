import "./style.css";
import { STATE_CAPTIONS, STATE_COLORS, STATE_LABELS, createSinapses, sanitizeConfig, type Action, type LinkDef, type LinkState } from "../src/index";
import { loadConfig, mountPanel } from "./panel";
import { runTest } from "./test-mode";

const LINKS: LinkDef[] = [
  { id: "api-worker", from: "api", to: "worker", strands: 9, seed: 5, state: "flow" },
  { id: "worker-db", from: "worker", to: "db", strands: 7, seed: 9, state: "idle" },
  { id: "chat-api", from: "chat", to: "api", strands: 8, seed: 13, state: "flow" },
  { id: "worker-chat", from: "worker", to: "chat", strands: 6, seed: 21, state: "idle" },
];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const q = new URLSearchParams(location.search);
const test = q.get("test");
const nodeIds = ["api", "worker", "chat", "db"];
const nodes = Object.fromEntries(nodeIds.map((id) => [id, $(id)]));

// no modo de teste, o relógio é virtual e os ajustes vêm da URL (nada salvo no navegador)
const config = test ? sanitizeConfig(JSON.parse(q.get("cfg") || "{}")) : loadConfig();
const s = createSinapses($<HTMLCanvasElement>("cv"), { nodes, links: LINKS, config, worker: q.get("worker") !== "0", manual: !!test });
document.documentElement.dataset.mode = s.mode;

// legenda do estado: uma linha por estado presente
const caption = () => {
  const present = [...new Set(LINKS.map((l) => s.state(l.id)))].filter(Boolean) as LinkState[];
  $("cap").innerHTML = present.map((k) => `<b>${STATE_LABELS[k]}</b>: ${STATE_CAPTIONS[k]}`).join("<br>");
};
s.on("state", caption);
caption();

const name = (id: string) => $(id).firstChild!.textContent;
$<HTMLSelectElement>("tg").innerHTML = LINKS.map((l) => `<option value="${l.id}">${name(l.from)} → ${name(l.to)}</option>`).join("");
$("leg").innerHTML = (Object.keys(STATE_COLORS) as LinkState[]).map((k) => `<span><i style="--c:${STATE_COLORS[k]}"></i>${STATE_LABELS[k]}</span>`).join("");

document.querySelectorAll<HTMLButtonElement>("[data-a]").forEach((b) => {
  b.onclick = () => {
    const a = b.dataset.a!;
    if (a === "restart") {
      // reinicia o worker: as três ligações dele desligam, voltam e passam por um teste
      for (const id of ["api-worker", "worker-db", "worker-chat"]) {
        s.sequence(id, [[0, "retract"], [4800, "off"], [5600, "unfurl"], [9700, "testing"], [13300, id === "api-worker" ? "flow" : "idle"]]);
      }
      return;
    }
    s.act($<HTMLSelectElement>("tg").value, a as Action);
  };
});

// os nós podem ser arrastados; durante o arraste os fios ficam mais firmes
document.querySelectorAll<HTMLElement>(".g").forEach((g) => {
  let ox = 0, oy = 0, dr = false;
  g.onpointerdown = (e) => {
    dr = true;
    s.setDragging(true);
    g.setPointerCapture(e.pointerId);
    ox = e.clientX - g.offsetLeft;
    oy = e.clientY - g.offsetTop;
    g.classList.add("drag");
  };
  g.onpointermove = (e) => {
    if (!dr) return;
    g.style.left = `${Math.min(Math.max(e.clientX - ox, 0), innerWidth - 210)}px`;
    g.style.top = `${Math.min(Math.max(e.clientY - oy, 70), innerHeight - 110)}px`;
  };
  g.onpointerup = () => {
    dr = false;
    s.setDragging(false);
    g.classList.remove("drag");
  };
});

mountPanel(s, LINKS, !test);
if (test) runTest(s, test, q, LINKS);

// ?smoke=<ms>: depois desse tempo real, relata onde o motor roda e se ele está produzindo quadros (checagem do Worker)
const smoke = q.get("smoke");
if (smoke && !test) {
  const perf: { ms: number; fps: number }[] = [], errs: string[] = [];
  addEventListener("error", (e) => errs.push(e.message));
  s.on("perf", (p) => perf.push(p));
  if (q.get("act")) setTimeout(() => s.act("api-worker", q.get("act") as Action), 300);
  setTimeout(() => document.body.insertAdjacentHTML("beforeend", `<pre id="mt">${JSON.stringify({ modo: s.mode, eventosPerf: perf.length, ultimo: perf.at(-1) ?? null, estado: s.state("api-worker"), erros: errs })}</pre>`), +smoke);
}
