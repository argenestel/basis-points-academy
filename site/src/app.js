(function () {
  "use strict";
  var UNITS = window.BP_UNITS, TL = window.BP_TIMELINE, TLTAGS = window.BP_TIMELINE_TAGS, GL = window.BP_GLOSSARY, BUILDS = window.BP_BUILDS;
  var LESSONS = [], byId = {}, STEP = {};
  UNITS.forEach(function (u, ui) {
    u.n = ui + 1;
    u.lessons.forEach(function (l, li) {
      l.u = u; l.n = li + 1;
      l.code = "U" + String(ui + 1).padStart(2, "0") + "·L" + (li + 1);
      LESSONS.push(l); byId[l.id] = l;
    });
  });
  BUILDS.forEach(function (b) { b.steps.forEach(function (s) { STEP[s[0]] = b; }); });
  var REPO = "https://github.com/argenestel/basis-points-academy";
  var TYPE = { P: "Paper", D: "Docs", C: "Code", K: "Course / book", N: "News & reports", R: "Post-mortem", T: "Data & tools" };
  var TYPE_ORDER = ["P", "K", "D", "C", "R", "N", "T"];
  var LEVELS = [[0, "Observer"], [4, "Liquidity provider"], [12, "Arbitrageur"], [24, "Market maker"], [40, "Risk engineer"], [56, "Protocol architect"], [72, "Core dev"]];
  var DAILY_GOAL = 2;

  var main = document.getElementById("main");
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function dayKey(d) { d = new Date(d); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function stripHtml(h) { var d = document.createElement("div"); d.innerHTML = h; return (d.textContent || "").replace(/\s+\n/g, "\n").trim(); }

  /* ---------------- progress state ---------------- */
  var KEY = "bp-academy-progress-v1";
  var S = { done: {}, builds: {} };
  function merge(o) {
    if (!o || typeof o !== "object") return;
    var d = o.done || {}, b = o.builds || {};
    Object.keys(d).forEach(function (id) {
      var v = d[id]; if (!byId[id] || !v || typeof v !== "object") return;
      var cur = S.done[id];
      if (!cur) S.done[id] = { at: String(v.at || ""), ft: +v.ft || 0, n: +v.n || 0 };
      else {
        if (v.at && (!cur.at || v.at < cur.at)) cur.at = String(v.at);
        cur.ft = Math.max(cur.ft || 0, +v.ft || 0); cur.n = Math.max(cur.n || 0, +v.n || 0);
      }
    });
    Object.keys(b).forEach(function (id) {
      var v = b[id]; if (!STEP[id] || !v || typeof v !== "object") return;
      var cur = S.builds[id];
      if (!cur || String(v.at || "") > String(cur.at || "")) S.builds[id] = { v: !!v.v, at: String(v.at || "") };
    });
  }
  function stable(o) { return JSON.stringify(o, function (k, v) { return v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).sort().reduce(function (a, kk) { a[kk] = v[kk]; return a; }, {}) : v; }); }
  function snapshot() { return { done: S.done, builds: S.builds, v: 1 }; }
  try { var raw = localStorage.getItem(KEY); if (raw) merge(JSON.parse(raw)); } catch (e) { /* storage unavailable */ }

  var dbRef = null, syncMode = "local", writing = false, dirty = false;
  function writeLocal() { try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (e) { /* ignore */ } }
  function save() {
    writeLocal();
    if (!dbRef) return;
    if (writing) { dirty = true; return; }
    writing = true;
    (function loop() {
      dirty = false;
      dbRef.set(JSON.parse(JSON.stringify(snapshot()))).then(function () {
        if (dirty) return loop();
        writing = false;
      }, function (e) {
        writing = false;
        if (e && (e.code === "invalid_argument" || e.code === "revoked" || e.code === "not_granted")) { dbRef = null; syncMode = "local"; renderStats(); }
        else if (e && e.code === "unavailable") { setTimeout(save, 1500 + Math.random() * 1500); }
      });
    })();
  }
  function initSync() {
    if (!window.claude || typeof window.claude.use !== "function") return;
    Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function (r) {
      var db = r[0], user = r[1];
      if (!db || !user) return null;
      return user.id().then(function (uid) {
        if (!uid) return null;
        var ref = db.doc("data/users/" + uid + "/progress");
        return ref.get().then(function (snap) {
          var remote = snap.exists ? snap.data() : null;
          var before = stable({ done: S.done, builds: S.builds });
          if (remote) merge(remote);
          dbRef = ref; syncMode = "cloud";
          var tmp = S; S = { done: {}, builds: {} }; merge(remote); var remoteNorm = stable({ done: S.done, builds: S.builds }); S = tmp;
          if (stable({ done: S.done, builds: S.builds }) !== remoteNorm) save(); else writeLocal();
          if (before !== stable({ done: S.done, builds: S.builds })) route(); else renderStats();
        });
      });
    }).catch(function () { dbRef = null; syncMode = "local"; renderStats(); });
  }

  /* ---------------- derived stats ---------------- */
  function stats() {
    var doneIds = Object.keys(S.done).filter(function (id) { return byId[id]; });
    var bps = 0, steps = 0, days = {}, today = dayKey(new Date()), todayCount = 0;
    doneIds.forEach(function (id) {
      var v = S.done[id]; bps += 100 + 25 * (v.ft || 0);
      if (v.at) { var k = dayKey(v.at); days[k] = 1; if (k === today) todayCount++; }
    });
    Object.keys(S.builds).forEach(function (id) { var v = S.builds[id]; if (v.v && STEP[id]) { bps += 50; steps++; if (v.at) days[dayKey(v.at)] = 1; } });
    var streak = 0, d = new Date(); if (!days[today]) d.setDate(d.getDate() - 1);
    while (days[dayKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
    var level = LEVELS[0][1]; LEVELS.forEach(function (lv) { if (doneIds.length >= lv[0]) level = lv[1]; });
    return { bps: bps, done: doneIds.length, steps: steps, streak: streak, todayCount: todayCount, level: level };
  }
  function renderStats() {
    var s = stats();
    $("#stats").innerHTML =
      '<div><div class="bal"><span class="num">' + fmt(s.bps) + '</span><span class="unit">bps</span></div>' +
      '<p class="bal-sub">' + s.done + " of " + LESSONS.length + " lessons · " + s.steps + " build steps</p></div>" +
      '<div class="kv"><div><span class="k">Streak</span><span class="v">' + s.streak + (s.streak === 1 ? " day" : " days") + '</span></div>' +
      '<div><span class="k">Level</span><span class="v">' + esc(s.level) + "</span></div></div>" +
      '<div class="goal"><span>Today: ' + Math.min(s.todayCount, DAILY_GOAL) + " / " + DAILY_GOAL + ' lessons</span><div class="bar"><i style="width:' + Math.round(100 * Math.min(1, s.todayCount / DAILY_GOAL)) + '%"></i></div></div>' +
      '<p class="sync">' + (syncMode === "cloud" ? "Progress saved to your Claude account" : "Progress saved in this browser") + "</p>";
    $("#n-learn").textContent = s.done + "/" + LESSONS.length;
  }

  /* ---------------- sources ---------------- */
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

  /* ---------------- tutor (sample capability) ---------------- */
  var samplePromise = (window.claude && typeof window.claude.use === "function") ? window.claude.use("sample").catch(function () { return null; }) : Promise.resolve(null);
  var sampleState = "pending", sampleFn = null, tutorBlocked = "";
  samplePromise.then(function (fn) { sampleFn = fn; sampleState = fn ? "ready" : "none"; refreshTutorAvailability(); });
  var activeCtl = null;
  function stopTutor() { if (activeCtl) { activeCtl.abort(); activeCtl = null; } }
  function errCopy(code) {
    switch (code) {
      case "not_granted": return "The tutor wasn't allowed to use your Claude account in this visit. Reload the page if you want to be asked again.";
      case "sampling_disabled": return "Claude isn't available for this account, so the tutor is off.";
      case "rate_limited": return "Too many questions in a short time. Wait a minute, then ask again.";
      case "session_expired": return "Your Claude session expired. Sign in again, then ask.";
      case "refused": return "Claude declined that question. Rephrase it and try again.";
      case "prompt_too_large": return "That question is too long. Shorten it and try again.";
      case "empty_completion": return "The tutor returned nothing. Try asking in a different way.";
      case "invalid_json": return "The new questions came back in the wrong format. Press the button again.";
      case "cancelled": return "";
      default: return "The tutor couldn't answer just now. Try again.";
    }
  }
  var HIDE_CODES = { not_granted: 1, sampling_disabled: 1, not_declared: 1, capability_disabled: 1, capability_removed: 1 };
  function tutorUnavailable() { return sampleState === "none" || !!tutorBlocked; }
  function refreshTutorAvailability() {
    $$("[data-tutor]").forEach(function (el) {
      var off = tutorUnavailable();
      $$("button, textarea", el).forEach(function (c) { if (!c.hasAttribute("data-stop")) c.disabled = off; });
      var n = $(".tutor-off", el);
      if (n) { n.hidden = !off; n.textContent = tutorBlocked || "The AI tutor only works when this course runs as a Claude artifact on claude.ai. Here, use the lessons, quizzes, sources and labs. Your progress is saved in this browser."; }
    });
  }
  var TUTOR_RULES = "You are the tutor inside Basis Points Academy, a self-study course on DeFi, onchain markets, perpetual futures, tokenized stocks, MEV, bridges, building blockchains, and protocol economics. The learner is a software engineer who wants to design and build their own protocol. Be concrete: use real numbers, formulas, short code sketches (Solidity, Rust, Python or TypeScript) where they help, and name the real protocols, papers and incidents involved. Prefer depth over hype. If something may have changed after your training data, say so plainly and tell the learner what to verify and where. Format with Markdown. Keep answers under about 400 words unless the learner asks for more.";
  function lessonContext(l) {
    var body = stripHtml(l.body).slice(0, 7000);
    return "CURRENT LESSON: " + l.code + " " + l.t + " (unit: " + l.u.t + ")\nSUMMARY: " + l.sum + "\nKEY IDEAS: " + l.keys.join("; ") + "\nLESSON TEXT:\n" + body + "\nBUILD TASK: " + l.build;
  }

  /* minimal, safe Markdown renderer for tutor answers */
  function md(src) {
    var lines = String(src).replace(/\r/g, "").split("\n"), out = [], i = 0;
    function inline(s) {
      return esc(s)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    while (i < lines.length) {
      var line = lines[i];
      if (/^```/.test(line)) {
        var code = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++; out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>"); continue;
      }
      if (/^\s*\|/.test(line)) {
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
        rows = rows.filter(function (r) { return !/^\s*\|?\s*:?-{2,}/.test(r.replace(/\|/g, "").trim() ? r : "---"); });
        var cells = rows.map(function (r) { return r.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }); })
          .filter(function (c) { return !c.every(function (x) { return /^:?-{2,}:?$/.test(x); }); });
        if (cells.length) {
          var h = "<div class=\"tbl\"><table><thead><tr>" + cells[0].map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
          cells.slice(1).forEach(function (r) { h += "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; });
          out.push(h + "</tbody></table></div>");
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

  function runSample(input, outEl, stopBtn, opts) {
    if (sampleState === "pending") {
      outEl.innerHTML = '<p class="thinking">Connecting to the tutor…</p>';
      return samplePromise.then(function () {
        if (!sampleFn) { outEl.innerHTML = '<p class="note-err">The AI tutor only works when this course runs as a Claude artifact on claude.ai.</p>'; return null; }
        return runSample(input, outEl, stopBtn, opts);
      });
    }
    opts = opts || {};
    if (!sampleFn) return Promise.resolve(null);
    stopTutor();
    var ctl = new AbortController(); activeCtl = ctl;
    outEl.innerHTML = '<p class="thinking">Thinking…</p>';
    if (stopBtn) { stopBtn.hidden = false; stopBtn.onclick = function () { ctl.abort(); }; }
    return sampleFn(input, { signal: ctl.signal, cache: opts.cache === undefined ? false : opts.cache, onText: function (u) { outEl.innerHTML = md(u.text); } })
      .then(function (res) {
        outEl.innerHTML = md(res.text) + (res.truncated ? '<p class="muted">The answer was cut short. Ask for a narrower part.</p>' : "");
        return res.text;
      }, function (e) {
        var code = e && e.code;
        var kept = e && e.text ? md(e.text) : "";
        var copy = errCopy(code);
        if (HIDE_CODES[code]) { tutorBlocked = copy; refreshTutorAvailability(); }
        outEl.innerHTML = kept + (copy ? '<p class="note-err">' + esc(copy) + "</p>" : "");
        return null;
      })
      .then(function (t) { if (activeCtl === ctl) activeCtl = null; if (stopBtn) stopBtn.hidden = true; return t; });
  }

  /* ---------------- routing ---------------- */
  var VIEWS = ["learn", "library", "builds", "timeline", "glossary", "tutor"];
  function route() {
    stopTutor();
    var h = (location.hash || "#learn").slice(1);
    var view = byId[h] ? "learn" : (VIEWS.indexOf(h) >= 0 ? h : "learn");
    $$("#nav a").forEach(function (a) { if (a.dataset.v === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (byId[h]) renderLesson(byId[h]);
    else if (view === "library") renderLibrary();
    else if (view === "builds") renderBuilds();
    else if (view === "timeline") renderTimeline();
    else if (view === "glossary") renderGlossary();
    else if (view === "tutor") renderTutorView();
    else renderLearn();
    renderStats();
    refreshTutorAvailability();
  }
  var lastHash = null;
  window.addEventListener("hashchange", function () {
    route();
    var h = location.hash.slice(1);
    if (h !== lastHash) { window.scrollTo(0, 0); lastHash = h; }
  });

  /* ---------------- learn ---------------- */
  var CHECK = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function ring(frac) {
    var r = 17, c = 2 * Math.PI * r, off = c * (1 - frac);
    return '<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="' + r + '" fill="none" stroke="var(--panel-2)" stroke-width="6"/>' +
      '<circle cx="22" cy="22" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 22 22)"/></svg>';
  }
  function nextLesson() { for (var i = 0; i < LESSONS.length; i++) if (!S.done[LESSONS[i].id]) return LESSONS[i]; return null; }
  function renderLearn() {
    var next = nextLesson(), s = stats();
    var h = '<header class="learn-head"><p class="eyebrow">' + UNITS.length + " units · " + LESSONS.length + " lessons · " + SOURCES.length + " primary sources · " + BUILDS.length + " build tracks</p>" +
      "<h1>Learn DeFi by building it.</h1>" +
      '<p class="lede">From money and market microstructure to building your own chain, AMMs, lending, stablecoins, perps, tokenized stocks, MEV, bridges, fundraising and launches, up to October 2026. Each lesson summarizes the key papers and docs, sets a build task and ends with a quiz. Finishing a lesson earns 100 bps, plus 25 for each first-try correct answer.</p>' +
      '<div class="actions">' + (next ? '<a class="btn primary" href="#' + next.id + '">' + (s.done ? "Continue" : "Start") + ": " + esc(next.code) + " " + esc(next.t) + "</a>" : '<span class="chip">All lessons complete</span>') +
      '<a class="btn" href="#builds">Open build tracks</a><a class="btn" href="' + REPO + '/tree/main/labs" target="_blank" rel="noopener">Hands-on labs on GitHub ↗</a></div></header>';
    h += '<div class="jump" aria-label="Jump to unit">' + UNITS.map(function (u) {
      var full = u.lessons.every(function (l) { return S.done[l.id]; });
      return '<button type="button" data-jump="' + u.id + '" class="' + (full ? "full" : "") + '" title="' + esc(u.t) + '">' + pad2(u.n) + "</button>";
    }).join("") + "</div>";
    UNITS.forEach(function (u) {
      var dn = u.lessons.filter(function (l) { return S.done[l.id]; }).length;
      h += '<section class="unit" id="unit-' + u.id + '"><div class="unit-head"><div class="unit-num">' + pad2(u.n) + "</div>" +
        '<div><p class="eyebrow">' + esc(u.tag) + "</p><h2>" + esc(u.t) + '</h2><p class="d">' + esc(u.d) + "</p></div>" +
        '<div class="ring">' + ring(dn / u.lessons.length) + "<span>" + dn + "/" + u.lessons.length + "</span></div></div><ol class=\"path\">";
      u.lessons.forEach(function (l, i) {
        var st = S.done[l.id] ? "done" : (next === l ? "next" : "todo");
        var x = Math.round(Math.sin(i * 1.2 + u.n * 0.7) * 64);
        h += '<li class="node ' + st + '" style="--x:' + x + '"><a class="node-btn" href="#' + l.id + '" aria-label="' + esc(l.code + " " + l.t + (st === "done" ? ", completed" : "")) + '">' +
          (st === "done" ? CHECK : "<span>" + l.n + "</span>") + "</a>" +
          '<a class="node-label" href="#' + l.id + '" tabindex="-1"><span class="code">' + esc(l.code) + " · " + l.min + " min</span><span class=\"ttl\">" + esc(l.t) + "</span></a></li>";
      });
      h += "</ol></section>";
    });
    main.innerHTML = h;
    $$("[data-jump]").forEach(function (b) { b.onclick = function () { var el = document.getElementById("unit-" + b.dataset.jump); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }; });
  }

  /* ---------------- lesson ---------------- */
  function srcItem(s, showUsed) {
    var used = showUsed && s.ls ? '<p class="used">Used in ' + s.ls.slice(0, 4).map(function (l) { return '<a href="#' + l.id + '">' + esc(l.code) + "</a>"; }).join(", ") + (s.ls.length > 4 ? " +" + (s.ls.length - 4) : "") + "</p>" : "";
    return '<li><span class="chip">' + esc(TYPE[s.ty] || s.ty) + '</span><div><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.t) + " ↗</a>" +
      (s.note ? '<p class="note">' + esc(s.note) + "</p>" : "") + used + "</div></li>";
  }
  var PROMPTS = [
    ["Explain it simply", "Explain this lesson as if I'm a strong backend engineer who has never traded. Use one concrete running example."],
    ["Work the math", "Walk me through the main formula in this lesson with a fully worked numeric example, step by step."],
    ["How do I build it?", "How would I implement the core mechanism from this lesson? Give a code sketch, the data structures, and the main pitfalls."],
    ["What breaks?", "What are the ways this mechanism fails in production? Cover attack vectors, economic failure modes, and real incidents you know of."],
    ["Compare designs", "Compare the main competing designs for what this lesson covers, with a table of trade-offs, and tell me which you'd choose for a new protocol and why."]
  ];
  function tutorBlock(idPrefix, withMore) {
    return '<section class="tutor block" id="s-tutor" data-tutor><h3>Ask the tutor</h3>' +
      '<p class="muted">Claude answers with this lesson as context. The first question asks permission to use your Claude account. Answers can be wrong or out of date, so check them against the sources.</p>' +
      '<p class="note-err tutor-off" hidden></p>' +
      '<div class="prompts">' + PROMPTS.map(function (p, i) { return '<button type="button" data-p="' + i + '">' + esc(p[0]) + "</button>"; }).join("") + "</div>" +
      '<form class="ask"><label class="muted" for="' + idPrefix + '-q">Your question</label><textarea id="' + idPrefix + '-q" rows="2" placeholder="e.g. Why is LVR proportional to variance and not volatility?"></textarea>' +
      '<div class="row"><button class="btn primary" type="submit">Ask</button><button class="btn" type="button" data-stop hidden>Stop</button>' +
      (withMore ? '<button class="btn ghost" type="button" data-more>Quiz me with 3 new questions</button>' : "") + "</div></form>" +
      '<div class="answer" aria-live="polite"></div></section>';
  }
  function renderLesson(l) {
    var idx = LESSONS.indexOf(l), prev = LESSONS[idx - 1], nxt = LESSONS[idx + 1], d = S.done[l.id];
    var h = '<article class="lesson">' +
      '<div class="crumbs"><a href="#learn">← Path</a><span>' + esc(l.u.tag) + " · Unit " + l.u.n + ": " + esc(l.u.t) + "</span></div>" +
      '<header class="lesson-title"><p class="eyebrow">' + esc(l.code) + " · " + l.min + " min read" + (d ? " · completed, " + (d.ft || 0) + "/" + (d.n || l.quiz.length) + " first try" : "") + "</p>" +
      "<h1>" + esc(l.t) + '</h1><p class="lede">' + esc(l.sum) + "</p>" +
      '<div class="steps"><button type="button" data-go="s-sources">Sources</button><button type="button" data-go="s-build">Build task</button><button type="button" data-go="s-tutor">Ask the tutor</button><button type="button" data-go="s-quiz">Quiz</button></div></header>' +
      '<div class="prose">' + l.body + "</div>" +
      '<aside class="keys block"><h3>Key ideas</h3><ul>' + l.keys.map(function (k) { return "<li><span>" + esc(k) + "</span></li>"; }).join("") + "</ul></aside>" +
      '<section class="block" id="s-sources"><h3>Read the sources</h3><ul class="srcs">' + l.src.map(function (s) { return srcItem({ t: s[0], url: s[1], ty: s[2], note: s[3] }, false); }).join("") + "</ul></section>" +
      '<section class="buildbox block" id="s-build"><h3>Build it</h3><p>' + esc(l.build) + '</p><p class="muted">Bigger projects live in <a href="#builds">Builds</a>.</p></section>' +
      tutorBlock("t-" + l.id, true) +
      '<section class="block" id="s-quiz"><h3>Quiz</h3><div id="quiz-root"></div></section>' +
      '<nav class="pager">' + (prev ? '<a href="#' + prev.id + '"><span class="lbl">← Previous</span>' + esc(prev.t) + "</a>" : "<span></span>") +
      (nxt ? '<a href="#' + nxt.id + '" style="text-align:right"><span class="lbl">Next →</span>' + esc(nxt.t) + "</a>" : "<span></span>") + "</nav></article>";
    main.innerHTML = h;
    $$("[data-go]").forEach(function (b) { b.onclick = function () { var el = document.getElementById(b.dataset.go); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }; });
    setupQuiz(l, null);
    setupLessonTutor(l);
  }
  function setupLessonTutor(l) {
    var box = $("#s-tutor"), form = $("form", box), ta = $("textarea", box), out = $(".answer", box), stop = $("[data-stop]", box), more = $("[data-more]", box);
    function ask(q) {
      if (!q.trim() || tutorUnavailable()) return;
      runSample(TUTOR_RULES + "\n\n" + lessonContext(l) + "\n\nLEARNER'S QUESTION: " + q.trim(), out, stop);
    }
    form.onsubmit = function (e) { e.preventDefault(); ask(ta.value); };
    ta.onkeydown = function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ask(ta.value); } };
    $$("[data-p]", box).forEach(function (b) { b.onclick = function () { var p = PROMPTS[+b.dataset.p][1]; ta.value = p; ask(p); }; });
    if (more) more.onclick = function () {
      if (!sampleFn || tutorUnavailable()) return;
      stopTutor();
      var ctl = new AbortController(); activeCtl = ctl;
      more.disabled = true; out.innerHTML = '<p class="thinking">Writing new questions…</p>'; stop.hidden = false; stop.onclick = function () { ctl.abort(); };
      var prompt = TUTOR_RULES + "\n\n" + lessonContext(l) + "\n\nWrite 3 NEW multiple-choice questions that test understanding of this lesson (reasoning, numbers or design trade-offs, not trivia), different from these existing ones: " +
        l.quiz.map(function (q) { return q[0]; }).join(" | ") +
        '\nReply with only a JSON array of 3 objects shaped like {"q": "question", "options": ["the correct answer", "wrong", "wrong", "wrong"], "why": "one or two sentence explanation"}. Put the correct answer FIRST in options; the page shuffles them.';
      sampleFn.json(prompt, { signal: ctl.signal }).then(function (arr) {
        var qs = (Array.isArray(arr) ? arr : []).filter(function (q) { return q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length >= 2 && q.options.every(function (o) { return typeof o === "string"; }); })
          .slice(0, 5).map(function (q) { return { q: q.q, opts: q.options.slice(0, 4), why: typeof q.why === "string" ? q.why : "" }; });
        if (!qs.length) { out.innerHTML = '<p class="note-err">' + esc(errCopy("invalid_json")) + "</p>"; return; }
        out.innerHTML = '<p class="muted">Three bonus questions are ready in the quiz below. They don\'t affect your score.</p>';
        setupQuiz(l, qs);
        var qz = document.getElementById("s-quiz"); if (qz) qz.scrollIntoView({ behavior: "smooth", block: "start" });
      }, function (e) {
        var c = errCopy(e && e.code); if (HIDE_CODES[e && e.code]) { tutorBlocked = c; refreshTutorAvailability(); }
        out.innerHTML = c ? '<p class="note-err">' + esc(c) + "</p>" : "";
      }).then(function () { if (activeCtl === ctl) activeCtl = null; stop.hidden = true; more.disabled = tutorUnavailable(); });
    };
  }

  /* ---------------- quiz ---------------- */
  var quizKeys = null;
  function setupQuiz(l, extra) {
    var root = $("#quiz-root");
    var qs = extra || l.quiz.map(function (q) { return { q: q[0], opts: q[1], why: q[2] }; });
    var st = { queue: qs.map(function (_, i) { return i; }), first: {}, tried: {}, total: qs.length };
    function intro() {
      quizKeys = null;
      var d = S.done[l.id];
      root.innerHTML = '<div class="quiz-card"><h3 class="q">' + (extra ? "Bonus questions" : (d ? "Practice again" : "Check yourself")) + "</h3>" +
        '<p class="muted">' + qs.length + " questions. Answers are shuffled, and anything you miss comes back until you get it right." +
        (extra ? " Bonus questions don't change your score." : (d ? " Your best first-try score is kept." : " Finishing earns 100 bps, plus 25 for each first-try correct answer.")) + "</p>" +
        '<div><button class="btn primary" type="button" id="q-start">Start quiz</button></div></div>';
      $("#q-start").onclick = show;
    }
    function show() {
      if (!st.queue.length) return finish();
      var i = st.queue[0], q = qs[i];
      var order = shuffle(q.opts.map(function (t, k) { return { t: t, k: k }; }));
      var answered = st.total - new Set(st.queue).size;
      root.innerHTML = '<div class="quiz-card"><div class="qbar"><i style="width:' + Math.round(100 * answered / st.total) + '%"></i></div>' +
        '<p class="eyebrow">' + (st.tried[i] ? "Try again · " : "") + "Question " + (Math.min(answered + 1, st.total)) + " of " + st.total + "</p>" +
        '<h3 class="q">' + esc(q.q) + '</h3><div class="opts" role="group" aria-label="Answers">' +
        order.map(function (o, j) { return '<button class="opt" type="button" data-k="' + o.k + '"><span class="key">' + "ABCD"[j] + "</span><span>" + esc(o.t) + "</span></button>"; }).join("") +
        '</div><div class="feedback" aria-live="polite"></div></div>';
      var btns = $$(".opt", root);
      btns.forEach(function (b) { b.onclick = function () { answer(i, +b.dataset.k, b); }; });
      quizKeys = function (key) { var n = "abcd1234".indexOf(key.toLowerCase()); if (n < 0) return false; var b = btns[n % 4]; if (b && !b.disabled) { b.click(); return true; } return false; };
      if (btns[0]) btns[0].focus({ preventScroll: true });
    }
    function answer(i, k, btn) {
      var q = qs[i], right = k === 0;
      $$(".opt", root).forEach(function (b) { b.disabled = true; if (+b.dataset.k === 0) b.classList.add("correct"); });
      if (!right) btn.classList.add("wrong");
      if (!st.tried[i]) { st.tried[i] = 1; if (right) st.first[i] = 1; }
      st.queue.shift(); if (!right) st.queue.push(i);
      quizKeys = null;
      var fb = $(".feedback", root);
      fb.innerHTML = '<p class="verdict ' + (right ? "ok" : "no") + '">' + (right ? "Correct" : "Not quite. This one will come back.") + "</p>" +
        (q.why ? "<p>" + esc(q.why) + "</p>" : "") + '<div><button class="btn primary" type="button" id="q-next">' + (st.queue.length ? "Continue" : "Finish") + "</button></div>";
      var nb = $("#q-next"); nb.onclick = show; nb.focus({ preventScroll: true });
      quizKeys = function (key) { if (key === "Enter") { nb.click(); return true; } return false; };
    }
    function finish() {
      quizKeys = null;
      var ft = Object.keys(st.first).length, gained = 0, msg;
      if (extra) {
        msg = '<p class="muted">Bonus round: ' + ft + " of " + st.total + " right on the first try.</p>";
      } else {
        var prev = S.done[l.id];
        if (!prev) { S.done[l.id] = { at: new Date().toISOString(), ft: ft, n: st.total }; gained = 100 + 25 * ft; }
        else { gained = Math.max(0, (ft - (prev.ft || 0)) * 25); prev.ft = Math.max(prev.ft || 0, ft); prev.n = st.total; }
        save(); renderStats();
        msg = '<p class="gain">+' + gained + ' bps</p><p class="muted">' + ft + " of " + st.total + " right on the first try" + (prev ? " (practice run)" : "") + ".</p>";
      }
      var nx = LESSONS[LESSONS.indexOf(l) + 1], s = stats();
      root.innerHTML = '<div class="quiz-card done-card"><p class="eyebrow">' + (extra ? "Bonus complete" : "Lesson complete") + "</p>" + msg +
        (extra ? "" : '<p class="muted">Streak: ' + s.streak + (s.streak === 1 ? " day" : " days") + " · Today: " + Math.min(s.todayCount, DAILY_GOAL) + "/" + DAILY_GOAL + "</p>") +
        '<div class="row">' + (nx ? '<a class="btn primary" href="#' + nx.id + '">Next: ' + esc(nx.t) + "</a>" : '<a class="btn primary" href="#builds">Go build</a>') +
        '<a class="btn" href="#learn">Back to path</a><button class="btn ghost" type="button" id="q-again">Retake quiz</button></div></div>';
      $("#q-again").onclick = function () { setupQuiz(l, extra); $("#q-start").click(); };
    }
    intro();
  }
  document.addEventListener("keydown", function (e) {
    if (!quizKeys || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target; if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
    if (quizKeys(e.key)) e.preventDefault();
  });

  /* ---------------- library ---------------- */
  var libState = { ty: "all", q: "" };
  function renderLibrary() {
    var counts = {}; SOURCES.forEach(function (s) { counts[s.ty] = (counts[s.ty] || 0) + 1; });
    main.innerHTML = '<header class="view-head"><p class="eyebrow">Library</p><h1>Every paper, doc and post-mortem in the course</h1>' +
      '<p class="lede">' + SOURCES.length + " sources, each with a one-line summary and the lessons that use it. Read papers for the ideas, docs and code for implementation, and post-mortems for what goes wrong.</p></header>" +
      '<div class="lib-tools"><label class="muted" for="lib-q">Search the library</label><input class="search" id="lib-q" type="search" placeholder="Search titles and summaries, e.g. LVR, funding, light client" value="' + esc(libState.q) + '">' +
      '<div class="filters" role="group" aria-label="Filter by type"><button type="button" data-ty="all">All ' + SOURCES.length + "</button>" +
      TYPE_ORDER.filter(function (t) { return counts[t]; }).map(function (t) { return '<button type="button" data-ty="' + t + '">' + esc(TYPE[t]) + " " + counts[t] + "</button>"; }).join("") +
      '</div><p class="count-line" id="lib-count"></p></div><ul class="srcs" id="lib-list"></ul>';
    function draw() {
      var q = libState.q.toLowerCase().trim();
      var list = SOURCES.filter(function (s) { return (libState.ty === "all" || s.ty === libState.ty) && (!q || (s.t + " " + s.note).toLowerCase().indexOf(q) >= 0); });
      $("#lib-list").innerHTML = list.length ? list.map(function (s) { return srcItem(s, true); }).join("") : '<li class="empty">No sources match. Try a broader word.</li>';
      $("#lib-count").textContent = "Showing " + list.length + " of " + SOURCES.length;
      $$("[data-ty]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.ty === libState.ty)); });
    }
    $("#lib-q").oninput = function (e) { libState.q = e.target.value; draw(); };
    $$("[data-ty]").forEach(function (b) { b.onclick = function () { libState.ty = b.dataset.ty; draw(); }; });
    draw();
  }

  /* ---------------- builds ---------------- */
  function renderBuilds() {
    var h = '<header class="view-head"><p class="eyebrow">Builds</p><h1>Nine projects that turn reading into a protocol</h1>' +
      '<p class="lede">Tick off steps as you ship them. Each step earns 50 bps and counts toward your streak. Six tracks have tested starter code with exercises in the <a href="' + REPO + '/tree/main/labs" target="_blank" rel="noopener">GitHub labs</a>. Start with the funding-rate collector, since it is read-only and risk-free.</p></header><div class="builds">';
    BUILDS.forEach(function (b) {
      var n = b.steps.filter(function (s) { return S.builds[s[0]] && S.builds[s[0]].v; }).length;
      h += '<article class="bcard" id="card-' + b.id + '"><div class="bcard-head"><div><h2>' + esc(b.t) + '</h2><div class="meta"><span class="chip">' + esc(b.lvl) + '</span><span class="chip">' + esc(b.stack) + "</span></div></div>" +
        '<span class="frac" data-frac="' + b.id + '">' + n + "/" + b.steps.length + "</span></div>" +
        '<p class="muted">' + esc(b.d) + '</p><div class="bar"><i data-bar="' + b.id + '" style="width:' + Math.round(100 * n / b.steps.length) + '%"></i></div>' +
        '<ul class="steplist">' + b.steps.map(function (s) {
          var on = S.builds[s[0]] && S.builds[s[0]].v;
          return '<li><label for="step-' + s[0] + '"><input type="checkbox" id="step-' + s[0] + '" data-step="' + s[0] + '"' + (on ? " checked" : "") + "><span>" + esc(s[1]) + "</span></label></li>";
        }).join("") + '</ul><div class="blinks">' +
        (b.code ? '<a href="' + REPO + "/tree/main/" + esc(b.code) + '" target="_blank" rel="noopener"><b>Starter code and exercises ↗</b></a>' : '<span class="muted">No starter code: build this one from the lessons.</span>') +
        b.links.map(function (k) { return '<a href="' + esc(k[1]) + '" target="_blank" rel="noopener">' + esc(k[0]) + " ↗</a>"; }).join("") + "</div></article>";
    });
    main.innerHTML = h + "</div>";
    $$("[data-step]").forEach(function (c) {
      c.onchange = function () {
        S.builds[c.dataset.step] = { v: c.checked, at: new Date().toISOString() };
        var b = STEP[c.dataset.step], n = b.steps.filter(function (s) { return S.builds[s[0]] && S.builds[s[0]].v; }).length;
        $('[data-frac="' + b.id + '"]').textContent = n + "/" + b.steps.length;
        $('[data-bar="' + b.id + '"]').style.width = Math.round(100 * n / b.steps.length) + "%";
        save(); renderStats(); updateBuildCount();
      };
    });
  }
  function updateBuildCount() { var total = 0, done = 0; BUILDS.forEach(function (b) { b.steps.forEach(function (s) { total++; if (S.builds[s[0]] && S.builds[s[0]].v) done++; }); }); $("#n-builds").textContent = done + "/" + total; }

  /* ---------------- timeline ---------------- */
  var tlState = { tag: "all" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function renderTimeline() {
    main.innerHTML = '<header class="view-head"><p class="eyebrow">Timeline</p><h1>From the Bitcoin whitepaper to the 2026 perp war</h1>' +
      '<p class="lede">The events that shaped today\'s designs. Items from mid-2026 onward come from news reports collected in October 2026, so check the details before relying on them.</p></header>' +
      '<div class="lib-tools"><div class="filters" role="group" aria-label="Filter by topic"><button type="button" data-tag="all">All</button>' +
      Object.keys(TLTAGS).map(function (k) { return '<button type="button" data-tag="' + k + '">' + esc(TLTAGS[k]) + "</button>"; }).join("") + '</div></div><div class="tl" id="tl"></div>';
    function draw() {
      var years = {}, order = [];
      TL.forEach(function (e) { if (tlState.tag !== "all" && e[1] !== tlState.tag) return; var y = e[0].slice(0, 4); if (!years[y]) { years[y] = []; order.push(y); } years[y].push(e); });
      $("#tl").innerHTML = order.length ? order.map(function (y) {
        return '<section class="tl-year"><h2>' + y + "</h2><ol>" + years[y].map(function (e) {
          var m = +e[0].slice(5, 7);
          return '<li><span class="m">' + (m ? MONTHS[m - 1] : "") + '</span><p><span class="chip">' + esc(TLTAGS[e[1]] || e[1]) + "</span>" + esc(e[2]) + "</p></li>";
        }).join("") + "</ol></section>";
      }).join("") : '<p class="empty">No events for this topic.</p>';
      $$("[data-tag]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tag === tlState.tag)); });
    }
    $$("[data-tag]").forEach(function (b) { b.onclick = function () { tlState.tag = b.dataset.tag; draw(); }; });
    draw();
  }

  /* ---------------- glossary ---------------- */
  var glQ = "";
  function renderGlossary() {
    var items = GL.slice().sort(function (a, b) { return a[0].localeCompare(b[0]); });
    main.innerHTML = '<header class="view-head"><p class="eyebrow">Glossary</p><h1>' + GL.length + ' terms you\'ll meet in docs and papers</h1></header>' +
      '<div class="lib-tools"><label class="muted" for="gl-q">Search terms</label><input class="search" id="gl-q" type="search" placeholder="e.g. ADL, LVR, DVN" value="' + esc(glQ) + '"><p class="count-line" id="gl-count"></p></div><dl class="gloss" id="gl"></dl>';
    function draw() {
      var q = glQ.toLowerCase().trim();
      var list = items.filter(function (g) { return !q || (g[0] + " " + g[1]).toLowerCase().indexOf(q) >= 0; });
      $("#gl").innerHTML = list.length ? list.map(function (g) { return "<div><dt>" + esc(g[0]) + "</dt><dd>" + esc(g[1]) + "</dd></div>"; }).join("") : '<div><dt>No match</dt><dd>Try a shorter word, or ask the tutor.</dd></div>';
      $("#gl-count").textContent = list.length + " of " + GL.length + " terms";
    }
    $("#gl-q").oninput = function (e) { glQ = e.target.value; draw(); };
    draw();
  }

  /* ---------------- tutor view (free chat) ---------------- */
  var chat = [];
  var STARTERS = [
    "I want to build a perp DEX. Which units should I prioritize and in what order?",
    "Design a liquidation engine for a new perp venue listing long-tail assets. What parameters and why?",
    "Compare building on Hyperliquid's HIP-3 versus launching my own appchain for an equity-perp venue.",
    "Critique this idea: an AMM hook that auctions the right to the first swap in each block to recapture LVR."
  ];
  function renderTutorView() {
    main.innerHTML = '<header class="view-head"><p class="eyebrow">Tutor</p><h1>Ask anything about building in DeFi</h1>' +
      '<p class="lede">A free-form chat with Claude, tuned for protocol engineers. Use it to plan your path, attack your designs, or go deeper than a lesson. It can\'t browse the web, so verify anything recent against the Library.</p></header>' +
      '<section class="tutor" data-tutor><p class="note-err tutor-off" hidden></p><div class="chat" id="chat"></div>' +
      '<div class="prompts" id="starters">' + STARTERS.map(function (s, i) { return '<button type="button" data-s="' + i + '">' + esc(s) + "</button>"; }).join("") + "</div>" +
      '<form class="ask" id="chat-form"><label class="muted" for="chat-q">Message</label><textarea id="chat-q" rows="3" placeholder="Ask about a mechanism, paste a design section to critique, or ask for a study plan"></textarea>' +
      '<div class="row"><button class="btn primary" type="submit">Send</button><button class="btn" type="button" data-stop hidden>Stop</button><button class="btn ghost" type="button" id="chat-clear">Clear chat</button></div></form></section>';
    drawChat();
    var form = $("#chat-form"), ta = $("#chat-q"), stop = $("[data-stop]", form);
    function send(text) {
      text = text.trim(); if (!text || tutorUnavailable() || !sampleFn) return;
      chat.push({ role: "user", content: text }); ta.value = ""; drawChat();
      var bubble = document.createElement("div"); bubble.className = "msg bot"; bubble.innerHTML = '<span class="who">Tutor</span><div class="answer"></div>';
      $("#chat").appendChild(bubble);
      var out = $(".answer", bubble);
      var turns = [{ role: "user", content: TUTOR_RULES + "\n\nThe learner has completed " + stats().done + " of " + LESSONS.length + " lessons. Course units: " + UNITS.map(function (u) { return u.n + ". " + u.t; }).join("; ") + "." }].concat(chat.slice(-12));
      runSample(turns, out, stop).then(function (t) { if (t) chat.push({ role: "assistant", content: t }); });
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
    }).join("") : '<p class="empty">No messages yet. Pick a starter below or write your own. The first message asks permission to use your Claude account.</p>';
    var st = $("#starters"); if (st) st.hidden = chat.length > 0;
  }

  /* ---------------- side footer: reset ---------------- */
  function renderFoot() {
    var f = $("#side-foot");
    f.innerHTML = '<p>Sources current to October 2026. Not financial or legal advice.</p><a href="' + REPO + '" target="_blank" rel="noopener">Source and labs on GitHub ↗</a><button class="linkbtn" type="button" id="reset">Reset my progress</button>';
    var armed = null;
    $("#reset").onclick = function () {
      var b = $("#reset");
      if (!armed) { b.textContent = "Click again to erase all progress"; armed = setTimeout(function () { armed = null; b.textContent = "Reset my progress"; }, 4000); return; }
      clearTimeout(armed); armed = null;
      S = { done: {}, builds: {} }; save(); b.textContent = "Progress erased"; route();
      setTimeout(function () { b.textContent = "Reset my progress"; }, 2500);
    };
  }

  /* ---------------- boot ---------------- */
  $("#n-library").textContent = SOURCES.length;
  $("#n-gloss").textContent = GL.length;
  updateBuildCount();
  renderFoot();
  lastHash = location.hash.slice(1);
  route();
  initSync();
})();
