/* Stayline — complementos da Operação: cartão ao passar o mouse (como no Smart Escala), linha "agora" e "+48h"
   andando sozinhas, e a ficha do hotel (contrato, diária, quartos por noite: contrato × usados × o que o hotel informa pela API). */
(function(){
'use strict';
const X = window.SLX; if(!X) return;
const { S, t, esc, $ } = X;
const loc = ()=> S.lang==='pt' ? 'pt-BR' : 'en-US';
const fH = d => new Date(d).toLocaleString(loc(), { weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
const dur = h => h < 1 ? Math.round(h*60)+' min' : (Math.floor(h)+'h'+(Math.round((h%1)*60) ? String(Math.round((h%1)*60)).padStart(2,'0') : ''));
const noitesDe = p => Math.max(1, Math.round((new Date(p.saida) - new Date(p.chegada)) / 86400000));
const diariaDe = p => { const h = X.hotelPor(p.hotel_id) || S.hoteis.filter(x=>x.base===p.base && x.ativo).sort((a,b)=>(a.tipo==='primario'?0:1)-(b.tipo==='primario'?0:1))[0]; return { v: h ? Number(h.tarifa||0) : 0, moeda: h && h.moeda }; };
const atualizadoHa = iso => { const m = Math.max(0, Math.round((Date.now() - new Date(iso))/60000)); return m < 60 ? t('op.ha_min',{n:m}) : t('op.ha_h',{n:Math.round(m/60)}); };
window.SL_atualizadoHa = atualizadoHa;
const janelas = j => !j ? '—' : ['manha','tarde'].filter(k=>j[k]).map(k=>`+${j[k].folga} min ${esc(t('ht.'+k))} ${esc(j[k].ini||'')}–${esc(j[k].fim||'')}`).join('<br>') || '—';

/* ---------- cartão ao passar o mouse ---------- */
const card = document.createElement('div'); card.id = 'hcard'; card.hidden = true; card.setAttribute('role','tooltip'); document.body.appendChild(card);
function conteudoPernoite(p){
  const h = X.hotelPor(p.hotel_id), agora = Date.now(), ate = (new Date(p.chegada) - agora)/3600000;
  const quando = ate > 0 ? t('op.chega_em',{t:dur(ate)}) : (new Date(p.saida) > agora ? t('op.hospedado') : t('op.ja_saiu'));
  const { v:diaria, moeda } = diariaDe(p), noites = noitesDe(p), total = diaria * p.qtd * noites;
  return `<div class="hc-h"><span class="pill s-${p.situacao}">${esc(t('sit.'+p.situacao))}</span>${p.origem==='nao_previsto'?` <span class="tag amber">⚡ ${esc(t('orig.nao_previsto'))}</span>`:''}${p.situacao==='a_alocar' && ate <= 48 && ate > -12 ? ` <span class="crit-tag">${esc(t('op.urgente'))}</span>`:''}</div>
    <b class="hc-t">${esc(p.lider)}${p.qtd>1?' +'+(p.qtd-1):''}</b>
    <div class="hc-g"><span>${esc(t('pn.base'))}</span><b class="mono">${esc(p.base)}</b>
      <span>${esc(t('pn.chegada'))}</span><b><span class="mono">${esc(p.voo_chegada||'–')}</span> · ${fH(p.chegada)}</b>
      <span>${esc(t('pn.saida'))}</span><b><span class="mono">${esc(p.voo_saida||'–')}</span> · ${fH(p.saida)}</b>
      <span>${esc(t('op.estadia'))}</span><b>${dur((new Date(p.saida)-new Date(p.chegada))/3600000)} · ${esc(quando)}</b>
      <span>${esc(t('pn.hotel'))}</span><b>${h ? esc(h.nome) : '<span class="muted">'+esc(t('op.sem_hotel'))+'</span>'}</b>
      <span>${esc(t('op.diaria'))}</span><b>${X.fMoeda(diaria, moeda)}${h?'':' <span class="muted">('+esc(t('op.estimada'))+')</span>'}</b>
      <span>${esc(t('op.total'))}</span><b>${X.fMoeda(total, moeda)} <span class="muted">${p.qtd} × ${noites} ${esc(t('op.noite_s'))}</span></b></div>
    ${p.motivo?`<div class="hc-m">${esc(p.motivo)}</div>`:''}
    ${p.situacao==='cancelado' ? '' : `<div class="hc-f">${esc(t('op.dica_bloco'))}</div>`}`;
}
function conteudoOcupacao(el){
  const h = X.hotelPor(el.dataset.occ), n = el.dataset.noite, u = +el.dataset.u, c = +el.dataset.c, api = h && S.disp[h.id+'|'+n];
  const dia = X.diaLocal(n,12).toLocaleDateString(loc(), { weekday:'long', day:'2-digit', month:'2-digit' });
  return `<b class="hc-t">${esc(h ? h.nome : t('op.base_toda'))}</b><div class="muted" style="text-transform:capitalize">${esc(t('op.noite_de',{d:dia}))}</div>
    <div class="hc-g"><span>${esc(t('op.contratados'))}</span><b>${c}</b><span>${esc(t('op.usados'))}</span><b>${u}</b><span>${esc(t('op.livres_contrato'))}</span><b>${Math.max(0,c-u)}</b>
      ${h ? `<span>${esc(t('op.livres_api'))}</span><b>${api ? `${api.quartos_livres} <span class="muted">· ${esc(atualizadoHa(api.atualizado_em))}</span>` : '<span class="muted">'+esc(t('op.sem_api'))+'</span>'}</b>
      <span>${esc(t('op.diaria'))}</span><b>${X.fMoeda(h.tarifa, h.moeda)}</b><span>${esc(t('op.receita_noite'))}</span><b>${X.fMoeda(u*Number(h.tarifa||0), h.moeda)}</b>` : ''}</div>
    ${api && api.quartos_livres < Math.max(0,c-u) ? `<div class="hc-m">${esc(t('op.api_alerta'))}</div>` : ''}
    ${h ? `<div class="hc-f">${esc(t('op.dica_occ2'))}</div>` : ''}`;
}
function posicionar(e){ const w = card.offsetWidth, hh = card.offsetHeight; let x = e.clientX + 16, y = e.clientY + 16;
  if(x + w > innerWidth - 8) x = e.clientX - w - 16; if(y + hh > innerHeight - 8) y = Math.max(8, e.clientY - hh - 16); card.style.left = x+'px'; card.style.top = y+'px'; }
document.addEventListener('mouseover', e=>{
  if(document.body.classList.contains('arrastando')) return;
  const b = e.target.closest && e.target.closest('#view-operacao .blk, #view-operacao .occ2'); if(!b){ card.hidden = true; return; }
  if(b.classList.contains('blk')){ const p = S.pern.find(x=>x.id===b.dataset.p); if(!p) return; card.innerHTML = conteudoPernoite(p); }
  else card.innerHTML = conteudoOcupacao(b);
  card.hidden = false; posicionar(e);
});
document.addEventListener('mousemove', e=>{ if(!card.hidden) posicionar(e); });
document.addEventListener('dragstart', ()=>{ card.hidden = true; });
document.addEventListener('scroll', ()=>{ card.hidden = true; }, true);
window.addEventListener('blur', ()=>{ card.hidden = true; });

/* ---------- "agora" e "+48h" andam sozinhas, a cada minuto, sem redesenhar a tela ---------- */
setInterval(()=>{
  if(S.view !== 'operacao') return;
  const ini = X.diaLocal(S.ini,0).getTime(), pxh = window.SL_pxh ? window.SL_pxh() : 14 * [0.5,0.75,1,1.5,2][S.zoomIdx];
  const x = d => (d - ini)/3600000 * pxh, agora = Date.now(), crit = agora + 48*3600000;
  const tz = d => new Date(d).toLocaleString(loc(), { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  document.querySelectorAll('.ln-agora,.lb-agora').forEach(el=>{ el.style.left = x(agora)+'px'; });
  document.querySelectorAll('.ln-crit,.lb-crit').forEach(el=>{ el.style.left = x(crit)+'px'; });
  document.querySelectorAll('.lb-agora').forEach(el=>{ el.textContent = t('op.agora',{h:tz(agora)}); });
  document.querySelectorAll('.lb-crit').forEach(el=>{ el.textContent = '+48h ' + tz(crit); });
}, 60000);

/* ---------- ficha do hotel ---------- */
window.SL_fichaHotel = async function(id){
  const h = X.hotelPor(id); if(!h) return;
  const noites = Array.from({length:7}, (_,i)=> X.somaDias(X.hojeISO(), i));
  const { data:fat } = await X.sb.from('prn_faturas').select('*').eq('hotel_id', id).order('competencia', { ascending:false }).limit(6);
  const liq = f => Number(f.valor_bruto) * (1 - Number(f.comissao_pct)/100);
  const mes = d => new Date(d+'T12:00:00').toLocaleDateString(loc(), { month:'long', year:'numeric' });
  X.abrirModal(`<div class="modal-h"><div><h3>${esc(h.nome)}</h3><div class="sub"><span class="mono">${esc(h.base)}</span> · <span class="tag">${esc(h.tipo==='primario'?t('ht.primario'):t('ht.secundario'))}</span>${h.exemplo?' · '+esc(t('hoje.exemplo')):''}</div></div><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b">
      ${h.aviso?`<div class="hc-m" style="margin-bottom:10px">⚠ ${esc(h.aviso)}</div>`:''}
      <div class="kv"><div><small>${esc(t('ht.tarifa'))}</small><b>${X.fMoeda(h.tarifa, h.moeda)}</b></div><div><small>${esc(t('ht.duplo'))}</small><b>${X.fMoeda(h.tarifa_duplo, h.moeda)}</b></div><div><small>${esc(t('ht.quartos'))}</small><b>${h.quartos_dia}</b></div>
        <div><small title="${esc(t('ht.duracao_d'))}">${esc(t('ht.duracao'))}</small><b>${h.duracao_h?h.duracao_h+'h':'—'}</b></div><div><small>${esc(t('ht.translado'))}</small><b>${h.minutos_local!=null?h.minutos_local+' min':'—'}</b></div><div><small>${esc(t('ht.release'))}</small><b class="mono">${esc(h.release||'—')}</b></div>
        <div><small>${esc(t('ht.janelas'))}</small><b>${janelas(h.janelas)}</b></div><div><small>${esc(t('ht.categoria'))}</small><b>${esc(h.categoria||'—')}</b></div><div><small>${esc(t('ht.rede'))}</small><b>${esc(h.rede||'—')}</b></div>
        <div><small>${esc(t('ht.cidade_uf'))}</small><b>${esc([h.cidade,h.uf].filter(Boolean).join(' · ')||'—')}</b></div><div><small>${esc(t('ht.contrato_num'))}</small><b class="mono">${esc(h.contrato_num||'—')}</b></div><div><small>${esc(t('ht.comissao'))}</small><b>${Number(h.comissao_pct)}%</b></div>
        <div><small>${esc(t('ht.servicos'))}</small><b>${esc(h.servicos||'—')}</b></div><div><small>${esc(t('ht.contato'))}</small><b>${esc(h.contato||'—')}</b></div><div><small>${esc(t('ht.telefone'))}</small><b class="mono">${esc(h.telefone||'—')}</b></div></div>
      ${h.fonte?`<div class="sub" style="margin-top:-4px">${esc(h.fonte)}</div>`:''}
      <div class="fld"><span>${esc(t('op.quartos_7'))}</span><div class="tl-scroll"><table><thead><tr><th>${esc(t('op.noite'))}</th><th>${esc(t('op.contratados'))}</th><th>${esc(t('op.usados'))}</th><th>${esc(t('op.livres_contrato'))}</th><th>${esc(t('op.livres_api'))}</th></tr></thead><tbody>
        ${noites.map(n=>{ const u = X.usados(h.id, n), api = S.disp[h.id+'|'+n], livre = Math.max(0, h.quartos_dia-u);
          return `<tr><td>${esc(X.diaLocal(n,12).toLocaleDateString(loc(), { weekday:'short', day:'2-digit', month:'2-digit' }))}</td><td class="mono">${h.quartos_dia}</td><td class="mono">${u}</td><td class="mono">${livre}</td><td class="mono">${api ? `<b class="${api.quartos_livres < livre ? 'neg' : ''}">${api.quartos_livres}</b> <span class="sub">${esc(api.fonte)} · ${esc(atualizadoHa(api.atualizado_em))}</span>` : '<span class="muted">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>
        <div class="sub">${esc(t('op.api_nota'))}</div></div>
      <div class="fld"><span>${esc(t('op.faturas'))}</span><div class="tl-scroll"><table><thead><tr><th>${esc(t('ant.competencia'))}</th><th>${esc(t('ant.noites'))}</th><th>${esc(t('ant.liquido'))}</th><th>${esc(t('ant.previsao'))}</th><th>${esc(t('ant.status'))}</th></tr></thead><tbody>
        ${(fat||[]).map(f=>`<tr><td style="text-transform:capitalize">${esc(mes(f.competencia))}</td><td class="mono">${f.noites}</td><td class="mono">${X.fMoeda(liq(f), h.moeda)}</td><td class="mono">${esc(new Date(f.previsao+'T12:00:00').toLocaleDateString(loc()))}</td><td><span class="pill ast-${f.status}">${esc(t('ast.'+f.status))}</span></td></tr>`).join('') || '<tr><td colspan="5" class="muted">—</td></tr>'}</tbody></table></div></div>
    </div>
    <div class="modal-f"><button class="btn" type="button" id="fh-editar" style="margin-right:auto">${esc(t('op.editar_contrato'))}</button><button class="btn" type="button" id="fh-ver">${esc(t('op.ver_pernoites'))}</button><button class="btn pri" type="button" id="fh-ant">${esc(t('op.antecipar'))}</button></div>`, bg=>{
      bg.querySelector('.modal').style.width = 'min(820px,100%)';
      $('#fh-editar', bg).addEventListener('click', ()=>{ X.fecharModal(); X.modalHotel(h); });
      $('#fh-ver', bg).addEventListener('click', ()=>{ X.fecharModal(); S.abertos.add(h.id); X.irPara('operacao'); });
      $('#fh-ant', bg).addEventListener('click', ()=>{ X.fecharModal(); S.antHotel = h.id; X.irPara('antecipa'); });
    });
};

const css = document.createElement('style'); css.textContent = `
  .ln-dia{position:absolute;top:0;bottom:0;width:1px;background:color-mix(in srgb, var(--ink) 30%, transparent)}
  .ln-meio{position:absolute;top:38px;bottom:0;width:0;border-left:2px dashed color-mix(in srgb, var(--ink) 30%, transparent)}
  .tlg-lab .diaria{font-size:11px;color:var(--ink-3);flex:none}
  .occ2 span b{font-weight:700} .occ2.api-baixo{box-shadow:inset 0 0 0 2px var(--amber)}
  #hcard{position:fixed;z-index:480;width:330px;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lg);padding:12px 14px;display:grid;gap:6px;font-size:12.5px;pointer-events:none}
  .hc-h{display:flex;gap:6px;flex-wrap:wrap;align-items:center} .hc-t{font-size:14px}
  .hc-g{display:grid;grid-template-columns:auto 1fr;gap:3px 12px} .hc-g > span{color:var(--ink-3)} .hc-g b{font-weight:600}
  .hc-m{background:var(--amber-soft);color:var(--amber);border-radius:6px;padding:5px 8px} .hc-f{color:var(--ink-3);font-size:11.5px}
  .neg{color:var(--red)}
  .ast-a_vencer{background:var(--blue-soft);color:var(--blue)} .ast-ofertada{background:var(--amber-soft);color:var(--amber)} .ast-aprovada{background:var(--accent-soft);color:var(--accent)}
  .ast-paga{background:var(--green-soft);color:var(--green)} .ast-recusada{background:var(--gray-soft);color:var(--ink-3)} .ast-liquidada{background:var(--gray-soft);color:var(--ink-2)}`;
document.head.appendChild(css);
})();
