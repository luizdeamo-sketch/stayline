/* Stayline — vídeos narrados dentro do navegador, no molde da apresentação do CRM Aliança:
   voz (speechSynthesis, PT ou EN conforme o idioma), gráficos animados, avanço sozinho ao fim de cada fala.
   Três roteiros: "Como funciona" (percorre as telas reais com destaque), "Analítico da operação" e
   "Potencial do Antecipa" (para vender o projeto). Os números vêm do próprio banco; o que é exemplo é dito como exemplo. */
(function(){
'use strict';
const X = window.SLX; if(!X) return;
const { S, t, esc } = X;
const L = (pt, en)=> S.lang==='en' ? en : pt;
const loc = ()=> S.lang==='en' ? 'en-US' : 'pt-BR';
const N = v=> Math.round(Number(v)||0).toLocaleString(loc());
const P = (a,b)=> b ? Math.round(a/b*100) : 0;
const R = v=> X.fMoeda(v);
const RC = v=>{ v = Number(v)||0; const a = Math.abs(v); return a>=1e6 ? 'R$ '+(v/1e6).toLocaleString(loc(),{maximumFractionDigits:1})+L(' mi',' M') : a>=1e3 ? 'R$ '+Math.round(v/1e3).toLocaleString(loc())+L(' mil','k') : 'R$ '+Math.round(v); };
// número por extenso para a voz não ler "R$" de forma estranha
const RF = v=>{ v = Number(v)||0; const a = Math.abs(v);
  if(a>=1e6) return (v/1e6).toLocaleString(loc(),{maximumFractionDigits:1})+L(' milhões de reais',' million reais');
  if(a>=1e3) return Math.round(v/1e3).toLocaleString(loc())+L(' mil reais',' thousand reais'); return Math.round(v)+L(' reais',' reais'); };
const COR = { a:'#4f7cff', b:'#2fbf8f', c:'#f2a33a', d:'#e5534b', e:'#9b7bff', f:'#3fb6d8' };

/* ---------- dados ---------- */
async function carregarFaturas(){ const PAG = 1000; let pag = 0, todos = [];
  while(true){ const { data, error } = await X.sb.from('prn_faturas').select('*').order('competencia').range(pag*PAG, pag*PAG+PAG-1); if(error) break; todos = todos.concat(data||[]); if(!data || data.length < PAG) break; pag++; }
  return todos; }
async function carregarCadastro(){ const PAG = 1000; let pag = 0, todos = [];
  while(true){ const { data, error } = await X.sb.from('prn_cadastro_hoteis').select('categoria,risco,preferencia,contratado').range(pag*PAG, pag*PAG+PAG-1); if(error) break; todos = todos.concat(data||[]); if(!data || data.length < PAG) break; pag++; }
  return todos; }
const num = (k, d)=>{ const v = parseFloat((S.config||{})[k]); return isNaN(v) ? d : v; };
const par = ()=> ({ mes:num('antecipa_taxa_mes',2), min:num('antecipa_taxa_min',1), max:num('antecipa_taxa_max',6), fixa:num('antecipa_taxa_fixa',150), prazo:num('antecipa_prazo_dias',90), valorMin:num('antecipa_valor_min',5000) });
const diasAte = iso=> Math.round((X.diaLocal(iso,12) - X.diaLocal(X.hojeISO(),12)) / 86400000);
const fMes = iso=>{ const d = new Date(iso+'T12:00:00'); return d.toLocaleDateString(loc(), { month:'short' }).replace('.','') + '/' + String(d.getFullYear()).slice(2); };
const fMesLongo = iso=> new Date(iso+'T12:00:00').toLocaleDateString(loc(), { month:'long' });

/* ---------- roteiros ---------- */
function cenasComoFunciona(){
  return [
    { tela:'operacao', alvo:'.side .brand', t:L('O que é o Stayline','What Stayline is'), fala:L('Este é o Stayline: a gestão dos pernoites de tripulação e dos hotéis que recebem cada uma. Em poucos minutos, vamos passar por cada tela e pelo que cada número quer dizer.','This is Stayline: managing crew layovers and the hotels that host them. In a few minutes, we will walk through each screen and what each number means.') },
    { tela:'operacao', alvo:'.op-bar', t:L('A barra de cima','The top bar'), fala:L('Na barra de cima ficam o período, a base, a busca e os contadores por situação. Os botões Dia e Hora mudam a escala da linha do tempo: por dia é o padrão, porque um pernoite dura de vinte e quatro a trinta e seis horas.','The top bar holds the period, the station, the search and the counters by status. The Day and Hour buttons change the timeline scale: day is the default, because a layover lasts twenty-four to thirty-six hours.') },
    { tela:'operacao', alvo:'.tlg-res', t:L('O resumo do período','The period summary'), fala:L('O resumo mostra, para cada noite, os voos da GOL e da Azul, os quartos contratados, os ocupados e os livres, em número e em porcentagem. Clicar numa linha filtra os hotéis embaixo; clicar num dia filtra só aquela noite.','The summary shows, for each night, GOL and Azul flights, contracted, occupied and free rooms, in numbers and percentages. Clicking a row filters the hotels below; clicking a day filters just that night.') },
    { tela:'operacao', alvo:'#op-bot', t:L('Os hotéis, noite a noite','Hotels, night by night'), fala:L('Cada linha é um hotel contratado. Em cada noite aparecem os quartos livres que o hotel informa e o total do contrato. Verde é folga, âmbar está apertando e vermelho está quase lotado. Clicar na célula abre a ficha do hotel.','Each row is a contracted hotel. Each night shows the free rooms the hotel reports and the contract total. Green means slack, amber is tightening and red is almost full. Clicking a cell opens the hotel card.') },
    { tela:'operacao', alvo:'#op-sec-top', t:L('O que falta alocar','What is left to allocate'), fala:L('Em cima ficam os pernoites ainda sem hotel, por base, com os urgentes primeiro: os que chegam nas próximas quarenta e oito horas. Para alocar, basta arrastar o pernoite até a linha do hotel. O botão Demonstração liga os pernoites simulados para mostrar esse fluxo.','At the top are layovers still without a hotel, by station, with the urgent ones first: those arriving in the next forty-eight hours. To allocate, just drag the layover onto the hotel row. The Demo button turns on simulated layovers to show this flow.') },
    { tela:'hoteis', alvo:'.ht-abas', antes:()=>{ S.htAba = 'contratados'; }, t:L('Contratos e cadastro geral','Contracts and full registry'), fala:L('Em Hotéis ficam os contratos reais: diária single e duplo na moeda do hotel, quartos por dia, quantas horas a diária cobre e o tempo de translado. A aba Cadastro geral traz todos os hotéis cadastrados, com categoria, rede e o risco de cada um.','Hotels holds the real contracts: single and double rate in the hotel currency, rooms per day, how many hours a rate covers and the transfer time. The Registry tab lists every registered hotel, with category, chain and risk.') },
    { tela:'antecipa', alvo:'.kpis', t:L('Antecipa: o negócio','Advance: the business'), fala:L('Antecipa é o coração do projeto. Hoje o hotel espera cerca de noventa dias depois do fechamento do mês para receber. Aqui oferecemos o pagamento à vista, com um desconto. Esse desconto é o nosso spread, além da comissão do contrato.','Advance is the heart of the project. Today a hotel waits about ninety days after month close to get paid. Here we offer payment upfront, at a discount. That discount is our spread, on top of the contract commission.') },
    { tela:'antecipa', alvo:'.ant-conta', t:L('Como a conta é feita','How the math works'), fala:L('A conta é simples: valor bruto menos a comissão do contrato dá o líquido ao hotel. Para receber hoje, o hotel paga a taxa de antecipação, que sobe com o prazo que falta, mais uma taxa fixa por pedido.','The math is simple: gross minus the contract commission gives the hotel net. To get paid today, the hotel pays the advance rate, which rises with the remaining lead time, plus a fixed fee per request.') },
    { tela:'antecipa', alvo:'.at-wrap', antes:()=>{ S.antVista = 'linha'; }, t:L('A história de cada hotel','Each hotel story'), fala:L('Na linha do tempo, cada hotel é uma linha e cada mês uma coluna: quanto ele tem a receber, quando, e quanto ganharíamos antecipando hoje. Clicar no hotel abre um recibo simulado; clicar na célula abre a antecipação daquela fatura.','In the timeline, each hotel is a row and each month a column: what it will receive, when, and what we would earn by advancing today. Clicking the hotel opens a simulated receipt; clicking a cell opens the advance for that invoice.') },
    { tela:'antecipa', alvo:'#ac-btn', t:L('Fale com a gente','Talk to us'), fala:L('Por fim, o balão no canto: mande uma ideia, uma dúvida ou um problema, com print marcado da tela. E o botão Entendemos certo traz as perguntas para confirmar que entendemos o fluxo. É assim que o Stayline amadurece.','Finally, the bubble in the corner: send an idea, a question or a problem, with a marked screenshot. And the Did we get it right button brings the questions to confirm we understood the flow. That is how Stayline matures.') },
  ];
}

function cenasAnalitico(dados){
  const hs = S.hoteis.filter(h=> h.ativo), bases = new Set(hs.map(h=>h.base)), cap = hs.reduce((a,h)=>a+h.quartos_dia,0);
  const porBase = {}; hs.forEach(h=>{ porBase[h.base] = (porBase[h.base]||0) + h.quartos_dia; });
  const topB = Object.entries(porBase).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const moedas = {}; hs.forEach(h=>{ moedas[h.moeda||'BRL'] = (moedas[h.moeda||'BRL']||0)+1; });
  const brl = hs.filter(h=> (h.moeda||'BRL')==='BRL' && h.tarifa), medBRL = brl.length ? brl.reduce((a,h)=>a+Number(h.tarifa),0)/brl.length : 0;
  const caros = brl.slice().sort((a,b)=>b.tarifa-a.tarifa).slice(0,6);
  const valorNoite = brl.reduce((a,h)=>a+h.quartos_dia*Number(h.tarifa),0);
  const ns = Array.from({length:7}, (_,i)=> X.somaDias(X.hojeISO(), i));
  const livre = (h,n)=>{ const d = S.disp[h.id+'|'+n]; return d ? d.quartos_livres : h.quartos_dia; };
  const ocup = ns.map(n=>{ const l = hs.reduce((a,h)=>a+livre(h,n),0); return { n, o:cap-l, l }; });
  const ocMed = ocup.reduce((a,x)=>a+x.o,0)/Math.max(1,ocup.length);
  const apert = hs.filter(h=> ns.some(n=> h.quartos_dia && livre(h,n)/h.quartos_dia < 0.2));
  const dur = {}; hs.forEach(h=>{ if(!h.duracao_h) return; const k = h.duracao_h+'h'; dur[k] = (dur[k]||0)+1; }); const durTop = (Object.entries(dur).sort((a,b)=>b[1]-a[1])[0]||['30h'])[0];
  const transl = hs.filter(h=>h.minutos_local!=null), trMed = transl.length ? transl.reduce((a,h)=>a+h.minutos_local,0)/transl.length : 0;
  const cad = dados.cad || [], cat = {}; cad.forEach(c=>{ if(c.categoria) cat[c.categoria] = (cat[c.categoria]||0)+1; });
  const bloq = cad.filter(c=>/bloq/i.test(c.risco||'')).length, rev = cad.filter(c=>/revis/i.test(c.risco||'')).length;
  return [
    { k:L('1 · A rede','1 · The network'), t:L(`${N(hs.length)} hotéis contratados em ${N(bases.size)} aeroportos.`,`${N(hs.length)} contracted hotels at ${N(bases.size)} airports.`), s:L('Contratos da GOL de outubro de 2026','GOL contracts, October 2026'),
      viz:{ tipo:'numeros', itens:[{ v:hs.length, l:L('hotéis','hotels'), cor:COR.a },{ v:bases.size, l:L('aeroportos','airports'), cor:COR.f },{ v:cap, l:L('quartos por noite','rooms per night'), cor:COR.b }] },
      fala:L(`A rede de hoje tem ${N(hs.length)} hotéis contratados, em ${N(bases.size)} aeroportos, somando ${N(cap)} quartos por noite. São os contratos reais da GOL de outubro de dois mil e vinte e seis.`,`Today's network has ${N(hs.length)} contracted hotels at ${N(bases.size)} airports, adding up to ${N(cap)} rooms per night. These are GOL's real contracts for October 2026.`) },
    { k:L('2 · Onde','2 · Where'), t:L(`As 8 maiores bases somam ${P(topB.reduce((a,x)=>a+x[1],0), cap)}% dos quartos.`,`The 8 largest stations hold ${P(topB.reduce((a,x)=>a+x[1],0), cap)}% of rooms.`), s:L('Quartos contratados por noite, por aeroporto','Contracted rooms per night, by airport'),
      viz:{ tipo:'barras', itens:topB.map(([b,v],i)=>({ l:b, v, cor:i<3?COR.a:COR.f })) },
      fala:L(`A capacidade é concentrada. ${topB.slice(0,3).map(x=>x[0]).join(', ')} lideram. As oito maiores bases somam ${P(topB.reduce((a,x)=>a+x[1],0), cap)} por cento dos quartos.`,`Capacity is concentrated. ${topB.slice(0,3).map(x=>x[0]).join(', ')} lead. The eight largest stations hold ${P(topB.reduce((a,x)=>a+x[1],0), cap)} percent of rooms.`) },
    { k:L('3 · Moeda','3 · Currency'), t:L(`${N(moedas.BRL||0)} hotéis em reais e ${N(hs.length-(moedas.BRL||0))} no exterior.`,`${N(moedas.BRL||0)} hotels in reais and ${N(hs.length-(moedas.BRL||0))} abroad.`), s:L('Moeda do contrato','Contract currency'),
      viz:{ tipo:'colunas', itens:Object.entries(moedas).sort((a,b)=>b[1]-a[1]).map(([m,v],i)=>({ l:m, v, cor:[COR.b,COR.a,COR.c][i]||COR.e })) },
      fala:L(`A maior parte da rede cobra em reais: ${N(moedas.BRL||0)} hotéis. Os outros ${N(hs.length-(moedas.BRL||0))} estão no exterior e cobram em dólar ou em euro. O sistema mostra cada diária na moeda do próprio hotel.`,`Most of the network charges in reais: ${N(moedas.BRL||0)} hotels. The other ${N(hs.length-(moedas.BRL||0))} are abroad and charge in dollars or euros. The system shows each rate in the hotel's own currency.`) },
    { k:L('4 · Diárias','4 · Rates'), t:L(`Diária single média de ${R(medBRL)} no Brasil.`,`Average single rate of ${R(medBRL)} in Brazil.`), s:L('As diárias mais altas da rede em reais','The highest rates in the network, in reais'),
      viz:{ tipo:'barras', fmt:'r', itens:caros.map(h=>({ l:h.base+' · '+h.nome.slice(0,26), v:Number(h.tarifa), cor:COR.c })) },
      fala:L(`A diária single média dos hotéis em reais é de ${RF(medBRL)}. As mais altas estão em ${caros.slice(0,3).map(h=>h.base).join(', ')}.`,`The average single rate of hotels in reais is ${RF(medBRL)}. The highest are at ${caros.slice(0,3).map(h=>h.base).join(', ')}.`) },
    { k:L('5 · Quanto a rede movimenta','5 · What the network moves'), t:L(`${RC(valorNoite)} por noite com a rede cheia.`,`${RC(valorNoite)} per night with the network full.`), s:L('Quartos contratados × diária single, só hotéis em reais','Contracted rooms × single rate, hotels in reais only'),
      viz:{ tipo:'numeros', fmt:'r', itens:[{ v:valorNoite, l:L('por noite','per night'), cor:COR.b },{ v:valorNoite*30, l:L('por mês','per month'), cor:COR.a },{ v:valorNoite*365, l:L('por ano','per year'), cor:COR.e }] },
      fala:L(`Se todos os quartos contratados em reais forem usados, a rede movimenta cerca de ${RF(valorNoite)} por noite, perto de ${RF(valorNoite*30)} por mês. É esse volume que passa pelo intermediário, e é sobre ele que a antecipação trabalha.`,`If every contracted room in reais is used, the network moves about ${RF(valorNoite)} per night, close to ${RF(valorNoite*30)} per month. That volume flows through the intermediary, and it is what advance payments work on.`) },
    { k:L('6 · Ocupação','6 · Occupancy'), t:L(`${P(ocMed, cap)}% dos quartos ocupados nos próximos 7 dias.`,`${P(ocMed, cap)}% of rooms occupied in the next 7 days.`), s:L('Ocupados = contratados − livres informados pelos hotéis (dados de exemplo da API)','Occupied = contracted − free rooms reported by hotels (sample API data)'),
      viz:{ tipo:'colunas', itens:ocup.map(x=>({ l:X.diaLocal(x.n,12).toLocaleDateString(loc(),{weekday:'short', day:'2-digit'}), v:x.o, cor:COR.a })) },
      fala:L(`Pelo que os hotéis informam, cerca de ${P(ocMed, cap)} por cento dos quartos estão ocupados nos próximos sete dias. Esses números ainda são de exemplo: quando a integração com cada hotel entrar, eles passam a ser em tempo real.`,`From what hotels report, about ${P(ocMed, cap)} percent of rooms are occupied in the next seven days. These numbers are still samples: once each hotel is integrated, they become real time.`) },
    { k:L('7 · Hotéis apertados','7 · Tight hotels'), t:L(`${N(apert.length)} hotéis com menos de 20% livres em alguma noite.`,`${N(apert.length)} hotels with under 20% free on some night.`), s:L('Onde a alocação pede atenção','Where allocation needs attention'),
      viz:{ tipo:'barras', itens:apert.slice(0,7).map(h=>({ l:h.base+' · '+h.nome.slice(0,26), v:Math.min(...ns.map(n=>livre(h,n))), cor:COR.d })), sufixo:L(' livres',' free') },
      fala:L(`${N(apert.length)} hotéis chegam a ter menos de vinte por cento dos quartos livres em alguma noite. São esses que o resumo marca como apertados, e onde vale ter um hotel secundário à mão.`,`${N(apert.length)} hotels drop below twenty percent free rooms on some night. Those are the ones the summary marks as tight, where a secondary hotel is worth having at hand.`) },
    { k:L('8 · O contrato','8 · The contract'), t:L(`A maioria das diárias cobre ${durTop.replace('h',' horas')}; translado médio de ${Math.round(trMed)} min.`,`Most rates cover ${durTop.replace('h',' hours')}; average transfer of ${Math.round(trMed)} min.`), s:L('Quantas horas uma diária cobre (Contract Rate Duration)','How many hours one rate covers (Contract Rate Duration)'),
      viz:{ tipo:'colunas', itens:Object.entries(dur).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([k,v])=>({ l:k, v, cor:COR.f })) },
      fala:L(`Na maior parte dos contratos, uma diária cobre trinta horas de estadia; alguns cobrem vinte e quatro ou vinte e seis. Passar desse tempo deve gerar uma segunda diária, um ponto a conferir no fechamento do mês. O translado médio até o aeroporto é de ${Math.round(trMed)} minutos.`,`In most contracts one rate covers thirty hours of stay; some cover twenty-four or twenty-six. Going beyond that should trigger a second rate, a point to check at month close. The average transfer to the airport is ${Math.round(trMed)} minutes.`) },
    { k:L('9 · Cadastro geral','9 · Hotel registry'), t:L(`${N(cad.length)} hotéis cadastrados; ${N(bloq)} para bloquear e ${N(rev)} para revisar.`,`${N(cad.length)} registered hotels; ${N(bloq)} to block and ${N(rev)} to review.`), s:L('Categoria dos hotéis do cadastro','Category of registry hotels'),
      viz:{ tipo:'colunas', itens:Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({ l:k, v, cor:[COR.a,COR.b,COR.c][i]||COR.e })) },
      fala:L(`Além dos contratos, o cadastro geral reúne ${N(cad.length)} hotéis, mesmo os sem negociação ativa. A maioria é de categoria intermediária. ${N(bloq)} está marcado para bloquear e ${N(rev)} para revisar antes de receber tripulação.`,`Beyond the contracts, the registry holds ${N(cad.length)} hotels, including those with no active deal. Most are mid scale. ${N(bloq)} is flagged to block and ${N(rev)} to review before hosting crews.`) },
    { fim:true, k:'', t:'Stayline', s:L('Rede real, ocupação de exemplo até a integração com os hotéis','Real network, sample occupancy until hotels are integrated'),
      viz:{ tipo:'numeros', itens:[{ v:hs.length, l:L('hotéis','hotels'), cor:COR.a },{ v:cap, l:L('quartos/noite','rooms/night'), cor:COR.b },{ v:cad.length, l:L('no cadastro','in registry'), cor:COR.f }] },
      fala:L('Resumindo: uma rede real e concentrada, com contratos claros e um cadastro amplo para crescer. O próximo passo é ligar a disponibilidade em tempo real de cada hotel. Stayline.','In short: a real, concentrated network, with clear contracts and a wide registry to grow. The next step is to connect each hotel live availability. Stayline.') },
  ];
}

function cenasPotencial(dados){
  const p = par(), fat = (dados.fat||[]).filter(f=> X.hotelPor(f.hotel_id));
  const liq = f=> Number(f.valor_bruto) * (1 - Number(f.comissao_pct)/100), com = f=> Number(f.valor_bruto) - liq(f);
  const taxaDe = d=> Math.min(p.max, Math.max(p.min, p.mes * d / 30));
  const meses = [...new Set(fat.map(f=>f.competencia))].sort();
  const porMes = meses.map(m=>{ const fs = fat.filter(f=>f.competencia===m), l = fs.reduce((a,f)=>a+liq(f),0);
    const spFech = l * taxaDe(p.prazo)/100 + p.fixa*fs.length;   // se todos antecipassem logo no fechamento (prazo cheio)
    return { m, n:fs.length, bruto:fs.reduce((a,f)=>a+Number(f.valor_bruto),0), l, c:fs.reduce((a,f)=>a+com(f),0), spFech }; });
  const aVencer = fat.filter(f=> f.status==='a_vencer' && diasAte(f.previsao) > 0);
  const elegiveis = aVencer.filter(f=> liq(f) >= p.valorMin);
  const lv = aVencer.reduce((a,f)=>a+liq(f),0), le = elegiveis.reduce((a,f)=>a+liq(f),0);
  const spHoje = elegiveis.reduce((a,f)=> a + liq(f)*taxaDe(diasAte(f.previsao))/100 + p.fixa, 0);
  const prazoMed = lv ? aVencer.reduce((a,f)=>a+diasAte(f.previsao)*liq(f),0)/lv : 0;
  const ult = porMes.slice(-3), mLiq = ult.reduce((a,x)=>a+x.l,0)/Math.max(1,ult.length), mSp = ult.reduce((a,x)=>a+x.spFech,0)/Math.max(1,ult.length), mCom = ult.reduce((a,x)=>a+x.c,0)/Math.max(1,ult.length);
  const porHotel = {}; elegiveis.forEach(f=>{ porHotel[f.hotel_id] = (porHotel[f.hotel_id]||0) + liq(f)*taxaDe(diasAte(f.previsao))/100 + p.fixa; });
  const topH = Object.entries(porHotel).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([id,v])=>({ h:X.hotelPor(id), v }));
  const exemplo = fat.some(f=>f.exemplo);
  const aviso = exemplo ? L(' · faturas de exemplo sobre os contratos reais',' · sample invoices on real contracts') : '';
  return [
    { k:L('1 · O problema','1 · The problem'), t:L(`O hotel espera ${N(p.prazo)} dias para receber.`,`The hotel waits ${N(p.prazo)} days to get paid.`), s:L('Do fechamento do mês até o pagamento','From month close to payment'),
      viz:{ tipo:'linha_prazo', dias:p.prazo },
      fala:L(`Hoje, o hotel hospeda a tripulação durante o mês, fecha a fatura e espera cerca de ${N(p.prazo)} dias para receber. Nesse intervalo, ele financia a companhia aérea com o próprio caixa.`,`Today, the hotel hosts crews during the month, closes the invoice and waits about ${N(p.prazo)} days to get paid. In that gap, it finances the airline with its own cash.`) },
    { k:L('2 · O volume','2 · The volume'), t:L(`${RC(mLiq)} líquidos por mês aos hotéis.`,`${RC(mLiq)} net per month to hotels.`), s:L('Líquido ao hotel por mês de competência','Hotel net by service month')+aviso,
      viz:{ tipo:'colunas', fmt:'c', itens:porMes.map(x=>({ l:fMes(x.m), v:x.l, cor:COR.a })) },
      fala:L(`Somando as faturas fechadas, os hotéis em reais têm a receber cerca de ${RF(mLiq)} por mês, já descontada a comissão do contrato.${exemplo?' As faturas ainda são de exemplo, montadas sobre os quartos e as diárias reais.':''}`,`Adding up closed invoices, hotels in reais are owed about ${RF(mLiq)} per month, net of the contract commission.${exemplo?' The invoices are still samples, built on real rooms and rates.':''}`) },
    { k:L('3 · O que já ganhamos','3 · What we already earn'), t:L(`${RC(mCom)} por mês de comissão do contrato.`,`${RC(mCom)} per month in contract commission.`), s:L('A comissão é o ganho de hoje, antecipando ou não','Commission is today\'s earning, advanced or not'),
      viz:{ tipo:'numeros', fmt:'r', itens:[{ v:mCom, l:L('comissão por mês','commission per month'), cor:COR.c },{ v:mCom*12, l:L('por ano','per year'), cor:COR.e }] },
      fala:L(`A comissão prevista no contrato já rende cerca de ${RF(mCom)} por mês. Esse é o ganho de hoje. A antecipação vem por cima dele.`,`The contract commission already yields about ${RF(mCom)} per month. That is today's earning. Advance payments come on top of it.`) },
    { k:L('4 · A conta','4 · The math'), t:L(`Taxa de ${p.mes}% ao mês pelo prazo, entre ${p.min}% e ${p.max}%, + R$ ${N(p.fixa)} por pedido.`,`${p.mes}% per month of lead time, between ${p.min}% and ${p.max}%, + R$ ${N(p.fixa)} per request.`), s:L('Exemplo: fatura de R$ 100 mil, antecipada no fechamento','Example: R$ 100k invoice, advanced at close'),
      viz:{ tipo:'cascata', itens:[{ l:L('Líquido','Net'), v:100000, cor:COR.a },{ l:L('Taxa','Rate'), v:-100000*taxaDe(p.prazo)/100, cor:COR.d },{ l:L('Fixa','Fixed'), v:-p.fixa, cor:COR.c }], total:L('Hotel recebe hoje','Hotel gets today') },
      fala:L(`A conta é a mesma do Smart Escala. Uma fatura de cem mil reais, antecipada logo no fechamento, com ${N(p.prazo)} dias pela frente, paga ${taxaDe(p.prazo)} por cento de taxa mais ${N(p.fixa)} reais fixos. O hotel recebe na hora, e a diferença é o nosso spread.`,`The math is the same as Smart Escala. A one hundred thousand reais invoice, advanced right at close with ${N(p.prazo)} days ahead, pays ${taxaDe(p.prazo)} percent plus ${N(p.fixa)} reais fixed. The hotel is paid immediately, and the difference is our spread.`) },
    { k:L('5 · Se antecipar tudo hoje','5 · If everything were advanced today'), t:L(`${RC(spHoje)} de spread com ${N(elegiveis.length)} faturas.`,`${RC(spHoje)} of spread from ${N(elegiveis.length)} invoices.`), s:L(`A vencer hoje: ${RC(lv)} · prazo médio de ${Math.round(prazoMed)} dias`,`Due now: ${RC(lv)} · average lead time of ${Math.round(prazoMed)} days`),
      viz:{ tipo:'numeros', fmt:'r', itens:[{ v:lv, l:L('a pagar aos hotéis','owed to hotels'), cor:COR.a },{ v:spHoje, l:L('nosso spread hoje','our spread today'), cor:COR.b },{ v:le-spHoje, l:L('hotéis recebem hoje','hotels receive today'), cor:COR.f }] },
      fala:L(`Olhando só o que está a vencer agora, são ${RF(lv)} a pagar aos hotéis, com prazo médio de ${Math.round(prazoMed)} dias. Se todas as ${N(elegiveis.length)} faturas elegíveis fossem antecipadas hoje, o spread seria de ${RF(spHoje)}, ${P(spHoje, le)} por cento do líquido.`,`Looking only at what is due now, ${RF(lv)} is owed to hotels, with an average lead time of ${Math.round(prazoMed)} days. If all ${N(elegiveis.length)} eligible invoices were advanced today, the spread would be ${RF(spHoje)}, ${P(spHoje, le)} percent of net.`) },
    { k:L('6 · Por mês','6 · Per month'), t:L(`Até ${RC(mSp)} de spread por mês antecipando no fechamento.`,`Up to ${RC(mSp)} of spread per month advancing at close.`), s:L('Spread se todos os hotéis antecipassem cada mês logo no fechamento','Spread if every hotel advanced each month right at close')+aviso,
      viz:{ tipo:'colunas', fmt:'c', itens:porMes.map(x=>({ l:fMes(x.m), v:x.spFech, cor:COR.b })) },
      fala:L(`Mês a mês: se cada hotel antecipasse a fatura logo no fechamento, o spread chegaria a cerca de ${RF(mSp)} por mês. É o teto do potencial, com cem por cento de adesão.`,`Month by month: if each hotel advanced its invoice right at close, the spread would reach about ${RF(mSp)} per month. That is the ceiling, with one hundred percent uptake.`) },
    { k:L('7 · Cenários de adesão','7 · Uptake scenarios'), t:L(`Com metade dos hotéis: ${RC(mSp*0.5*12)} por ano.`,`With half the hotels: ${RC(mSp*0.5*12)} per year.`), s:L('Spread por ano conforme a parte dos hotéis que antecipa','Spread per year by share of hotels that advance'),
      viz:{ tipo:'colunas', fmt:'c', itens:[0.25,0.5,0.75,1].map((a,i)=>({ l:Math.round(a*100)+'%', v:mSp*a*12, cor:[COR.f,COR.b,COR.a,COR.e][i] })) },
      fala:L(`Nem todo hotel vai antecipar. Com um quarto dos hotéis, o spread anual fica perto de ${RF(mSp*0.25*12)}. Com metade, cerca de ${RF(mSp*0.5*12)}. Com todos, ${RF(mSp*12)} por ano, além da comissão.`,`Not every hotel will advance. With a quarter of hotels, the yearly spread is close to ${RF(mSp*0.25*12)}. With half, about ${RF(mSp*0.5*12)}. With all of them, ${RF(mSp*12)} per year, on top of the commission.`) },
    { k:L('8 · Onde começar','8 · Where to start'), t:L('Os hotéis com maior potencial hoje.','The hotels with the most potential today.'), s:L('Spread se antecipar hoje as faturas a vencer','Spread if today\'s due invoices were advanced'),
      viz:{ tipo:'barras', fmt:'r', itens:topH.map(x=>({ l:x.h.base+' · '+x.h.nome.slice(0,26), v:x.v, cor:COR.b })) },
      fala:L(`Para começar, os hotéis com maior potencial: ${topH.slice(0,3).map(x=>x.h.nome).join(', ')}. São os primeiros a receber a oferta.`,`To start, the hotels with the most potential: ${topH.slice(0,3).map(x=>x.h.nome).join(', ')}. They are the first to get the offer.`) },
    { k:L('9 · O fluxo','9 · The flow'), t:L('A vencer → ofertada → aceita → paga.','Due → offered → accepted → paid.'), s:L('Cada passo fica registrado no Stayline','Each step is recorded in Stayline'),
      viz:{ tipo:'funil', itens:[{ l:L('A vencer','Due'), v:aVencer.length, cor:COR.a },{ l:L('Elegíveis','Eligible'), v:elegiveis.length, cor:COR.f },{ l:L('Ofertadas','Offered'), v:Math.round(elegiveis.length*0.6), cor:COR.c },{ l:L('Aceitas','Accepted'), v:Math.round(elegiveis.length*0.35), cor:COR.b }] },
      fala:L('O fluxo é o mesmo do Smart Escala. A fatura a vencer recebe uma oferta, o hotel aceita ou recusa, e o pagamento é registrado com a referência do PIX ou da TED. Uma exceção de taxa sempre pede o motivo. As etapas de oferta e aceite deste gráfico são ilustrativas.','The flow is the same as Smart Escala. A due invoice gets an offer, the hotel accepts or declines, and payment is recorded with the PIX or wire reference. A rate exception always requires a reason. The offer and acceptance steps in this chart are illustrative.') },
    { fim:true, k:'', t:L('Antecipa · Stayline','Advance · Stayline'), s:L('O hotel recebe na hora; nós ganhamos o spread','The hotel gets paid now; we earn the spread'),
      viz:{ tipo:'numeros', fmt:'r', itens:[{ v:mLiq, l:L('líquido por mês','net per month'), cor:COR.a },{ v:mSp, l:L('spread potencial por mês','potential spread per month'), cor:COR.b },{ v:mSp*0.5*12, l:L('por ano com 50%','per year at 50%'), cor:COR.e }] },
      fala:L(`Resumindo: os hotéis esperam ${N(p.prazo)} dias por um volume de ${RF(mLiq)} por mês. Oferecer o pagamento à vista resolve o caixa deles e abre um spread de até ${RF(mSp)} por mês para nós. Esse é o grande projeto do Stayline.`,`In short: hotels wait ${N(p.prazo)} days for a volume of ${RF(mLiq)} per month. Offering upfront payment solves their cash and opens a spread of up to ${RF(mSp)} per month for us. That is Stayline's big project.`) },
  ];
}

/* ---------- voz ---------- */
const AUD = { on:true, fala:null };
function vozes(){ try{ const pre = S.lang==='en' ? /^en/i : /^pt/i; return (speechSynthesis.getVoices()||[]).filter(v=>pre.test(v.lang)); }catch(e){ return []; } }
function nota(v){ const n = v.name||''; let s = 0; if(/natural|neural/i.test(n)) s += 60; if(/online/i.test(n)) s += 25; if(/google/i.test(n)) s += 15; if(S.lang!=='en' && /pt[-_]BR/i.test(v.lang)) s += 8; if(S.lang==='en' && /en[-_]US/i.test(v.lang)) s += 8; if(/desktop/i.test(n)) s -= 20; return s; }
function parar(){ if(AUD.fala) AUD.fala.cancel = true; try{ speechSynthesis.cancel(); }catch(e){} }
function falar(texto, fim){
  if(!AUD.on || !('speechSynthesis' in window)) return null;
  try{ parar(); const partes = []; String(texto||'').replace(/\s+/g,' ').trim().split(/(?<=[.!?:;])\s+/).filter(Boolean).forEach(fr=>{ if(fr.length<=95){ partes.push(fr); return; } let cur = ''; fr.split(/(?<=,)\s+/).forEach(pc=>{ if(cur && (cur+' '+pc).length>95){ partes.push(cur); cur = pc; } else cur = cur ? cur+' '+pc : pc; }); if(cur) partes.push(cur); });
    const v = vozes().sort((a,b)=>nota(b)-nota(a))[0], tok = { cancel:false }; AUD.fala = tok; let i = 0;
    const prox = ()=>{ if(tok.cancel) return; if(i>=partes.length){ if(fim) fim(); return; } const f = partes[i++], u = new SpeechSynthesisUtterance(f); u.lang = S.lang==='en' ? 'en-US' : 'pt-BR'; if(v) u.voice = v; u.rate = 0.97; u.pitch = /\?$/.test(f) ? 1.06 : 1;
      u.onend = ()=>setTimeout(prox, /[.!?]$/.test(f) ? 380 : 160); u.onerror = ()=>setTimeout(prox, 120); speechSynthesis.speak(u); };
    prox(); return tok; }catch(e){ return null; }
}

/* ---------- gráficos (HTML, animados com transição) ---------- */
function fmt(v, f){ return f==='r' ? R(v) : f==='c' ? RC(v) : N(v); }
function viz(sp){
  if(!sp) return '';
  if(sp.tipo==='numeros') return `<div class="vz-num">${sp.itens.map(q=>`<div style="--c:${q.cor}"><b data-cnt="${q.v}" data-fmt="${sp.fmt||''}">0</b><span>${esc(q.l)}</span></div>`).join('')}</div>`;
  if(sp.tipo==='barras'){ const mx = Math.max(1, ...sp.itens.map(q=>Math.abs(q.v)));
    return `<div class="vz-bar">${sp.itens.map(q=>`<div class="r"><span class="l">${esc(q.l)}</span><span class="t"><i style="--w:${Math.abs(q.v)/mx*100}%;background:${q.cor}"></i></span><b>${fmt(q.v, sp.fmt)}${sp.sufixo?esc(sp.sufixo):''}</b></div>`).join('')}</div>`; }
  if(sp.tipo==='colunas'){ const mx = Math.max(1, ...sp.itens.map(q=>q.v));
    return `<div class="vz-col">${sp.itens.map(q=>`<div class="c"><b>${fmt(q.v, sp.fmt)}</b><span class="t"><i style="--h:${q.v/mx*100}%;background:${q.cor}"></i></span><span class="l">${esc(q.l)}</span></div>`).join('')}</div>`; }
  if(sp.tipo==='funil'){ const mx = Math.max(1, sp.itens[0].v);
    return `<div class="vz-fun">${sp.itens.map(q=>`<div class="f"><span class="l">${esc(q.l)}</span><i style="--w:${Math.max(8,q.v/mx*100)}%;background:${q.cor}"><b>${N(q.v)}</b></i></div>`).join('')}</div>`; }
  if(sp.tipo==='cascata'){ let acc = 0; const tot = sp.itens.reduce((a,q)=>a+q.v,0), mx = Math.max(...sp.itens.map(q=>Math.abs(q.v)), tot);
    const cols = sp.itens.map(q=>{ const ini = q.v>=0 ? acc : acc+q.v; acc += q.v; return `<div class="c"><b>${R(q.v)}</b><span class="t"><i style="--h:${Math.max(1.5,Math.abs(q.v)/mx*100)}%;--b:${ini/mx*100}%;background:${q.cor}"></i></span><span class="l">${esc(q.l)}</span></div>`; }).join('');
    return `<div class="vz-col cas">${cols}<div class="c"><b>${R(tot)}</b><span class="t"><i style="--h:${tot/mx*100}%;background:${COR.b}"></i></span><span class="l">${esc(sp.total)}</span></div></div>`; }
  if(sp.tipo==='linha_prazo') return `<div class="vz-prazo"><div class="pz"><span>${esc(L('Mês de hospedagem','Service month'))}</span><span>${esc(L('Fechamento','Close'))}</span><span>${esc(L('Hotel recebe','Hotel paid'))}</span></div><div class="pz-bar"><i class="a"></i><i class="b"><b>${sp.dias} ${esc(L('dias esperando','days waiting'))}</b></i></div><div class="pz-hoje">${esc(L('Com o Antecipa: recebe no fechamento','With Advance: paid at close'))} ✓</div></div>`;
  return '';
}
function animar(host){
  requestAnimationFrame(()=> requestAnimationFrame(()=> host.classList.add('vai')));
  host.querySelectorAll('[data-cnt]').forEach(el=>{ const alvo = +el.dataset.cnt, f = el.dataset.fmt, t0 = performance.now(), dur = 1400;
    const passo = now=>{ const p = Math.min(1, (now-t0)/dur), e = 1-Math.pow(1-p,3); el.textContent = fmt(alvo*e, f); if(p<1 && document.body.contains(el)) requestAnimationFrame(passo); }; requestAnimationFrame(passo); });
}

/* ---------- player ---------- */
let V = null;
async function tocar(tipo){
  fecharMenu();
  const ov = document.createElement('div'); ov.id = 'vid'; ov.className = 'vid'; ov.innerHTML = `<div class="vid-load">${esc(t('gen.carregando'))}</div>`; document.body.appendChild(ov);
  let cenas;
  if(tipo==='como') cenas = cenasComoFunciona();
  else if(tipo==='analitico') cenas = cenasAnalitico({ cad: await carregarCadastro() });
  else cenas = cenasPotencial({ fat: await carregarFaturas() });
  const tela = tipo==='como';
  ov.className = 'vid' + (tela ? ' tela' : '');
  ov.innerHTML = `${tela?'<div class="vid-luz" id="vid-luz"></div>':''}<div class="vid-palco" id="vid-palco"></div>
    <div class="vid-ctl"><button type="button" id="vid-ant" title="←">◀</button><button type="button" id="vid-pp" title="${esc(t('vid.pausar'))}">⏸</button><button type="button" id="vid-prx" title="→">▶</button><button type="button" id="vid-voz">${esc(t('vid.voz'))}</button>${tela?'':'<button type="button" id="vid-fs" title="⛶">⛶</button>'}<button type="button" id="vid-x" title="Esc">✕</button></div><div class="vid-bar"><i id="vid-bar"></i></div>`;
  V = { cenas, i:-1, pausa:false, timer:null, vivo:true, tela, ov };
  const teclas = e=>{ if(!V) return; if(e.key==='Escape') sair(); else if(e.key==='ArrowRight') ir(V.i+1); else if(e.key==='ArrowLeft') ir(V.i-1); else if(e.key===' '){ e.preventDefault(); pausa(); } };
  const sair = ()=>{ if(!V) return; V.vivo = false; clearTimeout(V.timer); parar(); document.removeEventListener('keydown', teclas); window.removeEventListener('resize', reluz); ov.remove(); if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); V = null; };
  const pausa = ()=>{ V.pausa = !V.pausa; ov.querySelector('#vid-pp').textContent = V.pausa ? '▶︎' : '⏸'; if(V.pausa){ clearTimeout(V.timer); try{ speechSynthesis.pause(); }catch(e){} } else { try{ speechSynthesis.resume(); }catch(e){} if(!AUD.on) V.timer = setTimeout(()=>ir(V.i+1), 4000); } };
  const reluz = ()=>{ if(!V || !V.tela) return; const c = V.cenas[V.i], el = c && document.querySelector(c.alvo), luz = ov.querySelector('#vid-luz'); if(!luz) return;
    if(!el){ luz.style.cssText = 'opacity:0'; return; } const r = el.getBoundingClientRect(), m = 6; luz.style.cssText = `left:${r.left-m}px;top:${r.top-m}px;width:${r.width+m*2}px;height:${Math.min(r.height, innerHeight-r.top-120)+m*2}px;opacity:1`; };
  const ir = async i=>{
    if(!V || !V.vivo) return; if(i>=V.cenas.length){ sair(); return; } i = Math.max(0, i); V.i = i; clearTimeout(V.timer); parar();
    const c = V.cenas[i], palco = ov.querySelector('#vid-palco');
    if(V.tela){ if(c.antes) c.antes(); if(S.view !== c.tela) X.irPara(c.tela); else X.render(); await new Promise(r=>setTimeout(r, 450)); const el = document.querySelector(c.alvo); if(el) el.scrollIntoView({ block:'center', behavior:'auto' }); setTimeout(reluz, 60);
      palco.innerHTML = `<div class="vid-card"><i>${i+1} / ${V.cenas.length}</i><b>${esc(c.t)}</b><p>${esc(c.fala)}</p></div>`; }
    else { palco.className = 'vid-palco'; palco.innerHTML = `<div class="vid-cap">${c.k?`<i>${esc(c.k)}</i>`:''}<b>${esc(c.t)}</b><span>${esc(c.s||'')}</span></div><div class="vid-viz">${viz(c.viz)}</div><div class="vid-fala">${esc(c.fala)}</div>`;
      animar(palco.querySelector('.vid-viz')); ov.classList.toggle('fim', !!c.fim); }
    ov.querySelector('#vid-bar').style.width = ((i+1)/V.cenas.length*100)+'%';
    let foi = false; const avancar = ()=>{ if(foi || !V || V.pausa) return; foi = true; V.timer = setTimeout(()=>{ if(V && !V.pausa) ir(i+1); }, 900); };
    const tok = falar(c.fala, avancar); V.timer = setTimeout(avancar, tok ? Math.max(9000, c.fala.length*85) + 5000 : Math.max(7000, c.fala.length*55));
  };
  ov.querySelector('#vid-x').onclick = sair; ov.querySelector('#vid-pp').onclick = pausa;
  ov.querySelector('#vid-ant').onclick = ()=> ir(V.i-1); ov.querySelector('#vid-prx').onclick = ()=> ir(V.i+1);
  ov.querySelector('#vid-voz').onclick = e=>{ AUD.on = !AUD.on; e.target.textContent = AUD.on ? t('vid.voz') : t('vid.sem_voz'); if(!AUD.on) parar(); ir(V.i); };
  const fs = ov.querySelector('#vid-fs'); if(fs) fs.onclick = ()=>{ if(document.fullscreenElement) document.exitFullscreen(); else ov.requestFullscreen && ov.requestFullscreen().catch(()=>{}); };
  document.addEventListener('keydown', teclas); window.addEventListener('resize', reluz);
  if(!tela){ try{ if(ov.requestFullscreen) await ov.requestFullscreen(); }catch(e){} }
  try{ speechSynthesis.getVoices(); }catch(e){}
  setTimeout(()=> ir(0), 350);
}

/* ---------- menu de vídeos ---------- */
function fecharMenu(){ const m = document.getElementById('vid-menu'); if(m) m.remove(); }
function abrirMenu(ancora){
  fecharMenu(); const r = ancora.getBoundingClientRect(), m = document.createElement('div'); m.id = 'vid-menu'; m.className = 'card vid-menu';
  m.innerHTML = [['como','vid.como','vid.como_d'],['analitico','vid.analitico','vid.analitico_d'],['potencial','vid.potencial','vid.potencial_d']].map(([k,a,b])=>`<button type="button" data-vid="${k}"><b>▶ ${esc(t(a))}</b><span>${esc(t(b))}</span></button>`).join('');
  m.style.top = (r.bottom + 6) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - 340, r.left)) + 'px'; document.body.appendChild(m);
  m.querySelectorAll('[data-vid]').forEach(b=> b.onclick = ()=> tocar(b.dataset.vid));
  setTimeout(()=> document.addEventListener('pointerdown', function fora(e){ if(!m.contains(e.target)){ fecharMenu(); document.removeEventListener('pointerdown', fora); } }), 0);
}
window.SL_video = tocar;
function botao(){
  if(document.getElementById('btn-vid')) return; const tour = document.getElementById('btn-tour'); if(!tour) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn'; b.id = 'btn-vid'; b.title = t('vid.botao'); b.setAttribute('aria-label', t('vid.botao'));
  b.innerHTML = `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg><span>${esc(t('vid.botao'))}</span>`;
  tour.parentNode.insertBefore(b, tour); b.onclick = ()=> abrirMenu(b);
}
window.addEventListener('sl-entrou', botao);
window.addEventListener('sl-idioma', ()=>{ const b = document.getElementById('btn-vid'); if(b){ b.querySelector('span').textContent = t('vid.botao'); b.title = t('vid.botao'); } });
setTimeout(botao, 1500);

const css = document.createElement('style'); css.textContent = `
  .vid-menu{position:fixed;z-index:700;display:grid;padding:6px;width:330px}
  .vid-menu button{border:0;background:transparent;text-align:left;padding:9px 10px;border-radius:8px;display:grid;gap:2px} .vid-menu button:hover{background:var(--gray-soft)}
  .vid-menu b{font-size:13.5px} .vid-menu span{font-size:12px;color:var(--ink-3)}
  .vid{position:fixed;inset:0;z-index:900;background:radial-gradient(1100px 600px at 20% -10%, #17306b 0%, transparent 60%), #071226;color:#e8eefb;display:flex;flex-direction:column}
  .vid.tela{background:transparent;pointer-events:none} .vid.tela .vid-ctl,.vid.tela .vid-card{pointer-events:auto}
  .vid-load{margin:auto;font-size:15px;color:#9fb0cc}
  .vid-luz{position:fixed;border-radius:12px;box-shadow:0 0 0 9999px rgba(4,10,24,.58);outline:2px solid #f2a33a;transition:all .45s ease;pointer-events:none}
  .vid-card{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);width:min(760px,calc(100% - 32px));background:#0b1733;color:#e8eefb;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:14px 18px;display:grid;gap:4px;box-shadow:0 18px 50px rgba(0,0,0,.45)}
  .vid-card i{font-style:normal;color:#f2a33a;font-size:12px;font-weight:700} .vid-card b{font-size:17px} .vid-card p{margin:0;color:#c7d3ea;font-size:14px;line-height:1.5}
  .vid-palco{flex:1;display:grid;grid-template-rows:auto 1fr auto;gap:18px;padding:48px 7vw 92px;min-height:0}
  .vid-cap{display:grid;gap:6px} .vid-cap i{font-style:normal;color:#f2a33a;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:13px}
  .vid-cap b{font-size:clamp(24px,3.4vw,44px);line-height:1.15;letter-spacing:-.015em} .vid-cap span{color:#9fb0cc;font-size:15px}
  .vid-viz{min-height:0;display:flex;align-items:center;justify-content:center}
  .vid-fala{color:#c7d3ea;font-size:15px;line-height:1.55;max-width:1100px}
  .vid.fim .vid-cap{text-align:center} .vid.fim .vid-cap b{font-size:clamp(34px,5vw,64px)}
  .vid-ctl{position:fixed;right:18px;bottom:16px;display:flex;gap:6px;z-index:2}
  .vid-ctl button{border:1px solid rgba(255,255,255,.18);background:rgba(11,23,51,.85);color:#e8eefb;border-radius:8px;padding:6px 11px;font-size:13px;cursor:pointer}
  .vid-bar{position:fixed;left:0;right:0;bottom:0;height:4px;background:rgba(255,255,255,.08)} .vid-bar i{display:block;height:100%;background:#f2a33a;transition:width .6s}
  .vz-num{display:flex;gap:22px;flex-wrap:wrap;justify-content:center;width:100%}
  .vz-num > div{flex:1 1 220px;max-width:340px;background:rgba(255,255,255,.04);border:1.5px solid var(--c);border-radius:18px;padding:26px 20px;display:grid;gap:6px;text-align:center;opacity:0;transform:translateY(16px);transition:all .7s}
  .vz-num b{font-size:clamp(28px,3.6vw,50px);font-weight:700;color:#fff;font-variant-numeric:tabular-nums} .vz-num span{color:#9fb0cc;font-size:15px}
  .vai .vz-num > div{opacity:1;transform:none} .vai .vz-num > div:nth-child(2){transition-delay:.15s} .vai .vz-num > div:nth-child(3){transition-delay:.3s}
  .vz-bar{width:100%;max-width:1100px;display:grid;gap:10px}
  .vz-bar .r{display:grid;grid-template-columns:minmax(120px,300px) 1fr 140px;gap:14px;align-items:center}
  .vz-bar .l{text-align:right;color:#c7d3ea;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .vz-bar b{font-size:15px;color:#fff}
  .vz-bar .t{height:24px;background:rgba(255,255,255,.06);border-radius:12px;overflow:hidden} .vz-bar .t i{display:block;height:100%;width:0;border-radius:12px;transition:width 1.3s cubic-bezier(.2,.8,.2,1)}
  .vai .vz-bar .t i{width:var(--w)}
  .vz-col{width:100%;max-width:1100px;height:min(46vh,420px);display:flex;gap:16px;align-items:stretch}
  .vz-col .c{flex:1;display:grid;grid-template-rows:auto 1fr auto;gap:6px;text-align:center;min-width:0}
  .vz-col .c b{font-size:14px;color:#fff;white-space:nowrap} .vz-col .c .l{color:#9fb0cc;font-size:13px;text-transform:capitalize}
  .vz-col .t{position:relative;background:rgba(255,255,255,.04);border-radius:10px} .vz-col .t i{position:absolute;left:12%;right:12%;bottom:var(--b,0);height:0;border-radius:8px;transition:height 1.2s cubic-bezier(.2,.8,.2,1)}
  .vai .vz-col .t i{height:var(--h)}
  .vz-fun{width:100%;max-width:900px;display:grid;gap:12px}
  .vz-fun .f{display:grid;grid-template-columns:160px 1fr;gap:14px;align-items:center} .vz-fun .l{text-align:right;color:#c7d3ea}
  .vz-fun i{display:flex;align-items:center;justify-content:center;height:46px;border-radius:12px;width:0;margin:0 auto;transition:width 1.2s;color:#071226} .vz-fun i b{font-size:18px}
  .vai .vz-fun i{width:var(--w)}
  .vz-prazo{width:100%;max-width:1000px;display:grid;gap:14px} .pz{display:grid;grid-template-columns:1fr 1fr 1fr;color:#9fb0cc;font-size:14px} .pz span:nth-child(2){text-align:center} .pz span:nth-child(3){text-align:right}
  .pz-bar{display:grid;grid-template-columns:1fr 2fr;height:46px;gap:4px} .pz-bar i{border-radius:12px;transform-origin:left;transform:scaleX(0);transition:transform 1.4s} .pz-bar .a{background:#4f7cff} .pz-bar .b{background:#e5534b;display:flex;align-items:center;justify-content:center;transition-delay:.5s} .pz-bar b{color:#fff}
  .vai .pz-bar i{transform:none} .pz-hoje{color:#2fbf8f;font-weight:700;font-size:16px;opacity:0;transition:opacity .8s 1.8s} .vai .pz-hoje{opacity:1}
  @media (max-width:760px){ .vid-palco{padding:28px 18px 92px} .vz-bar .r{grid-template-columns:110px 1fr 90px} .vz-col{gap:6px} }`;
document.head.appendChild(css);
})();
