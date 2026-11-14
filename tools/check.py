"""Verificação de regressão da demo. Roda as sondas e falha se algo sair dos limites.

Uso: python3 -I tools/check.py [demo.html]

As medidas de comportamento usam a configuração de referência (todos os ajustes em 100%, 48 pontos), para não
depender do padrão escolhido no painel. Os erros de JavaScript são conferidos com o padrão e com a referência.
Leva cerca de 2 minutos.
"""
import json
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEMO = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "legacy/index.html")
REF = json.dumps({"pspd": 1, "pfrq": 1, "pdot": 1, "nmul": 1, "wid": 1, "spr": 1, "ops": 0, "glo": 1, "sat": 1,
                  "life": 1, "wav": 1, "wln": 1, "sway": 1, "tdl": 1, "avd": True, "np": 48})
STATES = ["none", "on", "off", "test", "upd", "anom", "busy", "flow", "break", "block", "idle"]
failed = 0


def probe(name, hash_, cfg=REF, env=None):
    r = subprocess.run([str(ROOT / "tools/probe.sh"), name, hash_, cfg, DEMO], capture_output=True, text=True,
                       env={**os.environ, **(env or {})})
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {"falhou": (r.stdout + r.stderr).strip()[:300] or "sem saída (erro de sintaxe na demo?)"}


def check(label, cond, detail):
    global failed
    failed += 0 if cond else 1
    print(f"{'ok   ' if cond else 'FALHA'} {label}: {json.dumps(detail, ensure_ascii=False)}", flush=True)


for cfg_name, cfg in (("padrão", ""), ("referência", REF)):
    errs = {}
    for a in STATES:
        r = probe("errors.py", f"{a}:4", cfg)
        if r.get("erros") or "falhou" in r:
            errs[a] = r.get("erros") or r["falhou"]
    check(f"sem erros de JavaScript nos {len(STATES)} estados ({cfg_name})", not errs, errs or "nenhum")

k = probe("kinks.py", "break:10")
check("dobras na quebra (amostras acima de 30° ≤ 3%)",
      "falhou" not in k and k["inteiros"]["acima30"] <= .03 and k["rompidos"]["acima30"] <= .03, k)

w = probe("waviness.py", "none:8")
check("ondulação em repouso (≤ 3 cristas por fio)", "falhou" not in w and w["cristasPorFio"] <= 3, w)

t = probe("tips.py", "break:23")
check("pontas quebradas tentam se reencontrar (média 8–22 px, fios independentes)",
      "falhou" not in t and 8 <= t["mediaGeral"] <= 22 and abs(t["corrMedia"]) <= .4,
      {k: t.get(k) for k in ("mediaGeral", "corrMedia", "falhou") if k in t})

s = probe("sway.py", "none:4")
check("balanço ao arrastar assenta em até 0,5 s", "falhou" not in s and 0 <= s["assentaEmS"] <= .5, s)

i = probe("independence.py", "flow:6")
check("fios em uso se mexem sozinhos (correlação ≤ 0,3)", "falhou" not in i and abs(i["corrMedia"]) <= .3, i)

p = probe("panel.py", "flow:2", "")
check("painel: controles, presets e janela cabendo em 900 px",
      "falhou" not in p and p["inicio"]["preset"] == "padrao" and p["quantidade"]["fios"] == 30
      and p["pontos"]["nos"] == 24 and p["muitos"]["fios"] == 106 and p["padrao"]["igual"]
      and p["janela"]["fimPx"] <= 900 and p["janela"]["conteudo"] <= p["janela"]["visivel"], p)

f1 = probe("fps.py", "flow:8", env={"HZ": "144"})
check("monitor de 144 Hz em uso desenha ~60 quadros/s", "falhou" not in f1 and 58 <= f1["desenhosPorS"] <= 63, f1)
f2 = probe("fps.py", "all-off:16", env={"HZ": "144"})
check("tudo desligado cai para ~30 quadros/s", "falhou" not in f2 and f2["desenhosPorS"] <= 32 and f2["repouso"], f2)

print("\n" + ("tudo certo" if not failed else f"{failed} verificação(ões) falharam"))
sys.exit(1 if failed else 0)
