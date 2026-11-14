"""Ondulação da ligação chat-api: desvio lateral de cada nó em relação à forma-alvo (px) e cristas por fio."""
import sys
src = open(sys.argv[1]).read()
P = '''
(function(){const c=C.find(c=>c.id==='chat-api');let A=[],Z=[],M=[];
 window.__samp=()=>{for(const s of c.strands){if(!s.init||s.cut>=0)continue;const d=[];for(let j=2;j<NP-2;j++){const T=target(s,j/(NP-1)),q1=target(s,(j+1)/(NP-1)),q0=target(s,(j-1)/(NP-1)),tx=q1[0]-q0[0],ty=q1[1]-q0[1],l=Math.hypot(tx,ty)||1;d.push(((s.x[j]-T[0])*-ty+(s.y[j]-T[1])*tx)/l)}
  const mu=d.reduce((a,b)=>a+b)/d.length;let z=0;for(let k=1;k<d.length;k++)if((d[k]-mu)*(d[k-1]-mu)<0)z++;A.push(Math.sqrt(d.reduce((a,b)=>a+(b-mu)**2,0)/d.length));M.push(Math.max(...d.map(Math.abs)));Z.push(z/2)}};
 window.__res=()=>({rmsPx:+(A.reduce((a,b)=>a+b)/A.length).toFixed(2),picoPx:+(M.reduce((a,b)=>a+b)/M.length).toFixed(2),cristasPorFio:+(Z.reduce((a,b)=>a+b)/Z.length).toFixed(1)})})();
'''
src = src.replace("size();cap();\n", "size();cap();\n" + P, 1)
src = src.replace("frame()}})();", "frame();if(i>120&&i%10===0)__samp()}document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify(__res())+'</pre>')})();")
open(sys.argv[2], "w").write(src)
