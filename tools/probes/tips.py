"""Quebra da ligação api-worker: distância real entre as pontas de cada fio rompido (px), quantas vezes quase
encostaram (< 6 px) e a correlação média entre fios (perto de 0 = cada fio no seu ritmo). Amostra a partir de 3 s."""
import sys
src = open(sys.argv[1]).read()
P = '''
(function(){const c=C[0];const G={};
 window.__samp=t=>{if(t<3)return;for(const s of c.strands){if(s.cut<0)continue;const k=s.cut;(G[s.i]=G[s.i]||[]).push(Math.hypot(s.x[k+1]-s.x[k],s.y[k+1]-s.y[k]))}};
 window.__res=()=>{const ser=Object.values(G),fios={};for(const i in G){const a=G[i];let ev=0,lo=false;for(const d of a){if(d<6&&!lo){ev++;lo=true}if(d>10)lo=false}fios[i]={min:+Math.min(...a).toFixed(1),media:+(a.reduce((x,y)=>x+y)/a.length).toFixed(1),max:+Math.max(...a).toFixed(1),quaseEncostou:ev}}
  const n=Math.min(...ser.map(a=>a.length)),cor=(a,b)=>{const ma=a.reduce((x,y)=>x+y)/n,mb=b.reduce((x,y)=>x+y)/n;let s1=0,s2=0,s3=0;for(let i=0;i<n;i++){s1+=(a[i]-ma)*(b[i]-mb);s2+=(a[i]-ma)**2;s3+=(b[i]-mb)**2}return s1/Math.sqrt(s2*s3||1e-12)};
  let t=0,q=0;for(let a=0;a<ser.length;a++)for(let b=a+1;b<ser.length;b++){t+=cor(ser[a].slice(0,n),ser[b].slice(0,n));q++}
  const ms=Object.values(fios).map(f=>f.media);return{fios,mediaGeral:+(ms.reduce((x,y)=>x+y)/ms.length).toFixed(1),corrMedia:+(t/q).toFixed(2)}}})();
'''
src = src.replace("size();cap();\n", "size();cap();\n" + P, 1)
src = src.replace("frame()}})();", "frame();__samp(i/60)}document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify(__res())+'</pre>')})();")
open(sys.argv[2], "w").write(src)
