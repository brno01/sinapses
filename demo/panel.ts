// Janela de ajustes: gerada a partir de CONTROL_SECTIONS e PRESETS; grava no navegador e manda os valores para o motor.
import { CONFIG_DEFAULT, CONTROL_SECTIONS, POINTS_OPTIONS, PRESETS, configEquals, sanitizeConfig, strandCount, type Config, type ControlSpec, type LinkDef, type Sinapses } from "../src/index";

const STORAGE_KEY = "sinapses-cfg";
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function loadConfig(): Config {
  try {
    return sanitizeConfig(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
  } catch {
    return { ...CONFIG_DEFAULT };
  }
}

export function mountPanel(s: Sinapses, links: LinkDef[], persist: boolean): void {
  const total = (cfg: Config) => links.reduce((t, l) => t + strandCount(l.strands, cfg), 0);
  const fmt = (c: ControlSpec, v: number, cfg: Config) => (c.format === "strands" ? `${total(cfg)} fios` : `${Math.round(v * 100)}%`);
  const controls = CONTROL_SECTIONS.flatMap((sec) => sec.controls);

  let h = "";
  for (const sec of CONTROL_SECTIONS) {
    h += `<section><h3>${sec.title}</h3>`;
    for (const c of sec.controls) {
      h += `<div class="row" data-k="${c.key}" title="Duplo clique volta ao padrão"><label for="c_${c.key}">${c.label}</label><output id="o_${c.key}" for="c_${c.key}"></output><input type="range" id="c_${c.key}" min="${c.min}" max="${c.max}" step="${c.step}"${c.hint ? ` aria-describedby="h_${c.key}"` : ""}>${c.hint ? `<small id="h_${c.key}">${c.hint}</small>` : ""}</div>`;
    }
    if (sec.title === "Movimento") h += `<div class="row two"><span id="l_avd">Desviar dos nós</span><button type="button" role="switch" id="c_avd" aria-labelledby="l_avd"><i></i></button></div>`;
    h += "</section>";
  }
  h += `<section><h3>Física</h3><div class="row two"><span id="l_np">Pontos por fio</span><div class="seg" role="radiogroup" aria-labelledby="l_np">${POINTS_OPTIONS.map((v) => `<button type="button" role="radio" data-np="${v}">${v}</button>`).join("")}</div></div></section>`;
  h += `<footer><div class="act"><select id="cfgPre" aria-label="Preset"><option value="custom" disabled>Personalizado</option>${Object.entries(PRESETS).map(([id, p]) => `<option value="${id}">${p.label}</option>`).join("")}</select><button type="button" class="p" id="cfgCopy">Copiar ajustes</button></div></footer>`;
  $("cfgB").innerHTML = h;

  const set = (partial: Partial<Config>) => {
    s.setConfig(partial);
    sync();
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s.config)); } catch { /* sem armazenamento: segue sem salvar */ }
    }
  };
  const sync = () => {
    const cfg = s.config;
    document.documentElement.style.setProperty("--sat", String(cfg.sat));
    const pk = Object.entries(PRESETS).find(([, p]) => configEquals(p.config, cfg))?.[0];
    $<HTMLSelectElement>("cfgPre").value = pk ?? "custom";
    for (const c of controls) {
      const el = $<HTMLInputElement>(`c_${c.key}`), v = cfg[c.key];
      el.value = String(v);
      el.style.setProperty("--p", `${((v - c.min) / (c.max - c.min)) * 100}%`);
      $(`o_${c.key}`).textContent = fmt(c, v, cfg);
      el.closest(".row")!.classList.toggle("mod", Math.abs(v - CONFIG_DEFAULT[c.key]) > 1e-6);
    }
    const sw = $("c_avd");
    sw.setAttribute("aria-checked", String(cfg.avd));
    sw.closest(".row")!.classList.toggle("mod", cfg.avd !== CONFIG_DEFAULT.avd);
    document.querySelectorAll<HTMLButtonElement>("[data-np]").forEach((b) => {
      const on = +b.dataset.np! === cfg.np;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
  };

  for (const c of controls) {
    const el = $<HTMLInputElement>(`c_${c.key}`);
    el.addEventListener("input", () => set({ [c.key]: +el.value }));
    el.closest(".row")!.addEventListener("dblclick", () => set({ [c.key]: CONFIG_DEFAULT[c.key] }));
  }
  $("c_avd").onclick = () => set({ avd: !s.config.avd });
  const nps = [...document.querySelectorAll<HTMLButtonElement>("[data-np]")];
  nps.forEach((b, i) => {
    b.onclick = () => set({ np: +b.dataset.np! as Config["np"] });
    b.onkeydown = (e) => {
      const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const nb = nps[(i + d + nps.length) % nps.length];
      set({ np: +nb.dataset.np! as Config["np"] });
      nb.focus();
    };
  });
  $<HTMLSelectElement>("cfgPre").onchange = (e) => {
    const p = PRESETS[(e.target as HTMLSelectElement).value as keyof typeof PRESETS];
    if (p) set({ ...p.config });
  };
  const cp = $<HTMLButtonElement & { t?: number }>("cfgCopy");
  cp.onclick = async () => {
    const txt = JSON.stringify(s.config);
    let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; } catch { /* sem permissão de área de transferência */ }
    cp.textContent = ok ? "Copiado" : "Não copiou";
    clearTimeout(cp.t);
    cp.t = window.setTimeout(() => (cp.textContent = "Copiar ajustes"), 1600);
  };

  // a janela recolhe pelo botão e se arrasta pelo cabeçalho
  const W = $("cfg"), minB = $("cfgMin");
  const setMin = (m: boolean) => {
    W.classList.toggle("min", m);
    minB.setAttribute("aria-expanded", String(!m));
    minB.setAttribute("aria-label", m ? "Abrir ajustes" : "Recolher ajustes");
  };
  minB.onclick = () => setMin(!W.classList.contains("min"));
  if (innerWidth < 1200) setMin(true);
  const H = $("cfgH");
  let ox = 0, oy = 0, dr = false;
  H.onpointerdown = (e) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dr = true;
    H.setPointerCapture(e.pointerId);
    const r = W.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    W.style.left = `${r.left}px`;
    W.style.right = "auto";
    W.classList.add("drag");
  };
  H.onpointermove = (e) => {
    if (!dr) return;
    W.style.left = `${Math.min(Math.max(e.clientX - ox, 8), innerWidth - W.offsetWidth - 8)}px`;
    W.style.top = `${Math.min(Math.max(e.clientY - oy, 8), innerHeight - 48)}px`;
  };
  H.onpointerup = () => {
    dr = false;
    W.classList.remove("drag");
  };

  s.on("perf", ({ ms, fps }) => ($("perf").textContent = `${ms.toFixed(1).replace(".", ",")} ms · ${fps} fps`));
  sync();
}
