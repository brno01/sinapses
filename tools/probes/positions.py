"""Impressão digital das posições de todos os nós ao fim da simulação. Duas versões com a mesma impressão digital
produziram exatamente as mesmas posições (útil para otimizações que não devem mudar nada)."""
import sys
src = open(sys.argv[1]).read()
src = src.replace("frame()}})();", "frame()}let h=0,n=0;for(const c of C)for(const s of c.strands)for(let j=0;j<NP;j++){h=(h*31+Math.round(s.x[j]*1e6))%2147483647;h=(h*31+Math.round(s.y[j]*1e6))%2147483647;n++}document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify({hash:h,nos:n})+'</pre>')})();")
open(sys.argv[2], "w").write(src)
