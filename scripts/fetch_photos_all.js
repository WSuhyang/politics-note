#!/usr/bin/env node
/** 사진 없는 인물 전원 채우기: ko위키 → en위키(로마자) → Commons 검색 (국회 공식 초상 공공누리 다수) */
const https = require("https");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const persons = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "persons.json"), "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const EN = {
  "유승민":"Yoo Seung-min", "송영길":"Song Young-gil", "박지현":"Park Ji-hyun (politician)",
  "박영선":"Park Young-sun", "이인영":"Lee In-young", "김민석":"Kim Min-seok (politician)",
  "정청래":"Jung Cheong-rae", "박찬대":"Park Chan-dae", "하태경":"Ha Tae-kyung",
  "권성동":"Kwon Sung-dong", "박광온":"Park Kwang-on", "김동연":"Kim Dong-yeon",
  "김한길":"Kim Han-gil", "김기현":"Kim Gi-hyeon", "박범계":"Park Beom-kye"
};

function get(url) {
  return new Promise(res => {
    const req = https.get(url, { headers: { "User-Agent": "politics-note/0.4 (educational; contact n/a)" }, timeout: 15000 }, r => {
      if (r.statusCode !== 200) { r.resume(); return res(null); }
      let b = ""; r.on("data", c => b += c);
      r.on("end", () => { try { res(JSON.parse(b)); } catch { res(null); } });
    });
    req.on("error", () => res(null));
    req.on("timeout", () => { req.destroy(); res(null); });
  });
}
const okUrl = u => u && /upload\.wikimedia\.org|commons\.wikimedia\.org/.test(u) ? u.split("?")[0].replace("thumb.wikimedia.org","upload.wikimedia.org") : null;

async function fromWiki(lang, title) {
  const d = await get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`);
  const t = d && (d.originalimage || d.thumbnail);
  return t ? okUrl(t.source) : null;
}
async function fromCommons(name) {
  const d = await get("https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
    encodeURIComponent(name + " politician Korea") + "&gsrlimit=8&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json");
  if (!d || !d.query || !d.query.pages) return null;
  const pages = Object.values(d.query.pages).filter(p => /\.(jpe?g|png)$/i.test(p.title || ""));
  for (const p of pages) {
    const ii = p.imageinfo && p.imageinfo[0];
    if (!ii) continue;
    // 얼굴 사진일 확률 높은 파일명 필터(부제외: 로고/지도/건물)
    if (/logo|map|flag|building|assembly|hall|poster/i.test(p.title)) continue;
    if (ii.thumburl) return okUrl(ii.thumburl);
    if (ii.url && /commons\.wikimedia/.test(ii.url)) return okUrl(ii.url);
  }
  return null;
}

(async () => {
  const targets = persons.nodes.filter(p => !p.photo);
  console.log("대상:", targets.length, "—", targets.map(t => t.id).join(", "));
  let ok = 0;
  for (const p of targets) {
    let got = await fromWiki("ko", p.id);
    if (!got && EN[p.id]) { await sleep(2200); got = await fromWiki("en", EN[p.id]); }
    if (!got) { await sleep(2200); got = await fromCommons(p.id); }
    if (!got) { await sleep(2200); got = await fromCommons(p.id + " 국회의원"); }
    if (got) { p.photo = got; ok++; console.log("✓ " + p.id + " ← " + got.slice(-60)); }
    else console.log("✗ " + p.id);
    await sleep(2800);
  }
  fs.writeFileSync(path.join(ROOT, "data", "persons.json"), JSON.stringify(persons, null, 2));
  console.log(`\n${ok}/${targets.length} — 전체 ${persons.nodes.filter(x=>x.photo).length}/${persons.nodes.length}`);
})();
