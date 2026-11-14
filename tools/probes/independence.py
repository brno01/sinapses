"""Independência entre fios da ligação api-worker em uso: desvio lateral do nó do meio de cada fio em relação à
forma-alvo (rms, px) e correlação média entre fios (perto de 0 = cada fio se mexe sozinho)."""
import sys
src = open(sys.argv[1]).read()
P = '''
(function(){const c=C[0];const rows=[];
 window.__samp=()=>{const r=[];for(const s of c.strands){if(!s.init||s.cut>=0)continue;const j=Math.floor((NP-1)*.5),T=target(s,j/(NP-1)),dx=s.B.x-s.A.x,dy=s.B.y-s.A.y,L=Math.hypot(dx,dy);r.push(((s.x[j]-T[0])*(-dy)+(s.y[j]-T[1])*dx)/L)}rows.push(r)};
 window.__res=()=>{const n=rows.length,m=rows[0].length,ser=[...Array(m).keys()].map(k=>rows.map(r=>r[k]));
  const rms=ser.map(a=>{const mu=a.reduce((x,y)=>x+y)/n;return Math.sqrt(a.reduce((x,y)=>x+(y-mu)**2,0)/n)});
  const cor=(a,b)=>{const ma=a.reduce((x,y)=>x+y)/n,mb=b.reduce((x,y)=>x+y)/n;let sab=0,saa=0,sbb=0;for(let i=0;i<n;i++){sab+=(a[i]-ma)*(b[i]-mb);saa+=(a[i]-ma)**2;sbb+=(b[i]-mb)**2}return sab/Math.sqrt(saa*sbb||1e-12)};
  let t=0,k=0;for(let a=0;a<m;a++)for(let b=a+1;b<m;b++){t+=cor(ser[a],ser[b]);k++}
  return{fios:m,rmsPx:+(rms.reduce((x,y)=>x+y)/m).toFixed(2),corrMedia:+(t/k).toFixed(2)}}})();
'''
src = src.replace("size();cap();\n", "size();cap();\n" + P, 1)
src = src.replace("frame()}})();", "frame();if(i>=Math.round(N*.35))__samp()}document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify(__res())+'</pre>')})();")
open(sys.argv[2], "w").write(src)
