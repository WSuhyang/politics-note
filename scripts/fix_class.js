// 일회성 수정: 사법연수원 기수 오기(시험 회차 혼동) 교정 — 위키백과 wikitext 대조 결과(2026-11-24)
// 문재인 12기 · 윤석열 23기 · 이재명 18기 · 홍준표 14기 · 한동훈 27기
const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..');
const jobs={
  'data/persons.json':[
    ['"경희대 법학 · 사법연수원 23기"','"경희대 법학 · 사법연수원 12기"'],
    ['"서울대 법학 · 사법연수원 33기"','"서울대 법학 · 사법연수원 23기"'],
    ['"중앙대 법학 · 사법연수원 29기"','"중앙대 법학 · 사법연수원 18기"'],
    ['"서울대 법학 · 사법연수원 13기 · YS키즈"','"서울대 법학 · 사법연수원 14기 · YS키즈"'],
    ['"서울대·하버드 · 사법연수원 41기"','"서울대·하버드 · 사법연수원 27기"'],
  ],
  'data/notes.json':[
    ['홍준표(서울대·사법연수원 13기)','홍준표(서울대·사법연수원 14기)'],
    ['경희대 법학과 → 사법연수원 23기','경희대 법학과 → 사법연수원 12기'],
    ['서울대 법학과 → 사법연수원 33기','서울대 법학과 → 사법연수원 23기'],
    ['한동훈(사법연수원 41기, 법무부장관)','한동훈(사법연수원 27기, 법무부장관)'],
    ['중앙대 법학과 졸업 → 사법연수원 29기','중앙대 법학과 졸업 → 사법연수원 18기'],
    ['사법연수원 29기 동기 네트워크','사법연수원 18기 동기 네트워크'],
  ]
};
let ok=true;
for(const [file,rules] of Object.entries(jobs)){
  const p=path.join(ROOT,file);let s=fs.readFileSync(p,'utf8');
  for(const [a,b] of rules){const c=s.split(a).length-1;if(c!==1){ok=false;console.log('ABORT count='+c, file, a)}else s=s.replace(a,b)}
  if(ok)fs.writeFileSync(p,s);
}
console.log(ok?'FIXED 11 occurrences':'NOT WRITTEN — see ABORT lines');
