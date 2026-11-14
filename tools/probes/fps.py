"""Simula um monitor de HZ quadros/s (variável HZ, padrão 60) e conta desenhos e passos de física por segundo nos
últimos 2 s. FOCUS=0 simula a janela sem foco. Ex.: HZ=144 tools/probe.sh fps.py all-off:16"""
import os, sys
src = open(sys.argv[1]).read()
hz = os.environ.get("HZ", "60"); foco = os.environ.get("FOCUS", "1") == "1"
a = 'const N=Math.round(T*60);for(let i=0;i<N;i++){__t+=1000/60;'
assert src.count(a) == 1
src = src.replace(a, 'const N=Math.round(T*%s);for(let i=0;i<N;i++){__t+=1000/%s;if(i===N-Math.round(2*%s)){window.__d0=nDraw;window.__s0=__st}' % (hz, hz, hz))
src = src.replace("size();cap();\n", "size();cap();\ndocument.hasFocus=()=>%s;window.__st=0;const __sf=step;step=function(...a){__st++;return __sf.apply(this,a)};\n" % ("true" if foco else "false"), 1)
src = src.replace("frame()}})();", "frame()}document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify({desenhosPorS:(nDraw-__d0)/2,passosPorS:(__st-__s0)/2/C.length,repouso:calm})+'</pre>')})();")
open(sys.argv[2], "w").write(src)
