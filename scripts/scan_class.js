// 전수 스캔: persons.edu + notes 본문의 모든 '연수원 N기' 출현 위치 (수정 전 점검용)
const path=require('path');const ROOT=path.join(__dirname,'..');
const persons=require(path.join(ROOT,'data/persons.json')).nodes;
const raw=require(path.join(ROOT,'data/notes.json'));const notes=raw.notes||raw;
let n=0;
const scan=(where,text)=>{for(const m of String(text||'').matchAll(/.{0,24}연수원\s*\d+\s*기.{0,14}/g)){n++;console.log(where,'|',m[0])}};
for(const p of persons){scan('edu:'+p.id,p.edu);const t=notes[p.id];if(t)t.sections.forEach(s=>s[1].forEach((x,i)=>scan('notes:'+p.id+'/'+s[0]+'['+i+']',x)))}
console.log('TOTAL',n);
