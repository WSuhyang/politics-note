#!/usr/bin/env node
/** 사진 규격 통일: 원본 URL → Commons 400px 썸네일 (동일 해상도·빠른 로드). 실패 시 원본 유지 */
const https = require("https");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const persons = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "persons.json"), "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function api(titles) {
  const url = "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&titles=" + encodeURIComponent(titles);
  return new Promise(res => {
    const req = https.get(url, { headers: { "User-Agent": "politics-note/0.4" }, timeout: 15000 }, r => {
      if (r.statusCode !== 200) { r.resume(); return res(null); }
      let b = ""; r.on("data", c => b += c);
      r.on("end", () => { try { res(JSON.parse(b)); } catch { res(null); } });
    });
    req.on("error", () => res(null));
    req.on("timeout", () => { req.destroy(); res(null); });
  });
}
const fileNameFromUrl = u => decodeURIComponent(u.split("/").pop());

(async () => {
  let ok = 0, keep = 0, skip = 0;
  for (const p of persons.nodes) {
    if (!p.photo) { skip++; continue; }
    if (p.photo.includes("/thumb/")) { keep++; continue; }           // 이미 썸네일
    const fn = fileNameFromUrl(p.photo);
    if (!/\.(jpe?g|png)$/i.test(fn)) { keep++; continue; }           // 특수 파일(ogv 등)은 원본 유지
    const d = await api("File:" + fn);
    const ii = d && d.query && d.query.pages && Object.values(d.query.pages)[0];
    const t = ii && ii.imageinfo && ii.imageinfo[0] && ii.imageinfo[0].thumburl;
    if (t) { p.photo = t; ok++; }
    else { keep++; console.log("  원본유지:", p.id); }
    await sleep(2100);
  }
  fs.writeFileSync(path.join(ROOT, "data", "persons.json"), JSON.stringify(persons, null, 2));
  console.log(`썸네일화 ${ok} · 원본유지 ${keep} · 사진없음 ${skip}`);
})();
