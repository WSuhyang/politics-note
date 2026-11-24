// 일회성 점검: edu / notes 의 '사법연수원 N기' 표기를 위키백과 wikitext 와 대조
const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..');
const persons=require(path.join(ROOT,'data/persons.json')).nodes;
const rawNotes=require(path.join(ROOT,'data/notes.json'));const notes=rawNotes.notes||rawNotes;
const html=fs.readFileSync(path.join(ROOT,'v4.html'),'utf8');
const WT={};const m=html.match(/const WIKI_TITLES=\{[^}]*\}/);if(m)m[0].replace(/"([^"]+)":"([^"]+)"/g,(_,k,v)=>{WT[k]=v});
const pick=s=>{const a=[];for(const x of String(s||'').matchAll(/사법연수원\s*(\d+)기|연수원\s*(\d+)기/g))a.push(x[1]||x[2]);return a};
const targets=[];
for(const p of persons){const mine=new Set([...pick(p.edu),...pick(JSON.stringify(notes[p.id]||''))]);if(mine.size)targets.push({id:p.id,mine:[...mine]})}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const out=[];
  for(const t of targets){
    const title=WT[t.id]||t.id;
    let txt='';
    try{
      const u='https://ko.wikipedia.org/w/api.php?action=parse&page='+encodeURIComponent(title)+'&prop=wikitext&format=json&formatversion=2&redirects=1';
      const j=await (await fetch(u,{headers:{'User-Agent':'politics-note-verify/1.0 (research)'}})).json();
      txt=(j.parse&&j.parse.wikitext)||'';
    }catch(e){txt='ERR '+e.message}
    const wiki=[...new Set([...String(txt).matchAll(/사법연수원[^\n|]{0,3}?(\d+)\s*기|연수원[^\n|]{0,3}?(\d+)\s*기/g)].map(x=>x[1]||x[2]))];
    const exam=[...new Set([...String(txt).matchAll(/제\s*(\d+)\s*회\s*사법시험/g)].map(x=>x[1]))];
    out.push({id:t.id,title,mine:t.mine,wiki,exam});
    await sleep(2600);
  }
  fs.writeFileSync(path.join(ROOT,'_class_check.json'),JSON.stringify(out,null,1));
  for(const o of out)console.log((JSON.stringify(o.mine)===JSON.stringify(o.wiki)?'OK  ':'DIFF')+' '+o.id+' | 데이터:'+o.mine.join(',')+' | 위키:'+o.wiki.join(',')+' | 시험:'+o.exam.join(','));
})();
