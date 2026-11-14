"""Erros de JavaScript durante a simulação e custo médio dos últimos 120 quadros (ms)."""
import sys
src = open(sys.argv[1]).read()
src = src.replace('<script>', '<script>window.__err=[];addEventListener("error",e=>__err.push(e.message));\n', 1)
src = src.replace("frame()}})();", "const q0=Date.now();frame();if(i>=N-120)window.__ms=(window.__ms||0)+(Date.now()-q0)}document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify({erros:__err,msQuadro:+(__ms/120).toFixed(1)})+'</pre>')})();")
open(sys.argv[2], "w").write(src)
