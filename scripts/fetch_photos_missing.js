#!/usr/bin/env node
/** 신규 인물 사진 수집 — photo 필드 없는 인물만 (레이트리밋 대비 2.5s 간격) → persons.json에 병합 */
const https = require("https");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const persons = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "persons.json"), "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const EN = {
  "유승민":"Yoo Seung-min", "송영길":"Song Young-gil", "박지현":"Park Ji-hyun (politician)",
  "박영선":"Park Young-sun", "이인영":"Lee In-young"
};

function summary(lang, title) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;
  return new Promise(res => {
    const req = https.get(url, { headers: { "User-Agent": "politics-note/0.4 (rate-limit aware)" }, timeout: 15000 }, r => {
      if (r.statusCode !== 200) { r.resume(); return res(null); }
      let b = ""; r.on("data", c => b += c);
      r.on("end", () => { try { res(JSON.parse(b)); } catch { res(null); } });
    });
    req.on("error", () => res(null));
    req.on("timeout", () => { req.destroy(); res(null); });
  });
}

(async () => {
  const targets = persons.nodes.filter(p => !p.photo);
  console.log("사진 없는 인물:", targets.map(t => t.id).join(", "));
  let ok = 0;
  for (const p of targets) {
    let got = null;
    for (const [lang, title] of [["ko", p.id], ...(EN[p.id] ? [["en", EN[p.id]]] : [])]) {
      const d = await summary(lang, title);
      const t = d && (d.originalimage || d.thumbnail);
      if (t && t.source && /wikimedia\.org/.test(t.source)) { got = t.source; break; }
      await sleep(2000);
    }
    if (got) {
      p.photo = got.split("?")[0].replace("thumb.wikimedia.org", "upload.wikimedia.org");
      ok++; console.log("✓ " + p.id);
    } else {
      console.log("✗ " + p.id + " — fallback 아바타");
    }
    await sleep(2800);
  }
  fs.writeFileSync(path.join(ROOT, "data", "persons.json"), JSON.stringify(persons, null, 2));
  console.log(`\n${ok}/${targets.length} 수집 — 총 사진 보유 ${persons.nodes.filter(p=>p.photo).length}/${persons.nodes.length}`);
})();
