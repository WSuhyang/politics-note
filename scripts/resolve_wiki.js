#!/usr/bin/env node
/** 1) 동명이인 인물의 정확한 위키 문서 제목 확인 → data/wiki_titles.json */
const https = require("https");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const sleep = ms => new Promise(r => setTimeout(r, ms));

function api(params) {
  const url = "https://ko.wikipedia.org/w/api.php?" + params + "&format=json";
  return new Promise(res => {
    https.get(url, { headers: { "User-Agent": "politics-note/0.4" } }, r => {
      if (r.statusCode !== 200) { r.resume(); return res(null); }
      let b = ""; r.on("data", c => b += c);
      r.on("end", () => { try { res(JSON.parse(b)); } catch { res(null); } });
    }).on("error", () => res(null));
  });
}

(async () => {
  // 후보: 위키 검색으로 '정치인' 관련 문서 찾기
  const ambiguous = ["이상민", "박지원", "김기현", "김문수", "김한길"];
  const out = {};
  for (const name of ambiguous) {
    const d = await api("action=query&list=search&srsearch=" + encodeURIComponent(name + " 정치인") + "&srlimit=5&srnamespace=0");
    const hits = d && d.query && d.query.search ? d.query.search.map(s => s.title) : [];
    out[name] = hits;
    console.log(name + ": " + hits.join(" | "));
    await sleep(2500);
  }
  fs.writeFileSync(path.join(ROOT, "data", "wiki_titles.json"), JSON.stringify(out, null, 2));
  console.log("→ data/wiki_titles.json 저장");
})();
