// 정치백과 v6 시안 — 인물 중심 뷰 로직 (목업)
(function () {
  'use strict';
  var DB = window.DB, SAMPLE = window.SAMPLE || {};
  var NODES = DB.graph.nodes, EDGES = DB.graph.edges;
  var NOTES = DB.notes || {}, POLICIES = DB.policies || [], PLEDGES = DB.pledges || [], GLOSSARY = DB.glossary || [];
  var byId = {};
  NODES.forEach(function (n) { byId[n.id] = n; });
  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  var GROUP = { faction: 'ally', lineage: 'ally', rival: 'rival', family: 'tie', school: 'tie' };
  var TYPE_LABEL = { family: '혈연·가족', lineage: '계보·후계', faction: '동맹·협력', school: '동문·동료', rival: '갈등·경쟁' };
  var GNAME = { ally: '함께한 길', rival: '대립·경쟁', tie: '연결고리' };
  var FEATURED = ['이준석', '이재명', '윤석열', '한동훈', '오세훈', '김문수', '안철수', '홍준표', '유승민', '나경원', '조국', '이낙연', '박지현', '문재인', '박근혜', '노무현'];

  var CUR = null, HIST = [], HOT = null, DEFAULT_EX = '', EXPANDED = {}, CUR_G = null;

  // ── 데이터 조립 ──
  function relationsOf(id) {
    var s = SAMPLE[id], R;
    if (s) {
      R = s.relations.map(function (r) { return Object.assign({}, r); });
    } else {
      R = EDGES.filter(function (e) { return e.source === id || e.target === id; }).map(function (e) {
        var who = e.source === id ? e.target : e.source;
        return { who: who, type: e.type, label: e.relation, since: e.since, until: e.until || '', detail: e.detail || '', strength: e.strength || 0 };
      });
    }
    return R;
  }
  function notesOf(id) {
    var raw = NOTES[id];
    return raw && raw.sections ? raw.sections : [];
  }
  function textsOf(id) {
    var s = SAMPLE[id], out = [], n = byId[id];
    if (s) {
      out.push(s.tagline);
      s.relations.forEach(function (r) { out.push(r.label || ''); out.push(r.detail || ''); });
      s.timeline.forEach(function (t) { out.push(t.t); });
      (s.issues || []).forEach(function (i) { out.push(i.t); });
      (s.policies || []).forEach(function (p) { out.push(p.title); out.push(p.note || ''); });
    }
    if (n) { out.push(n.edu || ''); out.push(n.event || ''); }
    notesOf(id).forEach(function (sec) {
      out.push(sec[0] || '');
      (sec[1] || []).forEach(function (it) { out.push(String(it)); });
    });
    return out.filter(Boolean);
  }

  // ── 용어(맥락 사전): 본문 속 용어 탐지 ──
  var TERM_ALIASES = [];
  GLOSSARY.forEach(function (g) {
    [g.t].concat(String(g.t).split(' / ')).forEach(function (nm) {
      nm = nm.trim();
      if (nm) TERM_ALIASES.push({ nm: nm, t: g.t });
    });
  });
  TERM_ALIASES.sort(function (a, b) { return b.nm.length - a.nm.length; });
  function aliasRe(a, global) {
    var ascii = a.nm.length <= 2 && /[A-Za-z]/.test(a.nm);
    var src = ascii ? '(?<![A-Za-z])' + escRe(a.nm) + '(?![A-Za-z])' : escRe(a.nm);
    return new RegExp(src, global ? 'g' : '');
  }
  var PERSON_TERMS = {}, TERM_PEOPLE = {};
  NODES.forEach(function (n) {
    var txt = textsOf(n.id).join('\n'), hits = [], seen = {};
    TERM_ALIASES.forEach(function (a) {
      var idx = txt.search(aliasRe(a, false));
      if (idx >= 0) hits.push({ t: a.t, i: idx });
    });
    hits.sort(function (x, y) { return x.i - y.i; });
    PERSON_TERMS[n.id] = hits.map(function (h) { return h.t; }).filter(function (t) {
      if (seen[t]) return false;
      seen[t] = true;
      return true;
    });
    PERSON_TERMS[n.id].forEach(function (t) {
      if (!TERM_PEOPLE[t]) TERM_PEOPLE[t] = [];
      TERM_PEOPLE[t].push(n.id);
    });
  });
  function termify(text) {
    var s = String(text), hits = [], used = [], out = '', i = 0, m, a, k;
    for (k = 0; k < TERM_ALIASES.length; k++) {
      a = TERM_ALIASES[k];
      var re = aliasRe(a, true);
      while ((m = re.exec(s)) !== null) {
        hits.push({ s: m.index, e: m.index + m[0].length, t: a.t });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
    hits.sort(function (x, y) { return (y.e - y.s) - (x.e - x.s) || x.s - y.s; });
    hits = hits.filter(function (h) {
      for (var j = 0; j < used.length; j++) { if (h.s < used[j].e && h.e > used[j].s) return false; }
      used.push(h);
      return true;
    }).sort(function (x, y) { return x.s - y.s; });
    hits.forEach(function (h) {
      out += esc(s.slice(i, h.s)) + '<button class="term" data-term="' + esc(h.t) + '">' + esc(s.slice(h.s, h.e)) + '</button>';
      i = h.e;
    });
    return out + esc(s.slice(i));
  }

  // ── 조각 HTML ──
  function av(id, cls, eager) {
    var n = byId[id];
    if (n && n.photo) return '<img src="' + esc(n.photo) + '" alt=""' + (eager ? '' : ' loading="lazy"') + (cls ? ' class="' + cls + '"' : '') + '>';
    return '<span class="ph ' + (cls || '') + '">' + esc(id.slice(-2)) + '</span>';
  }
  function partyOf(n) { return (n.party || '').replace(/\(.*\)$/, ''); }
  function spanOf(r) {
    if (!r.since) return '';
    return r.until ? r.since + '~' + r.until : r.since + '년~';
  }
  function chipHTML(r, cls) {
    return '<button class="chip ' + cls + '" data-go="' + esc(r.who) + '">' + av(r.who) +
      '<span><b>' + esc(r.who) + '</b><small>' + esc(r.label || TYPE_LABEL[r.type] || '') + '</small>' +
      (r.since ? '<span class="since">' + spanOf(r) + '</span>' : '') + '</span></button>';
  }
  function explainDefault(id, R) {
    var c = { ally: 0, rival: 0, tie: 0 };
    R.forEach(function (r) { c[GROUP[r.type] || 'tie']++; });
    var last = R.slice().sort(function (a, b) { return (b.since || 0) - (a.since || 0); })[0];
    var h = '<b>' + esc(id) + '</b>의 직접 관계 <b>' + R.length + '</b>건 — 함께한 길 ' + c.ally +
      ' · 대립·경쟁 ' + c.rival + ' · 연결고리 ' + c.tie;
    if (last && last.since) {
      h += '<div>가장 최근: <b>' + esc(last.who) + '</b> — ' + esc(last.label) +
        '<span class="when">' + last.since + '년부터</span></div>';
    }
    return h;
  }
  function explainRel(r) {
    var g = GROUP[r.type] || 'tie';
    return '<span class="k ' + g + '">' + GNAME[g] + '</span><b>' + esc(r.who) + '</b>' +
      (r.label ? ' — ' + esc(r.label) : '') +
      (r.since ? '<span class="when">' + spanOf(r) + '</span>' : '') +
      (r.detail ? '<div class="d">' + termify(r.detail) + '</div>' : '');
  }
  function rowHTML(cur, r) {
    var around = relationsOf(r.who).filter(function (x) { return x.who !== cur; });
    var desc = r.detail ? termify(r.detail) : esc(r.label || '');
    return '<div class="rrow">' + av(r.who) + '<div class="rt"><b data-go="' + esc(r.who) + '">' + esc(r.who) + '</b>' +
      '<span class="tp">' + esc(TYPE_LABEL[r.type] || '') + '</span>' +
      (r.since ? '<span class="tp">' + spanOf(r) + '</span>' : '') +
      '<p>' + desc + '</p>' +
      (around.length ?
        '<div class="more" data-around="' + esc(r.who) + '">주변 보기 ' + around.length + '건 ▾</div>' +
        '<div class="around" id="around-' + esc(r.who) + '"><span class="lbl">' + esc(r.who) + '의 다른 관계</span>' +
        around.map(function (x) {
          return '<button data-go="' + esc(x.who) + '">' + esc(x.who) + (x.label ? ' · ' + esc(x.label) : '') + '</button>';
        }).join('') + '</div>' : '') +
      '</div></div>';
  }
  function timelineOf(id) {
    var s = SAMPLE[id], n = byId[id], items = [];
    if (s) return s.timeline.map(function (t) { return { y: t.y, t: termify(t.t) }; });
    notesOf(id).forEach(function (sec) {
      (sec[1] || []).forEach(function (it) {
        var str = String(it), m = str.match(/^(\d{4}(?:\.\d{1,2})?)/);
        items.push({ y: m ? m[1] : '', t: termify(str) });
      });
    });
    if (!items.length) {
      if (n.edu) items.push({ y: '', t: termify(n.edu) });
      if (n.event) items.push({ y: '', t: termify(n.event) });
    }
    return items;
  }
  function sideHTML(id) {
    var s = SAMPLE[id], h = '', ps, pl, sec, iss;
    if (s) {
      h += '<div class="rgroup"><h5>내세운 정책 · 공약</h5><ul class="pl">' + s.policies.map(function (p) {
        return '<li><span class="yr">' + esc(p.year) + '</span><b>' + esc(p.title) + '</b><p>' + esc(p.note) + '</p></li>';
      }).join('') + '</ul></div>';
    } else {
      ps = POLICIES.filter(function (p) { return (p.politicians || []).indexOf(id) >= 0; });
      if (ps.length) {
        h += '<div class="rgroup"><h5>주요 정책 <span class="n">' + ps.length + '</span></h5><ul class="pl">' + ps.map(function (p) {
          return '<li><span class="yr">' + esc(p.year) + '</span><b>' + esc(p.title) + '</b><p>' + esc(p.summary || '') + '</p></li>';
        }).join('') + '</ul></div>';
      }
    }
    pl = PLEDGES.filter(function (p) { return p.politician === id; })[0];
    if (pl) {
      var it = (pl.items || []).length, rate = pl.real && (pl.real.rateLabel || pl.real.rate);
      h += '<div class="rgroup"><h5>공약 이행도</h5><ul class="pl"><li><span class="yr">' + esc(pl.meta || '') + '</span><b>' +
        (rate ? esc(String(rate)) : '집계 예정') + '</b><p>공약 ' + it + '항목' +
        (pl.real && pl.real.total ? ' · 전체 ' + pl.real.total + '건' : '') + '</p></li></ul></div>';
    }
    iss = [];
    if (s) iss = s.issues || [];
    else {
      sec = notesOf(id).filter(function (x) { return /사건|논란/.test(x[0] || ''); })[0];
      if (sec) iss = (sec[1] || []).map(function (t) { return { y: '', t: String(t) }; });
    }
    if (iss.length) {
      h += '<div class="rgroup"><h5>주요 쟁점</h5><ul class="pl">' + iss.map(function (i) {
        return '<li>' + (i.y ? '<span class="yr">' + esc(i.y) + '</span>' : '') + termify(i.t) + '</li>';
      }).join('') + '</ul></div>';
    }
    return h || '<p class="none">—</p>';
  }
  function srcShort(id) {
    return SAMPLE[id] ? '위키백과 · 2026.11.24 열람' : '위키백과 · 데이터 기준 ' + (DB.meta.builtAt || '');
  }
  function srcLine(id) {
    if (SAMPLE[id]) return '위키백과 ‘이준석’(2026.11.24 열람) · 관계·행적 정리: 정치백과(수집일 2026.11.24)';
    return '위키백과 · 데이터 기준 ' + (DB.meta.builtAt || '') + ' · 사진: Wikimedia Commons';
  }

  // ── 렌더 ──
  function renderRail() {
    var list = FEATURED.indexOf(CUR) >= 0 ? FEATURED : [CUR].concat(FEATURED);
    $('#rail').innerHTML = '<span class="lbl">주요 인물</span>' + list.map(function (id) {
      return '<button data-go="' + esc(id) + '"' + (id === CUR ? ' class="on"' : '') + '>' + av(id) + esc(id) + '</button>';
    }).join('');
  }
  function render(id, push) {
    if (push === undefined) push = true;
    if (!byId[id]) return;
    if (push && CUR && CUR !== id) HIST.push(CUR);
    CUR = id;
    var n = byId[id], s = SAMPLE[id], R = relationsOf(id);
    var g = { ally: [], rival: [], tie: [] };
    R.forEach(function (r) { g[GROUP[r.type] || 'tie'].push(r); });
    renderRail();
    var prev = HIST[HIST.length - 1];
    var facts = [
      ['소속', n.party], ['출생', n.born ? n.born + '년생' + (n.died ? ' ~ ' + n.died : '') : ''],
      ['직급', n.role], ['대통령', n.president], ['학력', n.edu]
    ].filter(function (f) { return f[1]; });
    var tagline = '';
    if (s) tagline = s.tagline;
    else {
      var ns = notesOf(id), first = ns[0] && ns[0][1] && ns[0][1][0];
      tagline = first ? String(first) : ((n.edu || '') + (n.event ? ' · ' + n.event : ''));
    }
    var terms = PERSON_TERMS[id] || [];
    var born = n.born ? n.born + '년생' + (n.died ? ' ~ ' + n.died : '') : '';
    var H = [];
    if (prev) H.push('<button class="back" data-go="' + esc(prev) + '">← ' + esc(prev) + '</button>');
    H.push('<article class="hero fade">' + av(id, 'photo', true) + '<div><h2>' + esc(id) + '</h2>');
    H.push('<div class="meta"><span class="camp ' + esc(n.camp || 'mid') + '">' + esc(partyOf(n)) + '</span>' +
      (born ? '<span>' + born + '</span>' : '') + (n.role ? '<span>' + esc(n.role) + '</span>' : '') +
      (n.president ? '<span>' + esc(n.president) + ' 대통령</span>' : '') + '</div>');
    H.push('<p class="tagline">' + esc(tagline) + '</p>');
    H.push('<div class="facts">' + facts.map(function (f) { return '<div><b>' + f[0] + '</b>' + esc(f[1]) + '</div>'; }).join('') + '</div>');
    H.push('</div></article>');
    H.push('<section class="card fade">');
    H.push('<div class="card-h"><h3>관계</h3><span class="sub">1촌 관계 ' + R.length + '명 · 함께 ' + g.ally.length +
      ' · 대립 ' + g.rival.length + ' · 연결고리 ' + g.tie.length + '</span>');
    H.push('<span class="legend"><span><i></i>함께한 길</span><span><i class="r"></i>대립·경쟁</span><span><i class="t"></i>연결고리</span></span></div>');
    H.push('<div class="ego" id="ego"><svg class="wires" id="wires"></svg>');
    H.push('<div class="col c-ally"><h4>함께한 길<em>' + g.ally.length + '</em></h4>' + chips(g.ally, 'ally') + '</div>');
    H.push('<div class="center"><div class="ccard" id="ccard">' + av(id, '', true) + '<b>' + esc(id) + '</b><span>1촌 관계 ' + R.length + '명</span></div></div>');
    H.push('<div class="col c-rival"><h4>대립·경쟁<em>' + g.rival.length + '</em></h4>' + chips(g.rival, 'rival') + '</div>');
    H.push('<div class="ties"><h4>연결고리<em>' + g.tie.length + '</em></h4>' + chips(g.tie, 'tie') + '</div>');
    H.push('</div><div class="explain" id="explain"></div></section>');
    H.push('<div class="grid3 fade">');
    H.push('<section class="card"><div class="card-h"><h3>관계 자세히</h3></div><div class="body" id="rlist"></div></section>');
    H.push('<section class="card"><div class="card-h"><h3>주요 행적</h3><span class="sub">' + esc(srcShort(id)) + '</span></div><div class="body"><ol class="tl" id="tl"></ol></div></section>');
    H.push('<section class="card"><div class="card-h"><h3>정책 · 공약 · 쟁점</h3></div><div class="body" id="side"></div></section>');
    H.push('</div>');
    H.push('<section class="card terms fade"><div class="card-h"><h3>이 인물에서 나온 용어</h3><span class="sub">본문 속 ' + terms.length + '개</span></div><div class="body">' +
      (terms.map(function (t) { return '<button class="tchip" data-term="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') || '<span class="none">—</span>') + '</div></section>');
    H.push('<p class="src">출처: ' + esc(srcLine(id)) + '</p>');
    $('#page').innerHTML = H.join('');
    var rows = '';
    ['ally', 'rival', 'tie'].forEach(function (k) {
      if (!g[k].length) return;
      rows += '<div class="rgroup"><h5 class="' + k + '">' + GNAME[k] + ' <span class="n">' + g[k].length + '</span></h5>' +
        g[k].map(function (r) { return rowHTML(id, r); }).join('') + '</div>';
    });
    $('#rlist').innerHTML = rows || '<p class="none">—</p>';
    var tl = timelineOf(id);
    $('#tl').innerHTML = tl.map(function (t) { return '<li><time>' + esc(t.y) + '</time><p>' + t.t + '</p></li>'; }).join('') || '<li><p class="none">—</p></li>';
    $('#side').innerHTML = sideHTML(id);
    DEFAULT_EX = explainDefault(id, R);
    $('#explain').innerHTML = DEFAULT_EX;
    HOT = null;
    EXPANDED = {}; CUR_G = g;
    closePop();
    requestAnimationFrame(wires);
  }

  // ── 관계 선 그리기 · 호버 ──
  function wires() {
    var ego = $('#ego'), svg = $('#wires'), cc = $('#ccard');
    if (!ego || !svg || !cc) return;
    var E = ego.getBoundingClientRect(), C = cc.getBoundingClientRect();
    var xa = C.left - E.left, xb = C.right - E.left;
    var cy = (C.top + C.bottom) / 2 - E.top, cb = C.bottom - E.top, cxm = (xa + xb) / 2;
    var sides = { ally: [], rival: [], tie: [] }, d = '';
    ego.querySelectorAll('.chip').forEach(function (ch) {
      var r = ch.getBoundingClientRect();
      if (!r.width) return;
      var cls = ['ally', 'rival', 'tie'].filter(function (c) { return ch.classList.contains(c); })[0];
      if (cls) sides[cls].push({ ch: ch, top: r.top - E.top, bottom: r.bottom - E.top, left: r.left - E.left, right: r.right - E.left });
    });
    ['ally', 'rival'].forEach(function (k) {
      var arr = sides[k].sort(function (p, q) { return p.top - q.top; }), n = arr.length;
      var step = n > 1 ? Math.min(30, C.height * 0.6 / (n - 1)) : 0;
      arr.forEach(function (it, i) {
        var y0 = cy + (i - (n - 1) / 2) * step;
        var x0 = k === 'ally' ? xa : xb;
        var x = k === 'ally' ? it.right : it.left;
        var y = (it.top + it.bottom) / 2;
        var dx = Math.max(30, Math.abs(x - x0) * 0.55);
        var c1x = x0 + (k === 'rival' ? dx : -dx), c2x = x - (k === 'rival' ? dx : -dx);
        d += '<path class="' + k + '" data-k="' + esc(it.ch.dataset.go) + '" d="M' + x0 + ' ' + y0 + ' C' + c1x + ' ' + y0 +
          ', ' + c2x + ' ' + y + ', ' + x + ' ' + y + '"/>';
      });
    });
    sides.tie.sort(function (p, q) { return p.left - q.left; }).forEach(function (it) {
      var x = (it.left + it.right) / 2, y = it.top;
      var dy = Math.max(20, Math.abs(y - cb) * 0.6);
      d += '<path class="tie" data-k="' + esc(it.ch.dataset.go) + '" d="M' + cxm + ' ' + cb + ' C' + cxm + ' ' + (cb + dy) +
        ', ' + x + ' ' + (y - dy) + ', ' + x + ' ' + y + '"/>';
    });
    svg.innerHTML = d;
    svg.setAttribute('viewBox', '0 0 ' + E.width + ' ' + E.height);
  }
  function focusRel(who) {
    var ego = $('#ego');
    if (!ego) return;
    ego.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('hot', !!who && c.dataset.go === who); });
    document.querySelectorAll('#wires path').forEach(function (p) {
      p.classList.toggle('hot', !!who && p.dataset.k === who);
      p.classList.toggle('dim', !!who && p.dataset.k !== who);
    });
    var r = who ? relationsOf(CUR).filter(function (x) { return x.who === who; })[0] : null;
    $('#explain').innerHTML = r ? explainRel(r) : DEFAULT_EX;
  }

  // ── 용어 풍선 ──
  function openPop(el) {
    var t = el.dataset.term, g = GLOSSARY.filter(function (x) { return x.t === t; })[0];
    if (!g) return;
    var people = (TERM_PEOPLE[t] || []).filter(function (p) { return p !== CUR; });
    var pop = $('#pop');
    pop.hidden = false;
    pop.innerHTML = '<b>' + esc(g.t) + '</b><span class="cat">' + esc(g.cat || '') + '</span><p>' + esc(g.d) + '</p>' +
      (people.length ? '<div class="who"><span class="l">이 용어가 나오는 다른 인물 ' + people.length + '명</span>' +
        people.slice(0, 8).map(function (p) { return '<span class="p" data-go="' + esc(p) + '">' + esc(p) + '</span>'; }).join('') +
        (people.length > 8 ? '<span class="p" style="cursor:default">+' + (people.length - 8) + '</span>' : '') + '</div>' : '');
    var r = el.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight, vw = innerWidth, vh = innerHeight;
    var left = Math.min(Math.max(12, r.left), vw - pw - 12);
    var top = r.bottom + 8;
    if (top + ph > vh - 12) top = Math.max(12, r.top - ph - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function closePop() { $('#pop').hidden = true; }

  // ── 이동 ──
  function go(id) {
    if (!byId[id]) return;
    render(id);
    var h = document.querySelector('.hero');
    if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    DROP.classList.remove('open');
    Q.value = '';
    Q.blur();
  }

  // ── 검색 ──
  var Q = $('#q'), DROP = $('#drop');
  function searchList(q) {
    q = q.trim();
    var list = NODES.filter(function (n) {
      return !q || n.id.indexOf(q) >= 0 || (n.party || '').indexOf(q) >= 0 || (n.role || '').indexOf(q) >= 0 || (n.event || '').indexOf(q) >= 0;
    });
    var picked = q ? list : NODES.filter(function (n) { return FEATURED.indexOf(n.id) >= 0; });
    return picked.slice(0, q ? 12 : FEATURED.length);
  }
  function showDrop() {
    var list = searchList(Q.value);
    DROP.innerHTML = list.map(function (n) {
      return '<button data-go="' + esc(n.id) + '">' + av(n.id) + '<span>' + esc(n.id) + '</span><small>' + esc(partyOf(n)) + '</small></button>';
    }).join('') || '<div class="empty">결과 없음</div>';
    DROP.classList.add('open');
  }
  Q.addEventListener('input', showDrop);
  Q.addEventListener('focus', showDrop);
  Q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var b = DROP.querySelector('button'); if (b) go(b.dataset.go); }
  });
  Q.addEventListener('blur', function () { setTimeout(function () { DROP.classList.remove('open'); }, 120); });

function chips(list, cls) {
  var CAP = 6, full = EXPANDED[cls];
  var arr = list.slice().sort(function (a, b) { return (b.strength - a.strength) || ((b.since || 0) - (a.since || 0)); });
  var html = (full ? arr : arr.slice(0, CAP)).map(function (r) { return chipHTML(r, cls); }).join('') || '<span class="none">—</span>';
  if (!full && arr.length > CAP) html += '<button class="more more-chips" data-more="' + cls + '">+ ' + (arr.length - CAP) + '명 더 보기</button>';
  return '<div class="chips">' + html + '</div>';
}

  // ── 이벤트 위임 ──
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.term,.tchip');
    if (t) { openPop(t); return; }
    var a = e.target.closest('[data-around]');
    if (a) {
      var box = document.getElementById('around-' + a.dataset.around);
      if (box) box.classList.toggle('open');
      a.textContent = box && box.classList.contains('open') ? '주변 보기 ▴' : '주변 보기 ' + (box ? box.querySelectorAll('button').length : 0) + '건 ▾';
      return;
    }
    var mc = e.target.closest('[data-more]');
    if (mc) {
      var k = mc.dataset.more; EXPANDED[k] = true;
      mc.closest('.chips').outerHTML = chips(CUR_G[k], k);
      requestAnimationFrame(wires);
      return;
    }
    var g = e.target.closest('[data-go]');
    if (g) { go(g.dataset.go); return; }
    if (!e.target.closest('#pop')) closePop();
  });
  $('#page').addEventListener('mouseover', function (e) {
    var ch = e.target.closest('#ego .chip');
    if (!ch || ch === HOT) return;
    HOT = ch;
    focusRel(ch.dataset.go);
  });
  $('#page').addEventListener('mouseout', function (e) {
    var ch = e.target.closest('#ego .chip');
    if (ch && !ch.contains(e.relatedTarget)) { HOT = null; focusRel(null); }
  });
  var RT = null;
  addEventListener('resize', function () { clearTimeout(RT); RT = setTimeout(wires, 120); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePop(); DROP.classList.remove('open'); } });

  $('#date').textContent = (DB.meta.builtAt || '').replace(/-/g, '.');
  render('이준석', false);
})();
