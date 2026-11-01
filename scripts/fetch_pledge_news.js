#!/usr/bin/env node
/** 공약 항목별 최근 뉴스 2건 수집 (Google News RSS) → pledges.json 각 item.news에 기록 */
const https = require("https");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const P = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "pledges.json"), "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function rss(q) {
  const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=ko&gl=KR&ceid=KR:ko";
  return new Promise(res => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 politics-note" }, timeout: 15000 }, r => {
      if (r.statusCode !== 200) { r.resume(); return res(null); }
      let b = ""; r.on("data", c => b += c); r.on("end", () => res(b));
    }).on("error", () => res(null));
  });
}
function parse(xml) {
  if (!xml) return [];
  const items = []; const re = /<item>([\s\S]*?)<\/item>/g; let m;
  const clean = s => s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
  while ((m = re.exec(xml)) && items.length < 2) {
    const t = m[1].match(/<title>([\s\S]*?)<\/title>/);
    const l = m[1].match(/<link>([\s\S]*?)<\/link>/);
    const d = m[1].match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const s = m[1].match(/<source[^>]*>([\s\S]*?)<\/source>/);
    if (t && l) items.push({ title: clean(t[1]), link: l[1].trim(), date: d ? new Date(d[1]).toISOString().slice(0,10) : "", source: s ? clean(s[1]) : "" });
  }
  return items;
}

(async () => {
  const collected = new Date().toISOString().slice(0, 10);
  for (const pl of P.pledges) {
    for (const it of pl.items) {
      // 검색어: 정치인(또는 정당) + 공약 제목 핵심어
      const key = it.title.replace(/\(.*?\)/g, "").slice(0, 18);
      const q = `${pl.politician} ${key}`;
      const news = parse(await rss(q));
      it.news = news;
      console.log(`${news.length ? "✓" : "✗"} ${pl.politician} — ${it.title.slice(0,20)} (${news.length}건)`);
      await sleep(1500);
    }
  }
  P.newsCollected = collected;
  fs.writeFileSync(path.join(ROOT, "data", "pledges.json"), JSON.stringify(P, null, 2), "utf8");
  const total = P.pledges.reduce((s,p)=>s+p.items.reduce((s2,i)=>s2+(i.news?i.news.length:0),0),0);
  console.log(`\n총 ${total}건 뉴스 수집 (${collected})`);
})();
