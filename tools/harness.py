"""Gera uma cópia da demo com relógio virtual, para medir e capturar sem depender do tempo real.

Uso: python3 -I tools/harness.py <demo.html> <saida.html>

A cópia não usa requestAnimationFrame: ela roda a simulação quadro a quadro, a 60 quadros
por segundo virtuais, logo ao carregar. O hash da URL controla a execução:

    #<ação>:<segundos>[:<x>:<y>]

- ação: uma das ações dos botões (on, off, test, upd, anom, busy, flow, break, block, idle),
  aplicada à ligação api-worker; "all-<ação>" aplica a todas as ligações; "none" não faz nada.
- segundos: quanto tempo simular depois da ação (padrão 3).
- x, y: posição do ponteiro do mouse, se quiser simular a repulsão.

As sondas em tools/probes/ inserem código logo depois de "size();cap();" e no fim do laço.
"""
import sys

src = open(sys.argv[1]).read()

head = (
    "<script>window.__t=0;performance.now=()=>window.__t;window.__Q=[];"
    "window.setTimeout=(f,ms)=>{__Q.push([__t+ms,f]);return __Q.length};"
    "window.clearTimeout=()=>{};window.requestAnimationFrame=()=>0;\n"
)
assert src.count("<script>") == 1, "a demo deve ter um único <script>"
src = src.replace("<script>", head, 1)

assert src.count("if(location.hash){") == 1
src = src.replace("if(location.hash){", "if(false){")

run = """size();cap();
(function(){const [a,sec,ptrx,ptry]=location.hash.slice(1).split(':');const T=parseFloat(sec||'3');last=0;
 for(let i=0;i<30;i++){__t+=1000/60;frame()}
 if(a&&a!=='none'){if(a.startsWith('all-'))C.forEach(c=>act(c,a.slice(4)));else act(by('api-worker'),a)}
 if(ptrx){ptr.x=+ptrx;ptr.y=+ptry;ptr.on=true}
 const N=Math.round(T*60);for(let i=0;i<N;i++){__t+=1000/60;for(let q=__Q.length-1;q>=0;q--){if(__Q[q][0]<=__t){const f=__Q[q][1];__Q.splice(q,1);f()}}frame()}})();"""
anchor = "size();cap();requestAnimationFrame(frame);"
assert src.count(anchor) == 1
src = src.replace(anchor, run)

open(sys.argv[2], "w").write(src)
