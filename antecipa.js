/* Stayline — Antecipa para hotéis, com as premissas do Smart Escala Antecipa:
   cada fatura mensal fechada (líquida da comissão) tem uma data prevista de pagamento ao hotel (fechamento + prazo, hoje ~90 dias).
   O hotel pode receber à vista: desconto = líquido × taxa% (taxa ao mês × meses antecipados, limitada entre a mínima e a máxima)
   + taxa fixa por pedido. O desconto é o nosso spread. Fluxo: a vencer → ofertada → aprovada (hotel aceitou) → paga; ou recusada. */
(function(){
'use strict';
const X = window.SLX; if(!X) return;
const { S, t, esc, $, $$ } = X;
const loc = ()=> S.lang==='pt' ? 'pt-BR' : 'en-US';
S.antFiltro = S.antFiltro || 'a_vencer'; S.antVista = S.antVista || X.lsGet('sl_ant_vista', 'linha');   // 'linha' (linha do tempo por mês) ou 'tabela'
let FAT = [];

const num = (k, d) => { const v = parseFloat((S.config||{})[k]); return isNaN(v) ? d : v; };
const params = ()=> ({ mes:num('antecipa_taxa_mes',2), min:num('antecipa_taxa_min',1), max:num('antecipa_taxa_max',6), fixa:num('antecipa_taxa_fixa',150), prazo:num('antecipa_prazo_dias',90), valorMin:num('antecipa_valor_min',5000) });
const diasAte = iso => Math.round((X.diaLocal(iso,12) - X.diaLocal(X.hojeISO(),12)) / 86400000);
const fData = iso => new Date(iso+'T12:00:00').toLocaleDateString(loc());
const fMes = iso => new Date(iso+'T12:00:00').toLocaleDateString(loc(), { month:'short', year:'numeric' });
const pct = v => v.toLocaleString(loc(), { maximumFractionDigits:2 }) + '%';

function calc(f, taxaManual){
  const P = params(), liquido = Number(f.valor_bruto) * (1 - Number(f.comissao_pct)/100), comissao = Number(f.valor_bruto) - liquido;
  const dias = Math.max(0, diasAte(f.previsao));
  const taxaAuto = Math.min(P.max, Math.max(P.min, P.mes * dias / 30));
  const taxa = taxaManual != null ? taxaManual : (f.antecipacao && f.antecipacao.taxa_pct != null ? Number(f.antecipacao.taxa_pct) : taxaAuto);
  const desconto = dias > 0 ? liquido * taxa/100 + P.fixa : 0;
  return { liquido, comissao, dias, taxa, taxaAuto, desconto, hotelRecebe: liquido - desconto, elegivel: f.status==='a_vencer' && dias > 0 && liquido >= P.valorMin,
    efetivaMes: dias > 0 ? (desconto/liquido*100) / (dias/30) : 0 };
}

async function carregar(){
  const PAG = 1000; let pag = 0, todos = [];
  while(true){ const { data, error } = await X.sb.from('prn_faturas').select('*').order('previsao').range(pag*PAG, pag*PAG+PAG-1);
    if(error){ window.showToast(t('gen.erro',{m:error.message})); break; } todos = todos.concat(data||[]); if(!data || data.length < PAG) break; pag++; }
  FAT = todos;
}

window.SL_renderAntecipa = async function(){
  const v = $('#view-antecipa'); if(!v) return;
  if(!FAT.length){ v.innerHTML = `<div class="muted">${esc(t('gen.carregando'))}</div>`; await carregar(); if(S.view!=='antecipa') return; }
  desenhar();
};
function desenhar(){
  const v = $('#view-antecipa'), P = params();
  const linhas = FAT.map(f=> ({ f, h:X.hotelPor(f.hotel_id), c:calc(f) })).filter(r=> r.h);
  const doBase = r => !S.base || r.h.base===S.base;
  const q = (S.antBusca||'').toLowerCase();
  const visiveis = linhas.filter(r=> doBase(r) && (!S.antHotel || r.f.hotel_id===S.antHotel) && (S.antFiltro==='todas' || r.f.status===S.antFiltro) && (!q || r.h.nome.toLowerCase().includes(q)));
  const aVencer = linhas.filter(r=> doBase(r) && r.f.status==='a_vencer');
  const eleg = aVencer.filter(r=> r.c.elegivel);
  const soma = (a, k) => a.reduce((s,r)=> s + r.c[k], 0);
  const prazoMedio = aVencer.length ? aVencer.reduce((s,r)=> s + r.c.dias*r.c.liquido, 0) / Math.max(1, soma(aVencer,'liquido')) : 0;
  const andamento = linhas.filter(r=> doBase(r) && (r.f.status==='ofertada' || r.f.status==='aprovada'));
  const pagas = linhas.filter(r=> doBase(r) && r.f.status==='paga');
  const lucro = pagas.reduce((s,r)=> s + Number((r.f.antecipacao||{}).desconto||0), 0);
  const cont = {}; ['a_vencer','ofertada','aprovada','paga','recusada','liquidada'].forEach(s=> cont[s] = linhas.filter(r=> doBase(r) && r.f.status===s).length); cont.todas = linhas.filter(doBase).length;
  const hotelFiltro = S.antHotel && X.hotelPor(S.antHotel);

  v.innerHTML = `
    <div class="head"><div><h2>${esc(t('ant.titulo'))} ${FAT.some(f=>f.exemplo)?`<span class="tag amber">${esc(t('hoje.exemplo'))}</span>`:''}</h2><p>${esc(t('ant.sub',{d:P.prazo}))}</p></div>
      <div class="acts">${X.ehAdmin()?`<button class="btn" type="button" id="an-par">${esc(t('ant.parametros'))}</button>`:''}</div></div>
    <div class="kpis">
      <div class="card kpi"><small>${esc(t('ant.k.avencer'))}</small><b>${X.fMoeda(soma(aVencer,'liquido'))}</b><span>${esc(t('ant.k.avencer.s',{n:aVencer.length}))}</span></div>
      <div class="card kpi"><small>${esc(t('ant.k.prazo'))}</small><b>${Math.round(prazoMedio)} ${esc(t('ant.dias'))}</b><span>${esc(t('ant.k.prazo.s'))}</span></div>
      <div class="card kpi hl" title="${esc(t('ant.k.spread_d'))}"><small>${esc(t('ant.k.spread'))}</small><b>${X.fMoeda(soma(eleg,'desconto'))} <em class="kpi-pct">${pct(soma(eleg,'liquido') ? soma(eleg,'desconto')/soma(eleg,'liquido')*100 : 0)}</em></b><span>${esc(t('ant.k.spread.s2',{n:eleg.length, c:X.fMoeda(soma(eleg,'hotelRecebe'))}))}</span></div>
      <div class="card kpi"><small>${esc(t('ant.k.andamento'))}</small><b>${andamento.length}</b><span>${X.fMoeda(andamento.reduce((s,r)=>s+Number((r.f.antecipacao||{}).valor_hotel||r.c.hotelRecebe),0))}</span></div>
      <div class="card kpi"><small>${esc(t('ant.k.lucro'))}</small><b>${X.fMoeda(lucro)}</b><span>${esc(t('ant.k.lucro.s',{n:pagas.length}))}</span></div>
    </div>
    <div class="ant-conta card"><b>${esc(t('ant.conta.tit'))}</b> ${t('ant.conta',{com:'<b>'+esc(t('ant.comissao'))+'</b>', liq:'<b>'+esc(t('ant.liquido'))+'</b>', tx:'<b>'+esc(t('ant.taxa'))+'</b>', sp:'<b>'+esc(t('ant.desconto'))+'</b>', mes:pct(P.mes), min:pct(P.min), max:pct(P.max), fixa:X.fMoeda(P.fixa)})}</div>
    <div class="card op-tools">
      <div class="seg" role="group"><button type="button" data-av="linha" class="${S.antVista==='linha'?'on':''}">${esc(t('ant.vista.linha'))}</button><button type="button" data-av="tabela" class="${S.antVista==='tabela'?'on':''}">${esc(t('ant.vista.tabela'))}</button></div>
      <span style="flex:1"></span>
      ${hotelFiltro?`<span class="tag amber">${esc(hotelFiltro.nome)} <button type="button" id="an-xh" class="chev" aria-label="✕">✕</button></span>`:''}
      <select id="an-base" aria-label="${esc(t('col.base'))}"><option value="">${esc(t('hoje.todas_bases'))}</option>${S.bases.map(b=>`<option value="${esc(b.codigo)}" ${S.base===b.codigo?'selected':''}>${esc(b.codigo)} · ${esc(b.cidade)}</option>`).join('')}</select>
      <input id="an-busca" type="search" placeholder="${esc(t('ant.busca'))}" value="${esc(S.antBusca||'')}" aria-label="${esc(t('ant.busca'))}">
    </div>
    <div class="chips"${S.antVista==='linha'?' hidden':''}>${['a_vencer','ofertada','aprovada','paga','recusada','todas'].map(k=>`<button type="button" class="chip" data-af="${k}" aria-pressed="${S.antFiltro===k}"><b>${cont[k]}</b><span>${esc(k==='todas'?t('chip.todos'):t('ast.'+k))}</span></button>`).join('')}</div>
    ${S.antVista==='linha' ? linhaDoTempo(linhas.filter(r=> doBase(r) && (!S.antHotel || r.f.hotel_id===S.antHotel) && (!q || r.h.nome.toLowerCase().includes(q)))) : `<div class="card tl"><div class="tl-scroll"><table class="ant-tab"><thead><tr>
      <th>${esc(t('pn.hotel'))}</th><th>${esc(t('ant.competencia'))}</th><th class="r">${esc(t('ant.noites'))}</th><th class="r">${esc(t('ant.bruto'))}</th><th class="r" title="${esc(t('ant.comissao_d'))}">${esc(t('ant.comissao'))} ⓘ</th><th class="r">${esc(t('ant.liquido'))}</th>
      <th>${esc(t('ant.previsao'))}</th><th class="r" title="${esc(t('ant.taxa_d'))}">${esc(t('ant.taxa'))} ⓘ</th><th class="r" title="${esc(t('ant.desconto_d'))}">${esc(t('ant.desconto'))} ⓘ</th><th class="r">${esc(t('ant.recebe'))}</th><th>${esc(t('ant.status'))}</th><th></th></tr></thead>
      <tbody>${visiveis.map(({f,h,c})=>{ const a = f.antecipacao||{};
        const acao = f.status==='a_vencer' ? (c.dias>0 ? `<button class="btn ${c.elegivel?'pri':''}" type="button" data-sim="${f.id}">${esc(t('ant.simular'))}</button>` : '')
          : f.status==='ofertada' ? `<button class="btn" type="button" data-sim="${f.id}">${esc(t('ant.resposta'))}</button>`
          : f.status==='aprovada' ? `<button class="btn pri" type="button" data-sim="${f.id}">${esc(t('ant.pagar'))}</button>`
          : f.status==='paga' ? `<button class="btn" type="button" data-sim="${f.id}">${esc(t('ant.recibo'))}</button>` : '';
        return `<tr class="clk" data-fat="${f.id}"><td><b class="hn" data-hx="${h.id}">${esc(h.nome)}</b><div class="sub"><span class="mono">${esc(h.base)}</span></div></td><td style="text-transform:capitalize">${esc(fMes(f.competencia))}</td><td class="mono r">${f.noites}</td>
          <td class="mono r">${X.fMoeda(f.valor_bruto)}</td><td class="mono r">${X.fMoeda(c.comissao)}</td><td class="mono r"><b>${X.fMoeda(c.liquido)}</b></td>
          <td class="mono">${fData(f.previsao)}<div class="sub">${c.dias>0?esc(t('ant.em_dias',{n:c.dias})):esc(t('ant.vencida'))}</div></td>
          <td class="mono r">${f.status==='liquidada'||c.dias<=0?'—':pct(a.taxa_pct!=null?Number(a.taxa_pct):c.taxa)}</td><td class="mono r">${f.status==='liquidada'||c.dias<=0?'—':X.fMoeda(a.desconto!=null?Number(a.desconto):c.desconto)}</td>
          <td class="mono r">${f.status==='liquidada'||c.dias<=0?'—':'<b>'+X.fMoeda(a.valor_hotel!=null?Number(a.valor_hotel):c.hotelRecebe)+'</b>'}</td>
          <td><span class="pill ast-${f.status}">${esc(t('ast.'+f.status))}</span>${f.status==='a_vencer'&&!c.elegivel&&c.dias>0?`<div class="sub">${esc(t('ant.abaixo_min'))}</div>`:''}</td><td>${acao}</td></tr>`; }).join('')}</tbody></table>
      ${visiveis.length?'':`<div class="empty">${esc(t('ant.vazio'))}</div>`}</div></div>`}
    <p class="sub">${esc(t('ant.nota'))}</p>`;

  $$('[data-af]', v).forEach(b=> b.addEventListener('click', ()=>{ S.antFiltro = b.dataset.af; desenhar(); }));
  $('#an-base').addEventListener('change', e=>{ S.base = e.target.value; desenhar(); });
  const bs = $('#an-busca'); bs.addEventListener('input', ()=>{ S.antBusca = bs.value; const p = bs.selectionStart; desenhar(); const n = $('#an-busca'); n.focus(); n.setSelectionRange(p,p); });
  const xh = $('#an-xh'); if(xh) xh.addEventListener('click', ()=>{ S.antHotel = null; desenhar(); });
  const par = $('#an-par'); if(par) par.addEventListener('click', modalParametros);
  $$('[data-sim]', v).forEach(b=> b.addEventListener('click', e=>{ e.stopPropagation(); modalAntecipar(FAT.find(f=>f.id===b.dataset.sim)); }));
  $$('[data-av]', v).forEach(b=> b.addEventListener('click', ()=>{ S.antVista = b.dataset.av; X.lsSet('sl_ant_vista', S.antVista); desenhar(); }));
  $$('tr[data-fat]', v).forEach(tr=> tr.addEventListener('click', e=>{ if(e.target.closest('[data-hx]')) return; modalAntecipar(FAT.find(f=>f.id===tr.dataset.fat)); }));
  $$('[data-hx]', v).forEach(el=> el.addEventListener('click', e=>{ e.stopPropagation(); quadroHotel(el.dataset.hx); }));
  $$('[data-cel]', v).forEach(el=> el.addEventListener('click', ()=> modalAntecipar(FAT.find(f=>f.id===el.dataset.cel))));
}

// Linha do tempo por mês: uma linha por hotel, uma coluna por mês de competência; cada célula conta a história da fatura
// (quanto o hotel tem a receber, quando, e quanto ganharíamos antecipando hoje). Em cima, o total de cada mês.
function linhaDoTempo(rs){
  const meses = [...new Set(rs.map(r=> r.f.competencia))].sort();
  if(!meses.length) return `<div class="card empty">${esc(t('ant.vazio'))}</div>`;
  const hoteis = [...new Map(rs.map(r=> [r.h.id, r.h])).values()].sort((a,b)=> a.base.localeCompare(b.base) || a.nome.localeCompare(b.nome));
  const por = {}; rs.forEach(r=> por[r.h.id+'|'+r.f.competencia] = r);
  const vlr = r => r.f.status==='paga' || r.f.status==='aprovada' || r.f.status==='ofertada' ? Number((r.f.antecipacao||{}).valor_hotel ?? r.c.hotelRecebe) : r.c.liquido;
  const totMes = m => rs.filter(r=> r.f.competencia===m);
  const cab = meses.map(m=>{ const xs = totMes(m), liq = xs.reduce((a,r)=>a+r.c.liquido,0), sp = xs.filter(r=>r.c.elegivel).reduce((a,r)=>a+r.c.desconto,0), prev = xs[0] && xs[0].f.previsao;
    return `<div class="at-mh"><b style="text-transform:capitalize">${esc(fMes(m))}</b><span class="mono">${X.fMoeda(liq)}</span><span class="sub">${prev?esc(t('ant.lt.paga_em',{d:fData(prev)})):''}${sp?` · <i class="sp">+${X.fMoeda(sp)}</i>`:''}</span></div>`; }).join('');
  const linhasH = hoteis.map(h=>{ const tot = meses.reduce((a,m)=> a + (por[h.id+'|'+m] && por[h.id+'|'+m].f.status==='a_vencer' ? por[h.id+'|'+m].c.liquido : 0), 0);
    return `<div class="at-row"><div class="at-lab"><b class="mono bc">${esc(h.base)}</b><span class="hn" data-hx="${h.id}" title="${esc(t('ant.lt.abrir'))}">${esc(h.nome)}</span><span class="mono sub">${tot?X.fMoeda(tot, h.moeda):''}</span></div>
      ${meses.map(m=>{ const r = por[h.id+'|'+m]; if(!r) return '<div class="at-c vazio">·</div>';
        const pode = r.f.status==='a_vencer' && r.c.dias>0;
        return `<div class="at-c st-${r.f.status}" data-cel="${r.f.id}" title="${esc(t('ast.'+r.f.status))} · ${esc(fData(r.f.previsao))}"><b class="mono">${X.fMoeda(vlr(r), h.moeda)}</b>
          <span>${esc(t('ast.'+r.f.status))}${pode?' · '+esc(t('ant.em_dias',{n:r.c.dias})):''}</span>${pode && r.c.elegivel?`<i class="sp">+${X.fMoeda(r.c.desconto, h.moeda)} · ${pct(r.c.taxa)}</i>`:''}</div>`; }).join('')}</div>`; }).join('');
  return `<div class="card at-wrap"><div class="at-grid" style="--m:${meses.length}"><div class="at-row at-head"><div class="at-lab"><b>${esc(t('ant.lt.hoteis',{n:hoteis.length}))}</b><span class="sub">${esc(t('ant.lt.dica'))}</span></div>${cab}</div>${linhasH}</div></div>
    <div class="at-leg sub">${['liquidada','a_vencer','ofertada','aprovada','paga','recusada'].map(k=>`<span><i class="st-${k}"></i>${esc(t('ast.'+k))}</span>`).join('')}</div>`;
}

// Quadro do hotel: a história das faturas dele e um recibo simulado de "antecipar tudo hoje"
function quadroHotel(id){
  const h = X.hotelPor(id); if(!h) return; const P = params();
  const rs = FAT.filter(f=> f.hotel_id===id).map(f=> ({ f, c:calc(f) })).sort((a,b)=> a.f.competencia.localeCompare(b.f.competencia));
  const eleg = rs.filter(r=> r.c.elegivel), liq = eleg.reduce((a,r)=>a+r.c.liquido,0), sp = eleg.reduce((a,r)=>a+r.c.desconto,0), rec = liq - sp;
  const m = v => X.fMoeda(v, h.moeda);
  const hoje = new Date().toLocaleDateString(loc(), { day:'2-digit', month:'long', year:'numeric' });
  X.abrirModal(`<div class="modal-h"><div><h3>${esc(h.nome)}</h3><div class="sub"><span class="mono">${esc(h.base)}</span>${h.cidade?' · '+esc(h.cidade):''} · ${esc(t('ant.q.sub'))}</div></div><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b">
      <div class="tl-scroll"><table class="ant-tab"><thead><tr><th>${esc(t('ant.competencia'))}</th><th class="r">${esc(t('ant.noites'))}</th><th class="r">${esc(t('ant.liquido'))}</th><th>${esc(t('ant.previsao'))}</th><th class="r">${esc(t('ant.recebe'))}</th><th>${esc(t('ant.status'))}</th></tr></thead><tbody>
        ${rs.map(({f,c})=>`<tr class="clk" data-fat="${f.id}"><td style="text-transform:capitalize">${esc(fMes(f.competencia))}</td><td class="mono r">${f.noites}</td><td class="mono r">${m(c.liquido)}</td><td class="mono">${esc(fData(f.previsao))}<div class="sub">${c.dias>0?esc(t('ant.em_dias',{n:c.dias})):esc(t('ant.vencida'))}</div></td><td class="mono r">${c.elegivel?'<b>'+m(c.hotelRecebe)+'</b>':'—'}</td><td><span class="pill ast-${f.status}">${esc(t('ast.'+f.status))}</span></td></tr>`).join('')}</tbody></table></div>
      ${eleg.length ? `<div class="recibo" id="an-recibo">
        <div class="rc-h"><b>${esc(t('ant.q.recibo'))}</b><span class="tag amber">${esc(t('ant.q.simulado'))}</span></div>
        <div class="sub">${esc(t('ant.q.recibo_sub',{d:hoje, n:eleg.length}))}</div>
        <div class="sim">
          <div class="sim-l"><span>${esc(t('ant.q.esperar'))}</span><b class="mono">${m(liq)}</b></div>
          <div class="sim-l"><span>− ${esc(t('ant.taxa'))} (${pct(liq ? (sp - P.fixa*eleg.length)/liq*100 : 0)} ${esc(t('ant.q.media'))})</span><b class="mono">${m(sp - P.fixa*eleg.length)}</b></div>
          <div class="sim-l"><span>− ${esc(t('ant.taxa_fixa'))} × ${eleg.length}</span><b class="mono">${m(P.fixa*eleg.length)}</b></div>
          <div class="sim-l total"><span>${esc(t('ant.q.recebe_hoje'))}</span><b class="mono">${m(rec)}</b></div>
          <div class="sim-l spread"><span>${esc(t('ant.nosso_spread'))} (${pct(liq ? sp/liq*100 : 0)})</span><b class="mono">${m(sp)}</b></div>
        </div>
        <div class="sub">${esc(t('ant.q.ganho',{d:Math.round(eleg.reduce((a,r)=>a+r.c.dias*r.c.liquido,0)/Math.max(1,liq))}))}</div></div>` : `<div class="empty">${esc(t('ant.q.nada'))}</div>`}
    </div>
    <div class="modal-f"><button class="btn" type="button" id="an-imp" style="margin-right:auto"${eleg.length?'':' disabled'}>🖨 ${esc(t('ant.q.imprimir'))}</button><button class="btn pri" data-close type="button">${esc(t('nov.ok'))}</button></div>`, bg=>{
      bg.querySelector('.modal').style.width = 'min(780px,100%)';
      $$('tr[data-fat]', bg).forEach(tr=> tr.addEventListener('click', ()=>{ X.fecharModal(); modalAntecipar(FAT.find(f=>f.id===tr.dataset.fat)); }));
      const imp = $('#an-imp', bg); if(imp) imp.addEventListener('click', ()=>{ document.body.classList.add('imprimindo-recibo'); window.print(); setTimeout(()=> document.body.classList.remove('imprimindo-recibo'), 500); });
  });
}

async function salvarFatura(f, campos, acao){
  if(!X.guard()) return false;
  const historico = (f.historico||[]).concat([{ em:new Date().toISOString(), por:S.email, acao, de:f.status, para:campos.status||f.status }]);
  const { data, error } = await X.sb.from('prn_faturas').update({ ...campos, historico }).eq('id', f.id).select().single();
  if(error){ window.showToast(t('err.salvar',{m:error.message})); return false; }
  const i = FAT.findIndex(x=>x.id===f.id); if(i>=0) FAT[i] = data; return data;
}

function modalAntecipar(f){
  if(!f) return; const h = X.hotelPor(f.hotel_id), c = calc(f), a = f.antecipacao || {}, P = params();
  const editavel = f.status==='a_vencer';
  const linha = (k, v, cls) => `<div class="sim-l ${cls||''}"><span>${esc(k)}</span><b class="mono">${v}</b></div>`;
  const corpo = tx => { const r = calc(f, tx);
    return linha(t('ant.bruto'), X.fMoeda(f.valor_bruto)) + linha('− '+t('ant.comissao')+' ('+Number(f.comissao_pct)+'%)', X.fMoeda(r.comissao)) + linha(t('ant.liquido'), X.fMoeda(r.liquido), 'forte')
      + linha(t('ant.previsao'), fData(f.previsao)+' · '+t('ant.em_dias',{n:r.dias})) + linha('− '+t('ant.taxa')+' '+pct(r.taxa)+' ('+t('ant.efetiva',{v:pct(r.efetivaMes)})+')', X.fMoeda(r.liquido*r.taxa/100))
      + linha('− '+t('ant.taxa_fixa'), X.fMoeda(P.fixa)) + linha(t('ant.recebe'), X.fMoeda(r.hotelRecebe), 'total') + linha(t('ant.nosso_spread'), X.fMoeda(r.desconto), 'spread'); };
  const hist = (f.historico||[]).slice().reverse().map(x=>`<div><span class="mono">${new Date(x.em).toLocaleString(loc())}</span> · ${esc(x.por||'')} · ${esc(x.acao||'')}</div>`).join('');
  X.abrirModal(`<div class="modal-h"><div><h3>${esc(t('ant.modal.titulo'))} · ${esc(h?h.nome:'')}</h3><div class="sub"><span style="text-transform:capitalize">${esc(fMes(f.competencia))}</span> · ${f.noites} ${esc(t('ant.noites').toLowerCase())} · <span class="pill ast-${f.status}">${esc(t('ast.'+f.status))}</span></div></div><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b">
      <div class="sim" id="an-sim">${editavel ? corpo(null) : corpo(a.taxa_pct!=null?Number(a.taxa_pct):null)}</div>
      ${editavel ? `<details><summary class="muted" style="cursor:pointer">${esc(t('ant.excecao'))}</summary><div class="form" style="margin-top:8px">
        <label class="fld"><span>${esc(t('ant.taxa'))} (%)</span><input id="an-tx" type="number" step="0.1" min="0" max="20" value="${c.taxa.toFixed(2)}"></label>
        <label class="fld"><span>${esc(t('ant.motivo'))}</span><input id="an-mot"></label></div></details>` : ''}
      ${f.status==='aprovada' ? `<label class="fld"><span>${esc(t('ant.referencia'))}</span><input id="an-ref" placeholder="PIX / TED"></label>` : ''}
      ${a.referencia ? `<div class="sub">${esc(t('ant.referencia'))}: ${esc(a.referencia)}</div>` : ''}
      ${hist ? `<div class="fld"><span>${esc(t('pn.historico'))}</span><div class="hist">${hist}</div></div>` : ''}
    </div>
    <div class="modal-f">
      ${f.status==='a_vencer' ? `<button class="btn" data-close type="button">${esc(t('gen.cancelar'))}</button><button class="btn pri" type="button" id="an-ofertar">${esc(t('ant.ofertar'))}</button>` : ''}
      ${f.status==='ofertada' ? `<button class="btn danger" type="button" id="an-recusou" style="margin-right:auto">${esc(t('ant.recusou'))}</button><button class="btn pri" type="button" id="an-aceitou">${esc(t('ant.aceitou'))}</button>` : ''}
      ${f.status==='aprovada' ? `<button class="btn pri" type="button" id="an-pago">${esc(t('ant.marcar_paga'))}</button>` : ''}
      ${f.status==='paga' || f.status==='recusada' ? `<button class="btn pri" data-close type="button">${esc(t('nov.ok'))}</button>` : ''}
    </div>`, bg=>{
      const tx = $('#an-tx', bg); if(tx) tx.addEventListener('input', ()=>{ const v = parseFloat(tx.value); $('#an-sim', bg).innerHTML = corpo(isNaN(v) ? null : v); });
      const of = $('#an-ofertar', bg); if(of) of.addEventListener('click', async ()=>{
        const v = tx ? parseFloat(tx.value) : NaN, manual = !isNaN(v) && Math.abs(v - c.taxaAuto) > 0.001, mot = ($('#an-mot', bg)||{}).value || '';
        if(manual && !mot.trim()){ window.showToast(t('ant.err.motivo')); return; }
        const r = calc(f, isNaN(v) ? null : v);
        const ant = { taxa_pct:+r.taxa.toFixed(3), taxa_auto:+r.taxaAuto.toFixed(3), dias:r.dias, liquido:+r.liquido.toFixed(2), taxa_fixa:P.fixa, desconto:+r.desconto.toFixed(2), valor_hotel:+r.hotelRecebe.toFixed(2), ofertada_em:new Date().toISOString(), por:S.email, excecao: manual ? mot.trim() : null };
        if(await salvarFatura(f, { status:'ofertada', antecipacao:ant }, 'ofertada')){ window.showToast(t('ant.ok.ofertada')); X.fecharModal(); desenhar(); } });
      const ac = $('#an-aceitou', bg); if(ac) ac.addEventListener('click', async ()=>{ if(await salvarFatura(f, { status:'aprovada', antecipacao:{ ...a, aprovada_em:new Date().toISOString() } }, 'hotel aceitou')){ window.showToast(t('ant.ok.aprovada')); X.fecharModal(); desenhar(); } });
      const re = $('#an-recusou', bg); if(re) re.addEventListener('click', async ()=>{ if(await salvarFatura(f, { status:'recusada', antecipacao:{ ...a, recusada_em:new Date().toISOString() } }, 'hotel recusou')){ window.showToast(t('ant.ok.recusada')); X.fecharModal(); desenhar(); } });
      const pg = $('#an-pago', bg); if(pg) pg.addEventListener('click', async ()=>{ const ref = ($('#an-ref', bg).value||'').trim(); if(!ref){ window.showToast(t('ant.err.ref')); return; }
        if(await salvarFatura(f, { status:'paga', antecipacao:{ ...a, paga_em:new Date().toISOString(), referencia:ref } }, 'antecipação paga')){ window.showToast(t('ant.ok.paga')); X.fecharModal(); desenhar(); } });
    });
}

function modalParametros(){
  const P = params();
  const campo = (k, rot, v, st) => `<label class="fld"><span>${esc(rot)}</span><input data-k="${k}" type="number" step="${st}" value="${v}"></label>`;
  X.abrirModal(`<div class="modal-h"><div><h3>${esc(t('ant.parametros'))}</h3><div class="sub">${esc(t('ant.par.sub'))}</div></div><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b"><div class="form">${campo('antecipa_taxa_mes', t('ant.par.mes'), P.mes, 0.1)}${campo('antecipa_taxa_fixa', t('ant.taxa_fixa')+' (R$)', P.fixa, 10)}${campo('antecipa_taxa_min', t('ant.par.min'), P.min, 0.1)}${campo('antecipa_taxa_max', t('ant.par.max'), P.max, 0.1)}${campo('antecipa_prazo_dias', t('ant.par.prazo'), P.prazo, 1)}${campo('antecipa_valor_min', t('ant.par.valor_min'), P.valorMin, 100)}</div></div>
    <div class="modal-f"><button class="btn" data-close type="button">${esc(t('gen.cancelar'))}</button><button class="btn pri" type="button" id="par-ok">${esc(t('gen.salvar'))}</button></div>`, bg=>{
    $('#par-ok', bg).addEventListener('click', async ()=>{
      const regs = $$('[data-k]', bg).map(i=>({ chave:i.dataset.k, valor:String(parseFloat(i.value)||0) }));
      const { error } = await X.sb.from('prn_config').upsert(regs, { onConflict:'chave' }); if(error){ window.showToast(t('err.salvar',{m:error.message})); return; }
      regs.forEach(r=> S.config[r.chave] = r.valor); window.showToast(t('ok.salvo')); X.fecharModal(); desenhar(); });
  });
}

const css = document.createElement('style'); css.textContent = `
  .kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
  .kpi{padding:12px 14px;display:grid;gap:2px} .kpi small{color:var(--ink-3);font-size:12px} .kpi b{font-family:var(--fm);font-size:20px;font-weight:500} .kpi span{font-size:12px;color:var(--ink-2)}
  .kpi.hl{border-color:var(--green);box-shadow:0 0 0 1px var(--green) inset} .kpi.hl b{color:var(--green)}
  .ant-tab th.r,.ant-tab td.r{text-align:right}
  .sim{display:grid;gap:2px;background:var(--panel-2);border-radius:10px;padding:10px 12px}
  .sim-l{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px dashed var(--line)} .sim-l:last-child{border-bottom:0}
  .sim-l span{color:var(--ink-2)} .sim-l.forte b{font-weight:700} .sim-l.total{font-size:15px} .sim-l.total b{color:var(--accent);font-weight:700} .sim-l.spread b{color:var(--green);font-weight:700}
  .kpi-pct{font-style:normal;font-size:13px;color:var(--green);background:var(--green-soft);border-radius:6px;padding:1px 6px;margin-left:4px;vertical-align:3px}
  .ant-conta{padding:10px 14px;font-size:12.5px;color:var(--ink-2);line-height:1.5} .ant-conta b{color:var(--ink)}
  .ant-tab tr.clk{cursor:pointer} .ant-tab tr.clk:hover td{background:var(--panel-2)} .ant-tab .hn{cursor:pointer} .ant-tab .hn:hover{text-decoration:underline}
  .ant-tab th[title]{cursor:help}
  .at-wrap{overflow:auto;max-height:calc(100vh - 330px);padding:0}
  .at-grid{display:grid;min-width:calc(330px + var(--m) * 170px)}
  .at-row{display:grid;grid-template-columns:330px repeat(var(--m), minmax(170px,1fr));border-bottom:1px solid var(--line)}
  .at-head{position:sticky;top:0;z-index:3;background:var(--panel-2)}
  .at-lab{position:sticky;left:0;z-index:2;background:var(--panel);display:flex;gap:6px;align-items:center;padding:6px 10px;border-right:1px solid var(--line);min-width:0}
  .at-head .at-lab{background:var(--panel-2);flex-direction:column;align-items:flex-start;gap:0}
  .at-lab .bc{width:34px;flex:none;font-size:11.5px;color:var(--ink-2)} .at-lab .hn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;font-weight:500} .at-lab .hn:hover{text-decoration:underline}
  .at-mh{display:grid;padding:6px 10px;border-right:1px solid var(--line);gap:1px} .at-mh .mono{font-weight:600}
  .at-c{margin:3px 4px;border-radius:6px;padding:4px 8px;display:grid;gap:0;cursor:pointer;border:1px solid transparent;font-size:11.5px}
  .at-c b{font-size:12.5px} .at-c span{color:var(--ink-3);font-size:11px} .at-c:hover{outline:1.5px solid var(--accent)}
  .at-c.vazio{cursor:default;color:var(--ink-3);text-align:center;background:none} .at-c.vazio:hover{outline:0}
  .sp{font-style:normal;color:var(--green);font-weight:600}
  .st-a_vencer{background:var(--blue-soft)} .st-ofertada{background:var(--amber-soft)} .st-aprovada{background:var(--accent-soft)} .st-paga{background:var(--green-soft)}
  .st-recusada{background:var(--gray-soft);opacity:.75} .st-liquidada{background:var(--gray-soft);opacity:.6}
  .at-leg{display:flex;gap:14px;flex-wrap:wrap} .at-leg i{display:inline-block;width:12px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
  .recibo{border:1px dashed var(--line-2);border-radius:12px;padding:12px 14px;display:grid;gap:8px;margin-top:12px} .rc-h{display:flex;gap:8px;align-items:center}
  @media print{ body.imprimindo-recibo > *:not(.modal-bg){display:none !important} body.imprimindo-recibo .modal-f,body.imprimindo-recibo .x{display:none !important} body.imprimindo-recibo .modal-bg{position:static;background:none} }
  @media (max-width:1100px){ .kpis{grid-template-columns:repeat(2,minmax(0,1fr))} }
  @media (max-width:760px){ .at-row{grid-template-columns:200px repeat(var(--m), minmax(150px,1fr))} .at-grid{min-width:calc(200px + var(--m) * 150px)} }
  @media (max-width:560px){ .kpis{grid-template-columns:1fr} }`;
document.head.appendChild(css);
})();
