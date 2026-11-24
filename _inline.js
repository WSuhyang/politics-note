
const DATA = DB.graph;
const GLOSSARY = DB.glossary;
const SRC_WIKI = "위키백과 · 2026-10 수집";

// ===== 탭 (주소 hash 연동: #people #pol … 북마크·공유 링크·뒤로가기) =====
const TABS=['rel','guide','people','pol','prom','gloss'];
function showTab(t,scrollTop){
  if(!TABS.includes(t)) t='rel';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.id==='tab-'+t));
  document.getElementById('page-'+t).classList.add('active');
  if(location.hash!=='#'+t) history.replaceState(null,'','#'+t);
  if(scrollTop) window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>showTab(b.id.replace('tab-',''),true)));

// 헤더 높이 → nav sticky 기준 (헤더가 줄바꿈돼도 nav가 딱 붙게)
const setHdrH=()=>document.documentElement.style.setProperty('--hdr-h',document.querySelector('header').offsetHeight+'px');
setHdrH(); addEventListener('resize',setHdrH);

// 데이터 기준일 표시 (build.js가 data/*.json 기준으로 기록)
{
  const fmt=s=>(s||'').replace(/-/g,'.');
  const el=document.getElementById('data-date');
  el.textContent='데이터 기준 '+(fmt((DB.meta||{}).builtAt)||'—')+(DB.newsCollected?' · 뉴스 '+fmt(DB.newsCollected):'');
  el.title='인물·정책·공약 데이터는 위키백과 기반, 뉴스는 관련 보도 수집분';
}

// ===== 심층 이동 (전역 검색·가이드 칩 공용): 탭 전환 + 해당 항목으로 스크롤/하이라이트 =====
function goDeep(kind,d){
  d=d||{};
  if(kind==='person'&&d.person){
    const n=DATA.nodes.find(x=>x.id===d.person); if(!n) return;
    showTab('rel',true);
    const si=document.getElementById('search'),cf=document.getElementById('camp-filter'),rf=document.getElementById('role-filter');
    si.value=''; cf.value='all'; rf.value='all'; applyNodeFilters();
    openNote(n);
    const sim=nodes.find(x=>x.id===n.id);
    if(sim&&sim.x!=null){const sc=document.getElementById('graph-scroll');sc.scrollTo({left:Math.max(0,sim.x-240),behavior:'smooth'});}
    return;
  }
  if(kind==='rel'&&d.camp){ showTab('rel',true); document.getElementById('camp-filter').value=d.camp; applyNodeFilters(); return; }
  if(kind==='policy'&&d.policy){ showTab('pol',true); const i=document.getElementById('pol-search'); i.value=d.policy; i.dispatchEvent(new Event('input')); return; }
  if(kind==='term'&&d.term){ showTab('gloss',true); const i=document.getElementById('gloss-search'); i.value=d.term; i.dispatchEvent(new Event('input')); return; }
  if(kind==='pledge'&&d.politician){
    showTab('prom',true); renderPledges('all');
    requestAnimationFrame(()=>{ const c=document.querySelector('#pol-grid .pol-card[data-politician="'+d.politician+'"]');
      if(c){ c.scrollIntoView({behavior:'smooth',block:'start'}); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); } });
    return;
  }
  showTab(kind,true);
}
document.getElementById('page-guide').addEventListener('click',e=>{ const b=e.target.closest('[data-goto]'); if(b) goDeep(b.dataset.goto,b.dataset); });

// ===== 전역 검색 (인물 · 정책 · 공약 · 용어) =====
const gsInput=document.getElementById('gsearch'), gsDrop=document.getElementById('gsearch-drop');
const KIND_LABEL={person:'인물',policy:'정책',pledge:'공약',term:'용어'};
let GIDX=null, gsTimer=null, gsSel=-1;
function buildIndex(){
  GIDX=[];
  DATA.nodes.forEach(n=>GIDX.push({k:'person',label:n.id,sub:[n.president||n.role||'',n.party].filter(Boolean).join(' · '),hay:(n.id+' '+(n.party||'')+' '+(n.edu||'')+' '+(n.president||'')+' '+(n.role||'')+' '+(n.event||'')).toLowerCase(),go:{person:n.id}}));
  (DB.policies||[]).forEach(p=>GIDX.push({k:'policy',label:p.title,sub:'정책 · '+p.cat+' · '+p.politicians.join(', '),hay:(p.title+' '+p.summary+' '+p.cat+' '+p.politicians.join(' ')).toLowerCase(),go:{policy:p.title}}));
  GLOSSARY.forEach(g=>GIDX.push({k:'term',label:g.t,sub:'용어 · '+g.cat,hay:(g.t+' '+g.d+' '+g.cat).toLowerCase(),go:{term:g.t}}));
  PLEDGES.forEach(p=>(p.items||[]).forEach(it=>GIDX.push({k:'pledge',label:it.title,sub:'공약 · '+p.politician+' · '+p.meta,hay:(it.title+' '+p.politician+' '+(it.note||'')).toLowerCase(),go:{politician:p.politician}})));
}
function gsHide(){ gsDrop.classList.remove('open'); gsSel=-1; }
function gsRender(q){
  if(!GIDX) buildIndex();
  const ql=q.toLowerCase();
  const score=r=>{const l=r.label.toLowerCase();return l.startsWith(ql)?3:(l.includes(ql)?2:1);};
  const KO={person:0,policy:1,pledge:2,term:3};
  const hits=GIDX.filter(r=>r.hay.includes(ql)).map(r=>[score(r),r]).sort((a,b)=>KO[a[1].k]-KO[b[1].k]||b[0]-a[0]||a[1].label.localeCompare(b[1].label,'ko')).slice(0,14);
  if(!hits.length){ gsDrop.innerHTML='<div class="gs-empty">일치하는 항목이 없습니다</div>'; }
  else{
    const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const hl=s=>{const i=s.toLowerCase().indexOf(ql); return i<0?esc(s):esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+q.length))+'</mark>'+esc(s.slice(i+q.length));};
    let html='',lastK=null;
    hits.forEach(([_,r])=>{
      if(r.k!==lastK){ html+='<div class="gs-group">'+KIND_LABEL[r.k]+'</div>'; lastK=r.k; }
      const go=Object.entries(r.go).map(([k,v])=>'data-'+k+'="'+esc(v)+'"').join(' ');
      html+='<div class="gs-item" role="option" data-goto="'+r.k+'" '+go+'><span class="lb"><b>'+hl(r.label)+'</b></span><span class="sub">'+esc(r.sub)+'</span></div>';
    });
    gsDrop.innerHTML=html;
  }
  gsDrop.classList.add('open'); gsSel=-1;
}
gsInput.addEventListener('input',()=>{ clearTimeout(gsTimer); const q=gsInput.value.trim(); gsTimer=setTimeout(()=>q.length<1?gsHide():gsRender(q),120); });
gsInput.addEventListener('focus',()=>{ if(gsInput.value.trim().length>=1) gsRender(gsInput.value.trim()); });
gsInput.addEventListener('keydown',e=>{
  const items=[...gsDrop.querySelectorAll('.gs-item')];
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); if(!items.length) return; gsSel=(gsSel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length; items.forEach((it,i)=>it.classList.toggle('sel',i===gsSel)); items[gsSel].scrollIntoView({block:'nearest'}); }
  else if(e.key==='Enter'){ if(items.length){ items[Math.max(0,gsSel)].click(); e.preventDefault(); } }
  else if(e.key==='Escape'){ gsHide(); gsInput.blur(); }
});
gsDrop.addEventListener('mousedown',e=>{ const it=e.target.closest('.gs-item'); if(!it) return; e.preventDefault(); goDeep(it.dataset.goto,it.dataset); gsHide(); gsInput.blur(); });
document.addEventListener('click',e=>{ if(!e.target.closest('.gsearch')) gsHide(); });
// 키보드: '/' → 전역 검색 포커스, Esc → 모달 닫기
document.addEventListener('keydown',e=>{
  if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); gsInput.focus(); gsInput.select(); }
  if(e.key==='Escape') document.getElementById('note-overlay').classList.remove('open');
});

// ===== 테마 =====
(function(){
  const btn=document.getElementById('theme-toggle');
  const apply=t=>{document.documentElement.dataset.theme=t;btn.textContent=t==='dark'?'☀️':'🌙';try{localStorage.setItem('theme',t)}catch(e){}};
  apply(document.documentElement.dataset.theme||'light');
  btn.addEventListener('click',()=>apply(document.documentElement.dataset.theme==='dark'?'light':'dark'));
})();

// ===== 1) 관계도 — 가로 타임라인 레이아웃 =====
const campColor={dem:"var(--dem)",con:"var(--con)",mid:"var(--mid)"};
const typeColor={family:"var(--rel-family)",lineage:"var(--rel-lineage)",faction:"var(--rel-faction)",school:"var(--rel-school)",rival:"var(--rel-rival)"};

const H=660, TOP=70, BOT=60, MIDY=(TOP+H-BOT)/2+40;
const presByName={}; DB.presidents.forEach(p=>presByName[p.name]=p);
const presSorted=[...DB.presidents].sort((a,b)=>a.from-b.from);
const isNonPres=p=>p.n==="내각"||p.n==="대행";

// x축: 실제 시간 비례 (장기 재임자는 넓게). 극단 겹침(1979~80)만 최소간격 보정
const YEAR0=1946, YEAR1=2029;
const GRAPH_W=Math.max(2150, (document.getElementById("graph-scroll").clientWidth||2150)-8); // 화면이 넓으면 그래프도 끝까지 늘어남
const xOf=year=>80+(year-YEAR0)/(YEAR1-YEAR0)*(GRAPH_W-160);
const presX={};
{
  let last=-1e9;
  presSorted.forEach(p=>{
    let x=xOf(p.from);
    const minGap=isNonPres(p)?70:62;
    if(x-last<minGap)x=last+minGap;
    presX[p.name]=x; last=x;
  });
}

const svg=d3.select("#graph-svg").attr("width",GRAPH_W).attr("height",H);
const defs=svg.append("defs");
const gAxis=svg.append("g"), gYears=svg.append("g"), gBars=svg.append("g"), gLink=svg.append("g"), gHit=svg.append("g"), gNode=svg.append("g");
const tooltip=d3.select("#tooltip");

// 상단 연대 눈금 + 굵직한 사건
d3.range(1950,2030,10).forEach(y=>{
  const x=xOf(y);
  gAxis.append("line").attr("x1",x).attr("x2",x).attr("y1",26).attr("y2",H-30).attr("class","gridline");
  gAxis.append("text").attr("x",x).attr("y",16).attr("text-anchor","middle").attr("class","gridlabel").style("font-weight",700).text(y+"년대");
});
(DB.events||[]).forEach(ev=>{
  const x=xOf(ev.year+0.5);
  gAxis.append("text").attr("x",x).attr("y",40).attr("text-anchor","middle")
    .style("font-size","10.5px").style("fill","var(--con)").style("font-weight",600)
    .text("⚑ "+ev.label);
});

// 1년 단위 눈금 + 연도 호버 존 (그 해의 사건 요약 툴팁)
const yearEventMap={};(DB.yearEvents||[]).forEach(ye=>yearEventMap[ye.year]=ye.events);
function incumbentOf(year){
  const inc=DB.presidents.filter(p=>p.from<=year+0.99&&year<p.to);
  return inc.map(p=>(p.termLabel||(typeof p.n==="number"?p.n+"대":p.n))+" "+p.name).join(", ");
}
d3.range(1948,2027).forEach(y=>{
  const x=xOf(y);
  // 마이너 눈금 (짧은 세로선)
  gAxis.append("line").attr("x1",x).attr("x2",x).attr("y1",48).attr("y2",y%10===0?58:55)
    .attr("stroke","var(--muted)").attr("stroke-width",y%10===0?1.4:0.7).attr("opacity",.5);
  // 호버 존 (투명, 해당 연도 전체 폭·높이)
  const hw=(xOf(y+1)-xOf(y))/2+2;
  gYears.append("rect")
    .attr("x",x-hw).attr("y",48).attr("width",hw*2).attr("height",H-80)
    .attr("fill","transparent").style("cursor","crosshair")
    .on("mouseenter",e=>{
      tooltip.style("opacity",1)
        .style("left",Math.min(e.clientX+14,innerWidth-320)+"px").style("top",(e.clientY+12)+"px")
        .html(`<div class="t-name">${y}년</div>
          <div class="t-sub">🏛 ${incumbentOf(y)||"공백기"}</div>
          ${(yearEventMap[y]||[]).map(t=>`<div class="t-sub">• ${t}</div>`).join("")||""}
          ${!yearEventMap[y]?'<div class="t-sub">주요 사건 미등록</div>':""}`);
    })
    .on("mouseleave",()=>tooltip.style("opacity",0));
});

// 재임 기간 막대 (길이 = 실제 재임 기간)
presSorted.forEach(p=>{
  if(isNonPres(p))return;
  const x1=xOf(p.from), x2=Math.max(xOf(p.to),x1+14);
  gBars.append("rect")
    .attr("x",x1).attr("y",MIDY-46).attr("width",x2-x1).attr("height",7).attr("rx",3.5)
    .attr("fill",p.camp==="dem"?"var(--dem)":"var(--con)").attr("opacity",.22);
});

// 일반 인물의 x 타깃: 연결된 대통령 x의 평균 (없으면 생년+55)
function targetX(d){
  if(presX[d.id]!=null) return presX[d.id];
  const xs=DATA.edges.filter(e=>e.source===d.id||e.target===d.id)
    .map(e=>presByName[e.source===d.id?e.target:e.source])
    .filter(p=>p&&presX[p.name]!=null).map(p=>presX[p.name]);
  if(xs.length) return xs.reduce((a,b)=>a+b)/xs.length;
  return 80+((d.born+55)-YEAR0)/(YEAR1-YEAR0)*(GRAPH_W-160);
}

const nodes=DATA.nodes.map(d=>({...d}));
const links=DATA.edges.map(d=>({...d}));
// 대통령은 위치 완전 고정 (시간순 보장). 내각·대행은 아래 줄에 별도 표시
nodes.forEach(d=>{
  if(presX[d.id]!=null){
    const p=presByName[d.id];
    d.fx=presX[d.id];
    d.fy=isNonPres(p)?MIDY+92:MIDY;
  }
});
const sim=d3.forceSimulation(nodes)
  .force("link",d3.forceLink(links).id(d=>d.id).distance(l=>120-l.strength*18).strength(.4))
  .force("charge",d3.forceManyBody().strength(-380))
  .force("collide",d3.forceCollide(44))
  .force("x",d3.forceX(d=>targetX(d)).strength(.3))
  .force("y",d3.forceY(MIDY).strength(.12));

let linkSel, nodeSel, hitSel;
const REL_META={
  family:{label:"혈연·가족",dash:null,w:3},
  lineage:{label:"계보·후계",dash:null,w:2.6},
  faction:{label:"동맹·협력",dash:null,w:2.6},
  school:{label:"동문·동료",dash:"2,5",w:1.6},
  rival:{label:"갈등·경쟁",dash:"7,4",w:2.6}
};
function render(){
  gLink.selectAll("*").remove(); gHit.selectAll("*").remove(); gNode.selectAll("*").remove();
  // 시각 라인 (색+선 스타일 = 관계 유형)
  linkSel=gLink.selectAll("line").data(links).join("line")
    .attr("class","link").attr("stroke",l=>typeColor[l.type]||"#999")
    .attr("stroke-width",l=>(REL_META[l.type]||{w:2}).w)
    .attr("stroke-dasharray",l=>(REL_META[l.type]||{}).dash||null);
  // 히트 라인 (투명·두껍게 — 호버용)
  hitSel=gHit.selectAll("line").data(links).join("line")
    .attr("stroke","transparent").attr("stroke-width",15)
    .style("cursor","pointer")
    .on("mouseenter",(e,l)=>{
      const m=REL_META[l.type]||{label:l.type};
      highlight(l.source.id); highlight(l.target.id); // 양쪽 인물 강조는 아래에서 별도 처리
      linkSel.attr("stroke-opacity",k=>k===l?1:(k.source.id===l.source.id&&k.target.id===l.target.id?1:.06));
      const conn=new Set([l.source.id,l.target.id]);
      nodeSel.classed("faded",d=>!conn.has(d.id));
      tooltip.style("opacity",1)
        .style("left",Math.min(e.clientX+14,innerWidth-320)+"px").style("top",(e.clientY+12)+"px")
        .html(`<div class="t-name">${l.source.id} ⟷ ${l.target.id}</div>
          <div class="t-sub" style="color:${typeColor[l.type]}"><b>${m.label}</b> — ${l.relation}</div>`);
    })
    .on("mouseleave",()=>{clearHL();tooltip.style("opacity",0)});
  nodeSel=gNode.selectAll("g").data(nodes).join("g").attr("class","node")
    .filter(d=>presX[d.id]==null) // 대통령은 고정 — 드래그 불가
    .call(d3.drag()
      .on("start",(e,d)=>{if(!e.active)sim.alphaTarget(.25).restart();d.fx=d.x;d.fy=d.y})
      .on("drag",(e,d)=>{d.fx=e.x;d.fy=e.y})
      .on("end",(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));
  nodeSel=gNode.selectAll("g");
  nodeSel.each(function(d){
    const g=d3.select(this);
    const isP=presX[d.id]!=null;
    const r=isP?21:13, S=r*2;
    const clipId="clip-"+d.id.replace(/[^가-힣a-zA-Z0-9]/g,"");
    if(isP){
      defs.append("clipPath").attr("id",clipId)
        .append("rect").attr("x",-r).attr("y",-r).attr("width",S).attr("height",S).attr("rx",10);
      if(d.photo){
        g.append("image").attr("href",d.photo).attr("x",-r).attr("y",-r)
          .attr("width",S).attr("height",S).attr("preserveAspectRatio","xMidYMid slice")
          .attr("clip-path",`url(#${clipId})`)
          .on("error",function(){d3.select(this).remove();g.insert("rect",":first-child").attr("x",-r).attr("y",-r).attr("width",S).attr("height",S).attr("rx",10).attr("fill",campColor[d.camp]);});
      } else {
        g.append("rect").attr("x",-r).attr("y",-r).attr("width",S).attr("height",S).attr("rx",10).attr("fill",campColor[d.camp]);
      }
      g.append("rect").attr("x",-r).attr("y",-r).attr("width",S).attr("height",S).attr("rx",10)
        .attr("fill","none").attr("stroke",campColor[d.camp]).attr("stroke-width",3.5);
    } else {
      if(d.photo){
        defs.append("clipPath").attr("id",clipId).append("circle").attr("r",r);
        g.append("image").attr("href",d.photo).attr("x",-r).attr("y",-r)
          .attr("width",S).attr("height",S).attr("preserveAspectRatio","xMidYMid slice")
          .attr("clip-path",`url(#${clipId})`)
          .on("error",function(){d3.select(this).remove();g.insert("circle",":first-child").attr("r",r).attr("fill",campColor[d.camp]);});
        g.append("circle").attr("r",r).attr("fill","none").attr("stroke",campColor[d.camp]).attr("stroke-width",2);
      } else {
        g.append("circle").attr("r",r).attr("fill",campColor[d.camp]);
      }
    }
  });
  nodeSel.append("text").attr("dy",d=>presX[d.id]!=null?38:26).attr("text-anchor","middle")
    .text(d=>d.id).style("font-weight",d=>presX[d.id]!=null?700:400);
  nodeSel.filter(d=>presX[d.id]!=null).append("text")
    .attr("dy",50).attr("text-anchor","middle")
    .style("font-size","10px").style("fill","var(--muted)").style("font-weight",600)
    .text(d=>{const p=presByName[d.id];if(!p)return"";
      const t=p.termLabel||(typeof p.n==="number"?p.n+"대":"");
      return t+" · "+Math.floor(p.from)});
  // 호버 시에만 하이라이트 (떼면 해제) / 클릭은 인물 노트만
  nodeSel
    .on("mouseenter",(e,d)=>{highlight(d.id);
      tooltip.style("opacity",1)
        .style("left",Math.min(e.clientX+14,innerWidth-300)+"px").style("top",(e.clientY+12)+"px")
        .html(`<div class="t-name">${d.id}${d.president?" · "+d.president:""}</div>
          <div class="t-sub">${d.party||""}${d.born?" · "+d.born+(d.died?"–"+d.died:""):""}</div>
          <div class="t-sub">${d.edu||""}</div>
          ${d.event?`<div class="t-sub">⚑ ${d.event}</div>`:""}`);
    })
    .on("mouseleave",()=>{clearHL();tooltip.style("opacity",0)})
    .on("click",(e,d)=>{e.stopPropagation();openNote(d);if(presByName[d.id])eraViewFor(d.id);});
}
function clearHL(){
  nodeSel.classed("faded",false);
  linkSel.attr("stroke-opacity",.45);
}
function highlight(id){
  const conn=new Set([id]);
  links.forEach(l=>{if(l.source.id===id)conn.add(l.target.id);if(l.target.id===id)conn.add(l.source.id)});
  nodeSel.classed("faded",d=>!conn.has(d.id));
  linkSel.attr("stroke-opacity",l=>(l.source.id===id||l.target.id===id)?1:.05);
}
svg.on("click",()=>clearHL());
function applyT(){
  linkSel.attr("x1",l=>l.source.x).attr("y1",l=>l.source.y).attr("x2",l=>l.target.x).attr("y2",l=>l.target.y);
  nodeSel.attr("transform",d=>`translate(${d.x},${d.y})`);
}
sim.on("tick",applyT);
render();
// 타이머 스로틀링과 무관하게 동기적으로 레이아웃 확정
sim.stop();
for(let i=0;i<400;i++) sim.tick();
applyT();
sim.restart();
// 노드 필터: 검색 + 진영 + 직급 결합
function applyNodeFilters(){
  const q=(document.getElementById("search").value||"").trim();
  const camp=document.getElementById("camp-filter").value;
  const role=document.getElementById("role-filter").value;
  const ok=d=>(!q||d.id.includes(q)||(d.party||"").includes(q))&&
             (camp==="all"||d.camp===camp)&&
             (role==="all"||(d.role||"")==="role"||d.role===role||((role==="대통령")&&d.president));
  const vis=new Set(nodes.filter(ok).map(d=>d.id));
  nodeSel.classed("faded",d=>!vis.has(d.id));
  linkSel.attr("stroke-opacity",l=>(vis.has(l.source.id)&&vis.has(l.target.id))?.45:.03);
}
document.getElementById("search").addEventListener("input",applyNodeFilters);
document.getElementById("camp-filter").addEventListener("change",applyNodeFilters);
document.getElementById("role-filter").addEventListener("change",applyNodeFilters);
document.getElementById("rel-filter").addEventListener("change",e=>{
  const v=e.target.value;
  linkSel.attr("stroke-opacity",l=>(v==="all"||l.type===v)?.45:.03);
});

function openNote(d,forceInline){
  const inline=forceInline||document.getElementById("page-rel").classList.contains("active");
  const body=inline?document.getElementById("note-side"):document.getElementById("note-body");
  const rels=DATA.edges.filter(l=>l.source===d.id||l.target===d.id)
    .map(l=>`<li><b>${l.source===d.id?l.target:l.source}</b> — ${l.relation} <span style="color:var(--muted)">(${(REL_META[l.type]||{label:l.type}).label})</span>${l.since?` <span style="font-size:11px;color:var(--muted)">${l.since}년~</span>`:""}
      ${l.detail?`<div style="font-size:12px;color:var(--muted);margin:3px 0 7px 4px;line-height:1.6">↳ ${l.detail}</div>`:""}</li>`).join("");
  const note=DB.notes[d.id];
  const myPolicies=(DB.policies||[]).filter(p=>p.politicians.includes(d.id));
  let html=`${inline?"":`<button class="n-close" onclick="document.getElementById('note-overlay').classList.remove('open')">✕</button>`}
    ${d.photo?`<img class="n-avatar" src="${d.photo}" alt="${d.id}" onerror="this.style.display='none'">`:""}
    <h2>${d.id}</h2>
    <div class="n-sub">${d.president?d.president+" · ":""}${d.party||""}${d.born?" · "+d.born+(d.died?"–"+d.died:""):""}</div>
    <div class="n-tabs" style="display:flex;gap:6px;margin:10px 0 14px;border-bottom:1px solid var(--border)">
      <button class="tab-btn ntab on" data-t="info" style="border-radius:8px 8px 0 0;border-bottom:2px solid var(--accent)">프로필</button>
      ${myPolicies.length?`<button class="tab-btn ntab" data-t="pol" style="border-radius:8px 8px 0 0">주요 정책 ${myPolicies.length}</button>`:""}
    </div>
    <div class="ntab-body" id="ntab-info">`;
  if(d.edu) html+=`<h4>학력·경력</h4><ul><li>${d.edu}</li>${d.event?`<li>⚑ ${d.event}</li>`:""}</ul>`;
  if(note) note.sections.forEach(s=>{html+=`<h4>${s[0]}</h4><ul>${s[1].map(x=>`<li>${x}</li>`).join("")}</ul>`});
  html+=`<h4>관계</h4><ul>${rels||"<li>등록된 관계 없음</li>"}</ul>`;
  html+=`<a href="${WIKI_LINK(d.id)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;font-size:12.5px;color:var(--accent);text-decoration:none">📚 위키백과에서 '${d.id}' 전체 내용 보기 ↗</a>`;
  html+=`<div class="n-src">출처: ${SRC_WIKI}</div></div>`;
  if(myPolicies.length){
    html+=`<div class="ntab-body" id="ntab-pol" style="display:none">
      ${myPolicies.map(p=>`
      <div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;align-items:baseline">
          <b style="font-size:14px">${p.title}</b>
          <span class="st" style="background:${POL_STATUS_COLOR[p.status]}18;color:${POL_STATUS_COLOR[p.status]}">${p.status}</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin:4px 0 6px">${p.year} · ${p.period} · ${p.cat}</div>
        <div style="font-size:12.5px;line-height:1.65">${p.summary}</div>
        <details style="margin-top:6px">
          <summary style="cursor:pointer;font-size:11.5px;color:var(--accent)">배경·내용·결과</summary>
          <div style="font-size:12px;color:var(--muted);line-height:1.65;margin-top:5px">
            <b style="color:var(--ink)">배경</b> ${p.bg}<br><b style="color:var(--ink)">내용</b> ${p.content}<br><b style="color:var(--ink)">결과</b> ${p.result}
          </div>
        </details>
      </div>`).join("")}
      <p style="font-size:11.5px;color:var(--muted)">정책백과 탭에서 분야별 전체 정책을 볼 수 있습니다.</p></div>`;
  }
  body.innerHTML=html;
  if(!inline) document.getElementById("note-overlay").classList.add("open");
  else body.scrollTop=0;
  body.querySelectorAll(".ntab").forEach(t=>t.addEventListener("click",()=>{
    body.querySelectorAll(".ntab").forEach(x=>{x.classList.remove("on");x.style.borderBottom="";x.style.borderBottomColor=""});
    t.classList.add("on");t.style.borderBottom="2px solid var(--accent)";
    body.querySelectorAll(".ntab-body").forEach(b=>b.style.display="none");
    const el=document.getElementById("ntab-"+t.dataset.t);
    if(el)el.style.display="block";
  }));
}
document.getElementById("note-overlay").addEventListener("click",e=>{
  if(e.target.id==="note-overlay") e.target.classList.remove("open");
});

// ===== 2) 정당 지도 (관계도 아래 통합 — 대통령 클릭 시 그 시대 구도) =====
const WIKI_TITLES={"박지원":"박지원 (1942년)"};
const WIKI_LINK=id=>{
  const t=WIKI_TITLES[id];
  if(t) return "https://ko.wikipedia.org/wiki/"+encodeURIComponent(t);
  if(id==="이상민") return "https://ko.wikipedia.org/w/index.php?search="+encodeURIComponent("이상민 행정안전부 장관");
  return "https://ko.wikipedia.org/wiki/"+encodeURIComponent(id);
};
const PARTY_VIEWS=[
  ...(DB.assemblyEras||[]).map(a=>({id:a.id,label:a.label,note:a.note,seats:a.seats,parties:a.parties})),
  {id:"now",label:"현재 의석 · 22대 국회",note:"2026-09 기준 현재 의석 (재보궐·이탈 반영, 위키백과)",seats:true,parties:DB.parties.map(p=>({name:p.name,role:"대표 "+p.leader,color:p.color,seats:p.seats,desc:p.spectrum}))}
];
const membersOf=partyName=>{
  const core=partyName.split("·")[0].trim();
  return DATA.nodes.filter(n=>(n.party||"").startsWith(core));
};
function renderPartyMap(viewId){
  const wrap=document.getElementById("party-map");
  const view=PARTY_VIEWS.find(v=>v.id===viewId)||PARTY_VIEWS[PARTY_VIEWS.length-1];
  const total=view.seats?Math.max(...view.parties.map(p=>p.seats||0))*1.15:0;
  wrap.innerHTML=`
  <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      <b style="font-size:16px">🏛 정당 지도 — ${view.label}</b>
      <span style="font-size:11px;color:var(--muted)">대통령 클릭 시 자동 전환 · 출처: 위키백과 (2026-10)</span>
    </div>
    <div class="toolbar" style="overflow-x:auto;flex-wrap:nowrap;margin-bottom:10px">
      ${PARTY_VIEWS.map(v=>`<button class="tab-btn pm-btn ${v.id===view.id?'on':''}" data-id="${v.id}" style="white-space:nowrap;font-size:12px">${v.label}</button>`).join("")}
    </div>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${view.note||""}</p>
    ${view.parties.map(p=>{
      const mem=membersOf(p.name);
      return `
      <div class="pm-row" data-name="${p.name}" style="display:grid;grid-template-columns:${view.seats?'200px 1fr 150px':'230px 1fr'};gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--border);${mem.length?'cursor:pointer;':''}">
        <div>
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${p.color};margin-right:7px;vertical-align:-1px"></span>
          <b style="font-size:14px">${p.name}</b>${mem.length?' <span style="font-size:10px;color:var(--accent)">▾</span>':""}
          ${p.role?`<div style="font-size:10.5px;color:var(--muted);margin-top:2px">${p.role}</div>`:""}
        </div>
        ${view.seats
          ?`<div style="height:20px;background:var(--bg);border-radius:6px;overflow:hidden"><div style="height:100%;width:${((p.seats||0)/total*100).toFixed(1)}%;background:${p.color};border-radius:6px"></div></div>
            <div style="text-align:right;font-size:13px"><b>${p.seats||0}</b>석 <span style="font-size:11px;color:var(--muted)">${p.desc||""}</span></div>`
          :`<div style="font-size:12.5px;color:var(--muted)">${p.desc||""}</div>`}
      </div>
      <div class="pm-members" data-name="${p.name}" style="display:none;padding:6px 0 12px"></div>`;}).join("")}
    ${view.seats?"":`<p style="font-size:11px;color:var(--muted);margin-top:10px">※ 2016년 이전 국회는 정확한 의석 수 대신 여야 구도·주요 정당 중심으로 표기합니다. (의석 수 개별 검증 후 추가 예정)</p>`}
  </div>`;
  wrap.querySelectorAll(".pm-btn").forEach(b=>b.addEventListener("click",()=>renderPartyMap(b.dataset.id)));
  wrap.querySelectorAll(".pm-row").forEach(row=>row.addEventListener("click",()=>{
    const panel=wrap.querySelector(`.pm-members[data-name="${row.dataset.name}"]`);
    if(!panel)return;
    const open=panel.style.display!=="none";
    wrap.querySelectorAll(".pm-members").forEach(m=>m.style.display="none");
    if(open){panel.style.display="none";return;}
    const mem=membersOf(row.dataset.name);
    if(!mem.length)return;
    panel.style.display="block";
    panel.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:8px">${mem.map(m=>`
      <button class="mem-chip" data-id="${m.id}" style="display:flex;align-items:center;gap:7px;border:1px solid var(--border);background:var(--bg);border-radius:999px;padding:4px 12px 4px 4px;cursor:pointer;font-size:13px">
        ${m.photo?`<img src="${m.photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;object-position:top">`:`<span style="width:28px;height:28px;border-radius:50%;background:${campColor[m.camp]};display:inline-block"></span>`}
        ${m.id}
      </button>`).join("")}</div>`;
    panel.querySelectorAll(".mem-chip").forEach(ch=>ch.addEventListener("click",()=>{
      const p=DATA.nodes.find(n=>n.id===ch.dataset.id);if(p)openNote(p);
    }));
  }));
}
// 대통령 클릭 → 해당 시대 구도로 전환
function eraViewFor(presidentName){
  const a=(DB.assemblyEras||[]).find(x=>x.presidents.includes(presidentName));
  renderPartyMap(a?a.id:"now");
}
renderPartyMap("now");

// ===== 3) 공약 이행도 =====
const PLEDGES=DB.pledges;
const OFFICE_TABS=[
  {id:"all",label:"전체",match:()=>true},
  {id:"president",label:"대통령(대선)",match:p=>p.office==="president"},
  {id:"assembly",label:"국회의원·정당(총선)",match:p=>p.office==="assembly"||p.office==="party"},
  {id:"local",label:"지방선거",match:p=>p.office==="local"}
];
const stLabel={kept:"이행",partial:"부분",broken:"미이행",progress:"진행중"};
// 현재 기준 이행률: 공식 집계 우선, 없으면 자체 집계(이행1·부분0.5·진행0.25 가중)
function rateOf(p){
  if(p.real.rate!=null) return {pct:p.real.rate,tag:"공식 집계"};
  if(p.real.rateLabel) return {label:p.real.rateLabel,tag:"공식 집계"};
  const w={kept:1,partial:.5,progress:.25,broken:0};
  const items=p.items||[];
  if(!items.length) return {label:"—",tag:""};
  return {pct:Math.round(items.reduce((s,i)=>s+(w[i.status]||0),0)/items.length*100),tag:"자체 집계·보도 기반"};
}
function renderPledges(tabId){
  const tab=OFFICE_TABS.find(t=>t.id===tabId)||OFFICE_TABS[0];
  const elecYear=p=>+((p.meta.match(/(\d{4})/)||[0,0])[1]);
  const list=PLEDGES.filter(tab.match).sort((a,b)=>elecYear(b)-elecYear(a));
  document.getElementById("prom-filter").innerHTML=OFFICE_TABS.map(t=>`<button class="tab-btn ${t.id===tab.id?'on':''}" data-id="${t.id}">${t.label}</button>`).join("");
  document.querySelectorAll("#prom-filter button").forEach(b=>b.addEventListener("click",()=>renderPledges(b.dataset.id)));
  document.getElementById("pol-grid").innerHTML=list.map(p=>{
    const r=rateOf(p);
    const scoreHtml=r.pct!=null
      ?`<span class="score">${r.pct}<small>%</small></span>`
      :`<span class="score" style="font-size:20px">${r.label||"집계 없음"}</span>`;
    const detail=p.real.total
      ?`${p.real.total}개 공약 — 완전이행 ${p.real.kept}${p.real.broken?" · 미이행 "+p.real.broken:""}${p.real.na?" · 부분·후퇴 "+p.real.na:""}`
      :p.real.src;
    return `<div class="pol-card" data-politician="${p.politician}">
    <h3>${p.politician}<span class="who">${p.meta}</span></h3>
    <div class="score-row">${scoreHtml}<span class="rate-tag">${r.tag}</span></div>
    <div class="bar"><div style="width:${r.pct||0}%"></div></div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${detail}</div>
    ${p.items.map(it=>`<details class="promise">
      <summary><span class="st st-${it.status}">${stLabel[it.status]}</span> ${it.title}</summary>
      <div class="evidence">${it.note}
        ${(it.news||[]).map(n=>`<a class="pnews" href="${n.link}" target="_blank" rel="noopener">📄 ${n.title}<br><span>${n.source} · ${n.date}</span></a>`).join("")}
      </div></details>`).join("")}
  </div>`}).join("");
}
renderPledges("all");

// ===== 4) 인물백과 =====
function personSummary(d){
  const n=DB.notes[d.id];
  if(n){const s=n.sections.find(x=>x[0]==="이력")||n.sections[0];if(s)return s[1][0];}
  return d.edu||d.party||"";
}
function renderPeople(){
  const q=(document.getElementById("people-search").value||"").trim().toLowerCase();
  const camp=document.getElementById("people-camp").value;
  const role=document.getElementById("people-role").value;
  const list=DATA.nodes
    .filter(d=>(!q||d.id.toLowerCase().includes(q)||(d.party||"").toLowerCase().includes(q)||(d.president||"").includes(q)||(d.edu||"").toLowerCase().includes(q))
            &&(camp==="all"||d.camp===camp)
            &&(role==="all"||d.role===role||((role==="대통령")&&d.president)))
    .slice().sort((a,b)=>(a.president&&!b.president)?-1:(b.president&&!a.president)?1:(a.role===b.role?a.id.localeCompare(b.id,"ko"):(a.role||"").localeCompare(b.role||"","ko")));
  document.getElementById("people-count").textContent=list.length+"명";
  document.getElementById("people-grid").innerHTML=list.map(d=>`
    <div class="pol-card" style="padding:16px">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">
        ${d.photo?`<img src="${d.photo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:top;border:2px solid ${campColor[d.camp]}" onerror="this.style.display='none'">`:`<span style="width:52px;height:52px;border-radius:50%;background:${campColor[d.camp]};display:inline-block"></span>`}
        <div>
          <div style="font-weight:800;font-size:16px">${d.id}</div>
          <div style="font-size:11.5px;color:var(--muted)">${d.president?d.president+" · ":""}${d.party||""}</div>
        </div>
      </div>
      <div style="font-size:12.5px;color:var(--muted);line-height:1.6;min-height:38px">${personSummary(d)}</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="tab-btn" data-note="${d.id}" style="font-size:12px;padding:5px 10px">요약 노트</button>
        <a class="tab-btn" href="${WIKI_LINK(d.id)}" target="_blank" rel="noopener" style="font-size:12px;padding:5px 10px;display:inline-block;text-decoration:none">위키백과 전체 ↗</a>
      </div>
    </div>`).join("");
  document.querySelectorAll("#people-grid [data-note]").forEach(b=>b.addEventListener("click",()=>{
    const p=DATA.nodes.find(n=>n.id===b.dataset.note);if(p)openNote(p);
  }));
}
document.getElementById("people-search").addEventListener("input",renderPeople);
document.getElementById("people-camp").addEventListener("change",renderPeople);
document.getElementById("people-role").addEventListener("change",renderPeople);
renderPeople();

// ===== 4.5) 정책백과 =====
const POLICIES=DB.policies||[];
const POL_STATUS_COLOR={완료:"#15803d",진행:"#1d4ed8",일부수정:"#a16207",중단:"#b91c1c",계승:"#0d9488",논란:"#b45309"};
// 정부 필터 옵션 채우기 (정책에 등장하는 정치인 기준)
(function(){
  const sel=document.getElementById("pol-gov");
  const names=[...new Set(POLICIES.flatMap(p=>p.politicians))];
  sel.innerHTML='<option value="all">정부: 전체</option>'+names.map(n=>`<option value="${n}">${n}</option>`).join("");
})();
function renderPolicies(cat){
  const q=(document.getElementById("pol-search").value||"").trim().toLowerCase();
  const gov=document.getElementById("pol-gov").value;
  const cats=["전체",...new Set(POLICIES.map(p=>p.cat))];
  const list=POLICIES
    .filter(p=>(cat==="전체"||!cat||p.cat===cat)&&(!q||p.title.toLowerCase().includes(q)||p.summary.toLowerCase().includes(q)||p.politicians.join(" ").includes(q))&&(gov==="all"||p.politicians.includes(gov)))
    .slice().sort((a,b)=>a.year-b.year);
  document.getElementById("pol-cat").innerHTML=cats.map(c=>`<button class="tab-btn ${c===(cat||"전체")?'on':''}" data-c="${c}">${c}</button>`).join("");
  document.querySelectorAll("#pol-cat button").forEach(b=>b.addEventListener("click",()=>renderPolicies(b.dataset.c)));
  document.getElementById("pol-count").textContent=list.length+"개 정책";
  document.getElementById("policy-list").innerHTML=list.map(p=>`
    <div class="pol-card" style="padding:16px 18px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">
        <b style="font-size:15.5px">${p.title}</b>
        <span class="st" style="background:${POL_STATUS_COLOR[p.status]}18;color:${POL_STATUS_COLOR[p.status]}">${p.status}</span>
      </div>
      <div style="font-size:11.5px;color:var(--muted);margin:6px 0 8px">${p.year} 시작 · ${p.period} · ${p.cat} · ${p.politicians.join("·")} 정부</div>
      <div style="font-size:13px;line-height:1.65">${p.summary}</div>
      <details style="margin-top:10px;border-top:1px dashed var(--border);padding-top:8px">
        <summary style="cursor:pointer;font-size:12.5px;color:var(--accent)">상세 보기</summary>
        <div style="font-size:12.5px;color:var(--muted);line-height:1.7;margin-top:8px">
          <b style="color:var(--ink)">배경</b> — ${p.bg}<br>
          <b style="color:var(--ink)">내용</b> — ${p.content}<br>
          <b style="color:var(--ink)">결과</b> — ${p.result}<br>
          <span style="font-size:11px">출처: ${p.src}</span>
        </div>
      </details>
    </div>`).join("")||'<p class="hint">검색 결과가 없습니다.</p>';
}
document.getElementById("pol-search").addEventListener("input",()=>renderPolicies(null));
document.getElementById("pol-gov").addEventListener("change",()=>renderPolicies(null));
renderPolicies("전체");

// ===== 5) 용어 사전 (심플 리스트) =====
const CHO_LIST=["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const choOf=s=>{const c=s.charCodeAt(0)-0xAC00;return (c>=0&&c<11172)?CHO_LIST[Math.floor(c/588)]:s[0].toUpperCase();};
function renderGloss(q){
  q=(q||"").trim().toLowerCase();
  const list=GLOSSARY
    .filter(g=>!q||g.t.toLowerCase().includes(q)||g.cat.includes(q)||g.d.toLowerCase().includes(q))
    .slice().sort((a,b)=>a.t.localeCompare(b.t,"ko"));
  const groups={};
  list.forEach(g=>{const k=choOf(g.t);(groups[k]=groups[k]||[]).push(g)});
  const keys=Object.keys(groups).sort((a,b)=>{
    const ia=CHO_LIST.indexOf(a),ib=CHO_LIST.indexOf(b);
    if(ia>=0&&ib>=0)return ia-ib; if(ia>=0)return -1; if(ib>=0)return 1; return a.localeCompare(b);
  });
  document.getElementById("gloss-count").textContent=list.length+"개 용어";
  document.getElementById("gloss-dict").innerHTML= keys.length
    ? keys.map(k=>`<div class="dict-group"><div class="dict-head">${k}</div>
        ${groups[k].map(g=>`<div class="dict-row">
          <div class="dict-term">${g.t}<span class="cat">${g.cat}</span></div>
          <div><div class="dict-def">${g.d}</div>
            ${(g.news||[]).length?`<div class="dict-news">${g.news.slice(0,2).map(n=>`<a href="${n.link}" target="_blank" rel="noopener">📄 ${n.title.length>44?n.title.slice(0,44)+"…":n.title}</a> <span>${n.source}</span>`).join("")}</div>`:""}
          </div></div>`).join("")}</div>`).join("")
    : '<p class="hint" style="margin-top:20px">검색 결과가 없습니다.</p>';
}
document.getElementById("gloss-search").addEventListener("input",e=>renderGloss(e.target.value));
renderGloss("");

// 가이드 — 입문자 우선 용어 칩 (용어사전에 실제로 등록된 것만 노출)
{
  const PREF=['탄핵','계파','여소야대','총선','지방선거','권한대행','계보','삼김','87년 체제','지역주의','공수처','검찰개혁','촛불집회','게이트'];
  let terms=PREF.filter(t=>GLOSSARY.some(g=>g.t===t));
  if(terms.length<6) GLOSSARY.forEach(g=>{ if(terms.length<10&&!terms.includes(g.t)) terms.push(g.t); });
  document.getElementById('guide-terms').innerHTML='<span class="lbl">바로가기</span>'+terms.map(t=>'<button class="chip" data-goto="term" data-term="'+t.replace(/"/g,'')+'">'+t+'</button>').join('');
}
// 주소 hash로 직접 진입(#people 등) + 뒤로가기
addEventListener('hashchange',()=>{ const h=location.hash.slice(1); if(TABS.includes(h)&&!document.getElementById('page-'+h).classList.contains('active')) showTab(h); });
{ const h=location.hash.slice(1); showTab(TABS.includes(h)?h:'rel'); }

// 관계도 우측 프로필 구역 — 기본 표시 (모든 함수 정의 후). forceInline: 다른 탭으로 진입해도 모달을 띄우지 않고 사이드에만 채움
openNote(DATA.nodes.find(n=>n.id==="이재명")||DATA.nodes[0],true);
