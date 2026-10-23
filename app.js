/* Stayline — pernoites de tripulação em linha do tempo.
   Telas: Operação (operacao.js, tracking no molde do Smart Escala), Contratos, Antecipa (antecipa.js), Sugestões, Equipe (admin).
   Banco: Supabase da Capacity Case, tabelas prn_*. */
(function(){
'use strict';
const CONFIG = {
  url: 'https://iuotvottnailofxbaynx.supabase.co',
  anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1b3R2b3R0bmFpbG9meGJheW54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1Mjg2NjMsImV4cCI6MjEwODEwNDY2M30._0FhywQ4Vq3km5Rl4tHEPtCLBVom4VAGaXG3X3nrUyQ'
};
const sb = window.supabase.createClient(CONFIG.url, CONFIG.anon);
const SITS = ['a_alocar','a_reconfirmar','alocado','confirmado','cancelado'];
const S = { lang:'pt', email:'', membro:null, view:'operacao', noite:hojeISO(), ini:hojeISO(), fim:somaDias(hojeISO(),6), disp:{}, config:{}, pern:[], hoteis:[], bases:[], filtro:'todos', busca:'', base:'', novidades:[], sugestoes:[], membros:[] };

/* ---------- utilidades ---------- */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function lsGet(k,d){ try{ const v = localStorage.getItem(k); return v==null ? d : v; }catch(e){ return d; } }
function lsSet(k,v){ try{ localStorage.setItem(k, v); }catch(e){} }
function t(k, vars){ const d = (window.I18N[S.lang]||{})[k] ?? window.I18N.pt[k] ?? k; return vars ? d.replace(/\{(\w+)\}/g, (_,n)=> vars[n]!=null ? vars[n] : '') : d; }
function hojeISO(){ const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function somaDias(iso, n){ const [y,m,d] = iso.split('-').map(Number); const x = new Date(y, m-1, d+n); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }
function diaLocal(iso, h){ const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d, h, 0, 0); }
const loc = ()=> S.lang==='pt' ? 'pt-BR' : 'en-US';
const fHora = d => new Date(d).toLocaleTimeString(loc(), {hour:'2-digit', minute:'2-digit'});
const fDiaHora = d => new Date(d).toLocaleString(loc(), {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
const fData = d => new Date(d).toLocaleDateString(loc(), {day:'2-digit', month:'short', year:'numeric'});
const fMoeda = (v, moeda) => v==null ? '–' : Number(v).toLocaleString(loc(), {style:'currency', currency:moeda||'BRL'});   // hotéis do exterior cobram em USD/EUR
function paraInput(d){ const x = new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,16); }
let toastTimer = null;
const showToast = msg => window.showToast(msg);   // passa pelo acompanhante, que anota avisos de erro
window.showToast = function(msg){ let el = $('#toast'); if(!el){ el = document.createElement('div'); el.id='toast'; el.className='toast'; el.setAttribute('role','status'); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(()=> el.hidden = true, 3800); };
const podeEscrever = ()=> S.membro && (S.membro.papel==='admin' || S.membro.papel==='operacao');
const ehAdmin = ()=> S.membro && S.membro.papel==='admin';
function guard(){ if(!podeEscrever()){ showToast(t('err.leitura')); return false; } return true; }

/* ---------- modal ---------- */
function abrirModal(html, onMount){
  const root = $('#modal-root'); root.innerHTML = '<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true">'+html+'</div></div>';
  const bg = root.firstChild;
  bg.addEventListener('mousedown', e=>{ if(e.target===bg) fecharModal(); });
  $$('[data-close]', bg).forEach(b=> b.addEventListener('click', fecharModal));
  document.addEventListener('keydown', escModal);
  if(onMount) onMount(bg);
  const f = bg.querySelector('input,select,textarea,button.pri'); if(f) setTimeout(()=>f.focus(), 30);
  return bg;
}
function escModal(e){ if(e.key==='Escape') fecharModal(); }
function fecharModal(){ $('#modal-root').innerHTML=''; document.removeEventListener('keydown', escModal); }

/* ---------- idioma e tema ---------- */
function aplicarIdioma(){
  document.documentElement.lang = S.lang==='pt' ? 'pt-BR' : 'en';
  $$('[data-i18n]').forEach(el=> el.textContent = t(el.dataset.i18n));
  $$('[data-lang-seg] button').forEach(b=> b.classList.toggle('on', b.dataset.lang===S.lang));
  aplicarTemaBotoes();
  [['#btn-nov','top.novidades'],['#btn-tour','top.tour'],['#btn-valid','top.validar'],['#btn-sair','top.sair']].forEach(([s,k])=>{ const b = $(s); b.title = t(k); b.setAttribute('aria-label', t(k)); });
  $$('[data-lang-seg]').forEach(g=> g.title = t('top.idioma'));
  if(S.membro) render();
  window.dispatchEvent(new CustomEvent('sl-idioma'));
}
function aplicarTemaBotoes(){
  const dark = document.documentElement.dataset.theme==='dark';
  $$('[data-theme-btn]').forEach(b=>{ b.innerHTML = dark
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
    b.title = dark ? t('top.tema.claro') : t('top.tema.escuro'); b.setAttribute('aria-label', b.title); });
}
document.addEventListener('click', e=>{
  const lb = e.target.closest('[data-lang]'); if(lb){ S.lang = lb.dataset.lang; lsSet('sl_idioma', S.lang); aplicarIdioma(); return; }
  const tb = e.target.closest('[data-theme-btn]'); if(tb){ const n = document.documentElement.dataset.theme==='dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; lsSet('sl_tema', n); aplicarTemaBotoes(); }
});

/* ---------- login ---------- */
function telaLogin(msg){
  $('#app').hidden = true; $('#login').hidden = false; $('#lg-pa').hidden = true; $('#lg-entrar').hidden = false;
  const m = $('#lg-msg'); m.hidden = !msg; m.textContent = msg || ''; m.className = 'msg';
}
$('#lg-btn').addEventListener('click', entrar);
$('#lg-senha').addEventListener('keydown', e=>{ if(e.key==='Enter') entrar(); });
async function entrar(){
  const email = $('#lg-email').value.trim(), senha = $('#lg-senha').value, m = $('#lg-msg'), b = $('#lg-btn');
  b.disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  b.disabled = false;
  if(error){ m.hidden = false; m.className='msg'; m.textContent = t('login.erro'); }
}
$('#lg-primeiro').addEventListener('click', ()=>{ $('#lg-entrar').hidden = true; $('#lg-pa').hidden = false; $('#pa-email').value = $('#lg-email').value; $('#pa-msg').hidden = true; });
$('#pa-voltar').addEventListener('click', ()=>{ $('#lg-pa').hidden = true; $('#lg-entrar').hidden = false; });
$('#pa-btn').addEventListener('click', async ()=>{
  const email = $('#pa-email').value.trim(), senha = $('#pa-senha').value, m = $('#pa-msg'), b = $('#pa-btn');
  b.disabled = true; m.hidden = true;
  try{
    const r = await fetch(CONFIG.url + '/functions/v1/prn-primeiro-acesso', { method:'POST', headers:{ 'Content-Type':'application/json', apikey: CONFIG.anon }, body: JSON.stringify({ email, senha }) });
    const j = await r.json().catch(()=>({ code:'erro' }));
    if(!r.ok || !j.ok){ m.hidden = false; m.className='msg'; m.textContent = t('pa.'+(j.code||'erro')); b.disabled = false; return; }
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if(error){ m.hidden = false; m.textContent = t('login.erro'); }
  }catch(e){ m.hidden = false; m.textContent = t('pa.erro'); }
  b.disabled = false;
});
$('#btn-sair').addEventListener('click', async ()=>{ await sb.auth.signOut(); });

let iniciado = false;
sb.auth.onAuthStateChange((ev, session)=>{ setTimeout(()=> sessao(session), 0); });
async function sessao(session){
  if(!session){ S.membro = null; S.email=''; window._userEmail=''; iniciado = false; telaLogin(); return; }
  if(iniciado && S.email === session.user.email.toLowerCase()) return;
  S.email = session.user.email.toLowerCase();
  const { data } = await sb.from('prn_membros').select('*').ilike('email', S.email).maybeSingle();
  if(!data || !data.ativo){ await sb.auth.signOut(); telaLogin(t('login.nao_membro')); return; }
  S.membro = data; window._userEmail = S.email; iniciado = true;
  $('#login').hidden = true; $('#app').hidden = false;
  $('#quem').textContent = (data.nome || S.email) + ' · ' + t('pap.'+data.papel);
  $$('[data-admin]').forEach(el=> el.hidden = !ehAdmin());
  try{ await sb.rpc('prn_exemplo_rolar'); }catch(e){}
  await carregarBase();
  irPara(location.hash.replace('#','') || 'operacao');
  novidadesIniciar();
  window.dispatchEvent(new CustomEvent('sl-entrou'));
}

/* ---------- dados ---------- */
async function carregarBase(){
  const [b, h, d, c] = await Promise.all([ sb.from('prn_bases').select('*').order('codigo'), sb.from('prn_hoteis').select('*').order('base').order('tipo'),
    sb.from('prn_disponibilidade').select('*').gte('noite', somaDias(hojeISO(),-1)), sb.from('prn_config').select('*') ]);
  S.bases = b.data || []; S.hoteis = h.data || [];
  S.disp = {}; (d.data || []).forEach(r=> S.disp[r.hotel_id+'|'+r.noite] = r);          // quartos livres informados pelo hotel (API) por noite
  S.config = {}; (c.data || []).forEach(r=> S.config[r.chave] = r.valor);
  await carregarNoite();
}
// Período da Operação (como no Smart Escala): vários dias no mesmo eixo. Cada pernoite pertence à "noite" da chegada
// (chegada antes das 6h conta na noite anterior). Busca paginada: o banco corta em 1000 linhas por vez.
async function carregarNoite(){
  const ini = diaLocal(S.ini, 6), fim = diaLocal(S.fim, 30);
  const PAG = 1000; let pag = 0, todos = [];
  while(true){
    let qy = sb.from('prn_pernoites').select('*').gte('chegada', ini.toISOString()).lt('chegada', fim.toISOString());
    if(!S.demo) qy = qy.eq('exemplo', false);   // pernoites simulados só aparecem com o botão Demonstração ligado
    const { data, error } = await qy.order('chegada').range(pag*PAG, pag*PAG+PAG-1);
    if(error){ showToast(t('gen.erro', {m:error.message})); S.pern = []; return; }
    todos = todos.concat(data || []); if(!data || data.length < PAG) break; pag++;
  }
  S.pern = todos;
  // com a Demonstração desligada, o Resumo ainda mostra os voos simulados (só voo, noite e base — marcados como exemplo)
  S.voosEx = null;
  if(!S.demo){ let pg = 0, ex = [];
    while(true){ const { data, error } = await sb.from('prn_pernoites').select('voo_chegada,chegada,base,situacao').eq('exemplo', true).gte('chegada', ini.toISOString()).lt('chegada', fim.toISOString()).order('chegada').range(pg*PAG, pg*PAG+PAG-1);
      if(error) break; ex = ex.concat(data || []); if(!data || data.length < PAG) break; pg++; }
    S.voosEx = ex; }
}
// a noite fica guardada no próprio pernoite (com ~6 mil pernoites na tela, recalcular a data a cada célula pesava)
function noiteDe(p){ if(p._c === p.chegada) return p._n; const d = new Date(new Date(p.chegada).getTime() - 6*3600000);
  p._c = p.chegada; return p._n = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
const hotelPor = id => S.hoteis.find(h=>h.id===id);
function usados(hotelId, noite, exceto){ return S.pern.filter(p=>p.hotel_id===hotelId && p.situacao!=='cancelado' && p.id!==exceto && noiteDe(p)===noite).reduce((a,p)=>a+p.qtd, 0); }
function opcoesHotel(p){
  const hs = S.hoteis.filter(h=>h.base===p.base && h.ativo).sort((a,b)=> (a.tipo==='primario'?0:1)-(b.tipo==='primario'?0:1));
  const noite = noiteDe(p);
  const lista = hs.map(h=>({ h, livres: h.quartos_dia - usados(h.id, noite, p.id) }));
  const sug = lista.find(o=>o.livres >= p.qtd);
  return { lista, sug: sug ? sug.h.id : null };
}
async function atualizarPernoite(p, campos, acao){
  if(!guard()) return false;
  const historico = (p.historico||[]).concat([{ em:new Date().toISOString(), por:S.email, acao, de:p.situacao, para:campos.situacao||p.situacao }]);
  const { data, error } = await sb.from('prn_pernoites').update({ ...campos, historico, atualizado_em:new Date().toISOString() }).eq('id', p.id).select().single();
  if(error){ showToast(t('err.salvar', {m:error.message})); return false; }
  const i = S.pern.findIndex(x=>x.id===p.id); if(i>=0) S.pern[i] = data;
  return data;
}

/* ---------- navegação ---------- */
$$('.nav').forEach(b=> b.addEventListener('click', ()=> irPara(b.dataset.view)));
const VIEWS = ['operacao','hoteis','antecipa','sugestoes','equipe'];
function irPara(v){
  if(v==='hoje') v = 'operacao';
  if(!VIEWS.includes(v) || (v==='equipe' && !ehAdmin())) v = 'operacao';
  S.view = v; history.replaceState(null, '', '#'+v);
  $$('.nav').forEach(b=> b.classList.toggle('on', b.dataset.view===v || (v==='hoteis' && b.dataset.view==='operacao')));
  $$('.view').forEach(s=> s.classList.toggle('active', s.id==='view-'+v));
  render();
}
window.SL_view = ()=> S.view;
function render(){
  $('#top-titulo').textContent = t('nav.'+S.view);
  if(S.view==='operacao') window.SL_renderOperacao && window.SL_renderOperacao(); else if(S.view==='hoteis') renderHoteis(); else if(S.view==='antecipa') window.SL_renderAntecipa && window.SL_renderAntecipa(); else if(S.view==='sugestoes') renderSugestoes(); else if(S.view==='equipe') renderEquipe();
}

function modalPernoite(p){
  if(!p) return;
  const { lista, sug } = opcoesHotel(p); const h = hotelPor(p.hotel_id);
  const horas = Math.round((new Date(p.saida)-new Date(p.chegada))/3600000);
  const hist = (p.historico||[]).slice().reverse();
  abrirModal(`
    <div class="modal-h"><div><h3>${esc(p.lider)} ${p.qtd>1?'+'+(p.qtd-1):''} · <span class="mono">${esc(p.base)}</span></h3><div class="sub"><span class="pill s-${p.situacao}">${esc(t('sit.'+p.situacao))}</span> · ${esc(t('orig.'+p.origem))}${p.exemplo?' · '+esc(t('hoje.exemplo')):''}</div></div><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b">
      <div class="kv"><div><small>${esc(t('pn.chegada'))}</small><b class="mono">${esc(p.voo_chegada||'–')}</b> · ${fDiaHora(p.chegada)}</div><div><small>${esc(t('pn.saida'))}</small><b class="mono">${esc(p.voo_saida||'–')}</b> · ${fDiaHora(p.saida)}</div><div><small>${esc(t('col.quartos'))}</small><b>${p.qtd}</b> · ${esc(t('pn.noites',{n:horas}))}</div></div>
      <div class="fld"><span>${esc(t('pn.hotel'))}${h?': <b>'+esc(h.nome)+'</b>':''}</span>
        ${lista.length ? lista.map(o=>`<div class="hotel-opt ${o.h.id===sug?'sug':''}"><div><b>${esc(o.h.nome)}</b> <span class="tag">${esc(o.h.tipo==='primario'?t('ht.primario'):t('ht.secundario'))}</span>${o.h.id===sug?` <span class="tag amber">${esc(t('pn.sugerido'))}</span>`:''}<div class="sub">${fMoeda(o.h.tarifa, o.h.moeda)} ·${o.livres>=0?esc(t('pn.livres',{n:o.livres})):esc(t('pn.sem_vaga'))}</div></div>
          <button type="button" class="btn ${o.h.id===sug&&p.hotel_id!==o.h.id?'pri':''}" data-alocar="${o.h.id}" ${p.hotel_id===o.h.id||p.situacao==='cancelado'?'disabled':''}>${esc(t('pn.alocar'))}</button></div>`).join('') : `<div class="muted">${esc(t('hoje.sem_hotel'))}</div>`}</div>
      <details><summary class="muted" style="cursor:pointer">${esc(t('gen.editar'))}</summary>
        <div class="form" style="margin-top:10px">
          <label class="fld"><span>${esc(t('pn.voo_c'))}</span><input id="e-vc" value="${esc(p.voo_chegada||'')}"></label>
          <label class="fld"><span>${esc(t('pn.chegada'))}</span><input id="e-c" type="datetime-local" value="${paraInput(p.chegada)}"></label>
          <label class="fld"><span>${esc(t('pn.voo_s'))}</span><input id="e-vs" value="${esc(p.voo_saida||'')}"></label>
          <label class="fld"><span>${esc(t('pn.saida'))}</span><input id="e-s" type="datetime-local" value="${paraInput(p.saida)}"></label>
          <label class="fld"><span>${esc(t('pn.qtd'))}</span><input id="e-q" type="number" min="1" max="40" value="${p.qtd}"></label>
          <label class="fld"><span>${esc(t('pn.motivo'))}</span><input id="e-m" value="${esc(p.motivo||'')}"></label>
        </div><div style="margin-top:10px"><button type="button" class="btn" id="e-salvar">${esc(t('pn.salvar'))}</button></div></details>
      <div class="fld"><span>${esc(t('pn.historico'))}</span><div class="hist">${hist.map(x=>`<div><span class="mono">${fDiaHora(x.em)}</span> · ${esc(x.por||'')} · ${esc(x.acao||'')}${x.para&&x.de!==x.para?' → '+esc(t('sit.'+x.para)):''}</div>`).join('')}</div></div>
    </div>
    <div class="modal-f">
      ${p.situacao!=='cancelado'?`<button type="button" class="btn danger" id="p-cancel" style="margin-right:auto">${esc(t('pn.cancelar'))}</button>`:''}
      ${p.hotel_id&&p.situacao!=='cancelado'&&p.situacao!=='a_reconfirmar'?`<button type="button" class="btn" id="p-reconf">${esc(t('pn.reconfirmar'))}</button>`:''}
      ${p.hotel_id&&p.situacao!=='confirmado'&&p.situacao!=='cancelado'?`<button type="button" class="btn pri" id="p-conf">${esc(t('pn.confirmar'))}</button>`:''}
    </div>`, bg=>{
      $$('[data-alocar]', bg).forEach(b=> b.addEventListener('click', async ()=>{ const hh = hotelPor(b.dataset.alocar); const ok = await atualizarPernoite(p, { hotel_id:hh.id, situacao:'alocado' }, 'alocado: '+hh.nome); if(ok){ showToast(t('ok.alocado',{h:hh.nome})); fecharModal(); render(); } }));
      const c = $('#p-conf', bg); if(c) c.addEventListener('click', async ()=>{ if(await atualizarPernoite(p, { situacao:'confirmado' }, 'confirmado')){ showToast(t('ok.confirmado')); fecharModal(); render(); } });
      const r = $('#p-reconf', bg); if(r) r.addEventListener('click', async ()=>{ if(await atualizarPernoite(p, { situacao:'a_reconfirmar' }, 'reconfirmar')){ showToast(t('ok.reconf')); fecharModal(); render(); } });
      const x = $('#p-cancel', bg); if(x) x.addEventListener('click', async ()=>{ if(!x.dataset.ok){ x.dataset.ok = '1'; x.textContent = t('pn.cancelar.conf'); return; } if(await atualizarPernoite(p, { situacao:'cancelado' }, 'cancelado')){ showToast(t('ok.cancelado')); fecharModal(); render(); } });
      $('#e-salvar', bg).addEventListener('click', async ()=>{
        const ch = new Date($('#e-c',bg).value), sa = new Date($('#e-s',bg).value); if(!(sa>ch)){ showToast(t('err.datas')); return; }
        const mudouHora = ch.getTime()!==new Date(p.chegada).getTime() || sa.getTime()!==new Date(p.saida).getTime();
        const campos = { voo_chegada:$('#e-vc',bg).value.trim()||null, voo_saida:$('#e-vs',bg).value.trim()||null, chegada:ch.toISOString(), saida:sa.toISOString(), qtd:Math.max(1, +$('#e-q',bg).value||1), motivo:$('#e-m',bg).value.trim()||null };
        if(mudouHora && p.hotel_id && p.situacao==='confirmado') campos.situacao = 'a_reconfirmar';   // mudou o horário: o hotel precisa saber
        if(await atualizarPernoite(p, campos, 'editado')){ showToast(t('ok.salvo')); fecharModal(); render(); }
      });
    });
}

function formPernoite(){
  return `<div class="form">
    <label class="fld"><span>${esc(t('pn.base'))}</span><select id="n-base">${S.bases.map(b=>`<option value="${esc(b.codigo)}">${esc(b.codigo)} · ${esc(b.cidade)}</option>`).join('')}</select></label>
    <label class="fld"><span>${esc(t('pn.origem'))}</span><select id="n-orig">${['nao_previsto','manual','publicacao'].map(o=>`<option value="${o}">${esc(t('orig.'+o))}</option>`).join('')}</select></label>
    <label class="fld"><span>${esc(t('pn.lider'))}</span><input id="n-lider" placeholder="CMD A. Silva"></label>
    <label class="fld"><span>${esc(t('pn.qtd'))}</span><input id="n-qtd" type="number" min="1" max="40" value="4"></label>
    <label class="fld"><span>${esc(t('pn.voo_c'))}</span><input id="n-vc" placeholder="G3 1234"></label>
    <label class="fld"><span>${esc(t('pn.chegada'))}</span><input id="n-c" type="datetime-local" value="${paraInput(diaLocal(S.noite,21))}"></label>
    <label class="fld"><span>${esc(t('pn.voo_s'))}</span><input id="n-vs" placeholder="G3 1235"></label>
    <label class="fld"><span>${esc(t('pn.saida'))}</span><input id="n-s" type="datetime-local" value="${paraInput(diaLocal(S.noite,32))}"></label>
    <label class="fld full"><span>${esc(t('pn.motivo'))}</span><input id="n-m"></label></div>`;
}
function modalNovo(){
  if(!guard()) return;
  abrirModal(`<div class="modal-h"><h3>${esc(t('hoje.novo'))}</h3><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b">${formPernoite()}</div><div class="modal-f"><button class="btn" data-close type="button">${esc(t('gen.cancelar'))}</button><button class="btn pri" id="n-ok" type="button">${esc(t('pn.criar'))}</button></div>`, bg=>{
    $('#n-ok', bg).addEventListener('click', async ()=>{
      const lider = $('#n-lider',bg).value.trim(), ch = new Date($('#n-c',bg).value), sa = new Date($('#n-s',bg).value);
      if(!lider || isNaN(ch) || isNaN(sa)){ showToast(t('err.campos')); return; } if(!(sa>ch)){ showToast(t('err.datas')); return; }
      const reg = { base:$('#n-base',bg).value, origem:$('#n-orig',bg).value, lider, qtd:Math.max(1,+$('#n-qtd',bg).value||1), voo_chegada:$('#n-vc',bg).value.trim()||null, voo_saida:$('#n-vs',bg).value.trim()||null,
        chegada:ch.toISOString(), saida:sa.toISOString(), motivo:$('#n-m',bg).value.trim()||null, situacao:'a_alocar', criado_por:S.email, historico:[{ em:new Date().toISOString(), por:S.email, acao:'criado' }] };
      const { error } = await sb.from('prn_pernoites').insert(reg);
      if(error){ showToast(t('err.salvar',{m:error.message})); return; }
      showToast(t('ok.criado')); fecharModal(); await carregarNoite(); render();
    });
  });
}
async function alocarPendentes(){
  if(!guard()) return;
  const pend = S.pern.filter(p=>p.situacao==='a_alocar').sort((a,b)=> new Date(a.chegada)-new Date(b.chegada));
  if(!pend.length){ showToast(t('ok.auto0')); return; }
  let n = 0, f = 0;
  for(const p of pend){ const { sug } = opcoesHotel(p); if(!sug){ f++; continue; } const hh = hotelPor(sug); if(await atualizarPernoite(p, { hotel_id:sug, situacao:'alocado' }, 'alocado automático: '+hh.nome)) n++; }
  showToast(t('ok.auto',{n,f})); render();
}
function modalImportar(){
  if(!guard()) return;
  let prontos = [];
  abrirModal(`<div class="modal-h"><div><h3>${esc(t('imp.titulo'))}</h3><div class="sub">${esc(t('imp.sub'))}</div></div><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b"><div class="acts"><button class="btn" id="i-modelo" type="button">${esc(t('imp.modelo'))}</button><label class="btn"><input type="file" id="i-arq" accept=".csv,text/csv" hidden>${esc(t('imp.arquivo'))}</label></div><div id="i-prev" class="muted"></div></div>
    <div class="modal-f"><button class="btn" data-close type="button">${esc(t('gen.cancelar'))}</button><button class="btn pri" id="i-ok" type="button" disabled>${esc(t('imp.ok'))}</button></div>`, bg=>{
    $('#i-modelo', bg).addEventListener('click', ()=>{
      const d = S.noite; const csv = 'base;responsavel;tripulantes;voo_chegada;chegada;voo_saida;saida\nGRU;CMD A. Silva;4;G3 1234;'+d+' 21:30;G3 1235;'+d+' 23:59\n';
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿'+csv], {type:'text/csv'})); a.download = 'stayline-modelo.csv'; a.click(); });
    $('#i-arq', bg).addEventListener('change', async e=>{
      const f = e.target.files[0]; if(!f) return; const txt = await f.text();
      const ls = txt.replace(/^﻿/,'').split(/\r?\n/).filter(l=>l.trim()); const sep = (ls[0]||'').includes(';') ? ';' : ',';
      const cab = ls.shift().split(sep).map(s=>s.trim().toLowerCase()); const ix = k => cab.indexOf(k);
      let ruins = 0; prontos = [];
      ls.forEach(l=>{ const c = l.split(sep).map(s=>s.trim()); const base = (c[ix('base')]||'').toUpperCase(); const ch = new Date((c[ix('chegada')]||'').replace(' ','T')), sa = new Date((c[ix('saida')]||'').replace(' ','T'));
        if(!S.bases.some(b=>b.codigo===base) || !c[ix('responsavel')] || isNaN(ch) || isNaN(sa) || !(sa>ch)){ ruins++; return; }
        prontos.push({ base, lider:c[ix('responsavel')], qtd:Math.max(1, parseInt(c[ix('tripulantes')])||1), voo_chegada:c[ix('voo_chegada')]||null, chegada:ch.toISOString(), voo_saida:c[ix('voo_saida')]||null, saida:sa.toISOString(), situacao:'a_alocar', origem:'publicacao', criado_por:S.email, historico:[{ em:new Date().toISOString(), por:S.email, acao:'importado' }] }); });
      $('#i-prev', bg).textContent = t('imp.previa',{n:prontos.length}) + (ruins ? ' · ' + t('imp.erros',{n:ruins}) : '');
      $('#i-ok', bg).disabled = !prontos.length;
    });
    $('#i-ok', bg).addEventListener('click', async ()=>{
      const { error } = await sb.from('prn_pernoites').insert(prontos);
      if(error){ showToast(t('err.salvar',{m:error.message})); return; }
      showToast(t('ok.import',{n:prontos.length})); fecharModal(); await carregarNoite(); render();
    });
  });
}

/* ---------- HOTÉIS ---------- */
// Duas abas: "Contratados" (os que entram na Operação, com quartos e diária) e "Cadastro geral" (todos os hotéis
// cadastrados, mesmo sem negociação ativa — consulta, categoria e risco). O cadastro só é buscado quando a aba abre.
const pillRisco = r => !r ? '' : `<span class="pill ${/bloq/i.test(r)?'s-cancelado':/revis/i.test(r)?'s-a_reconfirmar':'s-confirmado'}">${esc(/bloq/i.test(r)?t('cad.bloquear'):/revis/i.test(r)?t('cad.revisar'):t('cad.liberado'))}</span>`;
function renderHoteis(){
  const v = $('#view-hoteis'); S.htAba = S.htAba || 'contratados';
  const bases = S.bases.filter(b=> b.ativo !== false);
  v.innerHTML = `<div class="head"><div><h2>${esc(t('ht.titulo'))}</h2><p>${esc(t('ht.sub'))}</p></div><div class="acts"><button class="btn" id="h-voltar" type="button">← ${esc(t('nav.operacao'))}</button><button class="btn" id="b-nova" type="button">+ ${esc(t('ht.nova_base'))}</button><button class="btn pri" id="h-nova" type="button">+ ${esc(t('ht.novo'))}</button></div></div>
    <div class="chips ht-abas"><button type="button" class="chip ${S.htAba==='contratados'?'on':''}" data-aba="contratados">${esc(t('ht.aba_contr'))} <b>${S.hoteis.length}</b></button><button type="button" class="chip ${S.htAba==='cadastro'?'on':''}" data-aba="cadastro">${esc(t('ht.aba_cad'))}${S.cad?` <b>${S.cad.length}</b>`:''}</button></div>
    <div id="ht-corpo"></div>`;
  $$('[data-aba]', v).forEach(b=> b.addEventListener('click', ()=>{ S.htAba = b.dataset.aba; renderHoteis(); }));
  $('#h-nova').addEventListener('click', ()=> modalHotel(null));
  $('#b-nova').addEventListener('click', modalBase);
  $('#h-voltar').addEventListener('click', ()=> irPara('operacao'));
  const corpo = $('#ht-corpo', v);
  if(S.htAba === 'cadastro'){ renderCadastro(corpo); return; }
  const fonte = (S.hoteis.find(h=>h.fonte)||{}).fonte;
  corpo.innerHTML = (fonte?`<p class="sub" style="margin:0 0 10px">${esc(t('ht.fonte',{f:fonte}))}</p>`:'') + `<div class="grid-bases">${bases.map(b=>{ const hs = S.hoteis.filter(h=>h.base===b.codigo); if(!hs.length) return '';
      return `<div class="card base-card"><div class="base-h"><div><b>${esc(b.codigo)}</b> <span class="muted">${esc(b.cidade)}${b.uf?' · '+esc(b.uf):''}</span></div></div>
        <div class="tl-scroll"><table><thead><tr><th>${esc(t('ht.nome'))}</th><th>${esc(t('ht.single'))}</th><th>${esc(t('ht.duplo'))}</th><th>${esc(t('ht.quartos'))}</th><th title="${esc(t('ht.duracao_d'))}">${esc(t('ht.duracao'))}</th><th>${esc(t('ht.translado'))}</th><th>${esc(t('ht.hoje'))}</th></tr></thead><tbody>
        ${hs.map(h=>{ const u = usados(h.id, hojeISO()), pc = h.quartos_dia? Math.min(100,u/h.quartos_dia*100):0; return `<tr data-h="${h.id}"><td><b>${esc(h.nome)}</b>${h.ativo?'':' <span class="tag">off</span>'}${h.aviso?` <span class="tag amber">⚠ ${esc(h.aviso)}</span>`:''}<div class="sub">${esc([h.categoria, h.rede && !/independente/i.test(h.rede) ? h.rede : '', h.servicos].filter(Boolean).join(' · '))}</div></td><td class="mono">${fMoeda(h.tarifa, h.moeda)}</td><td class="mono">${fMoeda(h.tarifa_duplo, h.moeda)}</td><td class="mono">${h.quartos_dia}</td><td class="mono">${h.duracao_h?h.duracao_h+'h':'–'}</td><td class="mono">${h.minutos_local!=null?h.minutos_local+' min':'–'}</td><td><div style="display:flex;gap:8px;align-items:center"><div class="meter" style="width:60px"><i class="${pc>=100?'full':pc>=80?'mid':''}" style="width:${pc}%"></i></div><span class="mono">${u}/${h.quartos_dia}</span></div></td></tr>`; }).join('')}</tbody></table></div></div>`; }).join('')}</div>`;
  $$('tr[data-h]', corpo).forEach(tr=> tr.addEventListener('click', ()=> window.SL_fichaHotel ? window.SL_fichaHotel(tr.dataset.h) : modalHotel(hotelPor(tr.dataset.h))));
}
async function renderCadastro(corpo){
  if(!S.cad){ corpo.innerHTML = `<div class="empty">${esc(t('gen.carregando'))}</div>`; let pag = 0, todos = [];
    while(true){ const { data, error } = await sb.from('prn_cadastro_hoteis').select('*').order('aeroporto').order('nome').range(pag*1000, pag*1000+999);
      if(error){ corpo.innerHTML = `<div class="empty">${esc(t('gen.erro',{m:error.message}))}</div>`; return; }
      todos = todos.concat(data||[]); if(!data || data.length < 1000) break; pag++; }
    S.cad = todos; if(S.htAba==='cadastro') renderHoteis(); return; }
  const F = S.cadF = S.cadF || { q:'', pref:'', cat:'', risco:'', sem:false };
  const opts = (vals, sel, todos) => `<option value="">${esc(todos)}</option>` + vals.map(x=>`<option value="${esc(x)}" ${x===sel?'selected':''}>${esc(x)}</option>`).join('');
  const uniq = k => [...new Set(S.cad.map(c=>c[k]).filter(Boolean))].sort();
  const sem = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const lista = S.cad.filter(c=> (!F.pref || (c.preferencias||[c.preferencia]).includes(F.pref)) && (!F.cat || c.categoria===F.cat) && (!F.sem || !c.contratado)
    && (!F.risco || (F.risco==='atencao' ? !/sem ind/i.test(c.risco||'') : c.risco===F.risco))
    && (!F.q || sem([c.nome,c.aeroporto,c.cidade,c.rede,c.contrato_num].join(' ')).includes(sem(F.q))));
  const atencao = S.cad.filter(c=>!/sem ind/i.test(c.risco||'')).length;
  corpo.innerHTML = `<div class="card" style="padding:12px 14px;margin-bottom:12px"><div class="toolbar" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <input id="cf-q" type="search" placeholder="${esc(t('cad.busca'))}" value="${esc(F.q)}" style="flex:1 1 220px">
      <select id="cf-pref">${opts(uniq('preferencia'), F.pref, t('cad.todas_pref'))}</select>
      <select id="cf-cat">${opts(uniq('categoria'), F.cat, t('cad.todas_cat'))}</select>
      <select id="cf-risco"><option value="">${esc(t('cad.todo_risco'))}</option><option value="atencao" ${F.risco==='atencao'?'selected':''}>${esc(t('cad.atencao',{n:atencao}))}</option></select>
      <label class="muted" style="display:flex;gap:6px;align-items:center"><input id="cf-sem" type="checkbox" ${F.sem?'checked':''}> ${esc(t('cad.so_sem'))}</label>
      <span class="muted mono">${esc(t('cad.n',{n:lista.length, t:S.cad.length}))}</span></div></div>
    <div class="card tl-scroll"><table><thead><tr><th>${esc(t('cad.aero'))}</th><th>${esc(t('ht.nome'))}</th><th>${esc(t('cad.cidade'))}</th><th>${esc(t('cad.pref'))}</th><th>${esc(t('cad.cat'))}</th><th>${esc(t('cad.rede'))}</th><th>${esc(t('cad.risco'))}</th></tr></thead><tbody>
      ${lista.slice(0, 400).map(c=>`<tr data-cad="${esc(c.contrato_num)}"><td class="mono">${esc(c.aeroporto)}</td><td><b>${esc(c.nome)}</b>${c.contratado?` <span class="tag accent">${esc(t('cad.contratado'))}</span>`:''}<div class="sub mono">#${esc(c.contrato_num)}</div></td><td>${esc(c.cidade||'')}${c.uf?' · '+esc(c.uf):''}</td><td>${esc((c.preferencias||[c.preferencia]).join(', '))}</td><td>${esc(c.categoria||'')}</td><td class="sub">${esc(c.rede||'')}</td><td>${pillRisco(c.risco)}</td></tr>`).join('')
        || `<tr><td colspan="7" class="muted">${esc(t('cad.nada'))}</td></tr>`}</tbody></table>
      ${lista.length > 400 ? `<div class="sub" style="padding:10px">${esc(t('cad.mais',{n:lista.length-400}))}</div>` : ''}</div>`;
  const re = ()=>{ renderCadastro(corpo); };
  const q = $('#cf-q', corpo); q.addEventListener('input', ()=>{ F.q = q.value; clearTimeout(S.cadT); S.cadT = setTimeout(()=>{ re(); const n = $('#cf-q'); if(n){ n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); });
  $('#cf-pref', corpo).addEventListener('change', e=>{ F.pref = e.target.value; re(); });
  $('#cf-cat', corpo).addEventListener('change', e=>{ F.cat = e.target.value; re(); });
  $('#cf-risco', corpo).addEventListener('change', e=>{ F.risco = e.target.value; re(); });
  $('#cf-sem', corpo).addEventListener('change', e=>{ F.sem = e.target.checked; re(); });
  $$('tr[data-cad]', corpo).forEach(tr=> tr.addEventListener('click', ()=>{ const c = S.cad.find(x=>x.contrato_num===tr.dataset.cad); if(!c) return;
    abrirModal(`<div class="modal-h"><div><h3>${esc(c.nome)}</h3><div class="sub"><span class="mono">${esc(c.aeroporto)} · #${esc(c.contrato_num)}</span> · ${esc(c.cidade||'')}${c.uf?' · '+esc(c.uf):''}</div></div><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
      <div class="modal-b"><div class="kv"><div><small>${esc(t('cad.pref'))}</small><b>${esc((c.preferencias||[c.preferencia]).join(', '))}</b></div><div><small>${esc(t('cad.cat'))}</small><b>${esc(c.categoria||'—')}${c.confianca?` <span class="muted">(${esc(c.confianca)})</span>`:''}</b></div><div><small>${esc(t('cad.rede'))}</small><b>${esc(c.rede||'—')}</b></div>
        <div><small>${esc(t('cad.risco'))}</small><b>${pillRisco(c.risco)} ${esc(c.criterio_risco && !/aplic/i.test(c.criterio_risco) ? c.criterio_risco : '')}</b></div><div><small>${esc(t('cad.acao'))}</small><b>${esc(c.acao||'—')}</b></div><div><small>${esc(t('cad.contratado'))}</small><b>${c.contratado?'✓':'—'}</b></div></div>
        ${c.justificativa?`<div class="fld"><span>${esc(t('cad.justificativa'))}</span><div class="sub">${esc(c.justificativa)}</div></div>`:''}
        ${c.fonte && /^https?:\/\//.test(c.fonte)?`<div class="fld"><span>${esc(t('cad.fonte'))}</span><a href="${esc(c.fonte)}" target="_blank" rel="noopener noreferrer" class="sub">${esc(c.fonte)}</a></div>`:''}</div>
      <div class="modal-f"><button class="btn" data-close type="button">${esc(t('pn.fechar'))}</button></div>`);
  }));
}
function modalHotel(h){
  if(!guard()) return; const n = h || { base:(S.bases[0]||{}).codigo, tipo:'primario', comissao_pct:10, quartos_dia:10, ativo:true, moeda:'BRL' };
  abrirModal(`<div class="modal-h"><h3>${esc(h?h.nome:t('ht.novo'))}</h3><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b"><div class="form">
      <label class="fld"><span>${esc(t('pn.base'))}</span><select id="o-base">${S.bases.map(b=>`<option value="${esc(b.codigo)}" ${b.codigo===n.base?'selected':''}>${esc(b.codigo)} · ${esc(b.cidade)}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('ht.tipo'))}</span><select id="o-tipo"><option value="primario" ${n.tipo==='primario'?'selected':''}>${esc(t('ht.primario'))}</option><option value="secundario" ${n.tipo==='secundario'?'selected':''}>${esc(t('ht.secundario'))}</option></select></label>
      <label class="fld full"><span>${esc(t('ht.nome'))}</span><input id="o-nome" value="${esc(n.nome||'')}"></label>
      <label class="fld"><span>${esc(t('ht.moeda'))}</span><select id="o-moe">${['BRL','USD','EUR'].map(m=>`<option ${m===(n.moeda||'BRL')?'selected':''}>${m}</option>`).join('')}</select></label>
      <label class="fld"><span>${esc(t('ht.tarifa'))}</span><input id="o-tar" type="number" step="0.01" value="${n.tarifa??''}"></label>
      <label class="fld"><span>${esc(t('ht.duplo'))}</span><input id="o-dup" type="number" step="0.01" value="${n.tarifa_duplo??''}"></label>
      <label class="fld"><span>${esc(t('ht.quartos'))}</span><input id="o-q" type="number" min="0" value="${n.quartos_dia??0}"></label>
      <label class="fld"><span title="${esc(t('ht.duracao_d'))}">${esc(t('ht.duracao'))} (h)</span><input id="o-dur" type="number" min="0" value="${n.duracao_h??''}"></label>
      <label class="fld"><span>${esc(t('ht.translado'))} (min)</span><input id="o-min" type="number" min="0" value="${n.minutos_local??''}"></label>
      <label class="fld"><span>${esc(t('ht.release'))}</span><input id="o-rel" placeholder="00:20" value="${esc(n.release||'')}"></label>
      <label class="fld"><span>${esc(t('ht.comissao'))}</span><input id="o-com" type="number" step="0.5" value="${n.comissao_pct??10}"></label>
      <label class="fld"><span>${esc(t('ht.ativo'))}</span><select id="o-at"><option value="1" ${n.ativo?'selected':''}>✓</option><option value="0" ${n.ativo?'':'selected'}>—</option></select></label>
      <label class="fld full"><span>${esc(t('ht.servicos'))}</span><input id="o-serv" value="${esc(n.servicos||'')}"></label>
      <label class="fld"><span>${esc(t('ht.contato'))}</span><input id="o-cont" value="${esc(n.contato||'')}"></label>
      <label class="fld"><span>${esc(t('ht.telefone'))}</span><input id="o-tel" value="${esc(n.telefone||'')}"></label></div></div>
    <div class="modal-f"><button class="btn" data-close type="button">${esc(t('gen.cancelar'))}</button><button class="btn pri" id="o-ok" type="button">${esc(t('gen.salvar'))}</button></div>`, bg=>{
    $('#o-ok', bg).addEventListener('click', async ()=>{
      const reg = { base:$('#o-base',bg).value, tipo:$('#o-tipo',bg).value, nome:$('#o-nome',bg).value.trim(), tarifa:$('#o-tar',bg).value===''?null:+$('#o-tar',bg).value, quartos_dia:+$('#o-q',bg).value||0,
        moeda:$('#o-moe',bg).value, tarifa_duplo:$('#o-dup',bg).value===''?null:+$('#o-dup',bg).value, duracao_h:$('#o-dur',bg).value===''?null:+$('#o-dur',bg).value,
        minutos_local:$('#o-min',bg).value===''?null:+$('#o-min',bg).value, release:$('#o-rel',bg).value.trim()||null,
        comissao_pct:+$('#o-com',bg).value||0, ativo:$('#o-at',bg).value==='1', servicos:$('#o-serv',bg).value.trim()||null, contato:$('#o-cont',bg).value.trim()||null, telefone:$('#o-tel',bg).value.trim()||null, atualizado_em:new Date().toISOString() };
      if(!reg.nome){ showToast(t('err.campos')); return; }
      const r = h ? await sb.from('prn_hoteis').update(reg).eq('id', h.id) : await sb.from('prn_hoteis').insert(reg);
      if(r.error){ showToast(t('err.salvar',{m:r.error.message})); return; }
      showToast(t('ok.salvo')); fecharModal(); await carregarBase(); render();
    });
  });
}
function modalBase(){
  if(!guard()) return;
  abrirModal(`<div class="modal-h"><h3>${esc(t('ht.nova_base'))}</h3><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b"><div class="form"><label class="fld"><span>${esc(t('ht.codigo'))}</span><input id="bb-c" maxlength="4" placeholder="VCP"></label><label class="fld"><span>${esc(t('ht.uf'))}</span><input id="bb-uf" maxlength="2" placeholder="SP"></label>
      <label class="fld full"><span>${esc(t('ht.cidade'))}</span><input id="bb-ci" placeholder="Campinas"></label></div></div>
    <div class="modal-f"><button class="btn" data-close type="button">${esc(t('gen.cancelar'))}</button><button class="btn pri" id="bb-ok" type="button">${esc(t('gen.salvar'))}</button></div>`, bg=>{
    $('#bb-ok', bg).addEventListener('click', async ()=>{
      const reg = { codigo:$('#bb-c',bg).value.trim().toUpperCase(), cidade:$('#bb-ci',bg).value.trim(), uf:$('#bb-uf',bg).value.trim().toUpperCase()||null };
      if(!reg.codigo || !reg.cidade){ showToast(t('err.campos')); return; }
      const { error } = await sb.from('prn_bases').insert(reg); if(error){ showToast(t('err.salvar',{m:error.message})); return; }
      showToast(t('ok.salvo')); fecharModal(); await carregarBase(); render();
    });
  });
}

/* ---------- SUGESTÕES ---------- */
async function renderSugestoes(){
  const v = $('#view-sugestoes');
  v.innerHTML = `<div class="head"><div><h2>${esc(t('sg.titulo'))}</h2><p>${esc(t('sg.sub'))}</p></div></div>${ehAdmin()?'<div id="sg-val"></div>':''}<div id="sg-lista" class="muted">${esc(t('gen.carregando'))}</div>`;
  if(ehAdmin()) renderValidacao($('#sg-val'));
  const { data, error } = await sb.from('prn_sugestoes').select('*').order('criado_em', {ascending:false}).limit(200);
  if(S.view!=='sugestoes') return;
  const box = $('#sg-lista'); if(error){ box.textContent = t('gen.erro',{m:error.message}); return; }
  S.sugestoes = data || [];
  if(!S.sugestoes.length){ box.innerHTML = `<div class="card empty">${esc(t('sg.vazio'))}</div>`; return; }
  box.className = ''; box.style.cssText = 'display:grid;gap:12px';
  box.innerHTML = S.sugestoes.map(s=>`<div class="card sg" data-s="${s.id}">
    <div class="sg-h"><span class="pill ${s.status==='concluida'?'s-confirmado':s.status==='em_analise'?'s-alocado':s.status==='depois'?'s-cancelado':'s-a_reconfirmar'}">${esc(t('sgs.'+s.status))}</span><span class="tag">${esc(t('sgt.'+(s.tipo||'melhoria')))}</span><b>${esc(s.autor||s.email||'')}</b><span class="grow"></span><span class="muted mono">${fDiaHora(s.criado_em)}${s.tela?' · '+esc(s.tela):''}</span></div>
    <p>${esc(s.texto)}</p>
    ${(s.anexos||[]).length?`<div class="sg-atts">${s.anexos.map(a=>`<img data-path="${esc(a.path)}" alt="print">`).join('')}</div>`:''}
    ${s.audio_path?`<audio controls data-audio="${esc(s.audio_path)}"></audio>`:''}
    ${s.resposta?`<div class="sg-resp"><b>${esc(t('sg.resposta'))}:</b> ${esc(s.resposta)}</div>`:''}
    ${ehAdmin()?`<div class="form"><label class="fld"><span>${esc(t('sg.status'))}</span><select data-st>${['nova','em_analise','concluida','depois'].map(x=>`<option value="${x}" ${x===s.status?'selected':''}>${esc(t('sgs.'+x))}</option>`).join('')}</select></label>
      <label class="fld full"><span>${esc(t('sg.resposta'))}</span><textarea data-resp rows="2">${esc(s.resposta||'')}</textarea></label></div><div><button class="btn" type="button" data-salvar>${esc(t('sg.responder'))}</button></div>`:''}
  </div>`).join('');
  $$('img[data-path]', box).forEach(async img=>{ const { data } = await sb.storage.from('prn-anexos').createSignedUrl(img.dataset.path, 3600); if(data){ img.src = data.signedUrl; img.addEventListener('click', ()=> window.open(data.signedUrl, '_blank', 'noopener')); } });
  $$('audio[data-audio]', box).forEach(async au=>{ const { data } = await sb.storage.from('prn-anexos').createSignedUrl(au.dataset.audio, 3600); if(data) au.src = data.signedUrl; });
  $$('[data-salvar]', box).forEach(b=> b.addEventListener('click', async ()=>{
    const card = b.closest('[data-s]'), s = S.sugestoes.find(x=>x.id===card.dataset.s);
    const status = $('[data-st]', card).value, resposta = $('[data-resp]', card).value.trim() || null;
    const historico = (s.historico||[]).concat([{ em:new Date().toISOString(), por:S.email, de:s.status, para:status }]);
    const { error } = await sb.from('prn_sugestoes').update({ status, resposta, historico }).eq('id', s.id);
    if(error){ showToast(t('err.salvar',{m:error.message})); return; } showToast(t('ok.salvo')); renderSugestoes(); }));
}
window.SL_renderSugestoes = ()=>{ if(S.view==='sugestoes') renderSugestoes(); };

// validação do fluxo (admin): o que cada pessoa marcou em "Entendemos certo?"
async function renderValidacao(alvo){
  const { data } = await sb.from('prn_validacao').select('*').order('criado_em');
  const lista = data || []; const pessoas = [...new Set(lista.map(r=>r.email))];
  const ico = { certo:'<span class="pill s-confirmado">✓</span>', parcial:'<span class="pill s-a_reconfirmar">≈</span>', errado:'<span class="pill s-a_alocar">✕</span>' };
  alvo.innerHTML = `<div class="card" style="padding:14px 16px;display:grid;gap:10px"><div><b>${esc(t('sg.val.titulo'))}</b><div class="sub">${esc(t('sg.val.sub'))}</div></div>
    ${!lista.length ? `<div class="muted">${esc(t('sg.val.vazio'))}</div>` : `<div class="tl-scroll"><table class="val-tab"><thead><tr><th>#</th><th></th>${pessoas.map(p=>`<th>${esc(p)}</th>`).join('')}</tr></thead><tbody>
      ${(window.SL_PERGUNTAS||[]).map((q,i)=>`<tr><td class="mono">${i+1}</td><td style="min-width:260px">${esc(t('val.'+q))}</td>${pessoas.map(p=>{ const r = lista.find(x=>x.email===p && x.pergunta===q); return `<td style="min-width:180px">${r?ico[r.resposta]+(r.comentario?`<div class="sub" style="margin-top:4px">${esc(r.comentario)}</div>`:''):'<span class="muted">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`}</div>`;
}

/* ---------- EQUIPE ---------- */
async function renderEquipe(){
  const v = $('#view-equipe');
  const { data } = await sb.from('prn_membros').select('*').order('criado_em');
  S.membros = data || [];
  v.innerHTML = `<div class="head"><div><h2>${esc(t('eq.titulo'))}</h2><p>${esc(t('eq.sub'))}</p></div></div>
    <div class="card" style="padding:14px 16px"><div class="form eq-form">
      <label class="fld"><span>${esc(t('eq.email'))}</span><input id="m-email" type="email"></label><label class="fld"><span>${esc(t('eq.nome'))}</span><input id="m-nome"></label>
      <label class="fld"><span>${esc(t('eq.papel'))}</span><select id="m-papel">${['operacao','leitura','admin'].map(p=>`<option value="${p}">${esc(t('pap.'+p))}</option>`).join('')}</select></label>
      <button class="btn pri" id="m-add" type="button">${esc(t('eq.incluir'))}</button></div></div>
    <div class="card tl-scroll"><table><thead><tr><th>${esc(t('eq.email'))}</th><th>${esc(t('eq.nome'))}</th><th>${esc(t('eq.papel'))}</th><th></th></tr></thead><tbody>
      ${S.membros.map(m=>`<tr><td class="mono">${esc(m.email)}</td><td>${esc(m.nome||'')}</td><td>${esc(t('pap.'+m.papel))}</td><td>${m.primeiro_acesso_ate&&new Date(m.primeiro_acesso_ate)>new Date()?`<span class="tag amber">${esc(t('eq.liberado',{d:fDiaHora(m.primeiro_acesso_ate)}))}</span>`:''} <button class="btn" type="button" data-lib="${esc(m.email)}">${esc(t('eq.liberar'))}</button></td></tr>`).join('')}</tbody></table></div>`;
  $('#m-add').addEventListener('click', async ()=>{
    const email = $('#m-email').value.trim().toLowerCase(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ showToast(t('pa.email_invalido')); return; }
    const { error } = await sb.from('prn_membros').upsert({ email, nome:$('#m-nome').value.trim()||null, papel:$('#m-papel').value, ativo:true, primeiro_acesso_ate:new Date(Date.now()+48*3600000).toISOString() }, { onConflict:'email' });
    if(error){ showToast(t('err.salvar',{m:error.message})); return; } showToast(t('ok.salvo')); renderEquipe(); });
  $$('[data-lib]', v).forEach(b=> b.addEventListener('click', async ()=>{
    const { error } = await sb.from('prn_membros').update({ primeiro_acesso_ate:new Date(Date.now()+48*3600000).toISOString(), ativo:true }).eq('email', b.dataset.lib);
    if(error){ showToast(t('err.salvar',{m:error.message})); return; } showToast(t('ok.salvo')); renderEquipe(); }));
}

/* ---------- NOVIDADES ---------- */
const novChave = ()=> 'sl_nov_visto:' + S.email;
async function novidadesCarregar(){ const { data } = await sb.from('prn_novidades').select('*').order('data',{ascending:false}).order('criado_em',{ascending:false}).limit(8); S.novidades = data || []; return S.novidades; }
function novMarcarVisto(){ if(S.novidades[0]) lsSet(novChave(), S.novidades[0].id); const f = $('#nov-faixa'); if(f) f.remove(); $('#btn-nov').classList.remove('novo'); }
async function novidadesAbrir(){
  if(!S.novidades.length) await novidadesCarregar();
  const tit = n => S.lang==='pt' ? n.titulo_pt : n.titulo_en;
  abrirModal(`<div class="modal-h"><div><h3>✨ ${esc(t('nov.titulo'))}</h3><div class="sub">${esc(t('nov.sub'))}</div></div><button class="x" data-close aria-label="${esc(t('pn.fechar'))}">✕</button></div>
    <div class="modal-b">${S.novidades.map((n,i)=>`<div><div style="display:flex;gap:8px;align-items:center"><span style="font-size:20px">${esc(n.ico||'✨')}</span><b>${esc(tit(n))}</b><span class="tag">${fData(n.data+'T12:00:00')}</span>${i===0?`<span class="tag amber">${esc(t('nov.recente'))}</span>`:''}</div>
      <ul style="margin:6px 0 0;padding-left:22px;color:var(--ink-2)">${(n.itens||[]).map(it=>`<li>${esc(S.lang==='pt'?it.pt:it.en)}</li>`).join('')}</ul></div>`).join('')}</div>
    <div class="modal-f"><button class="btn pri" data-close type="button">${esc(t('nov.ok'))}</button></div>`);
  novMarcarVisto();
}
window.novidadesAbrir = novidadesAbrir;
$('#btn-nov').addEventListener('click', novidadesAbrir);
async function novidadesIniciar(){
  const lista = await novidadesCarregar(); if(!lista.length) return;
  if(lsGet(novChave(), '') !== lista[0].id && !$('#nov-faixa')){
    const f = document.createElement('div'); f.id = 'nov-faixa'; f.setAttribute('role','status');
    f.innerHTML = `<span>✨ <b data-i18n="nov.faixa">${esc(t('nov.faixa'))}</b></span><button class="btn pri" type="button" id="nov-ver" data-i18n="nov.ver">${esc(t('nov.ver'))}</button><button class="btn" type="button" id="nov-x" aria-label="${esc(t('pn.fechar'))}">✕</button>`;
    if($('#tour')) f.hidden = true;                                   // a apresentação vem primeiro; a faixa volta quando ela fecha
    document.body.appendChild(f); $('#nov-ver').addEventListener('click', novidadesAbrir); $('#nov-x').addEventListener('click', ()=> f.remove());
    $('#btn-nov').classList.add('novo');
  }
}

/* ---------- partida ---------- */
// a tela Operação (operacao.js) usa o estado e as ações daqui
window.SLX = { S, sb, t, esc, $, $$, fHora, fDiaHora, fData, fMoeda, hojeISO, somaDias, diaLocal, noiteDe, hotelPor, usados, opcoesHotel, atualizarPernoite, guard, podeEscrever,
  modalPernoite, modalNovo, modalImportar, modalHotel, modalBase, alocarPendentes, carregarNoite, carregarBase, render, irPara, abrirModal, fecharModal, ehAdmin, lsGet, lsSet };
window.SL = { sb, t, get lang(){ return S.lang; }, get email(){ return S.email; }, get nome(){ return (S.membro&&S.membro.nome) || S.email.split('@')[0]; }, view:()=>S.view, irPara };
$('#btn-tour').addEventListener('click', ()=> window.SL_tourAbrir && window.SL_tourAbrir());
$('#btn-valid').addEventListener('click', ()=> window.SL_validarAbrir && window.SL_validarAbrir());
S.demo = lsGet('sl_demo', '0') === '1';
S.lang = lsGet('sl_idioma', (navigator.language||'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en');
aplicarIdioma();
sb.auth.getSession().then(({data})=>{ if(!data.session) telaLogin(); });
})();
