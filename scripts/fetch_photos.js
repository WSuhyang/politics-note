#!/usr/bin/env node
/** 위키백과 REST API로 인물별 대표 이미지(공식 초상) URL 수집 → data/photos.json */
const https = require("https");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const persons = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "persons.json"), "utf8")).nodes;

function fetchJSON(title) {
  const url = "https://ko.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title) + "?redirect=true";
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { "User-Agent": "politics-note/0.3 (prototype)" }, timeout: 15000 }, res => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

(async () => {
  const out = {};
  for (const p of persons) {
    const data = await fetchJSON(p.id);
    const thumb = data && (data.originalimage || data.thumbnail);
    if (thumb && thumb.source && /\.jpg|\.jpeg|\.png/i.test(thumb.source)) {
      out[p.id] = thumb.source;
      console.log(`✓ ${p.id}`);
    } else {
      console.log(`✗ ${p.id} — 이미지 없음 (fallback: 이니셜 아바타)`);
    }
  }
  fs.writeFileSync(path.join(ROOT, "data", "photos.json"), JSON.stringify(out, null, 2), "utf8");
  console.log(`\n${Object.keys(out).length}/${persons.length} 수집 완료 → data/photos.json`);
})();
