#!/usr/bin/env node
/** 용어별 최근 뉴스 3개 수집 (Google News RSS) → glossary.json의 news 필드에 기록 */
const https = require("https");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const g = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "glossary.json"), "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function rss(q) {
  const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=ko&gl=KR&ceid=KR:ko";
  return new Promise(res => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 politics-note/0.3" }, timeout: 15000 }, r => {
      if (r.statusCode !== 200) { r.resume(); return res(null); }
      let b = ""; r.on("data", c => b += c);
      r.on("end", () => res(b));
    }).on("error", () => res(null));
  });
}
function parse(xml) {
  if (!xml) return [];
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < 3) {
    const blk = m[1];
    const t = blk.match(/<title>([\s\S]*?)<\/title>/);
    const l = blk.match(/<link>([\s\S]*?)<\/link>/);
    const d = blk.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const s = blk.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    if (t && l) items.push({
      title: t[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(),
      link: l[1].trim(),
      date: d ? new Date(d[1]).toISOString().slice(0, 10) : "",
      source: s ? s[1].trim() : "Google News"
    });
  }
  return items;
}

(async () => {
  const collected = new Date().toISOString().slice(0, 10);
  let ok = 0;
  for (const term of g.glossary) {
    const xml = await rss(term.q || term.t);
    term.news = parse(xml);
    if (term.news.length) ok++;
    console.log(`${term.news.length ? "✓" : "✗"} ${term.t} — ${term.news.length}건`);
    await sleep(1200);
  }
  g.newsCollected = collected;
  fs.writeFileSync(path.join(ROOT, "data", "glossary.json"), JSON.stringify(g, null, 2), "utf8");
  console.log(`\n${ok}/${g.glossary.length} 용어 뉴스 수집 완료 (${collected})`);
})();
