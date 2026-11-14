"""Varredura de custo por quantidade de fios: mede cada combinação várias vezes, fica com o menor tempo (o mais estável
sob ruído) e ajusta uma reta custo = base + custo por fio.

Uso: python3 -I tools/sweep.py [--nmul 1,1.5,2,2.5,3] [--states none,test,anom] [--runs 5] [--cfg '{"tdl":1}']
Dica: CORES=2,3 prende o Chrome nos núcleos rápidos (em CPUs híbridas, os núcleos econômicos medem ~2× mais lento).
"""
import argparse
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("--nmul", default="1,1.5,2,2.5,3")
ap.add_argument("--states", default="none,test,anom")
ap.add_argument("--runs", type=int, default=5)
ap.add_argument("--cfg", default="{}")
a = ap.parse_args()
extra = json.loads(a.cfg)

rows = {}
for nm in [float(x) for x in a.nmul.split(",")]:
    for st in a.states.split(","):
        best = None
        for _ in range(a.runs):
            cfg = json.dumps({**extra, "nmul": nm})
            out = subprocess.run([str(ROOT / "tools/probe.sh"), "cost.py", f"{st}:6", cfg], capture_output=True, text=True).stdout
            try:
                r = json.loads(out)
            except json.JSONDecodeError:
                continue
            if best is None or r["total"] < best["total"]:
                best = r
        rows[(nm, st)] = best
        print(f"Quantidade {nm:>4} ({best['fios']} fios) {st:>5}: {best['total']:5.1f} ms "
              f"(física {best['fisica']:.1f} · desenho {best['desenho']:.1f} · desvio {best['desvio']:.2f})", flush=True)

for st in a.states.split(","):
    pts = [(rows[k]["fios"], rows[k]["total"]) for k in rows if k[1] == st and rows[k]]
    n = len(pts)
    if n < 2:
        continue
    mx = sum(x for x, _ in pts) / n
    my = sum(y for _, y in pts) / n
    b = sum((x - mx) * (y - my) for x, y in pts) / sum((x - mx) ** 2 for x, _ in pts)
    base = my - b * mx
    print(f"{st}: {base:.2f} ms + {b * 1000:.0f} µs por fio → até ~{int((12 - base) / b)} fios para 12 ms por quadro")
