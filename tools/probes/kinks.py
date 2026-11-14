"""Dobras na ligação api-worker: maior ângulo entre segmentos vizinhos (graus) e fração de amostras acima de 30°,
separando fios inteiros e metades rompidas (a junta do corte não conta)."""
import sys
src = open(sys.argv[1]).read()
P = '''
(function(){const c=C[0];const st={inteiros:[0,0,0],rompidos:[0,0,0]};
 window.__samp=()=>{for(const s of c.strands){if(!s.init)continue;const k=s.cut,r=st[k<0?'inteiros':'rompidos'];let mx=0;
   for(let j=1;j<NP-1;j++){if(k>=0&&(j===k||j===k+1))continue;const ax=s.x[j]-s.x[j-1],ay=s.y[j]-s.y[j-1],bx=s.x[j+1]-s.x[j],by=s.y[j+1]-s.y[j],la=Math.hypot(ax,ay),lb=Math.hypot(bx,by);if(la<.3||lb<.3)continue;mx=Math.max(mx,Math.acos(Math.max(-1,Math.min(1,(ax*bx+ay*by)/(la*lb))))*57.3)}
   r[0]=Math.max(r[0],mx);r[1]+=mx>30?1:0;r[2]++}};
 window.__res=()=>{const o={};for(const k in st){const r=st[k];o[k]={maxGraus:Math.round(r[0]),acima30:+(r[1]/Math.max(1,r[2])).toFixed(3)}}return o}})();
'''
src = src.replace("size();cap();\n", "size();cap();\n" + P, 1)
src = src.replace("frame()}})();", "frame();if(i>30)__samp()}document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify(__res())+'</pre>')})();")
open(sys.argv[2], "w").write(src)
