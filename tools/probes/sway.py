"""Balanço ao arrastar: move o tile worker 120 px em 0,3 s e mede o desvio dos nós da ligação api-worker em relação à
forma-alvo (px): durante, pico depois, média de 0,5 a 2,5 s, em quanto tempo assenta (< 1 px) e a base em repouso.
Use com a ação none:4."""
import sys
src = open(sys.argv[1]).read()
hook = '''
window.__ser=[];window.__hook=i=>{const g=document.getElementById('worker');
 if(i>=60&&i<78){g.style.left=(470+120*((i-59)/18))+'px'}
 const c=C[0];let acc=0,n=0;for(const s of c.strands){if(!s.init||s.cut>=0)continue;for(let j=2;j<NP-2;j++){const T=target(s,j/(NP-1));acc+=(s.x[j]-T[0])**2+(s.y[j]-T[1])**2;n++}}__ser.push(Math.sqrt(acc/Math.max(1,n)))};
window.__done=()=>{const S=__ser,dur=S.slice(60,78),aft=S.slice(78),mid=aft.slice(30,150);let st=-1;for(let k=aft.length-1;k>=0;k--){if(aft[k]>1){st=k+1;break}}
 document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify({durante:+Math.max(...dur).toFixed(2),picoDepois:+Math.max(...aft).toFixed(2),media05a25s:+(mid.reduce((a,b)=>a+b,0)/mid.length).toFixed(2),assentaEmS:+(st/60).toFixed(2),base:+(S.slice(30,60).reduce((a,b)=>a+b,0)/30).toFixed(2)})+'</pre>')};
'''
src = src.replace("size();cap();\n", "size();cap();\n" + hook, 1).replace("frame()}})();", "frame();__hook(i)}__done()})();")
open(sys.argv[2], "w").write(src)
