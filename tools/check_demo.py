"""Checagem da demo nova (demo/, motor em TypeScript) num Chrome headless.

Uso: uv run --with playwright python -I tools/check_demo.py [--no-build]
(o Playwright só é usado na checagem do Worker, que precisa de tempo real; o resto usa o Chrome headless direto)

Gera o build (npm run build), serve dist/ num servidor local e roda:
- os 11 estados no modo de teste (relógio virtual, thread principal): sem erros de JavaScript;
- monitor de 144 Hz: ~60 desenhos por segundo; tudo desligado: ~30;
- a janela de ajustes (controles, presets, encaixe em 900 px);
- o Worker de verdade (tempo real): roda no modo "worker", produz quadros e responde a uma ação.
"""
import contextlib, functools, http.server, json, pathlib, socketserver, subprocess, sys, threading, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
STATES = ["none", "on", "off", "test", "upd", "anom", "busy", "flow", "break", "block", "idle"]
failed = 0


def check(label, cond, detail):
    global failed
    failed += 0 if cond else 1
    print(f"{'ok   ' if cond else 'FALHA'} {label}: {json.dumps(detail, ensure_ascii=False)}", flush=True)


@contextlib.contextmanager
def serve(directory):
    handler = type("Quiet", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None})
    handler = functools.partial(handler, directory=str(directory))
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
        th = threading.Thread(target=httpd.serve_forever, daemon=True)
        th.start()
        try:
            yield f"http://127.0.0.1:{httpd.server_address[1]}/"
        finally:
            httpd.shutdown()


def dump(chrome, url, budget=None):
    args = [chrome, "--headless", "--window-size=1440,900", "--enable-unsafe-swiftshader"]
    if budget:
        args.append(f"--virtual-time-budget={budget}")
    out = subprocess.run(args + ["--dump-dom", url], capture_output=True, text=True, timeout=120).stdout
    s = out.find('<pre id="mt">')
    if s < 0:
        return {"falhou": "sem resultado"}
    return json.loads(out[s + len('<pre id="mt">'):out.index("</pre>", s)])


def worker_smoke(chrome, url):
    """Abre a demo em tempo real (Playwright com o mesmo Chrome headless) e lê o relatório do modo ?smoke."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {"falhou": "Playwright ausente: rode com uv run --with playwright"}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome, args=["--enable-unsafe-swiftshader"])
        page = b.new_page(viewport={"width": 1440, "height": 900})
        page.goto(url)
        page.wait_for_selector("pre#mt", timeout=15000, state="attached")
        r = json.loads(page.inner_text("pre#mt"))
        b.close()
        return r


if "--no-build" not in sys.argv:
    subprocess.run(["npm", "run", "build", "--silent"], cwd=ROOT, check=True, capture_output=True)
chrome = subprocess.run([str(ROOT / "tools/chrome.sh")], capture_output=True, text=True, check=True).stdout.strip()

with serve(ROOT / "dist") as base:
    q = lambda **kw: base + "?" + urllib.parse.urlencode(kw)
    errs = {}
    for a in STATES:
        r = dump(chrome, q(test="run", act=a, sec=4))
        if r.get("erros") or "falhou" in r:
            errs[a] = r.get("erros") or r["falhou"]
    check(f"sem erros de JavaScript nos {len(STATES)} estados", not errs, errs or "nenhum")
    r = dump(chrome, q(test="run", act="flow", sec=8, hz=144))
    check("monitor de 144 Hz em uso desenha ~60 quadros/s", "falhou" not in r and 58 <= r["desenhosPorS"] <= 63, r)
    r = dump(chrome, q(test="run", act="all-off", sec=16, hz=144))
    check("tudo desligado cai para ~30 quadros/s", "falhou" not in r and r["desenhosPorS"] <= 32 and r["repouso"], r)
    p = dump(chrome, q(test="panel", act="flow", sec=2))
    check("painel: controles, presets e janela cabendo em 900 px",
          "falhou" not in p and not p["erros"] and p["inicio"]["preset"] == "padrao" and p["quantidade"]["fios"] == 30
          and p["pontos"]["nos"] == 24 and p["muitos"]["fios"] == 106 and p["padrao"]["fios"] == 76
          and p["janela"]["fimPx"] <= 900 and p["janela"]["conteudo"] <= p["janela"]["visivel"], p)
    w = worker_smoke(chrome, q(smoke=2500, act="test"))
    check("Worker: roda fora da thread principal, produz quadros e responde a ações",
          "falhou" not in w and w["modo"] == "worker" and w["eventosPerf"] >= 2 and w["ultimo"]["fps"] > 0 and w["estado"] == "testing" and not w["erros"], w)

print("\n" + ("tudo certo" if not failed else f"{failed} verificação(ões) falharam"))
sys.exit(1 if failed else 0)
