"""Exercita o painel de ajustes por eventos do DOM (slider, chave, pontos por fio, duplo clique, presets, recolher)
e confere se a janela cabe na tela de 900 px."""
import sys
src = open(sys.argv[1]).read()
T = '''
const L={},q=id=>document.getElementById(id),fire=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},cnt=()=>C.reduce((a,c)=>a+c.strands.length,0),sel=q('cfgPre'),pick=v=>{sel.value=v;sel.dispatchEvent(new Event('change'))};
L.inicio={preset:sel.value,fios:cnt()};
fire(q('c_nmul'),1);L.quantidade={nmul:CFG.nmul,rotulo:q('o_nmul').textContent,fios:cnt(),preset:sel.value,marcado:q('c_nmul').closest('.row').classList.contains('mod')};
q('c_avd').click();L.chave={avd:CFG.avd,aria:q('c_avd').getAttribute('aria-checked')};
document.querySelector('[data-np="24"]').click();L.pontos={np:CFG.np,NP,nos:C[0].strands[0].ax.length};
fire(q('c_life'),.5);q('c_life').closest('.row').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));L.duploClique={life:CFG.life,padrao:CFG_DEF.life};
let sv=null;try{sv=JSON.parse(localStorage.getItem('sinapses-cfg')).np}catch(e){sv='erro'}L.salvo={np:sv};
pick('muitos');L.muitos={preset:sel.value,nmul:CFG.nmul,tdl:CFG.tdl,fios:cnt()};
pick('padrao');L.padrao={preset:sel.value,igual:JSON.stringify(CFG)===JSON.stringify(CFG_DEF),fios:cnt(),NP};
q('cfgMin').click();L.recolher={min:q('cfg').classList.contains('min'),aria:q('cfgMin').getAttribute('aria-expanded')};q('cfgMin').click();
window.__UI=L;
'''
src = src.replace("size();cap();\n", "size();cap();\n" + T, 1)
src = src.replace("frame()}})();", "frame()}const B=document.getElementById('cfgB');__UI.janela={fimPx:Math.round(document.getElementById('cfg').getBoundingClientRect().bottom),conteudo:B.scrollHeight,visivel:B.clientHeight};document.body.insertAdjacentHTML('beforeend','<pre id=mt>'+JSON.stringify(__UI)+'</pre>')})();")
open(sys.argv[2], "w").write(src)
