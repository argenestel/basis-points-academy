(function () {
  "use strict";
  var UNITS = window.BP_UNITS, TL = window.BP_TIMELINE, TLTAGS = window.BP_TIMELINE_TAGS, GL = window.BP_GLOSSARY, BUILDS = window.BP_BUILDS;
  var TRACKS = window.BP_TRACKS || [{ id: "all", t: "Full course", who: "", units: null }];
  var REPO = "https://github.com/argenestel/basis-points-academy";
  var TYPE = { P: "Paper", D: "Docs", C: "Code", K: "Course / book", N: "News", R: "Post-mortem", T: "Data & tools" };
  var TYPE_ORDER = ["P", "K", "D", "C", "R", "N", "T"];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function stripHtml(h) { var d = document.createElement("div"); d.innerHTML = h; return (d.textContent || "").replace(/\s+/g, " ").trim(); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }

  var LESSONS = [], byId = {}, STEP = {}, unitById = {};
  UNITS.forEach(function (u, ui) {
    u.n = ui + 1; unitById[u.id] = u;
    u.lessons.forEach(function (l, li) { l.u = u; l.n = li + 1; l.code = "U" + pad2(ui + 1) + "·L" + (li + 1); LESSONS.push(l); byId[l.id] = l; });
  });
  BUILDS.forEach(function (b) { b.steps.forEach(function (s) { STEP[s[0]] = b; }); });

  var main = document.getElementById("main"), sidenav = document.getElementById("sidenav");
  var CHECK = '<svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ================= progress state (browser + optional Claude account) ================= */
  var KEY = "bp-academy-progress-v1";
  var S = { done: {}, builds: {}, prac: {} };
  function merge(o) {
    if (!o || typeof o !== "object") return;
    var d = o.done || {}, b = o.builds || {}, pr = o.prac || {};
    Object.keys(pr).forEach(function (day) { if (/^\d{4}-\d{2}-\d{2}$/.test(day)) S.prac[day] = Math.max(S.prac[day] || 0, +pr[day] || 0); });
    Object.keys(d).forEach(function (id) {
      var v = d[id]; if (!byId[id] || !v || typeof v !== "object") return;
      var cur = S.done[id];
      if (!cur) S.done[id] = { at: String(v.at || ""), ft: +v.ft || 0, n: +v.n || 0 };
      else { if (v.at && (!cur.at || v.at < cur.at)) cur.at = String(v.at); cur.ft = Math.max(cur.ft || 0, +v.ft || 0); cur.n = Math.max(cur.n || 0, +v.n || 0); }
    });
    Object.keys(b).forEach(function (id) {
      var v = b[id]; if (!STEP[id] || !v || typeof v !== "object") return;
      var cur = S.builds[id];
      if (!cur || String(v.at || "") > String(cur.at || "")) S.builds[id] = { v: !!v.v, at: String(v.at || "") };
    });
  }
  function stable(o) { return JSON.stringify(o, function (k, v) { return v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).sort().reduce(function (a, kk) { a[kk] = v[kk]; return a; }, {}) : v; }); }
  function snapshot() { return { done: S.done, builds: S.builds, prac: S.prac, v: 1 }; }
  try { var raw = lsGet(KEY); if (raw) merge(JSON.parse(raw)); } catch (e) { /* ignore */ }

  var dbRef = null, syncMode = "local", writing = false, dirty = false;
  function writeLocal() { lsSet(KEY, JSON.stringify(snapshot())); }
  function save() {
    writeLocal();
    if (!dbRef) return;
    if (writing) { dirty = true; return; }
    writing = true;
    (function loop() {
      dirty = false;
      dbRef.set(JSON.parse(JSON.stringify(snapshot()))).then(function () { if (dirty) return loop(); writing = false; }, function (e) {
        writing = false;
        if (e && (e.code === "invalid_argument" || e.code === "revoked" || e.code === "not_granted")) { dbRef = null; syncMode = "local"; }
        else if (e && e.code === "unavailable") setTimeout(save, 1500 + Math.random() * 1500);
      });
    })();
  }
  var hasViewer = !!(window.claude && typeof window.claude.use === "function");
  function initSync() {
    if (!hasViewer) return;
    Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function (r) {
      var db = r[0], user = r[1];
      if (!db || !user) return null;
      return user.id().then(function (uid) {
        if (!uid) return null;
        var ref = db.doc("data/users/" + uid + "/progress");
        return ref.get().then(function (snap) {
          var remote = snap.exists ? snap.data() : null, before = stable({ done: S.done, builds: S.builds, prac: S.prac });
          if (remote) merge(remote);
          dbRef = ref; syncMode = "cloud";
          var tmp = S; S = { done: {}, builds: {}, prac: {} }; merge(remote); var remoteNorm = stable({ done: S.done, builds: S.builds, prac: S.prac }); S = tmp;
          if (stable({ done: S.done, builds: S.builds, prac: S.prac }) !== remoteNorm) save(); else writeLocal();
          if (before !== stable({ done: S.done, builds: S.builds, prac: S.prac })) route(); else renderSidebar(currentLesson());
        });
      });
    }).catch(function () { dbRef = null; syncMode = "local"; });
  }

  function stats() {
    var ids = Object.keys(S.done).filter(function (id) { return byId[id]; });
    var bps = 0, steps = 0, days = {}, today = dayKey(new Date());
    ids.forEach(function (id) { var v = S.done[id]; bps += 100 + 25 * (v.ft || 0); if (v.at) days[dayKey(v.at)] = 1; });
    Object.keys(S.builds).forEach(function (id) { var v = S.builds[id]; if (v.v && STEP[id]) { bps += 50; steps++; if (v.at) days[dayKey(v.at)] = 1; } });
    Object.keys(S.prac).forEach(function (day) { if (S.prac[day] > 0) { days[day] = 1; bps += 10 * S.prac[day]; } });
    var streak = 0, d = new Date(); if (!days[today]) d.setDate(d.getDate() - 1);
    while (days[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
    return { bps: bps, done: ids.length, steps: steps, streak: streak };
  }

  /* ================= tracks ================= */
  var trackId = lsGet("bp-track") || "all";
  if (!TRACKS.some(function (t) { return t.id === trackId; })) trackId = "all";
  function currentTrack() { return TRACKS.filter(function (t) { return t.id === trackId; })[0] || TRACKS[0]; }
  function unitsOf(t) { return t.units ? t.units.map(function (id) { return unitById[id]; }).filter(Boolean) : UNITS; }
  function lessonsOf(t) { return unitsOf(t).reduce(function (a, u) { return a.concat(u.lessons); }, []); }
  function trackUnits() { return unitsOf(currentTrack()); }
  function trackLessons() { return lessonsOf(currentTrack()); }
  function nextLesson() { var ls = trackLessons(); for (var i = 0; i < ls.length; i++) if (!S.done[ls[i].id]) return ls[i]; return null; }
  function lessonSeq(l) { var seq = trackLessons(); return seq.indexOf(l) >= 0 ? seq : LESSONS; }
  function setTrack(id) { trackId = id; lsSet("bp-track", id); }

  /* ================= reading preferences ================= */
  var prefs = { size: "m", font: "serif" };
  try { var pr = JSON.parse(lsGet("bp-reading") || "{}"); if (["s", "m", "l"].indexOf(pr.size) >= 0) prefs.size = pr.size; if (["serif", "sans"].indexOf(pr.font) >= 0) prefs.font = pr.font; } catch (e) { /* defaults */ }
  function applyPrefs() {
    document.documentElement.setAttribute("data-size", prefs.size);
    document.documentElement.setAttribute("data-font", prefs.font);
    lsSet("bp-reading", JSON.stringify({ size: prefs.size, font: prefs.font }));
    $$("[data-rsize]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.rsize === prefs.size)); });
    $$("[data-rfont]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.rfont === prefs.font)); });
  }
  var aaBtn = $("#aa-btn"), aaPop = $("#aa-pop");
  function closeAa() { aaPop.hidden = true; aaBtn.setAttribute("aria-expanded", "false"); }
  aaBtn.onclick = function (e) { e.stopPropagation(); var open = aaPop.hidden; aaPop.hidden = !open; aaBtn.setAttribute("aria-expanded", String(open)); };
  aaPop.onclick = function (e) { e.stopPropagation(); };
  $$("[data-rsize]").forEach(function (b) { b.onclick = function () { prefs.size = b.dataset.rsize; applyPrefs(); }; });
  $$("[data-rfont]").forEach(function (b) { b.onclick = function () { prefs.font = b.dataset.rfont; applyPrefs(); }; });

  /* ================= toast ================= */
  var toastEl = $("#toast"), toastTimer = null;
  function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3200); }

  /* ================= sources ================= */
  var SOURCES = (function () {
    var m = {}, list = [];
    LESSONS.forEach(function (l) {
      l.src.forEach(function (s) {
        var e = m[s[1]];
        if (!e) { e = { t: s[0], url: s[1], ty: s[2], note: s[3], ls: [] }; m[s[1]] = e; list.push(e); }
        if (e.ls.indexOf(l) < 0) e.ls.push(l);
      });
    });
    list.sort(function (a, b) { return TYPE_ORDER.indexOf(a.ty) - TYPE_ORDER.indexOf(b.ty) || a.t.localeCompare(b.t); });
    return list;
  })();

  /* ================= search ================= */
  var INDEX = null;
  function buildIndex() {
    INDEX = LESSONS.map(function (l) {
      var body = stripHtml(l.body);
      return { l: l, title: l.t.toLowerCase(), keys: (l.keys.join(" ") + " " + l.sum).toLowerCase(), body: body, hay: (l.t + " " + l.sum + " " + l.keys.join(" ") + " " + l.u.t + " " + body).toLowerCase() };
    });
  }
  function searchAll(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    if (!INDEX) buildIndex();
    var terms = q.split(/\s+/).filter(Boolean), out = [];
    INDEX.forEach(function (e) {
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (e.hay.indexOf(t) < 0) return;
        if (e.title.indexOf(t) >= 0) score += 10;
        if (e.keys.indexOf(t) >= 0) score += 4;
        score += 1;
      }
      out.push({ kind: "lesson", l: e.l, score: score, snippet: snippet(e.body, terms[0]) });
    });
    GL.forEach(function (g) {
      var hay = (g[0] + " " + g[1]).toLowerCase();
      if (terms.every(function (t) { return hay.indexOf(t) >= 0; })) out.push({ kind: "term", g: g, score: g[0].toLowerCase().indexOf(terms[0]) >= 0 ? 8 : 2 });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 9);
  }
  function snippet(text, term) {
    var i = text.toLowerCase().indexOf(term);
    if (i < 0) return text.slice(0, 110) + "…";
    var a = Math.max(0, i - 50), b = Math.min(text.length, i + term.length + 70);
    return (a > 0 ? "…" : "") + text.slice(a, b) + (b < text.length ? "…" : "");
  }
  function highlight(s, q) {
    var h = esc(s);
    q.trim().split(/\s+/).filter(function (t) { return t.length > 1; }).forEach(function (t) {
      h = h.replace(new RegExp("(" + esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>");
    });
    return h;
  }
  var glQ = "";
  function wireSearch(box) {
    var input = $("input", box), results = $(".results", box), items = [], active = -1;
    function close() { results.hidden = true; active = -1; }
    function paint() {
      $$("a", results).forEach(function (a, i) {
        a.setAttribute("aria-selected", String(i === active));
        if (i === active) { var top = a.offsetTop, bot = top + a.offsetHeight; if (top < results.scrollTop) results.scrollTop = top; else if (bot > results.scrollTop + results.clientHeight) results.scrollTop = bot - results.clientHeight; }
      });
    }
    function go(i) {
      var it = items[i]; if (!it) return;
      close(); input.value = ""; input.blur();
      if (it.kind === "lesson") { if (location.hash === "#" + it.l.id) route(); else location.hash = it.l.id; }
      else { glQ = it.g[0]; if (location.hash === "#glossary") route(); else location.hash = "glossary"; }
    }
    input.addEventListener("input", function () {
      var q = input.value;
      items = searchAll(q); active = items.length ? 0 : -1;
      if (q.trim().length < 2) { close(); return; }
      results.innerHTML = items.length ? items.map(function (it, i) {
        if (it.kind === "lesson") return '<a href="#' + it.l.id + '" role="option" data-i="' + i + '"><span class="r-t">' + highlight(it.l.t, q) + '</span><span class="r-m">Unit ' + it.l.u.n + " · " + esc(it.l.u.t) + '</span><span class="r-s">' + highlight(it.snippet, q) + "</span></a>";
        return '<a href="#glossary" role="option" data-i="' + i + '"><span class="r-t">' + highlight(it.g[0], q) + '</span><span class="r-m">Glossary</span><span class="r-s">' + highlight(it.g[1], q) + "</span></a>";
      }).join("") : '<p class="r-empty">No lessons or terms match. Try a shorter word.</p>';
      results.hidden = false; paint();
      $$("a", results).forEach(function (a) { a.onmousedown = function (e) { e.preventDefault(); go(+a.dataset.i); }; });
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (items.length) { active = (active + 1) % items.length; paint(); } }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (items.length) { active = (active - 1 + items.length) % items.length; paint(); } }
      else if (e.key === "Enter") { e.preventDefault(); go(active < 0 ? 0 : active); }
      else if (e.key === "Escape") { close(); input.blur(); }
    });
    input.addEventListener("blur", function () { setTimeout(close, 120); });
  }
  wireSearch($(".topbar [data-search]"));

  /* ================= tutor (Claude, only inside the Claude viewer) ================= */
  var sampleFn = null, sampleState = hasViewer ? "pending" : "none", tutorBlocked = "", activeCtl = null;
  var samplePromise = hasViewer ? window.claude.use("sample").catch(function () { return null; }) : Promise.resolve(null);
  samplePromise.then(function (fn) {
    sampleFn = fn; sampleState = fn ? "ready" : "none";
    if (!fn) { $$("[data-tutor]").forEach(function (el) { el.remove(); }); if (location.hash === "#tutor") location.hash = "learn"; }
    updateTutorNav();
  });
  function updateTutorNav() { $$('[data-v="tutor"]').forEach(function (a) { a.hidden = sampleState === "none"; }); }
  function stopTutor() { if (activeCtl) { activeCtl.abort(); activeCtl = null; } }
  var HIDE_CODES = { not_granted: 1, sampling_disabled: 1, not_declared: 1, capability_disabled: 1, capability_removed: 1 };
  function errCopy(code) {
    switch (code) {
      case "not_granted": return "The tutor wasn't allowed to use your Claude account in this visit. Reload the page to be asked again.";
      case "sampling_disabled": return "Claude isn't available for this account, so the tutor is off.";
      case "rate_limited": return "Too many questions in a short time. Wait a minute, then ask again.";
      case "session_expired": return "Your Claude session expired. Sign in again, then ask.";
      case "refused": return "Claude declined that question. Rephrase it and try again.";
      case "prompt_too_large": return "That question is too long. Shorten it and try again.";
      case "empty_completion": return "The tutor returned nothing. Try asking another way.";
      case "invalid_json": return "The new questions came back in the wrong format. Press the button again.";
      case "cancelled": return "";
      default: return "The tutor couldn't answer just now. Try again.";
    }
  }
  var TUTOR_RULES = "You are the tutor inside Basis Points Academy, a self-study course on DeFi, onchain markets, perpetual futures, tokenized stocks, MEV, bridges, Solana, privacy, building blockchains and protocol economics. The learner is a software engineer who wants to design and build their own protocol. Be concrete: real numbers, formulas, short code sketches (Solidity, Rust, Python or TypeScript) where they help, and the real protocols, papers and incidents involved. If something may have changed after your training data, say so and tell the learner what to verify. Format with Markdown. Keep answers under about 400 words unless asked for more.";
  function lessonContext(l) {
    return "CURRENT LESSON: " + l.code + " " + l.t + " (unit: " + l.u.t + ")\nSUMMARY: " + l.sum + "\nKEY IDEAS: " + l.keys.join("; ") + "\nLESSON TEXT:\n" + stripHtml(l.body).slice(0, 7000) + "\nBUILD TASK: " + l.build;
  }
  function md(src) {
    var lines = String(src).replace(/\r/g, "").split("\n"), out = [], i = 0;
    function inline(s) {
      return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    while (i < lines.length) {
      var line = lines[i];
      if (/^```/.test(line)) { var code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; } i++; out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>"); continue; }
      if (/^\s*\|/.test(line)) {
        var rows = []; while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        var cells = rows.map(function (r) { return r.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }); })
          .filter(function (c) { return !c.every(function (x) { return /^:?-{2,}:?$/.test(x); }); });
        if (cells.length) {
          var t = '<div class="tbl"><table><thead><tr>' + cells[0].map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
          cells.slice(1).forEach(function (r) { t += "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; });
          out.push(t + "</tbody></table></div>");
        }
        continue;
      }
      var hm = /^(#{1,4})\s+(.*)$/.exec(line);
      if (hm) { out.push("<h4>" + inline(hm[2]) + "</h4>"); i++; continue; }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
        var ordered = /^\s*\d+[.)]\s+/.test(line), items = [];
        while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, "")); i++; }
        out.push((ordered ? "<ol>" : "<ul>") + items.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + (ordered ? "</ol>" : "</ul>"));
        continue;
      }
      if (!line.trim()) { i++; continue; }
      var para = [];
      while (i < lines.length && lines[i].trim() && !/^```|^\s*\||^#{1,4}\s|^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { para.push(lines[i]); i++; }
      out.push("<p>" + inline(para.join(" ")) + "</p>");
    }
    return out.join("");
  }
  function runSample(input, outEl, stopBtn) {
    if (sampleState === "pending") {
      outEl.innerHTML = '<p class="thinking">Connecting…</p>';
      return samplePromise.then(function () { return sampleFn ? runSample(input, outEl, stopBtn) : null; });
    }
    if (!sampleFn) return Promise.resolve(null);
    stopTutor();
    var ctl = new AbortController(); activeCtl = ctl;
    outEl.innerHTML = '<p class="thinking">Thinking…</p>';
    if (stopBtn) { stopBtn.hidden = false; stopBtn.onclick = function () { ctl.abort(); }; }
    return sampleFn(input, { signal: ctl.signal, cache: false, onText: function (u) { outEl.innerHTML = md(u.text); } })
      .then(function (res) { outEl.innerHTML = md(res.text) + (res.truncated ? '<p class="small">The answer was cut short. Ask about a narrower part.</p>' : ""); labelTables(outEl); return res.text; },
        function (e) {
          var code = e && e.code, copy = errCopy(code);
          if (HIDE_CODES[code]) tutorBlocked = copy;
          outEl.innerHTML = (e && e.text ? md(e.text) : "") + (copy ? '<p class="note-err">' + esc(copy) + "</p>" : "");
          return null;
        })
      .then(function (t) { if (activeCtl === ctl) activeCtl = null; if (stopBtn) stopBtn.hidden = true; return t; });
  }

  /* ================= routing ================= */
  var VIEWS = ["learn", "practice", "library", "builds", "timeline", "glossary", "tutor"];
  function currentLesson() { return byId[(location.hash || "").slice(1)] || null; }
  function route() {
    stopTutor(); closeDrawer(); closeAa();
    var h = (location.hash || "#learn").slice(1), lesson = byId[h];
    var view = lesson ? "lesson" : (VIEWS.indexOf(h) >= 0 ? h : "learn");
    if (view === "tutor" && sampleState === "none") view = "learn";
    document.body.setAttribute("data-view", view);
    if (view === "learn" || view === "lesson" || view === "practice") document.body.removeAttribute("data-wide"); else document.body.setAttribute("data-wide", "1");
    var navView = lesson ? "learn" : view;
    $$(".topbar [data-v]").forEach(function (a) { if (a.dataset.v === navView) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    renderSidebar(lesson);
    if (lesson) renderLesson(lesson);
    else if (view === "practice") renderPractice();
    else if (view === "library") renderLibrary();
    else if (view === "builds") renderBuilds();
    else if (view === "timeline") renderTimeline();
    else if (view === "glossary") renderGlossary();
    else if (view === "tutor") renderTutorView();
    else renderLearn();
    document.title = lesson ? lesson.t + " · Basis Points Academy" : "Basis Points Academy";
    updateTutorNav();
  }
  var lastHash = null;
  window.addEventListener("hashchange", function () {
    var h = location.hash.slice(1);
    route();
    if (h !== lastHash) { window.scrollTo(0, 0); lastHash = h; if (byId[h]) main.focus({ preventScroll: true }); }
  });

  /* ================= drawer (phones) ================= */
  var menuBtn = $("#menu-btn"), scrim = $("#scrim");
  function openDrawer() { document.body.setAttribute("data-drawer", "1"); scrim.hidden = false; menuBtn.setAttribute("aria-expanded", "true"); var cur = $('.lnk[aria-current="page"]', sidenav); if (cur) cur.scrollIntoView({ block: "center" }); }
  function closeDrawer() { document.body.removeAttribute("data-drawer"); scrim.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.onclick = function () { if (document.body.hasAttribute("data-drawer")) closeDrawer(); else openDrawer(); };
  scrim.onclick = closeDrawer;

  /* ================= sidebar ================= */
  var openUnits = {};
  function renderSidebar(current) {
    var tr = currentTrack(), units = trackUnits(), tl = trackLessons(), next = nextLesson(), s = stats();
    var tDone = tl.filter(function (l) { return S.done[l.id]; }).length;
    var activeUnit = current ? current.u.id : (next ? next.u.id : units[0].id);
    var navView = current ? "learn" : (document.body.getAttribute("data-view") || "learn");
    var h = '<div class="side-mobile"><div class="search" data-search><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<input type="search" placeholder="Search lessons and terms" aria-label="Search lessons and terms" autocomplete="off" spellcheck="false"><div class="results" role="listbox" aria-label="Search results" hidden></div></div>' +
      '<nav aria-label="Sections">' + [["learn", "Course"], ["practice", "Practice"], ["library", "Library"], ["builds", "Builds"], ["timeline", "Timeline"], ["glossary", "Glossary"], ["tutor", "Tutor"]].map(function (v) {
        return '<a href="#' + v[0] + '" data-v="' + v[0] + '"' + (v[0] === navView ? ' aria-current="page"' : "") + ">" + v[1] + "</a>";
      }).join("") + "</nav></div>" +
      '<label class="side-label" for="track-sel">Track</label><select id="track-sel">' + TRACKS.map(function (t) { return '<option value="' + t.id + '"' + (t.id === tr.id ? " selected" : "") + ">" + esc(t.t) + "</option>"; }).join("") + "</select>" +
      '<p class="side-progress"><b>' + tDone + "/" + tl.length + "</b> lessons" + (s.streak ? " · " + s.streak + "-day streak" : "") + " · " + fmt(s.bps) + " bps</p>" +
      '<div class="bar" aria-hidden="true"><i style="width:' + (tl.length ? Math.round(100 * tDone / tl.length) : 0) + '%"></i></div>' +
      '<nav class="units" aria-label="Units and lessons">' + units.map(function (u) {
        var open = openUnits[u.id] !== undefined ? openUnits[u.id] : u.id === activeUnit;
        var dn = u.lessons.filter(function (l) { return S.done[l.id]; }).length;
        return '<details class="unav" data-unit="' + u.id + '"' + (open ? " open" : "") + '><summary><span class="unum">' + pad2(u.n) + '</span><span class="ut">' + esc(u.t) + '</span><span class="uc">' + dn + "/" + u.lessons.length + "</span></summary><ol>" +
          u.lessons.map(function (l) {
            var dn2 = S.done[l.id];
            return '<li><a href="#' + l.id + '" class="lnk' + (dn2 ? " done" : "") + '"' + (current === l ? ' aria-current="page"' : "") + (dn2 ? ' title="Completed"' : "") + '><span class="dot" aria-hidden="true">' + (dn2 ? CHECK : "") + "</span><span>" + esc(l.t) + "</span></a></li>";
          }).join("") + "</ol></details>";
      }).join("") + "</nav>" +
      '<div class="side-foot"><p>' + (syncMode === "cloud" ? "Progress is saved to your Claude account." : "Progress is saved in this browser.") + "</p>" +
      '<a href="' + REPO + '" target="_blank" rel="noopener">Source and hands-on labs on GitHub ↗</a><button class="linkbtn" type="button" id="reset">Reset my progress</button></div>';
    var keepScroll = sidenav.scrollTop;
    sidenav.innerHTML = h;
    sidenav.scrollTop = keepScroll;
    wireSearch($("[data-search]", sidenav));
    $("#track-sel").onchange = function (e) { setTrack(e.target.value); openUnits = {}; route(); };
    $$(".unav", sidenav).forEach(function (d) { d.addEventListener("toggle", function () { openUnits[d.dataset.unit] = d.open; }); });
    $$("a[href^='#']", sidenav).forEach(function (a) { a.addEventListener("click", function () { if (a.getAttribute("href") === location.hash) closeDrawer(); }); });
    var armed = null, rb = $("#reset");
    rb.onclick = function () {
      if (!armed) { rb.textContent = "Click again to erase all progress"; armed = setTimeout(function () { armed = null; rb.textContent = "Reset my progress"; }, 4000); return; }
      clearTimeout(armed); armed = null; S = { done: {}, builds: {}, prac: {} }; save(); toast("Progress erased"); route();
    };
    var cur = $('.lnk[aria-current="page"]', sidenav);
    if (cur && window.innerWidth >= 900) {
      var r = cur.getBoundingClientRect(), sr = sidenav.getBoundingClientRect();
      if (r.top < sr.top + 40 || r.bottom > sr.bottom - 40) sidenav.scrollTop += r.top - sr.top - sr.height / 3;
    }
  }

  /* ================= course home ================= */
  function renderLearn() {
    var tr = currentTrack(), units = trackUnits(), tl = trackLessons(), next = nextLesson(), s = stats();
    var tDone = tl.filter(function (l) { return S.done[l.id]; }).length;
    var h = '<div class="page">' +
      '<header style="display:grid;gap:10px"><h1 class="h1">Learn DeFi by building it</h1>' +
      '<p class="sub">' + LESSONS.length + " lessons in " + UNITS.length + " units, from market microstructure and building a chain to AMMs, lending, perps, Solana, privacy and launches. Each lesson summarizes the primary sources, gives you something to build, and checks your understanding.</p>" +
      '<p class="home-stats"><span><b>' + s.done + "</b> of " + LESSONS.length + " lessons done</span>" + (s.streak ? "<span><b>" + s.streak + "</b>-day streak</span>" : "") + "<span><b>" + fmt(s.bps) + '</b> bps earned</span><span><a href="' + REPO + '/tree/main/labs" target="_blank" rel="noopener">Hands-on labs ↗</a></span></p></header>' +
      (next ? '<a class="continue" href="#' + next.id + '"><span class="c-label">' + (tDone ? "Continue where you left off" : "Start here") + '</span><span class="c-title">' + esc(next.t) + '</span><span class="c-meta">Unit ' + next.u.n + " · " + esc(next.u.t) + " · " + next.min + ' min</span><span class="c-sum">' + esc(next.sum) + "</span></a>"
        : '<div class="continue"><span class="c-label">Track complete</span><span class="c-title">You finished every lesson in ' + esc(tr.t) + '.</span><span class="c-sum">Pick another track below, or open Builds and ship something.</span></div>') +
      '<section style="display:grid;gap:10px" aria-labelledby="tp-h"><h2 id="tp-h" class="h2">Track</h2><div class="chips" role="radiogroup" aria-labelledby="tp-h">' +
      TRACKS.map(function (t) { return '<button type="button" role="radio" class="chip-btn" aria-checked="' + (t.id === tr.id) + '" data-track="' + t.id + '">' + esc(t.t) + "</button>"; }).join("") +
      '</div><p class="muted">' + esc(tr.who) + " " + units.length + " units, " + tl.length + " lessons, " + tDone + " done.</p></section>" +
      '<section style="display:grid;gap:10px" aria-labelledby="u-h"><h2 id="u-h" class="h2">Units</h2><div class="unit-list">' +
      units.map(function (u) {
        var dn = u.lessons.filter(function (l) { return S.done[l.id]; }).length, open = next && next.u === u;
        return '<details class="ucard"' + (open ? " open" : "") + '><summary><span class="unum">Unit ' + pad2(u.n) + '</span><span class="ut">' + esc(u.t) + '</span><span class="uprog">' + dn + "/" + u.lessons.length + ' done<span class="bar"><i style="width:' + Math.round(100 * dn / u.lessons.length) + '%"></i></span></span></summary>' +
          '<p class="ud">' + esc(u.d) + '</p><ol class="llist">' + u.lessons.map(function (l) {
            return '<li><a href="#' + l.id + '" class="' + (S.done[l.id] ? "done" : "") + '"><span class="dot" aria-hidden="true">' + (S.done[l.id] ? CHECK : "") + '</span><span class="lt">' + esc(l.t) + '<span class="ls">' + esc(l.sum) + '</span></span><span class="lm">' + (widgetsFor(l).length ? '<span class="tag tag-try">Interactive</span> ' : "") + l.min + " min</span></a></li>";
          }).join("") + "</ol></details>";
      }).join("") + "</div></section></div>";
    main.innerHTML = h;
    $$("[data-track]", main).forEach(function (b) { b.onclick = function () { setTrack(b.dataset.track); openUnits = {}; route(); var t = $('[data-track="' + trackId + '"]', main); if (t) t.focus({ preventScroll: true }); }; });
  }

  /* ================= lesson ================= */
  function labelTables(root) {
    $$(".tbl table", root).forEach(function (t) {
      var heads = $$("thead th", t).map(function (th) { return th.textContent; });
      $$("tbody tr", t).forEach(function (tr) { $$("td", tr).forEach(function (td, i) { if (heads[i]) td.setAttribute("data-label", heads[i]); }); });
    });
  }
  function srcItem(s, showUsed) {
    var used = showUsed && s.ls ? '<span class="used">Used in ' + s.ls.slice(0, 3).map(function (l) { return '<a href="#' + l.id + '">' + esc(l.t) + "</a>"; }).join(", ") + (s.ls.length > 3 ? " and " + (s.ls.length - 3) + " more" : "") + "</span>" : "";
    return '<li><div class="s-top"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.t) + ' ↗</a><span class="tag">' + esc(TYPE[s.ty] || s.ty) + "</span></div>" +
      (s.note ? '<p class="note">' + esc(s.note) + "</p>" : "") + used + "</li>";
  }
  var PROMPTS = [
    ["Explain it simply", "Explain this lesson as if I'm a strong backend engineer who has never traded. Use one concrete running example."],
    ["Work the math", "Walk me through the main formula in this lesson with a fully worked numeric example, step by step."],
    ["How do I build it?", "How would I implement the core mechanism from this lesson? Give a code sketch, the data structures, and the main pitfalls."],
    ["What breaks?", "What are the ways this mechanism fails in production? Cover attack vectors, economic failure modes, and real incidents you know of."]
  ];
  function widgetsFor(l) { var m = window.BP_LESSON_WIDGETS || {}; return (m[l.id] || []).filter(function (w) { return window.BP_WIDGETS && window.BP_WIDGETS.has(w); }); }
  function metaHtml(l) {
    return l.min + " min read · Unit " + l.u.n + ", lesson " + l.n + (widgetsFor(l).length ? ' · <a href="#' + l.id + '" data-jump-try>Interactive simulator below</a>' : "") + (S.done[l.id] ? ' · <span class="ok">Completed</span>' : "");
  }
  function renderLesson(l) {
    var seq = lessonSeq(l), idx = seq.indexOf(l), prev = seq[idx - 1], nxt = seq[idx + 1];
    var showTutor = sampleState !== "none";
    var h = '<article class="lesson">' +
      '<div class="lesson-head"><p class="crumb"><a href="#learn">' + esc(currentTrack().t) + "</a> / " + esc(l.u.t) + "</p>" +
      "<h1>" + esc(l.t) + '</h1><p class="meta" id="lesson-meta">' + metaHtml(l) + '</p><p class="lede">' + esc(l.sum) + "</p></div>" +
      '<div class="prose">' + l.body + "</div>" +
      '<section class="keys" aria-labelledby="k-h"><h2 id="k-h" class="h3">Recap</h2><ul>' + l.keys.map(function (k) { return "<li>" + esc(k) + "</li>"; }).join("") + "</ul></section>" +
      (widgetsFor(l).length ? '<section class="sect tryit" id="try" aria-labelledby="try-h"><h2 id="try-h" class="h2">Try it</h2>' + widgetsFor(l).map(function (w) { return '<div data-widget="' + w + '"></div>'; }).join("") + "</section>" : "") +
      '<section class="sect" aria-labelledby="src-h"><h2 id="src-h" class="h2">Read the sources</h2><ul class="srcs">' + l.src.map(function (s) { return srcItem({ t: s[0], url: s[1], ty: s[2], note: s[3] }, false); }).join("") + "</ul></section>" +
      '<section class="sect build" aria-labelledby="b-h"><h2 id="b-h" class="h2">Build it</h2><p>' + esc(l.build) + '</p><p class="small">Larger projects with starter code are in <a href="#builds">Builds</a>.</p></section>' +
      '<section class="sect" id="quiz" aria-labelledby="q-h"><h2 id="q-h" class="h2">Check your understanding</h2><div id="quiz-root" class="quiz"></div><div id="bonus-root" class="quiz"></div></section>' +
      (showTutor ? '<details class="tutor" data-tutor><summary>Ask the tutor about this lesson</summary><div class="tutor-body">' +
        '<p class="small">Claude answers with this lesson as context. The first question asks permission to use your Claude account. Check answers against the sources.</p><p class="note-err" data-blocked hidden></p>' +
        '<div class="prompts">' + PROMPTS.map(function (p, i) { return '<button type="button" data-p="' + i + '">' + esc(p[0]) + "</button>"; }).join("") + "</div>" +
        '<form class="ask"><label class="small" for="tq-' + l.id + '">Your question</label><textarea id="tq-' + l.id + '" rows="2" placeholder="e.g. Why is LVR proportional to variance?"></textarea>' +
        '<div class="row"><button class="btn primary" type="submit">Ask</button><button class="btn" type="button" data-stop hidden>Stop</button><button class="btn" type="button" data-more>Give me 3 new quiz questions</button></div></form>' +
        '<div class="answer" aria-live="polite"></div></div></details>' : "") +
      '<nav class="pager" aria-label="Lesson navigation">' + (prev ? '<a href="#' + prev.id + '"><span class="lbl">← Previous</span><span class="pt">' + esc(prev.t) + "</span></a>" : "<span></span>") +
      (nxt ? '<a href="#' + nxt.id + '" class="next"><span class="lbl">Next →</span><span class="pt">' + esc(nxt.t) + "</span></a>" : "") + "</nav>" +
      '<p class="kbd-hint">Tip: ← and → move between lessons, / opens search.</p></article>';
    main.innerHTML = h;
    labelTables(main);
    $$("[data-widget]", main).forEach(function (el) { try { window.BP_WIDGETS.mount(el, el.dataset.widget); } catch (e) { el.innerHTML = '<p class="note-err">This simulator failed to load.</p>'; } });
    renderQuiz(l, $("#quiz-root"), l.quiz.map(function (q) { return { q: q[0], opts: q[1], why: q[2] }; }), false);
    if (showTutor) setupLessonTutor(l);
  }
  function completeLesson(l, ft, n) {
    var prev = S.done[l.id], gained;
    if (!prev) { S.done[l.id] = { at: new Date().toISOString(), ft: ft, n: n }; gained = 100 + 25 * ft; }
    else { gained = Math.max(0, (ft - (prev.ft || 0)) * 25); prev.ft = Math.max(prev.ft || 0, ft); prev.n = Math.max(prev.n || 0, n); }
    save();
    var m = $("#lesson-meta"); if (m) m.innerHTML = metaHtml(l);
    renderSidebar(l);
    toast(prev ? (gained ? "Better score: +" + gained + " bps" : "Lesson already completed") : "Lesson complete: +" + gained + " bps");
  }

  /* quiz: every question visible; pick an option for instant feedback; retry until right */
  function renderQuiz(l, root, qs, bonus, onAllSolved) {
    function fresh() { return qs.map(function (q) { return { order: shuffle(q.opts.map(function (t, k) { return { t: t, k: k }; })), tries: 0, solved: false, first: false }; }); }
    var st = fresh();
    function foot() {
      var solved = st.filter(function (x) { return x.solved; }).length, first = st.filter(function (x) { return x.first; }).length, done = l && S.done[l.id];
      return '<div class="quiz-foot"><span><b>' + solved + "/" + qs.length + "</b> answered" + (solved ? " · " + first + " right first try" : "") + "</span>" +
        (bonus ? "" : (done ? '<span class="small">Completed. You can retake it to improve your score.</span>' : '<button class="btn" type="button" data-mark>Mark as read, skip the quiz</button>')) +
        (solved ? '<button class="btn" type="button" data-reset>Start over</button>' : "") + "</div>";
    }
    function paint() {
      root.innerHTML = (bonus && !onAllSolved ? '<h3 class="h3">Bonus questions</h3>' : "") + qs.map(function (q, i) {
        return '<div class="q" data-q="' + i + '"><p class="q-text"><span class="qn">' + (i + 1) + ".</span>" + esc(q.q) + "</p>" + (q.from ? '<p class="small">From <a href="#' + q.from.id + '">' + esc(q.from.t) + "</a></p>" : "") + '<div class="opts" role="group" aria-label="Answers to question ' + (i + 1) + '">' +
          st[i].order.map(function (o) { return '<button type="button" class="opt" data-k="' + o.k + '">' + esc(o.t) + "</button>"; }).join("") +
          '</div><p class="q-fb" aria-live="polite"></p></div>';
      }).join("") + foot();
      $$(".q", root).forEach(function (el) {
        var i = +el.dataset.q;
        $$(".opt", el).forEach(function (b) { b.onclick = function () { answer(i, +b.dataset.k, b, el); }; });
      });
      wireFoot();
    }
    function wireFoot() {
      var mk = $("[data-mark]", root); if (mk) mk.onclick = function () { completeLesson(l, 0, qs.length); refreshFoot(); };
      var rs = $("[data-reset]", root); if (rs) rs.onclick = function () { st = fresh(); paint(); };
    }
    function refreshFoot() { var f = $(".quiz-foot", root); if (f) { f.outerHTML = foot(); wireFoot(); } }
    function answer(i, k, btn, el) {
      var s = st[i], q = qs[i], fb = $(".q-fb", el);
      if (s.solved) return;
      s.tries++;
      if (k === 0) {
        s.solved = true; s.first = s.tries === 1;
        btn.classList.add("right");
        $$(".opt", el).forEach(function (b) { b.disabled = true; });
        fb.innerHTML = '<span class="ok">' + (s.first ? "Correct." : "That's it.") + "</span> " + esc(q.why || "");
      } else {
        btn.classList.add("wrong"); btn.disabled = true;
        fb.innerHTML = '<span class="no">Not quite.</span> Pick another answer.';
      }
      var allSolved = st.every(function (x) { return x.solved; }), firstN = st.filter(function (x) { return x.first; }).length;
      if (!bonus && allSolved) completeLesson(l, firstN, qs.length);
      if (onAllSolved && allSolved && !st.reported) { st.reported = true; onAllSolved(firstN, qs.length); }
      refreshFoot();
    }
    paint();
  }

  function setupLessonTutor(l) {
    var box = $("[data-tutor]"), form = $("form", box), ta = $("textarea", box), out = $(".answer", box), stop = $("[data-stop]", box), more = $("[data-more]", box), blocked = $("[data-blocked]", box);
    function guard() { if (tutorBlocked) { blocked.hidden = false; blocked.textContent = tutorBlocked; return false; } return true; }
    function ask(q) { if (!q.trim() || !guard()) return; runSample(TUTOR_RULES + "\n\n" + lessonContext(l) + "\n\nLEARNER'S QUESTION: " + q.trim(), out, stop); }
    form.onsubmit = function (e) { e.preventDefault(); ask(ta.value); };
    ta.onkeydown = function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ask(ta.value); } };
    $$("[data-p]", box).forEach(function (b) { b.onclick = function () { var p = PROMPTS[+b.dataset.p][1]; ta.value = p; ask(p); }; });
    more.onclick = function () {
      if (!guard()) return;
      var go = function () {
        if (!sampleFn) return;
        stopTutor();
        var ctl = new AbortController(); activeCtl = ctl;
        more.disabled = true; out.innerHTML = '<p class="thinking">Writing new questions…</p>'; stop.hidden = false; stop.onclick = function () { ctl.abort(); };
        var prompt = TUTOR_RULES + "\n\n" + lessonContext(l) + "\n\nWrite 3 NEW multiple-choice questions that test understanding of this lesson (reasoning, numbers or design trade-offs, not trivia), different from: " +
          l.quiz.map(function (q) { return q[0]; }).join(" | ") +
          '\nReply with only a JSON array of 3 objects shaped like {"q": "question", "options": ["the correct answer", "wrong", "wrong", "wrong"], "why": "one or two sentence explanation"}. Put the correct answer FIRST; the page shuffles them.';
        sampleFn.json(prompt, { signal: ctl.signal }).then(function (arr) {
          var qs = (Array.isArray(arr) ? arr : []).filter(function (q) { return q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length >= 2 && q.options.every(function (o) { return typeof o === "string"; }); })
            .slice(0, 5).map(function (q) { return { q: q.q, opts: q.options.slice(0, 4), why: typeof q.why === "string" ? q.why : "" }; });
          if (!qs.length) { out.innerHTML = '<p class="note-err">' + esc(errCopy("invalid_json")) + "</p>"; return; }
          out.innerHTML = '<p class="small">Three bonus questions were added to the quiz above. They don\'t change your score.</p>';
          renderQuiz(l, $("#bonus-root"), qs, true);
          $("#bonus-root").scrollIntoView({ behavior: "smooth", block: "start" });
        }, function (e) {
          var c = errCopy(e && e.code); if (HIDE_CODES[e && e.code]) tutorBlocked = c;
          out.innerHTML = c ? '<p class="note-err">' + esc(c) + "</p>" : "";
        }).then(function () { if (activeCtl === ctl) activeCtl = null; stop.hidden = true; more.disabled = false; });
      };
      if (sampleState === "pending") samplePromise.then(go); else go();
    };
  }

  /* ================= practice: spaced review of finished lessons ================= */
  function renderPractice() {
    var today = dayKey(new Date()), done = LESSONS.filter(function (l) { return S.done[l.id]; });
    var pool = done.length >= 2 ? done : trackLessons().slice(0, 6);
    var items = [];
    pool.forEach(function (l) {
      var d = S.done[l.id], weak = d && d.n ? 1 - (d.ft || 0) / d.n : 0.5;
      var ageDays = d && d.at ? (Date.now() - new Date(d.at).getTime()) / 864e5 : 0;
      l.quiz.forEach(function (q) { items.push({ q: q[0], opts: q[1], why: q[2], from: l, w: 1 + 2 * weak + Math.min(3, ageDays / 7) }); });
    });
    var picked = [];
    while (picked.length < Math.min(8, items.length)) {
      var total = items.reduce(function (a, it) { return a + it.w; }, 0), r = Math.random() * total;
      for (var i = 0; i < items.length; i++) { r -= items[i].w; if (r <= 0) { picked.push(items.splice(i, 1)[0]); break; } }
    }
    main.innerHTML = '<div class="page"><header style="display:grid;gap:8px"><h1 class="h1">Practice</h1><p class="sub">' +
      (done.length >= 2 ? "Eight questions from lessons you've finished, weighted toward the ones you missed and the ones you finished longest ago." : "Finish two lessons and practice will review them. Until then, here are questions from the start of your track.") +
      '</p><p class="home-stats"><span><b>' + (S.prac[today] || 0) + "</b> right first try today</span><span>+10 bps each, and practice keeps your streak going</span></p></header>" +
      '<div id="prac-root" class="quiz"></div><div><button class="btn" type="button" id="prac-new">New set of questions</button></div></div>';
    renderQuiz(null, $("#prac-root"), picked, true, function (first, n) {
      S.prac[today] = (S.prac[today] || 0) + first; save(); renderSidebar(null);
      toast("Practice done: " + first + "/" + n + " first try, +" + first * 10 + " bps");
    });
    $("#prac-new").onclick = function () { renderPractice(); window.scrollTo(0, 0); };
  }

  /* ================= library ================= */
  var libState = { ty: "all", q: "" };
  function renderLibrary() {
    var counts = {}; SOURCES.forEach(function (s) { counts[s.ty] = (counts[s.ty] || 0) + 1; });
    main.innerHTML = '<div class="page"><header style="display:grid;gap:8px"><h1 class="h1">Library</h1><p class="sub">Every paper, doc, codebase and post-mortem the course uses (' + SOURCES.length + " in total), each with a one-line note and the lessons that cite it.</p></header>" +
      '<div style="display:grid;gap:10px"><input class="input" id="lib-q" type="search" placeholder="Filter by title or note, e.g. LVR, funding, light client" aria-label="Filter the library" value="' + esc(libState.q) + '">' +
      '<div class="chips" role="group" aria-label="Filter by type"><button type="button" class="chip-btn" data-ty="all">All</button>' +
      TYPE_ORDER.filter(function (t) { return counts[t]; }).map(function (t) { return '<button type="button" class="chip-btn" data-ty="' + t + '">' + esc(TYPE[t]) + " (" + counts[t] + ")</button>"; }).join("") +
      '</div><p class="small" id="lib-count"></p></div><ul class="srcs" id="lib-list"></ul></div>';
    function draw() {
      var q = libState.q.toLowerCase().trim();
      var list = SOURCES.filter(function (s) { return (libState.ty === "all" || s.ty === libState.ty) && (!q || (s.t + " " + s.note).toLowerCase().indexOf(q) >= 0); });
      $("#lib-list").innerHTML = list.length ? list.map(function (s) { return srcItem(s, true); }).join("") : '<li class="empty">Nothing matches. Try a broader word.</li>';
      $("#lib-count").textContent = "Showing " + list.length + " of " + SOURCES.length;
      $$("[data-ty]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.ty === libState.ty)); });
    }
    $("#lib-q").oninput = function (e) { libState.q = e.target.value; draw(); };
    $$("[data-ty]").forEach(function (b) { b.onclick = function () { libState.ty = b.dataset.ty; draw(); }; });
    draw();
  }

  /* ================= builds ================= */
  function renderBuilds() {
    var h = '<div class="page"><header style="display:grid;gap:8px"><h1 class="h1">Builds</h1><p class="sub">' + BUILDS.length + ' projects that turn reading into working code. Tick off steps as you ship them (50 bps each). Eleven have tested starter code with exercises in the <a href="' + REPO + '/tree/main/labs" target="_blank" rel="noopener">GitHub labs</a>. Start with the funding-rate collector: it is read-only and risk-free.</p></header><div style="display:grid;gap:12px">';
    BUILDS.forEach(function (b) {
      var n = b.steps.filter(function (s) { return S.builds[s[0]] && S.builds[s[0]].v; }).length;
      h += '<article class="bcard"><div class="bcard-head"><div style="display:grid;gap:6px"><h2>' + esc(b.t) + '</h2><div class="chips"><span class="tag">' + esc(b.lvl) + '</span><span class="tag">' + esc(b.stack) + '</span></div></div><span class="frac" data-frac="' + b.id + '">' + n + "/" + b.steps.length + "</span></div>" +
        '<p class="muted">' + esc(b.d) + '</p><div class="bar"><i data-bar="' + b.id + '" style="width:' + Math.round(100 * n / b.steps.length) + '%"></i></div>' +
        '<ul class="steplist">' + b.steps.map(function (s) {
          var on = S.builds[s[0]] && S.builds[s[0]].v;
          return '<li><label for="step-' + s[0] + '"><input type="checkbox" id="step-' + s[0] + '" data-step="' + s[0] + '"' + (on ? " checked" : "") + "><span>" + esc(s[1]) + "</span></label></li>";
        }).join("") + '</ul><div class="blinks">' +
        (b.code ? '<a href="' + REPO + "/tree/main/" + esc(b.code) + '" target="_blank" rel="noopener"><b>Starter code and exercises ↗</b></a>' : '<span class="small">No starter code for this one: build it from the lessons.</span>') +
        b.links.map(function (k) { return '<a href="' + esc(k[1]) + '" target="_blank" rel="noopener">' + esc(k[0]) + " ↗</a>"; }).join("") + "</div></article>";
    });
    main.innerHTML = h + "</div></div>";
    $$("[data-step]").forEach(function (c) {
      c.onchange = function () {
        S.builds[c.dataset.step] = { v: c.checked, at: new Date().toISOString() };
        var b = STEP[c.dataset.step], n = b.steps.filter(function (s) { return S.builds[s[0]] && S.builds[s[0]].v; }).length;
        $('[data-frac="' + b.id + '"]').textContent = n + "/" + b.steps.length;
        $('[data-bar="' + b.id + '"]').style.width = Math.round(100 * n / b.steps.length) + "%";
        save(); renderSidebar(null);
        if (c.checked) toast("Step done: +50 bps");
      };
    });
  }

  /* ================= timeline ================= */
  var tlTag = "all", MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function renderTimeline() {
    main.innerHTML = '<div class="page"><header style="display:grid;gap:8px"><h1 class="h1">Timeline</h1><p class="sub">From the Bitcoin whitepaper to the 2026 perp DEX war. Items from mid-2026 onward come from news reports collected in October 2026, so check details before relying on them.</p></header>' +
      '<div class="chips" role="group" aria-label="Filter by topic"><button type="button" class="chip-btn" data-tag="all">All</button>' +
      Object.keys(TLTAGS).map(function (k) { return '<button type="button" class="chip-btn" data-tag="' + k + '">' + esc(TLTAGS[k]) + "</button>"; }).join("") + '</div><div class="tl" id="tl"></div></div>';
    function draw() {
      var years = {}, order = [];
      TL.forEach(function (e) { if (tlTag !== "all" && e[1] !== tlTag) return; var y = e[0].slice(0, 4); if (!years[y]) { years[y] = []; order.push(y); } years[y].push(e); });
      $("#tl").innerHTML = order.length ? order.map(function (y) {
        return '<section class="tl-year"><h2>' + y + "</h2><ol>" + years[y].map(function (e) {
          var m = +e[0].slice(5, 7);
          return '<li><span class="m">' + (m ? MONTHS[m - 1] : "") + '</span><p><span class="tag">' + esc(TLTAGS[e[1]] || e[1]) + "</span>" + esc(e[2]) + "</p></li>";
        }).join("") + "</ol></section>";
      }).join("") : '<p class="empty">No events for this topic.</p>';
      $$("[data-tag]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tag === tlTag)); });
    }
    $$("[data-tag]").forEach(function (b) { b.onclick = function () { tlTag = b.dataset.tag; draw(); }; });
    draw();
  }

  /* ================= glossary ================= */
  function renderGlossary() {
    var items = GL.slice().sort(function (a, b) { return a[0].localeCompare(b[0]); });
    main.innerHTML = '<div class="page"><header style="display:grid;gap:8px"><h1 class="h1">Glossary</h1><p class="sub">' + GL.length + ' terms you will meet in docs, papers and these lessons.</p></header>' +
      '<input class="input" id="gl-q" type="search" placeholder="Filter terms, e.g. ADL, LVR, DVN" aria-label="Filter terms" value="' + esc(glQ) + '"><p class="small" id="gl-count"></p><dl class="gloss" id="gl"></dl></div>';
    function draw() {
      var q = glQ.toLowerCase().trim();
      var list = items.filter(function (g) { return !q || (g[0] + " " + g[1]).toLowerCase().indexOf(q) >= 0; });
      $("#gl").innerHTML = list.length ? list.map(function (g) { return "<div><dt>" + esc(g[0]) + "</dt><dd>" + esc(g[1]) + "</dd></div>"; }).join("") : "<div><dt>No match</dt><dd>Try a shorter word.</dd></div>";
      $("#gl-count").textContent = list.length + " of " + GL.length + " terms";
    }
    $("#gl-q").oninput = function (e) { glQ = e.target.value; draw(); };
    draw();
  }

  /* ================= tutor chat ================= */
  var chat = [];
  var STARTERS = [
    "I want to build a perp DEX. Which units should I prioritize and in what order?",
    "Design a liquidation engine for a new perp venue listing long-tail assets. What parameters and why?",
    "Compare building on Hyperliquid's HIP-3 with launching my own appchain for an equity-perp venue.",
    "Critique this: an AMM hook that auctions the first swap in each block to recapture LVR."
  ];
  function renderTutorView() {
    main.innerHTML = '<div class="page" data-tutor><header style="display:grid;gap:8px"><h1 class="h1">Tutor</h1><p class="sub">A free-form chat with Claude, tuned for protocol engineers. Plan your path, attack your designs, or go deeper than a lesson. It can\'t browse the web, so check anything recent against the Library.</p></header>' +
      '<div class="chat" id="chat"></div><div class="prompts" id="starters">' + STARTERS.map(function (s, i) { return '<button type="button" data-s="' + i + '">' + esc(s) + "</button>"; }).join("") + "</div>" +
      '<form class="ask" id="chat-form"><label class="small" for="chat-q">Message</label><textarea id="chat-q" rows="3" placeholder="Ask about a mechanism, paste a design to critique, or ask for a study plan"></textarea>' +
      '<div class="row"><button class="btn primary" type="submit">Send</button><button class="btn" type="button" data-stop hidden>Stop</button><button class="btn" type="button" id="chat-clear">Clear chat</button></div></form></div>';
    drawChat();
    var form = $("#chat-form"), ta = $("#chat-q"), stop = $("[data-stop]", form);
    function send(text) {
      text = text.trim(); if (!text) return;
      if (tutorBlocked) { toast(tutorBlocked); return; }
      chat.push({ role: "user", content: text }); ta.value = ""; drawChat();
      var bubble = document.createElement("div"); bubble.className = "msg bot"; bubble.innerHTML = '<span class="who">Tutor</span><div class="answer"></div>';
      $("#chat").appendChild(bubble);
      var turns = [{ role: "user", content: TUTOR_RULES + "\n\nThe learner has completed " + stats().done + " of " + LESSONS.length + " lessons. Units: " + UNITS.map(function (u) { return u.n + ". " + u.t; }).join("; ") + "." }].concat(chat.slice(-12));
      runSample(turns, $(".answer", bubble), stop).then(function (t) { if (t) chat.push({ role: "assistant", content: t }); });
    }
    form.onsubmit = function (e) { e.preventDefault(); send(ta.value); };
    ta.onkeydown = function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(ta.value); } };
    $$("[data-s]").forEach(function (b) { b.onclick = function () { send(STARTERS[+b.dataset.s]); }; });
    $("#chat-clear").onclick = function () { stopTutor(); chat = []; drawChat(); };
  }
  function drawChat() {
    var el = $("#chat"); if (!el) return;
    el.innerHTML = chat.length ? chat.map(function (m) {
      return '<div class="msg ' + (m.role === "user" ? "me" : "bot") + '"><span class="who">' + (m.role === "user" ? "You" : "Tutor") + '</span><div class="answer">' + (m.role === "user" ? "<p>" + esc(m.content).replace(/\n/g, "<br>") + "</p>" : md(m.content)) + "</div></div>";
    }).join("") : '<p class="empty">No messages yet. Pick a starter or write your own. The first message asks permission to use your Claude account.</p>';
    var st = $("#starters"); if (st) st.hidden = chat.length > 0;
  }

  main.addEventListener("click", function (e) {
    var j = e.target.closest && e.target.closest("[data-jump-try]");
    if (j) { e.preventDefault(); var t = document.getElementById("try"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });

  /* ================= keyboard ================= */
  document.addEventListener("keydown", function (e) {
    var t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if (e.key === "Escape") { closeAa(); closeDrawer(); return; }
    if (typing || e.altKey) return;
    if ((e.key === "/" && !e.metaKey && !e.ctrlKey) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      if (window.innerWidth < 900) { openDrawer(); var mi = $("[data-search] input", sidenav); if (mi) mi.focus(); }
      else $("#q").focus();
      return;
    }
    if (e.metaKey || e.ctrlKey) return;
    var l = currentLesson();
    if (l && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      var seq = lessonSeq(l), i = seq.indexOf(l), target = seq[i + (e.key === "ArrowRight" ? 1 : -1)];
      if (target) { e.preventDefault(); location.hash = target.id; }
    }
  });
  document.addEventListener("click", function () { closeAa(); });

  /* ================= boot ================= */
  applyPrefs();
  lastHash = location.hash.slice(1);
  route();
  initSync();
})();
