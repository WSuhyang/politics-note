#!/usr/bin/env node
/**
 * 정리노트 데이터 빌드 스크립트
 * - data/*.json 읽기 → 스키마·참조 무결성 검증 → data.js 번들 생성
 * - 사용: node scripts/build.js
 * - 규칙: 검증 실패 시 data.js를 갱신하지 않고 0이 아닌 종료 코드로 끝남
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUT = path.join(ROOT, "data.js");

const CAMPS = ["dem", "con", "mid"];
const REL_TYPES = ["family", "lineage", "faction", "school", "rival"];
const PLEDGE_STATUS = ["kept", "partial", "broken", "progress"];
const OFFICES = ["president", "assembly", "local", "party"];

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

function load(name) {
  const p = path.join(DATA_DIR, name + ".json");
  if (!fs.existsSync(p)) { fail(`data/${name}.json 없음`); return {}; }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) { fail(`data/${name}.json 파싱 실패: ${e.message}`); return {}; }
}

const persons = load("persons").nodes || [];
const relations = load("relations").edges || [];
const presidents = load("presidents").presidents || [];
const events = load("presidents").events || [];
const yearEvents = load("presidents").yearEvents || [];
const parties = load("parties").parties || [];
const eras = load("parties").eras || [];
const assemblyEras = load("parties").assemblyEras || [];
const pledges = load("pledges").pledges || [];
const comparison = load("pledges").comparison || [];
const glossary = load("glossary").glossary || [];
const newsCollected = load("glossary").newsCollected || "";
const policies = load("policies").policies || [];
const notes = load("notes").notes || {};

// --- persons ---
const ids = new Set();
persons.forEach(p => {
  if (!p.id) return fail(`persons: id 없는 항목 ${JSON.stringify(p).slice(0,50)}`);
  if (ids.has(p.id)) fail(`persons: 중복 id '${p.id}'`);
  ids.add(p.id);
  if (!CAMPS.includes(p.camp)) fail(`persons '${p.id}': camp '${p.camp}' 무효 (dem|con|mid)`);
  if (typeof p.born !== "number") fail(`persons '${p.id}': born 필수(숫자)`);
  if (p.born < 1800 || p.born > 2030) fail(`persons '${p.id}': born ${p.born} 범위 이상`);
  if (p.photo && !/^https:\/\/(upload\.wikimedia\.org|commons\.wikimedia\.org)\//.test(p.photo))
    fail(`persons '${p.id}': photo URL은 위키미디어(upload.wikimedia.org)만 허용 — 저작권 원칙(PLAN.md §5)`);
});

// --- relations ---
relations.forEach(r => {
  if (!ids.has(r.source)) fail(`relations: 없는 인물 참조 source '${r.source}'`);
  if (!ids.has(r.target)) fail(`relations: 없는 인물 참조 target '${r.target}'`);
  if (!REL_TYPES.includes(r.type)) fail(`relations '${r.source}→${r.target}': type '${r.type}' 무효 (${REL_TYPES.join("|")})`);
  if (!Number.isInteger(r.strength) || r.strength < 1 || r.strength > 3) fail(`relations '${r.source}→${r.target}': strength 1~3 정수여야 함`);
  if (r.since != null && (!Number.isInteger(r.since) || r.since < 1900 || r.since > 2030))
    fail(`relations '${r.source}→${r.target}': since는 1900~2030 정수 또는 null`);
  if (!r.relation) warn(`relations '${r.source}→${r.target}': relation 라벨 없음`);
});

// --- presidents ---
const presNames = new Set();
presidents.forEach(p => {
  if (!p.name) fail("presidents: name 없음");
  presNames.add(p.name);
  if (!ids.has(p.name)) fail(`presidents '${p.name}': persons에 없는 인물`);
  if (typeof p.from !== "number" || typeof p.to !== "number") fail(`presidents '${p.name}': from/to 숫자 필수`);
  if (p.to < p.from) fail(`presidents '${p.name}': to < from`);
  if (!CAMPS.includes(p.camp)) fail(`presidents '${p.name}': camp 무효`);
});
["이승만","박정희","김영삼","김대중","노무현","이명박","박근혜","문재인","윤석열","이재명"].forEach(n => {
  if (!presNames.has(n)) warn(`presidents: 주요 대통령 '${n}' 누락`);
});
events.forEach(ev => {
  if (!Number.isInteger(ev.year) || !ev.label) fail(`events: year(정수)/label 필수 — ${JSON.stringify(ev).slice(0,50)}`);
});
yearEvents.forEach(ye => {
  if (!Number.isInteger(ye.year) || !Array.isArray(ye.events) || !ye.events.length)
    fail(`yearEvents: year·events 배열 필수 — ${JSON.stringify(ye).slice(0,50)}`);
});

// --- parties ---
parties.forEach(p => {
  if (!p.name || !p.leader) fail(`parties: name/leader 없음 ${JSON.stringify(p).slice(0,50)}`);
  if (!Number.isInteger(p.seats) || p.seats < 0 || p.seats > 300) fail(`parties '${p.name}': seats 0~300 정수여야 함`);
});
const seatSum = parties.reduce((s, p) => s + p.seats, 0);
if (seatSum > 300) fail(`parties: 의석 합계 ${seatSum} > 300`);
else if (seatSum < 295) warn(`parties: 의석 합계 ${seatSum}/300 — 결원·무소속 ${300-seatSum}석`);

// --- eras (시대별 정당 지도) ---
const eraIds = new Set();
eras.forEach(e => {
  if (!e.id || !e.label) fail(`eras: id/label 없음`);
  if (eraIds.has(e.id)) fail(`eras: 중복 id '${e.id}'`);
  eraIds.add(e.id);
  if (!Array.isArray(e.parties) || !e.parties.length) fail(`eras '${e.id}': parties 배열 필수`);
  const sum = e.parties.reduce((s, p) => s + (p.seats || 0), 0);
  if (sum > 300) fail(`eras '${e.id}': 의석 합계 ${sum} > 300`);
  else if (sum < 295) warn(`eras '${e.id}': 의석 합계 ${sum}/300`);
  e.parties.forEach(p => {
    if (!p.name || typeof p.seats !== "number") fail(`eras '${e.id}': name/seats 무효`);
    if (!p.color) fail(`eras '${e.id}' '${p.name}': color 필수`);
  });
});

// --- assemblyEras (대통령별 국회 구도) ---
const aIds = new Set();
assemblyEras.forEach(a => {
  if (!a.id || !a.label) fail(`assemblyEras: id/label 없음`);
  if (aIds.has(a.id)) fail(`assemblyEras: 중복 id '${a.id}'`);
  aIds.add(a.id);
  if (!Array.isArray(a.presidents) || !a.presidents.length) fail(`assemblyEras '${a.id}': presidents 필수`);
  a.presidents.forEach(n => { if (!presNames.has(n)) fail(`assemblyEras '${a.id}': presidents에 없는 인물 '${n}'`); });
  if (!a.note) warn(`assemblyEras '${a.id}': note 없음`);
  (a.parties || []).forEach(pp => {
    if (!pp.name || !pp.color) fail(`assemblyEras '${a.id}': party name/color 필수`);
    if (a.seats && typeof pp.seats !== "number") fail(`assemblyEras '${a.id}' '${pp.name}': seats=true인데 seats 숫자 없음`);
  });
});
const presCovered = new Set(assemblyEras.flatMap(a => a.presidents));
DB_pres_check: presidents.forEach(p => { if (typeof p.n === "number" && !presCovered.has(p.name)) warn(`assemblyEras: 대통령 '${p.name}'의 국회 구도 없음`); });

// --- pledges ---
pledges.forEach(pl => {
  if (!ids.has(pl.politician) && pl.office !== "party")
    warn(`pledges '${pl.politician}': persons에 없는 인물 (정당 단위면 무관)`);
  if (pl.office && !OFFICES.includes(pl.office))
    fail(`pledges '${pl.politician}': office '${pl.office}' 무효 (${OFFICES.join("|")})`);
  if (!pl.office) fail(`pledges '${pl.politician}': office 필수`);
  if (!pl.real || !pl.real.src) fail(`pledges '${pl.politician}': real.src(출처) 필수`);
  if (pl.real.rate != null && pl.real.total == null) fail(`pledges '${pl.politician}': rate 있는데 total 없음`);
  (pl.items || []).forEach(it => {
    if (!PLEDGE_STATUS.includes(it.status)) fail(`pledges '${pl.politician}' '${it.title}': status '${it.status}' 무효`);
    if (!it.note) warn(`pledges '${pl.politician}' '${it.title}': note(근거) 없음`);
  });
});

// --- glossary ---
const seen = new Set();
glossary.forEach(g => {
  if (!g.t || !g.d) fail("glossary: t/d 없음");
  if (seen.has(g.t)) fail(`glossary: 중복 용어 '${g.t}'`);
  seen.add(g.t);
});

// --- notes ---
Object.keys(notes).forEach(k => {
  if (!ids.has(k)) fail(`notes: persons에 없는 키 '${k}'`);
  if (!Array.isArray(notes[k].sections)) fail(`notes '${k}': sections 배열 필수`);
});

// --- policies (정책백과) ---
const POLICY_STATUS = ["완료", "진행", "일부수정", "중단", "계승", "논란"];
const pIds = new Set();
policies.forEach(po => {
  if (!po.id || !po.title) fail(`policies: id/title 없음 ${JSON.stringify(po).slice(0,50)}`);
  if (pIds.has(po.id)) fail(`policies: 중복 id '${po.id}'`);
  pIds.add(po.id);
  if (!po.cat) fail(`policies '${po.id}': cat 필수`);
  if (!POLICY_STATUS.includes(po.status)) fail(`policies '${po.id}': status '${po.status}' 무효 (${POLICY_STATUS.join("|")})`);
  if (!Array.isArray(po.politicians) || !po.politicians.length) fail(`policies '${po.id}': politicians 배열 필수`);
  po.politicians.forEach(n => { if (!ids.has(n)) fail(`policies '${po.id}': 없는 인물 '${n}'`); });
  if (!po.summary || !po.bg || !po.content || !po.result || !po.src) fail(`policies '${po.id}': summary/bg/content/result/src 필수`);
  if (!Number.isInteger(po.year)) fail(`policies '${po.id}': year 정수 필수`);
});

// --- 결과 ---
console.log(`인물 ${persons.length} · 관계 ${relations.length} · 대통령 ${presidents.length} · 정당 ${parties.length}(${seatSum}석) · 공약 ${pledges.length} · 용어 ${glossary.length} · 노트 ${Object.keys(notes).length}`);
warnings.forEach(w => console.log("  ⚠ " + w));

if (errors.length) {
  console.error("\n✗ 검증 실패 — data.js를 갱신하지 않음:");
  errors.forEach(e => console.error("  ✗ " + e));
  process.exit(1);
}

const bundle = `// 자동 생성 — 직접 편집 금지. data/*.json 수정 후 node scripts/build.js 실행\nwindow.DB = ${JSON.stringify({
  graph: { nodes: persons, edges: relations },
  presidents, events, yearEvents, parties, eras, assemblyEras, pledges, comparison, glossary, newsCollected, notes, policies,
  meta: { builtAt: new Date().toISOString().slice(0, 10) }
}, null, 0)};\n`;
fs.writeFileSync(OUT, bundle, "utf8");
console.log(`✓ 검증 통과 → ${path.relative(ROOT, OUT)} 갱신 (${(bundle.length / 1024).toFixed(1)} KB)`);
