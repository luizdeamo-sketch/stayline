/* Stayline — apresentação guiada (o que é cada coisa) e "Entendemos certo?" (perguntas para validar o fluxo).
   A apresentação abre sozinha no primeiro acesso de cada pessoa; depois fica no botão "Como funciona". */
(function(){
'use strict';
const SL = window.SL; if(!SL) return;
const t = (k,v)=> SL.t(k,v), sb = SL.sb;
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lsGet = k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const lsSet = (k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };

/* ---------- apresentação guiada ---------- */
const PASSOS = [
  { alvo:'.side .brand', view:'hoje', k:'bemvindo' },
  { alvo:'#noite-wrap', view:'hoje', k:'noite' },
  { alvo:'.chips', view:'hoje', k:'chips' },
  { alvo:'.chip.k-a_alocar', view:'hoje', k:'a_alocar' },
  { alvo:'.chip.k-alocado', view:'hoje', k:'alocado' },
  { alvo:'.chip.k-a_reconfirmar', view:'hoje', k:'a_reconfirmar' },
  { alvo:'.occ', view:'hoje', k:'ocupacao' },
  { alvo:'#view-hoje tbody tr', view:'hoje', k:'linha' },
  { alvo:'#h-auto', view:'hoje', k:'auto' },
  { alvo:'#h-imp', view:'hoje', k:'importar' },
  { alvo:'.nav[data-view=hoteis]', view:'hoje', k:'hoteis' },
  { alvo:'#ac-btn', view:'hoje', k:'balao' },
  { alvo:'#btn-valid', view:'hoje', k:'validar' }
];
let passo = 0;
function tourAbrir(){ passo = 0; const f = document.getElementById('nov-faixa'); if(f) f.hidden = true; desenhar(); }
function tourFechar(){ const o = document.getElementById('tour'); if(o) o.remove(); window.removeEventListener('resize', reposicionar); window.removeEventListener('scroll', reposicionar, true); lsSet('sl_tour_visto:'+SL.email, '1');
  const f = document.getElementById('nov-faixa'); if(f) f.hidden = false; }
function reposicionar(){ if(document.getElementById('tour')) desenhar(true); }
function desenhar(soPosicao){
  const p = PASSOS[passo]; if(SL.view() !== p.view) SL.irPara(p.view);
  const el = document.querySelector(p.alvo);
  let o = document.getElementById('tour');
  if(!o){ o = document.createElement('div'); o.id = 'tour'; o.innerHTML = '<div class="tour-luz"></div><div class="tour-card" role="dialog" aria-modal="true"></div>'; document.body.appendChild(o); window.addEventListener('resize', reposicionar); window.addEventListener('scroll', reposicionar, true); }
  const luz = o.querySelector('.tour-luz'), card = o.querySelector('.tour-card');
  if(el && !soPosicao){ el.scrollIntoView({ block:'center', behavior:'auto' }); }   // rolagem instantânea: o destaque mede a posição final
  setTimeout(()=>{
    const r = el ? el.getBoundingClientRect() : { left:innerWidth/2-1, top:innerHeight/2-1, width:2, height:2, right:innerWidth/2+1, bottom:innerHeight/2+1 };
    Object.assign(luz.style, { left:(r.left-6)+'px', top:(r.top-6)+'px', width:(r.width+12)+'px', height:(Math.min(r.height, innerHeight*0.6)+12)+'px' });
    if(!soPosicao){
      card.innerHTML = '<div class="tour-n">'+(passo+1)+' / '+PASSOS.length+'</div><h3>'+esc(t('tour.'+p.k+'.t'))+'</h3><p>'+esc(t('tour.'+p.k+'.d'))+'</p>'
        + '<div class="tour-bt"><button type="button" class="btn" data-tb="sair">'+esc(t('tour.pular'))+'</button><span style="flex:1"></span>'
        + (passo ? '<button type="button" class="btn" data-tb="voltar">'+esc(t('tour.voltar'))+'</button>' : '')
        + (passo < PASSOS.length-1 ? '<button type="button" class="btn pri" data-tb="prox">'+esc(t('tour.proximo'))+'</button>' : '<button type="button" class="btn pri" data-tb="validar">'+esc(t('tour.fim'))+'</button>')
        + '</div>';
      card.querySelectorAll('[data-tb]').forEach(b=> b.onclick = ()=>{ const a = b.dataset.tb;
        if(a==='sair') tourFechar(); else if(a==='voltar'){ passo--; desenhar(); } else if(a==='prox'){ passo++; desenhar(); } else { tourFechar(); validarAbrir(); } });
      const pri = card.querySelector('.btn.pri'); if(pri) pri.focus();
    }
    // cartão abaixo do alvo, ou acima quando não cabe
    const cw = Math.min(380, innerWidth-24), ch = card.offsetHeight || 200;
    let top = r.bottom + 14; if(top + ch > innerHeight - 12) top = Math.max(12, r.top - ch - 14);
    let left = Math.min(Math.max(12, r.left), innerWidth - cw - 12);
    Object.assign(card.style, { width:cw+'px', top:top+'px', left:left+'px' });
  }, soPosicao ? 0 : 60);
}
document.addEventListener('keydown', e=>{ if(!document.getElementById('tour')) return;
  if(e.key==='Escape') tourFechar(); else if(e.key==='ArrowRight' && passo < PASSOS.length-1){ passo++; desenhar(); } else if(e.key==='ArrowLeft' && passo){ passo--; desenhar(); } });

/* ---------- Entendemos certo? ---------- */
const PERGUNTAS = ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10'];
let respostas = {};
async function carregarRespostas(){
  const { data } = await sb.from('prn_validacao').select('pergunta,resposta,comentario').eq('email', SL.email);
  respostas = {}; (data||[]).forEach(r=> respostas[r.pergunta] = r); contar();
}
function contar(){ const b = document.getElementById('btn-valid'); if(!b) return; const falta = PERGUNTAS.filter(q=>!respostas[q]).length;
  const n = b.querySelector('.cnt'); if(n){ n.textContent = falta; n.hidden = !falta; } }
function validarAbrir(){
  const root = document.getElementById('modal-root');
  root.innerHTML = '<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true" style="width:min(760px,100%)">'
    + '<div class="modal-h"><div><h3>'+esc(t('val.titulo'))+'</h3><div class="sub">'+esc(t('val.sub'))+'</div></div><button class="x" type="button" data-close aria-label="✕">✕</button></div>'
    + '<div class="modal-b" id="val-lista">'+PERGUNTAS.map((q,i)=>{ const r = respostas[q]||{};
        return '<div class="val" data-q="'+q+'"><div class="val-n">'+(i+1)+'</div><div class="val-c"><p>'+esc(t('val.'+q))+'</p>'
          + '<div class="val-bt">'+['certo','parcial','errado'].map(op=>'<button type="button" class="btn '+(r.resposta===op?'on-'+op:'')+'" data-op="'+op+'">'+esc(t('val.op.'+op))+'</button>').join('')+'</div>'
          + '<textarea rows="2" placeholder="'+esc(t('val.coment'))+'" '+(r.resposta && r.resposta!=='certo' || r.comentario ? '' : 'hidden')+'>'+esc(r.comentario||'')+'</textarea>'
          + '<div class="val-ok sub" hidden></div></div></div>'; }).join('')+'</div>'
    + '<div class="modal-f"><span class="sub" id="val-prog" style="margin-right:auto"></span><button class="btn pri" type="button" data-close>'+esc(t('val.fechar'))+'</button></div></div></div>';
  const bg = root.firstChild;
  bg.querySelectorAll('[data-close]').forEach(b=> b.onclick = ()=>{ root.innerHTML = ''; });
  bg.addEventListener('mousedown', e=>{ if(e.target===bg) root.innerHTML = ''; });
  const prog = ()=>{ const n = PERGUNTAS.filter(q=>respostas[q]).length; bg.querySelector('#val-prog').textContent = t('val.prog', { n, total:PERGUNTAS.length }); contar(); };
  prog();
  async function salvar(box, op){
    const q = box.dataset.q, ta = box.querySelector('textarea'), ok = box.querySelector('.val-ok');
    const reg = { email:SL.email, pergunta:q, resposta:op, comentario:ta.value.trim()||null, idioma:SL.lang };
    const { error } = await sb.from('prn_validacao').upsert(reg, { onConflict:'email,pergunta' });
    if(error){ window.showToast(t('err.salvar', { m:error.message })); return; }
    respostas[q] = reg; ok.hidden = false; ok.textContent = t('val.salvo'); prog();
  }
  bg.querySelectorAll('.val').forEach(box=>{
    const ta = box.querySelector('textarea');
    box.querySelectorAll('[data-op]').forEach(b=> b.onclick = ()=>{
      box.querySelectorAll('[data-op]').forEach(x=> x.className = 'btn' + (x===b ? ' on-'+b.dataset.op : ''));
      if(b.dataset.op !== 'certo'){ ta.hidden = false; ta.focus(); }
      salvar(box, b.dataset.op); });
    let tm = null; ta.addEventListener('input', ()=>{ clearTimeout(tm); tm = setTimeout(()=>{ const r = respostas[box.dataset.q]; salvar(box, r ? r.resposta : 'parcial'); }, 900); });
  });
}
window.SL_validarAbrir = validarAbrir;
window.SL_tourAbrir = tourAbrir;
window.SL_PERGUNTAS = PERGUNTAS;

/* depois do login: carrega as respostas e, no primeiro acesso, abre a apresentação */
window.addEventListener('sl-entrou', async ()=>{
  await carregarRespostas();
  if(!lsGet('sl_tour_visto:'+SL.email)) setTimeout(tourAbrir, 900);
});
window.addEventListener('sl-idioma', ()=>{ if(document.getElementById('tour')) desenhar(); });

const css = document.createElement('style'); css.textContent = `
  #tour{position:fixed;inset:0;z-index:450}
  .tour-luz{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(8,12,20,.62);border:2px solid var(--accent);transition:all .25s ease;pointer-events:none}
  .tour-card{position:fixed;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:16px 18px;display:grid;gap:8px}
  .tour-card h3{margin:0;font-size:16px} .tour-card p{margin:0;color:var(--ink-2);line-height:1.55}
  .tour-n{font-family:var(--fm);font-size:11.5px;color:var(--accent)} .tour-bt{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px}
  .val{display:grid;grid-template-columns:30px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)} .val:last-child{border-bottom:0}
  .val-n{width:28px;height:28px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:700;font-size:13px}
  .val-c{display:grid;gap:8px;min-width:0} .val-c p{margin:0} .val-bt{display:flex;gap:6px;flex-wrap:wrap}
  .val textarea{width:100%;border:1px solid var(--line-2);background:var(--panel);border-radius:8px;padding:8px 10px}
  .btn.on-certo{background:var(--green-soft);border-color:var(--green);color:var(--green)} .btn.on-parcial{background:var(--amber-soft);border-color:var(--amber);color:var(--amber)} .btn.on-errado{background:var(--red-soft);border-color:var(--red);color:var(--red)}
  @media (prefers-reduced-motion:reduce){ .tour-luz{transition:none} }`;
document.head.appendChild(css);
})();
