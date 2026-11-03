#!/usr/bin/env node
/** 사진 URL 정규화: thumb.wikimedia.org → upload.wikimedia.org, utm 제거, /wikipedia/ 경로 확정 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const persons = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "persons.json"), "utf8"));
let n = 0;
for (const p of persons.nodes) {
  if (!p.photo) continue;
  let u = p.photo.split("?")[0].replace(/^https:\/\/thumb\.wikimedia\.org/, "https://upload.wikimedia.org");
  if (u !== p.photo) { p.photo = u; n++; }
}
fs.writeFileSync(path.join(ROOT, "data", "persons.json"), JSON.stringify(persons, null, 2));
console.log("정규화:", n, "건 · 비위키 URL:", persons.nodes.filter(p => p.photo && !p.photo.includes("upload.wikimedia.org")).length);
