#!/usr/bin/env node
/** v2.html(인라인 데이터) → v3.html(DB 번들 참조) 변환. 일회성 스크립트. */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
let html = fs.readFileSync(path.join(ROOT, "v2.html"), "utf8");

function replaceLiteral(src, startAnchor, endAnchor, replacement, startOffset = 0) {
  const start = src.indexOf(startAnchor, startOffset);
  if (start === -1) throw new Error(`시작 앵커 없음: ${startAnchor}`);
  const end = src.indexOf(endAnchor, start);
  if (end === -1) throw new Error(`종료 앵커 없음: ${endAnchor}`);
  return src.slice(0, start) + replacement + src.slice(end + endAnchor.length);
}

html = replaceLiteral(html, "const DATA = {", "\n};", "const DATA = DB.graph;");
html = replaceLiteral(html, "// 인물 노트 (주요 인물 상세 — 위키백과 기반)\nconst NOTES={", "\n};", "const NOTES = DB.notes;");
html = replaceLiteral(html, "// ===== 2) 대통령 타임라인 =====\nconst PRESIDENTS=[", "\n];", "const PRESIDENTS = DB.presidents;");
html = replaceLiteral(html, "const PARTIES=[", "\n];", "const PARTIES = DB.parties;");
html = replaceLiteral(html, "const PLEDGES=[", "\n];", "const PLEDGES = DB.pledges;");
html = replaceLiteral(html, "const GLOSSARY=[", "\n];", "const GLOSSARY = DB.glossary;");

// 공약 비교표를 데이터에서 읽도록 교체
const cmpOld = `document.getElementById("cmp-table").innerHTML=\`
  <tr><th>정부</th><th>집계 시점</th><th>이행률</th><th>비고</th></tr>`;
if (!html.includes(cmpOld)) throw new Error("비교표 앵커 없음");
html = html.replace(cmpOld,
  `document.getElementById("cmp-table").innerHTML =
  '<tr><th>정부</th><th>집계 시점</th><th>이행률</th><th>비고</th></tr>' +
  DB.comparison.map(r=>\`<tr><td>\${r.gov}</td><td>\${r.point}</td><td><b>\${r.rate}</b></td><td>\${r.note}</td></tr>\`).join("");\n/*레거시*/\`\n  <tr><th>정부</th><th>집계 시점</th><th>이행률</th><th>비고</th></tr>`);

// DB 번들 스크립트 태그 주입 (d3 뒤)
html = html.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>\n<script src="data.js"></script>');

// 타이틀/푸터 갱신
html = html.replace("정리노트 v2", "정리노트 v3").replace(/v2/g, "v3");

fs.writeFileSync(path.join(ROOT, "v3.html"), html, "utf8");
console.log("✓ v3.html 생성:", (html.length / 1024).toFixed(1), "KB");
