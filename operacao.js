/* Stayline — tela Operação, com as premissas do Smart Escala Tracking:
   dois painéis no mesmo eixo de tempo (vários dias, zoom, rolagem lateral sincronizada, divisor arrastável),
   em cima a exceção (pernoites A alocar, por base, urgentes primeiro) e embaixo a execução (uma linha por hotel,
   agrupada por base). Arrastar pernoite → hotel aloca; hotel → outro hotel realoca; hotel → painel de cima desaloca.
   Diferença do domínio: um hotel recebe dezenas de tripulações na mesma noite, então a linha do hotel fechada mostra a
   ocupação por noite (visão ampla) e aberta mostra cada pernoite em faixas (visão focada). */
(function(){
'use strict';
const X = window.SLX; if(!X) return;
const { S, t, esc, $, $$ } = X;
const PXH = 14, ZOOM = [0.5, 0.75, 1, 1.5, 2], ROW = 34, LANE = 22, CRIT_H = 48, MAX_NOITES = 31;   // janela crítica de 48h, igual ao Smart Escala
S.zoomIdx = S.zoomIdx ?? 2; S.frac = S.frac ?? 0.36; S.abertos = S.abertos || new Set(); S.recolhidas = S.recolhidas || new Set(); S.ordem = S.ordem || 'urgencia';
let primeiraVez = true;
const todosAbertos = ()=> S.hoteis.filter(h=>h.ativo).every(h=> S.abertos.has(h.id));

const ms = d => new Date(d).getTime();
const inicioMs = ()=> X.diaLocal(S.ini, 0).getTime();
const nDias = ()=> Math.round((X.diaLocal(S.fim,0) - X.diaLocal(S.ini,0))/86400000) + 2;   // +1 para a manhã de saída da última noite
const pxh = ()=> PXH * ZOOM[S.zoomIdx];
const xDe = d => (ms(d) - inicioMs())/3600000 * pxh();
const dias = ()=> Array.from({length:nDias()}, (_,i)=> X.somaDias(S.ini, i));
const loc = ()=> X.S.lang==='pt' ? 'pt-BR' : 'en-US';
const fimSemana = iso => { const d = X.diaLocal(iso, 12).getDay(); return d===0 || d===6; };
const noitesDoPeriodo = ()=> dias().slice(0, -1);
const fH = d => new Date(d).toLocaleString(loc(), { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

function filtrados(){
  const q = (S.busca||'').toLowerCase();
  return S.pern.filter(p=> (!S.base || p.base===S.base) && (S.filtro==='todos' || p.situacao===S.filtro) &&
    (!q || [p.lider, p.voo_chegada, p.voo_saida, p.base, (X.hotelPor(p.hotel_id)||{}).nome].join(' ').toLowerCase().includes(q)));
}
function faixas(lista){   // distribui blocos que se sobrepõem em faixas (lanes)
  const fins = []; const ord = lista.slice().sort((a,b)=> ms(a.chegada)-ms(b.chegada));
  ord.forEach(p=>{ let i = fins.findIndex(f=> f <= ms(p.chegada)); if(i<0){ i = fins.length; fins.push(0); } fins[i] = ms(p.saida); p._lane = i; });
  return Math.max(1, fins.length);
}
function bloco(p){
  const l = Math.max(0, xDe(p.chegada)), w = Math.max(16, xDe(p.saida) - xDe(p.chegada));
  const h = X.hotelPor(p.hotel_id);
  const tip = p.lider + (p.qtd>1 ? ' +'+(p.qtd-1) : '') + ' · ' + (p.voo_chegada||'') + ' → ' + (p.voo_saida||'') + '\n' + fH(p.chegada) + ' → ' + fH(p.saida) + '\n' + t('sit.'+p.situacao) + (h ? ' · ' + h.nome : '') + (p.motivo ? '\n' + p.motivo : '') + (p.situacao!=='cancelado' ? '\n' + t('op.arraste') : '');
  const crit = p.situacao==='a_alocar' && ms(p.chegada) <= Date.now() + CRIT_H*3600000;
  return `<div class="blk b2-${p.situacao}${crit?' crit':''}" data-p="${p.id}" ${p.situacao!=='cancelado'?'draggable="true"':''} aria-label="${esc(tip)}" style="left:${l}px;width:${w}px;top:${p._lane*LANE+6}px">${p.origem==='nao_previsto'?'⚡ ':''}<b>${esc(p.lider.replace(/^(CMD|COP|CMS) /,''))}</b>${p.qtd>1?' +'+(p.qtd-1):''} · ${esc((p.voo_chegada||'').replace('G3 ',''))}</div>`;
}
function celulasOcupacao(usadoPorNoite, cap, hotelId){   // uma célula por noite, alinhada da chegada típica (16h) à saída típica (10h)
  return noitesDoPeriodo().map(n=>{ const u = usadoPorNoite(n); const pc = cap ? u/cap*100 : (u?100:0); const cls = pc>=100 ? 'full' : pc>=80 ? 'mid' : u ? 'ok' : 'zero';
    const l = xDe(X.diaLocal(n,16)), w = xDe(X.diaLocal(n,34)) - l;
    const api = hotelId && S.disp[hotelId+'|'+n]; const alerta = api && api.quartos_livres < Math.max(0, cap-u) ? ' api-baixo' : '';
    return `<div class="occ2 ${cls}${alerta}" data-occ="${hotelId||''}" data-noite="${n}" data-u="${u}" data-c="${cap}" style="left:${l}px;width:${w}px"><i style="width:${Math.min(100,pc)}%"></i><span>${u}/${cap}${api?` · <b>${api.quartos_livres}</b> API`:''}</span></div>`; }).join('');
}
function cabecalho(contagem){
  const dw = 24*pxh(); const ds = dias();
  const horas = ZOOM[S.zoomIdx] >= 0.75 ? [0,3,6,9,12,15,18,21] : [0,12];
  return `<div class="tlg-head"><div class="tlg-corner"></div><div class="tlg-days" style="width:${ds.length*dw}px">${ds.map(d=>{ const c = contagem && contagem[d];
      const nome = X.diaLocal(d,12).toLocaleDateString(loc(), ZOOM[S.zoomIdx] < 0.75 ? { day:'2-digit', month:'2-digit' } : { weekday:'short', day:'2-digit', month:'2-digit' });
      return `<div class="tlg-day${fimSemana(d)?' fds':''}" style="width:${dw}px"><div class="tlg-dn">${esc(nome)}${c&&c.total?` <span class="cnt2" title="${esc(t('op.badge.dia',{a:c.a,t:c.total}))}">${c.a}/${c.total}</span>`:''}</div>
        <div class="tlg-hr">${horas.map(h=>`<span style="left:${h*pxh()}px">${h}</span>`).join('')}</div></div>`; }).join('')}</div></div>`;
}
function sobreposicao(comRotulos){
  const ds = dias(), dw = 24*pxh(), agora = Date.now(), xa = xDe(agora), xc = xDe(agora + CRIT_H*3600000);
  const tz = d => new Date(d).toLocaleString(loc(), { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  return `<div class="tlg-over" style="width:${ds.length*dw}px">${ds.map((d,i)=> (fimSemana(d) ? `<i class="fds-col" style="left:${i*dw}px;width:${dw}px"></i>` : '') + `<i class="ln-dia" style="left:${i*dw}px"></i><i class="ln-meio" style="left:${i*dw+dw/2}px"></i>`).join('')}
    <i class="ln-agora" style="left:${xa}px"></i>${comRotulos?`<span class="lb-agora" style="left:${xa}px">${esc(t('op.agora',{h:tz(agora)}))}</span>`:''}
    <i class="ln-crit" style="left:${xc}px"></i>${comRotulos?`<span class="lb-crit" style="left:${xc}px">+${CRIT_H}h ${esc(tz(agora + CRIT_H*3600000))}</span>`:''}</div>`;
}

window.SL_renderOperacao = function(){
  const v = $('#view-operacao'); if(!v) return;
  // guarda a rolagem para não pular a cada alocação
  const antes = { tx: ($('#op-top')||{}).scrollLeft, ty: ($('#op-top')||{}).scrollTop, by: ($('#op-bot')||{}).scrollTop };
  const lista = filtrados();
  const base = S.base ? S.bases.filter(b=>b.codigo===S.base) : S.bases;
  const cont = { todos: S.pern.filter(p=>!S.base||p.base===S.base).length };
  ['a_alocar','a_reconfirmar','alocado','confirmado','cancelado'].forEach(s=> cont[s] = S.pern.filter(p=>(!S.base||p.base===S.base) && p.situacao===s).length);
  const porDia = {}; S.pern.forEach(p=>{ if(S.base && p.base!==S.base) return; const n = X.noiteDe(p); porDia[n] = porDia[n] || { a:0, total:0 }; porDia[n].total++; if(p.situacao==='a_alocar') porDia[n].a++; });
  const W = nDias()*24*pxh();
  const exemplo = S.pern.some(p=>p.exemplo);

  // painel de cima: exceção — pernoites A alocar por base
  const pend = lista.filter(p=>p.situacao==='a_alocar');
  const agora = Date.now();
  let linhasTop = base.map(b=>{ const ps = pend.filter(p=>p.base===b.codigo); const total = S.pern.filter(p=>p.base===b.codigo).length;
    return { b, ps, total, crit: ps.some(p=> ms(p.chegada) <= agora + CRIT_H*3600000) }; });
  if(S.ordem==='az') linhasTop.sort((a,b)=> a.b.codigo.localeCompare(b.b.codigo));
  else linhasTop.sort((a,b)=> (b.crit-a.crit) || (b.ps.length-a.ps.length) || a.b.codigo.localeCompare(b.b.codigo));
  const htmlTop = linhasTop.map(r=>{ const lanes = faixas(r.ps); const h = Math.max(ROW, lanes*LANE+10);
    return `<div class="tlg-row" data-drop-base="${esc(r.b.codigo)}" style="height:${h}px"><div class="tlg-lab"><b class="mono">${esc(r.b.codigo)}</b> <span class="muted">${esc(r.b.cidade)}</span>${r.crit?' <span class="crit-tag">!</span>':''}<span class="cnt2 ml" title="${esc(t('op.badge.base',{a:r.ps.length,t:r.total}))}">${r.ps.length}/${r.total}</span></div>
      <div class="tlg-track" style="width:${W}px">${r.ps.map(bloco).join('')}</div></div>`; }).join('');

  // painel de baixo: execução — hotéis por base
  const vis = lista.filter(p=>p.hotel_id);
  const htmlBot = base.map(b=>{
    const hs = S.hoteis.filter(h=>h.base===b.codigo && h.ativo).sort((a,c)=> (a.tipo==='primario'?0:1)-(c.tipo==='primario'?0:1) || a.nome.localeCompare(c.nome));
    if(!hs.length) return '';
    const fechada = S.recolhidas.has(b.codigo);
    const capBase = hs.reduce((a,h)=>a+h.quartos_dia,0);
    const cab = `<div class="tlg-row grp" style="height:${ROW}px"><div class="tlg-lab"><button type="button" class="chev" data-grp="${esc(b.codigo)}" aria-expanded="${!fechada}" title="${esc(fechada?t('op.abrir_base'):t('op.fechar_base'))}">${fechada?'▸':'▾'}</button><b class="mono">${esc(b.codigo)}</b> <span class="muted">${esc(b.cidade)} · ${esc(t('op.hoteis.n',{n:hs.length}))}</span></div>
      <div class="tlg-track" style="width:${W}px">${celulasOcupacao(n=> hs.reduce((a,h)=>a+X.usados(h.id,n),0), capBase)}</div></div>`;
    if(fechada) return cab;
    return cab + hs.map(h=>{ const aberto = S.abertos.has(h.id) || (S.busca && vis.some(p=>p.hotel_id===h.id));
      const ps = vis.filter(p=>p.hotel_id===h.id); const lanes = aberto ? faixas(ps) : 1; const alt = aberto ? Math.max(ROW, lanes*LANE+10) : ROW;
      return `<div class="tlg-row hot${aberto?' aberto':''}" data-drop-hotel="${h.id}" style="height:${alt}px"><div class="tlg-lab"><button type="button" class="chev" data-hot="${h.id}" aria-expanded="${aberto}" title="${esc(aberto?t('op.fechar_hotel'):t('op.abrir_hotel'))}">${aberto?'▾':'▸'}</button><span class="hn" data-ficha="${h.id}" title="${esc(t('op.ficha'))}">${esc(h.nome)}</span><span class="diaria mono">${esc(X.fMoeda(h.tarifa, h.moeda))}</span>${h.aviso?`<span class="tag amber" title="${esc(h.aviso)}">⚠</span>`:''}<span class="tp tp-${h.tipo}" title="${esc(h.tipo==='primario'?t('ht.primario'):t('ht.secundario'))}">${h.tipo==='primario'?'P':'S'}</span><button type="button" class="gear" data-cfg="${h.id}" title="${esc(t('op.contrato'))}" aria-label="${esc(t('op.contrato'))}">⚙</button></div>
        <div class="tlg-track" style="width:${W}px">${aberto ? ps.map(bloco).join('') : celulasOcupacao(n=>X.usados(h.id,n), h.quartos_dia, h.id)}</div></div>`; }).join('');
  }).join('');

  v.innerHTML = `
    <div class="head"><div><h2>${esc(t('op.titulo'))} ${exemplo?`<span class="tag amber">${esc(t('hoje.exemplo'))}</span>`:''}</h2><p>${esc(t('op.sub'))}</p></div>
      <div class="acts"><button class="btn" id="op-contratos" type="button">${esc(t('op.contratos'))}</button><button class="btn" id="h-imp" type="button">${esc(t('hoje.importar'))}</button><button class="btn" id="h-auto" type="button">${esc(t('hoje.auto'))}</button><button class="btn pri" id="h-novo" type="button">+ ${esc(t('hoje.novo'))}</button></div></div>
    <div class="op-tools card">
      <div class="op-per" id="op-periodo"><input type="date" id="op-ini" value="${S.ini}" aria-label="${esc(t('op.de'))}"><span class="muted">${esc(t('op.ate'))}</span><input type="date" id="op-fim" value="${S.fim}" aria-label="${esc(t('op.ate'))}"><span class="sub">${esc(t('op.noites',{n:nDias()-1}))}</span><button class="btn" type="button" id="op-hoje">${esc(t('op.hoje'))}</button></div>
      <select id="h-base" aria-label="${esc(t('col.base'))}"><option value="">${esc(t('hoje.todas_bases'))}</option>${S.bases.map(b=>`<option value="${esc(b.codigo)}" ${S.base===b.codigo?'selected':''}>${esc(b.codigo)} · ${esc(b.cidade)}</option>`).join('')}</select>
      <input id="h-busca" type="search" placeholder="${esc(t('hoje.busca'))}" value="${esc(S.busca||'')}" aria-label="${esc(t('hoje.busca'))}">
      <select id="op-ordem" aria-label="${esc(t('op.ordem.urgencia'))}"><option value="urgencia" ${S.ordem==='urgencia'?'selected':''}>${esc(t('op.ordem.urgencia'))}</option><option value="az" ${S.ordem==='az'?'selected':''}>${esc(t('op.ordem.az'))}</option></select>
      <div class="zoom"><button type="button" id="op-zm" title="${esc(t('op.zoom.menos'))}" aria-label="${esc(t('op.zoom.menos'))}" ${S.zoomIdx===0?'disabled':''}>−</button><span class="mono">${Math.round(ZOOM[S.zoomIdx]*100)}%</span><button type="button" id="op-zp" title="${esc(t('op.zoom.mais'))}" aria-label="${esc(t('op.zoom.mais'))}" ${S.zoomIdx===ZOOM.length-1?'disabled':''}>+</button></div>
      <button class="btn" type="button" id="op-exp">${esc(todosAbertos() ? t('op.recolher') : t('op.expandir'))}</button>
    </div>
    <div class="chips">${['todos','a_alocar','a_reconfirmar','alocado','confirmado','cancelado'].map(k=>`<button type="button" class="chip k-${k}" data-f="${k}" aria-pressed="${S.filtro===k}"><b>${cont[k]}</b><span>${esc(k==='todos'?t('chip.todos'):t('sit.'+k))}</span></button>`).join('')}</div>
    <div class="op-paineis card" id="op-paineis">
      <div class="op-sec" id="op-sec-top" style="flex:0 0 ${S.frac*100}%"><div class="op-tit">⚠ ${esc(t('op.painel.abertos'))} <span class="sub">${esc(t('op.painel.n',{n:pend.length}))}</span><span class="leg"><i class="b2-a_alocar"></i>${esc(t('sit.a_alocar'))} <i class="b2-alocado"></i>${esc(t('sit.alocado'))} <i class="b2-a_reconfirmar"></i>${esc(t('sit.a_reconfirmar'))} <i class="b2-confirmado"></i>${esc(t('sit.confirmado'))}</span></div>
        <div class="op-scroll" id="op-top"><div class="tlg" style="width:calc(var(--lab) + ${W}px)">${cabecalho(porDia)}<div class="tlg-body com-rotulos">${sobreposicao(true)}${htmlTop || `<div class="empty">${esc(t('op.vazio.top'))}</div>`}</div></div></div></div>
      <div class="op-div" id="op-div" role="separator" aria-orientation="horizontal" title="${esc(t('op.divisor'))}"></div>
      <div class="op-sec" style="flex:1 1 0"><div class="op-tit">${esc(t('op.painel.hoteis'))} <span class="sub">${esc(t('op.hoteis.n',{n:S.hoteis.filter(h=>h.ativo && (!S.base||h.base===S.base)).length}))}</span></div>
        <div class="op-scroll" id="op-bot"><div class="tlg" style="width:calc(var(--lab) + ${W}px)">${cabecalho(null)}<div class="tlg-body">${sobreposicao(false)}${htmlBot}</div></div></div></div>
    </div>`;
  ligar(v, antes);
};

function alturaPaineis(){ const el = $('#op-paineis'); if(!el) return; const top = el.getBoundingClientRect().top + scrollY; el.style.height = Math.max(440, innerHeight - (top - scrollY) - 14) + 'px'; }
window.addEventListener('resize', ()=>{ if(S.view==='operacao') alturaPaineis(); });

function ligar(v, antes){
  alturaPaineis();
  const top = $('#op-top'), bot = $('#op-bot');
  let sinc = false;
  const sync = (a,b)=> a.addEventListener('scroll', ()=>{ if(sinc) return; sinc = true; b.scrollLeft = a.scrollLeft; sinc = false; });
  sync(top, bot); sync(bot, top);
  if(primeiraVez || antes.tx == null){ const x = Math.max(0, xDe(Date.now() - 6*3600000)); top.scrollLeft = x; bot.scrollLeft = x; primeiraVez = false; }
  else { top.scrollLeft = antes.tx; bot.scrollLeft = antes.tx; top.scrollTop = antes.ty||0; bot.scrollTop = antes.by||0; }

  $$('[data-f]', v).forEach(b=> b.addEventListener('click', ()=>{ S.filtro = b.dataset.f; X.render(); }));
  $('#h-base').addEventListener('change', e=>{ S.base = e.target.value; X.render(); });
  const bs = $('#h-busca'); bs.addEventListener('input', ()=>{ S.busca = bs.value; const pos = bs.selectionStart; X.render(); const n = $('#h-busca'); n.focus(); n.setSelectionRange(pos,pos); });
  $('#op-ordem').addEventListener('change', e=>{ S.ordem = e.target.value; X.render(); });
  $('#op-zm').addEventListener('click', ()=> zoom(-1)); $('#op-zp').addEventListener('click', ()=> zoom(1));
  $('#op-exp').addEventListener('click', ()=>{ if(todosAbertos()) S.abertos.clear(); else S.hoteis.forEach(h=>S.abertos.add(h.id)); X.render(); });
  $('#op-hoje').addEventListener('click', ()=> periodo(X.hojeISO(), X.somaDias(X.hojeISO(),6), true));
  $('#op-ini').addEventListener('change', e=> e.target.value && periodo(e.target.value, S.fim < e.target.value ? e.target.value : S.fim));
  $('#op-fim').addEventListener('change', e=> e.target.value && periodo(S.ini, e.target.value));
  $('#op-contratos').addEventListener('click', ()=> X.irPara('hoteis'));
  $('#h-novo').addEventListener('click', ()=> X.modalNovo());
  $('#h-auto').addEventListener('click', X.alocarPendentes);
  $('#h-imp').addEventListener('click', X.modalImportar);
  $$('[data-grp]', v).forEach(b=> b.addEventListener('click', ()=>{ const k = b.dataset.grp; S.recolhidas.has(k) ? S.recolhidas.delete(k) : S.recolhidas.add(k); X.render(); }));
  $$('[data-hot]', v).forEach(b=> b.addEventListener('click', ()=>{ const k = b.dataset.hot; S.abertos.has(k) ? S.abertos.delete(k) : S.abertos.add(k); X.render(); }));
  $$('[data-cfg]', v).forEach(b=> b.addEventListener('click', ()=> X.modalHotel(X.hotelPor(b.dataset.cfg))));
  $$('[data-ficha]', v).forEach(b=> b.addEventListener('click', ()=> window.SL_fichaHotel(b.dataset.ficha)));
  $$('.blk', v).forEach(el=>{
    el.addEventListener('click', ()=> X.modalPernoite(S.pern.find(p=>p.id===el.dataset.p)));
    el.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', el.dataset.p); e.dataTransfer.effectAllowed = 'move'; document.body.classList.add('arrastando'); });
    el.addEventListener('dragend', ()=> document.body.classList.remove('arrastando'));
  });
  $$('.occ2', v).forEach(el=> el.addEventListener('click', ()=>{ const row = el.closest('[data-drop-hotel]'); if(row){ S.abertos.add(row.dataset.dropHotel); X.render(); } }));
  $$('[data-drop-hotel],[data-drop-base]', v).forEach(row=>{
    row.addEventListener('dragover', e=>{ e.preventDefault(); row.classList.add('sobre'); });
    row.addEventListener('dragleave', ()=> row.classList.remove('sobre'));
    row.addEventListener('drop', async e=>{ e.preventDefault(); row.classList.remove('sobre'); document.body.classList.remove('arrastando');
      const p = S.pern.find(x=>x.id===e.dataTransfer.getData('text/plain')); if(!p) return;
      if(row.dataset.dropHotel) await alocarEm(p, X.hotelPor(row.dataset.dropHotel)); else await desalocar(p); });
  });
  // divisor arrastável entre os painéis (15% a 85%)
  const div = $('#op-div'), cont = $('#op-paineis'), secTop = $('#op-sec-top');
  div.addEventListener('pointerdown', e=>{ e.preventDefault(); div.setPointerCapture(e.pointerId);
    const mover = ev=>{ const r = cont.getBoundingClientRect(); S.frac = Math.min(0.85, Math.max(0.15, (ev.clientY - r.top)/r.height)); secTop.style.flex = '0 0 '+(S.frac*100)+'%'; };
    const soltar = ()=>{ div.removeEventListener('pointermove', mover); div.removeEventListener('pointerup', soltar); };
    div.addEventListener('pointermove', mover); div.addEventListener('pointerup', soltar); });
}
function zoom(d){
  const top = $('#op-top'); const centroH = (top.scrollLeft + top.clientWidth/2 - parseFloat(getComputedStyle(top).getPropertyValue('--lab')||260)) / pxh();
  S.zoomIdx = Math.min(ZOOM.length-1, Math.max(0, S.zoomIdx + d)); X.render();
  const n = $('#op-top'); const lab = parseFloat(getComputedStyle(n).getPropertyValue('--lab')) || 300; const x = Math.max(0, centroH*pxh() - n.clientWidth/2 + lab); n.scrollLeft = x; $('#op-bot').scrollLeft = x;
}
async function periodo(ini, fim, voltarAgora){
  if(Math.round((X.diaLocal(fim,0) - X.diaLocal(ini,0))/86400000) + 1 > MAX_NOITES){ window.showToast(t('op.max')); fim = X.somaDias(ini, MAX_NOITES-1); }
  S.ini = ini; S.fim = fim; if(voltarAgora) primeiraVez = true;
  await X.carregarNoite(); X.render();
}
async function alocarEm(p, h){
  if(!h || !X.guard()) return;
  if(h.base !== p.base){ window.showToast(t('op.err.base', { b:h.base, p:p.base })); return; }
  if(p.hotel_id === h.id) return;
  const livres = h.quartos_dia - X.usados(h.id, X.noiteDe(p), p.id);
  if(livres < p.qtd){ window.showToast(t('op.err.lotado', { h:h.nome, n:Math.max(0,livres), q:p.qtd })); return; }
  if(await X.atualizarPernoite(p, { hotel_id:h.id, situacao:'alocado' }, 'alocado (arrastar): '+h.nome)){ window.showToast(t('ok.alocado',{h:h.nome})); X.render(); }
}
async function desalocar(p){
  if(!X.guard() || !p.hotel_id) return;
  if(await X.atualizarPernoite(p, { hotel_id:null, situacao:'a_alocar' }, 'desalocado')){ window.showToast(t('op.ok.desalocado')); X.render(); }
}

const css = document.createElement('style'); css.textContent = `
  :root{ --lab:300px; --day-line:color-mix(in srgb, var(--ink) 24%, transparent); --hour-line:color-mix(in srgb, var(--ink) 7%, transparent); }
  .op-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px}
  .op-tools input,.op-tools select{border:1px solid var(--line-2);background:var(--panel);border-radius:8px;padding:6px 9px}
  .op-tools #h-busca{min-width:200px;flex:1;max-width:300px}
  .op-per{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .zoom{display:inline-flex;align-items:center;border:1px solid var(--line-2);border-radius:8px;overflow:hidden}
  .zoom button{border:0;background:var(--panel);padding:5px 10px;font-weight:700} .zoom button:disabled{opacity:.35} .zoom span{min-width:46px;text-align:center;font-size:12px}
  .op-paineis{display:flex;flex-direction:column;overflow:hidden;padding:0}
  .op-sec{display:flex;flex-direction:column;min-height:0;overflow:hidden}
  .op-tit{display:flex;gap:10px;align-items:center;padding:6px 12px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2);background:var(--panel-2);border-bottom:1px solid var(--line)}
  .op-tit .sub{text-transform:none;letter-spacing:0;font-weight:500}
  .op-tit .leg{margin-left:auto;display:flex;gap:6px;align-items:center;text-transform:none;letter-spacing:0;font-weight:500;color:var(--ink-3);flex-wrap:wrap}
  .op-tit .leg i{display:inline-block;width:12px;height:8px;border-radius:2px;margin-left:6px}
  .op-scroll{flex:1;overflow:auto;position:relative}
  .op-div{height:7px;flex:none;cursor:row-resize;background:var(--line);touch-action:none} .op-div:hover{background:var(--accent)}
  .tlg{position:relative;min-height:100%}
  .tlg-head{position:sticky;top:0;z-index:20;display:flex;height:38px;background:var(--panel);border-bottom:1px solid var(--line)}
  .tlg-corner{position:sticky;left:0;z-index:21;width:var(--lab);flex:none;background:var(--panel);border-right:1px solid var(--line)}
  .tlg-days{display:flex;flex:none}
  .tlg-day{flex:none;border-right:1px solid var(--day-line);display:grid;grid-template-rows:22px 16px}
  .tlg-day.fds{background:color-mix(in srgb, var(--amber) 9%, transparent)}
  .tlg-dn{font-size:11.5px;font-weight:600;display:flex;gap:6px;align-items:center;justify-content:center;text-transform:capitalize}
  .tlg-hr{position:relative;font-family:var(--fm);font-size:9.5px;color:var(--ink-3)} .tlg-hr span{position:absolute;top:1px;transform:translateX(2px)}
  .cnt2{font-family:var(--fm);font-size:10.5px;font-weight:600;background:var(--gray-soft);color:var(--ink-2);border-radius:4px;padding:0 5px;text-transform:none}
  .cnt2.ml{margin-left:auto}
  .tlg-body{position:relative} .tlg-body.com-rotulos{padding-top:20px}
  .tlg-row{display:flex;border-bottom:1px solid var(--line);position:relative}
  .tlg-row.grp{background:var(--panel-2)} .tlg-row.grp .tlg-lab{background:var(--panel-2);font-weight:600}
  .tlg-lab{position:sticky;left:0;z-index:12;width:var(--lab);flex:none;background:var(--panel);border-right:1px solid var(--line);display:flex;gap:6px;align-items:flex-start;padding:8px 8px 0;font-size:12.5px;overflow:hidden;white-space:nowrap}
  .tlg-lab > *{line-height:18px}
  .tlg-row.hot .tlg-lab{padding-left:22px}
  .tlg-lab .hn{overflow:hidden;text-overflow:ellipsis;cursor:pointer;flex:1;min-width:0}
  .tp{flex:none;font-size:10px;font-weight:700;border-radius:4px;padding:0 5px;background:var(--gray-soft);color:var(--ink-2)} .tp-primario{background:var(--accent-soft);color:var(--accent)} .tlg-lab .hn:hover{text-decoration:underline}
  .chev,.gear{border:0;background:transparent;color:var(--ink-3);padding:2px 4px;border-radius:4px;flex:none} .chev:hover,.gear:hover{background:var(--gray-soft);color:var(--ink)}
  .tlg-track{position:relative;flex:none;
    background-image:linear-gradient(to right, var(--day-line) 1px, transparent 1px), linear-gradient(to right, var(--hour-line) 1px, transparent 1px);
    background-size:calc(24 * ${PXH}px * var(--z)) 100%, calc(3 * ${PXH}px * var(--z)) 100%}
  .tlg-row.sobre{outline:2px solid var(--accent);outline-offset:-2px} .tlg-row.sobre .tlg-lab{background:var(--accent-soft)}
  body.arrastando [data-drop-hotel] .tlg-lab, body.arrastando [data-drop-base] .tlg-lab{box-shadow:inset 3px 0 0 var(--accent)}
  .tlg-over{position:absolute;top:0;bottom:0;left:var(--lab);pointer-events:none;z-index:10}
  .fds-col{position:absolute;top:0;bottom:0;background:color-mix(in srgb, var(--amber) 6%, transparent)}
  .ln-agora{position:absolute;top:0;bottom:0;width:2px;background:var(--red)} .ln-crit{position:absolute;top:0;bottom:0;width:2px;background:color-mix(in srgb, var(--ink) 60%, transparent)}
  .lb-agora,.lb-crit{position:absolute;top:2px;transform:translateX(-50%);font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px;white-space:nowrap;z-index:11}
  .lb-agora{background:var(--red);color:#fff} .lb-crit{background:var(--ink);color:var(--panel)}
  .blk{position:absolute;height:18px;border-radius:4px;font-size:11px;line-height:18px;padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:grab;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.18);z-index:5}
  .blk:hover{filter:brightness(1.08);z-index:6} .blk:active{cursor:grabbing}
  .b2-a_alocar{background:var(--bar-new)} .b2-alocado{background:color-mix(in srgb, var(--bar-ok) 55%, var(--panel))} .b2-a_reconfirmar{background:var(--bar-warn)}
  .b2-confirmado{background:var(--bar-ok)} .b2-cancelado{background:var(--bar-off);text-decoration:line-through;cursor:default;opacity:.7}
  .blk.b2-alocado{color:var(--ink);border:1px dashed var(--bar-ok)}
  .blk.crit{box-shadow:0 0 0 2px var(--panel),0 0 0 3.5px var(--red)}
  .crit-tag{background:var(--red);color:#fff;border-radius:4px;font-size:10px;font-weight:700;padding:0 5px}
  .occ2{position:absolute;top:6px;height:22px;border-radius:5px;background:var(--gray-soft);overflow:hidden;cursor:pointer;z-index:4}
  .occ2 i{position:absolute;left:0;top:0;bottom:0;background:var(--bar-done);opacity:.55} .occ2.mid i{background:var(--bar-warn)} .occ2.full i{background:var(--bar-new);opacity:.75} .occ2.zero{opacity:.6}
  .occ2 span{position:relative;font-family:var(--fm);font-size:11px;font-weight:600;padding:0 6px;line-height:22px}
  .tlg-row.grp .occ2{height:20px;top:7px}
  @media (max-width:760px){ :root{ --lab:170px } .op-tit .leg{display:none} }`;
document.head.appendChild(css);
// largura do dia acompanha o zoom (fundo com as linhas de hora e de dia)
const zcss = document.createElement('style'); document.head.appendChild(zcss);
const _render = window.SL_renderOperacao;
window.SL_renderOperacao = function(){ zcss.textContent = ':root{--z:'+ZOOM[S.zoomIdx]+'}'; _render(); };
})();
