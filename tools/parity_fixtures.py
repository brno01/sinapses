"""Gera test/fixtures/legacy-signatures.json: assinatura das posições da demo antiga (legacy/) em vários cenários.
O teste de paridade (test/parity.test.ts) roda os mesmos cenários no motor em TypeScript e compara com tolerância.
Uso: python3 -I tools/parity_fixtures.py"""
import json, os, pathlib, subprocess, tempfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
LEGACY = ROOT / "legacy/index.html"
SCEN = [("none", 5), ("flow", 5), ("idle", 5), ("busy", 5), ("test", 6), ("upd", 6), ("anom", 6), ("break", 6), ("block", 5), ("on", 5), ("off", 6)]
REF = {"pspd": 1, "pfrq": 1, "pdot": 1, "nmul": 1, "wid": 1, "spr": 1, "ops": 0, "glo": 1, "sat": 1, "life": 1, "wav": 1, "wln": 1, "sway": 1, "tdl": 1, "avd": True, "np": 48}

def run(hash_, cfg="", demo=LEGACY, env=None):
    out = subprocess.run([str(ROOT / "tools/probe.sh"), "signature.py", hash_, cfg, str(demo)], capture_output=True, text=True, env={**os.environ, **(env or {})}).stdout
    return json.loads(out)

res = {}
for a, sec in SCEN:
    res[f"{a}:{sec}"] = run(f"{a}:{sec}")
    print(a, flush=True)
res["break:6@ref"] = run("break:6", json.dumps(REF))
res["test:6@np24"] = run("test:6", json.dumps({"np": 24}))
with tempfile.TemporaryDirectory() as d:
    obst = pathlib.Path(d) / "obst.html"
    obst.write_text(LEGACY.read_text().replace('id="db" style="left:870px;top:420px"', 'id="db" style="left:470px;top:150px"'))
    res["obstacle:flow:5"] = run("flow:5", "", obst)
res["drag:none:4"] = run("none:4", env={"DRAG": "1"})
(ROOT / "test/fixtures").mkdir(parents=True, exist_ok=True)
(ROOT / "test/fixtures/legacy-signatures.json").write_text(json.dumps(res) + "\n")
