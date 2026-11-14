"""Assinatura das posições ao fim da simulação: por fio, [Σx, Σy, Σx·j, Σy·j] (j = índice do ponto).
Serve para comparar o motor em TypeScript (rodando em Node) com a demo antiga (rodando no Chrome) com tolerância:
Math.exp/sin/cos diferem no último bit entre versões do V8, então igualdade bit a bit entre ambientes não existe.
DRAG=1 arrasta o nó worker 120 px (em passos inteiros de pixel) entre os quadros 60 e 78."""
import os, sys
src = open(sys.argv[1]).read()
end = "const sig=C.map(c=>c.strands.map(s=>{let a=0,b=0,cx=0,cy=0;for(let j=0;j<NP;j++){a+=s.x[j];b+=s.y[j];cx+=s.x[j]*j;cy+=s.y[j]*j}return[a,b,cx,cy].map(v=>Math.round(v*1e6)/1e6)}));document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify(sig)+'</pre>')})();"
if os.environ.get("DRAG"):
    hook = "window.__hook=i=>{if(i>=60&&i<78){document.getElementById('worker').style.left=(470+Math.round(120*(i-59)/18))+'px'}};\n"
    src = src.replace("size();cap();\n", "size();cap();\n" + hook, 1).replace("frame()}})();", "frame();__hook(i)}" + end)
else:
    src = src.replace("frame()}})();", "frame()}" + end)
open(sys.argv[2], "w").write(src)
