"""Custo por quadro (ms, tempo real) dividido em leitura de layout, desvio de tiles, física e desenho, mais as chamadas de
target() e de getBoundingClientRect por quadro. Mede os últimos 60% da simulação. Ruidoso: repita e use o menor valor."""
import sys
src = open(sys.argv[1]).read()
src = src.replace('<script>window.__t=0;', '<script>window.__rn=performance.now.bind(performance);window.__t=0;', 1)
P = '''
(function(){const T={geo:0,avoid:0,step:0,draw:0,tgt:0,rect:0,frames:0},on={v:false};
 const W=(name,f)=>function(...a){if(!on.v)return f.apply(this,a);const t0=__rn();const r=f.apply(this,a);T[name]+=__rn()-t0;return r};
 geoC=W('geo',geoC);avoid=W('avoid',avoid);step=W('step',step);draw=W('draw',draw);
 const tg=target;target=function(...a){if(on.v)T.tgt++;return tg.apply(this,a)};
 const gb=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){if(on.v)T.rect++;return gb.call(this)};
 window.__prof={on,T}})();
'''
src = src.replace("size();cap();\n", "size();cap();\n" + P, 1)
src = src.replace("frame()}})();", "if(i===Math.round(N*.4))__prof.on.v=true;frame();if(__prof.on.v)__prof.T.frames++}const Q=__prof.T,f=Q.frames,r=x=>+(x/f).toFixed(2);document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify({layout:r(Q.geo-Q.avoid),desvio:r(Q.avoid),fisica:r(Q.step),desenho:r(Q.draw),total:r(Q.geo+Q.step+Q.draw),targetPorQuadro:Math.round(Q.tgt/f),rectsPorQuadro:Math.round(Q.rect/f),fios:C.reduce((a,c)=>a+c.strands.length,0)})+'</pre>')})();")
open(sys.argv[2], "w").write(src)
