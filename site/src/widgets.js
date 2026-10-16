/* Interactive simulators embedded in lessons ("Try it").
   Each widget: sliders -> compute() -> result rows + an SVG chart with a hover readout,
   a "predict first" challenge, and a collapsible explanation. Pure client-side math. */
window.BP_WIDGETS = (function () {
  "use strict";
  var uid = 0;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function num(x, d) { if (!isFinite(x)) return "∞"; var a = Math.abs(x); d = d === undefined ? (a >= 100 ? 0 : a >= 10 ? 1 : 2) : d; return x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function compact(x) { var a = Math.abs(x); if (a >= 1e9) return num(x / 1e9, 2) + "B"; if (a >= 1e6) return num(x / 1e6, 2) + "M"; if (a >= 1e4) return num(x / 1e3, 1) + "K"; return num(x); }
  function usd(x) { return (x < 0 ? "−$" : "$") + compact(Math.abs(x)); }
  function pct(x, d) { return (x < 0 ? "−" : "") + num(Math.abs(x) * 100, d === undefined ? 2 : d) + "%"; }

  /* ---------- nice ticks ---------- */
  function ticks(min, max, n) {
    var span = max - min; if (span <= 0) return [min];
    var step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], v = Math.ceil(min / step) * step;
    for (; v <= max + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return out;
  }
  function logTicks(min, max) {
    var out = [], cands = [1, 2, 5];
    for (var e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) cands.forEach(function (c) { var v = c * Math.pow(10, e); if (v >= min * 0.999 && v <= max * 1.001) out.push(v); });
    return out;
  }

  /* ---------- line chart with crosshair readout ---------- */
  function chart(spec) {
    var W = Math.round(clamp(spec.width || 560, 300, 760)), H = Math.round(clamp(W * 0.42, 210, 300)), L = 58, R = 18, T = 16, B = 42;
    var xs = spec.x, ys = spec.y, series = spec.series || [];
    var xmin = xs.min, xmax = xs.max, ymin = ys.min, ymax = ys.max;
    if (ymin === undefined || ymax === undefined) {
      var all = []; series.forEach(function (s) { s.points.forEach(function (p) { if (isFinite(p[1])) all.push(p[1]); }); });
      (spec.markers || []).forEach(function (m) { if (isFinite(m.y)) all.push(m.y); });
      var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.1 || 1;
      if (ymin === undefined) ymin = lo - pad; if (ymax === undefined) ymax = hi + pad;
    }
    var lx = function (v) { return xs.log ? Math.log(v) : v; };
    var X = function (v) { return L + (lx(v) - lx(xmin)) / (lx(xmax) - lx(xmin)) * (W - L - R); };
    var Y = function (v) { return T + (1 - (clamp(v, ymin, ymax) - ymin) / (ymax - ymin)) * (H - T - B); };
    var xt = xs.log ? logTicks(xmin, xmax) : ticks(xmin, xmax, W < 460 ? 3 : 5), yt = ticks(ymin, ymax, 4);
    if (xs.log && W < 460 && xt.length > 4) xt = xt.filter(function (_t, i) { return i % 2 === 0; });
    var fx = xs.fmt || num, fy = ys.fmt || num;
    var g = '<svg class="w-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(spec.label || "Chart") + '">';
    yt.forEach(function (t) { g += '<line class="w-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text class="w-tick" x="' + (L - 8) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + esc(fy(t)) + "</text>"; });
    xt.forEach(function (t) { g += '<text class="w-tick" x="' + X(t) + '" y="' + (H - B + 18) + '" text-anchor="middle">' + esc(fx(t)) + "</text>"; });
    g += '<line class="w-axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/>';
    g += '<text class="w-axlabel" x="' + ((L + W - R) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + esc(xs.label) + "</text>";
    g += '<text class="w-axlabel" x="12" y="' + ((T + H - B) / 2) + '" text-anchor="middle" transform="rotate(-90 12 ' + ((T + H - B) / 2) + ')">' + esc(ys.label) + "</text>";
    (spec.hlines || []).forEach(function (h) { if (h.y >= ymin && h.y <= ymax) g += '<line class="w-ref" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(h.y) + '" y2="' + Y(h.y) + '"/><text class="w-reflabel" x="' + (W - R - 4) + '" y="' + (Y(h.y) - 5) + '" text-anchor="end">' + esc(h.label) + "</text>"; });
    (spec.vlines || []).forEach(function (v) { if (v.x >= xmin && v.x <= xmax) g += '<line class="w-ref" x1="' + X(v.x) + '" x2="' + X(v.x) + '" y1="' + T + '" y2="' + (H - B) + '"/><text class="w-reflabel" x="' + (X(v.x) + 4) + '" y="' + (T + 10) + '">' + esc(v.label) + "</text>"; });
    series.forEach(function (s, i) {
      var d = s.points.filter(function (p) { return isFinite(p[1]); }).map(function (p, j) { return (j ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1); }).join("");
      if (s.area) g += '<path class="w-area w-a' + (s.color || i + 1) + '" d="' + d + "L" + X(s.points[s.points.length - 1][0]) + "," + Y(Math.max(ymin, 0)) + "L" + X(s.points[0][0]) + "," + Y(Math.max(ymin, 0)) + 'Z"/>';
      g += '<path class="w-line w-s' + (s.color || i + 1) + '" d="' + d + '"/>';
    });
    var placed = [];
    (spec.markers || []).forEach(function (m) {
      if (!isFinite(m.y) || m.x < xmin || m.x > xmax) return;
      g += '<circle class="w-dot w-d' + (m.color || 1) + '" cx="' + X(m.x) + '" cy="' + Y(m.y) + '" r="5"/>';
      if (!m.label) return;
      var w = m.label.length * 7 + 4, right = m.right !== false && X(m.x) + 9 + w < W - R;
      var cand = [[right ? 9 : -9, -10], [right ? 9 : -9, 20], [right ? -9 : 9, -10], [right ? -9 : 9, 20]], pick = cand[0];
      for (var c = 0; c < cand.length; c++) {
        var dx = cand[c][0], bx = dx > 0 ? X(m.x) + dx : X(m.x) + dx - w, by = Y(m.y) + cand[c][1] - 12;
        var hit = placed.some(function (q) { return bx < q[0] + q[2] && bx + w > q[0] && by < q[1] + 16 && by + 16 > q[1]; });
        if (!hit && by > 2 && by + 16 < H - B) { pick = cand[c]; break; }
      }
      var lx2 = X(m.x) + pick[0], ly2 = Y(m.y) + pick[1];
      placed.push([pick[0] > 0 ? lx2 : lx2 - w, ly2 - 12, w]);
      g += '<text class="w-mlabel" x="' + lx2 + '" y="' + ly2 + '" text-anchor="' + (pick[0] > 0 ? "start" : "end") + '">' + esc(m.label) + "</text>";
    });
    g += '<g class="w-hover" visibility="hidden"><line class="w-cross" y1="' + T + '" y2="' + (H - B) + '"/><g class="w-tip"><rect rx="6"/><text></text></g></g>';
    g += '<rect class="w-hit" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '"/></svg>';
    var legend = series.length > 1 ? '<div class="w-legend">' + series.map(function (s, i) { return '<span><i class="w-key w-k' + (s.color || i + 1) + '"></i>' + esc(s.name) + "</span>"; }).join("") + "</div>" : "";
    return { html: legend + g, bind: function (root) {
      var svg = root.querySelector(".w-chart"); if (!svg || !series.length) return;
      var hover = svg.querySelector(".w-hover"), cross = svg.querySelector(".w-cross"), tip = svg.querySelector(".w-tip"), txt = tip.querySelector("text"), box = tip.querySelector("rect");
      function move(ev) {
        var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        var p = pt.matrixTransform(svg.getScreenCTM().inverse());
        var frac = clamp((p.x - L) / (W - L - R), 0, 1);
        var xv = xs.log ? Math.exp(lx(xmin) + frac * (lx(xmax) - lx(xmin))) : xmin + frac * (xmax - xmin);
        var lines = [xs.label + ": " + fx(xv)];
        series.forEach(function (s) {
          var best = null; s.points.forEach(function (q) { if (!best || Math.abs(q[0] - xv) < Math.abs(best[0] - xv)) best = q; });
          if (best) lines.push((series.length > 1 ? s.name + ": " : "") + fy(best[1]));
        });
        cross.setAttribute("x1", X(xv)); cross.setAttribute("x2", X(xv));
        txt.innerHTML = lines.map(function (l, i) { return '<tspan x="10" dy="' + (i ? 16 : 18) + '">' + esc(l) + "</tspan>"; }).join("");
        var w = Math.max.apply(null, lines.map(function (l) { return l.length; })) * 6.6 + 20, h = lines.length * 16 + 12;
        box.setAttribute("width", w); box.setAttribute("height", h);
        var tx = X(xv) + 12; if (tx + w > W - R) tx = X(xv) - w - 12;
        tip.setAttribute("transform", "translate(" + tx + "," + (T + 4) + ")");
        hover.setAttribute("visibility", "visible");
      }
      var hit = svg.querySelector(".w-hit");
      hit.addEventListener("pointermove", move);
      hit.addEventListener("pointerdown", move);
      hit.addEventListener("pointerleave", function () { hover.setAttribute("visibility", "hidden"); });
    } };
  }
  function sample(f, a, b, n, log) { var out = []; for (var i = 0; i <= n; i++) { var t = i / n, x = log ? Math.exp(Math.log(a) + t * (Math.log(b) - Math.log(a))) : a + t * (b - a); out.push([x, f(x)]); } return out; }

  /* ---------- generic widget shell ---------- */
  function build(el, spec) {
    var id = "w" + (++uid), vals = {};
    var controls = spec.inputs.map(function (inp) {
      vals[inp.id] = inp.value;
      if (inp.options) return '<div class="w-ctl"><label for="' + id + inp.id + '">' + esc(inp.label) + '</label><select id="' + id + inp.id + '" data-k="' + inp.id + '">' + inp.options.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === inp.value ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div>";
      var pos = inp.log ? 1000 * Math.log(inp.value / inp.min) / Math.log(inp.max / inp.min) : inp.value;
      return '<div class="w-ctl"><label for="' + id + inp.id + '">' + esc(inp.label) + ' <output data-o="' + inp.id + '"></output></label><input type="range" id="' + id + inp.id + '" data-k="' + inp.id + '" min="' + (inp.log ? 0 : inp.min) + '" max="' + (inp.log ? 1000 : inp.max) + '" step="' + (inp.log ? 1 : inp.step) + '" value="' + pos + '"></div>';
    }).join("");
    el.innerHTML = '<div class="w"><div class="w-head"><h3 class="w-title">' + esc(spec.title) + '</h3><p class="w-intro">' + spec.intro + "</p></div>" +
      '<div class="w-body"><div class="w-controls">' + controls + '</div><dl class="w-outs" aria-live="polite"></dl></div><div class="w-fig"></div>' +
      (spec.predict ? '<div class="w-predict"><p><b>Predict first:</b> ' + spec.predict + '</p><details><summary>What you should see</summary><p>' + spec.answer + "</p></details></div>" : "") + "</div>";
    var outs = el.querySelector(".w-outs"), fig = el.querySelector(".w-fig");
    function read(inp, raw) { return inp.options ? raw : inp.log ? inp.min * Math.pow(inp.max / inp.min, raw / 1000) : +raw; }
    function render() {
      spec.inputs.forEach(function (inp) { var o = el.querySelector('[data-o="' + inp.id + '"]'); if (o) o.textContent = (inp.fmt || num)(vals[inp.id]); });
      var r = spec.compute(vals);
      outs.innerHTML = r.outs.map(function (o) { return '<div class="' + (o[2] ? "hl" : "") + '"><dt>' + esc(o[0]) + "</dt><dd>" + esc(o[1]) + "</dd></div>"; }).join("");
      if (r.chart) { r.chart.width = fig.clientWidth || 560; var c = chart(r.chart); fig.innerHTML = c.html; c.bind(fig); } else if (r.html) fig.innerHTML = r.html; else fig.innerHTML = "";
    }
    if (window.ResizeObserver) { var lastW = 0; new ResizeObserver(function () { var w = fig.clientWidth; if (Math.abs(w - lastW) > 24) { lastW = w; render(); } }).observe(fig); }
    spec.inputs.forEach(function (inp) {
      var input = el.querySelector('[data-k="' + inp.id + '"]');
      input.addEventListener("input", function () { vals[inp.id] = read(inp, input.value); render(); });
    });
    render();
  }

  var ammOut = function (dx, x, y, fee) { var e = dx * (1 - fee); return y * e / (x + e); };

  /* ================= widgets ================= */
  var W = {};

  W.carry = function (el) {
    build(el, {
      title: "Futures fair value and the basis",
      intro: "A future must trade near spot × e<sup>(r − q)T</sup>, or someone runs cash-and-carry. Move the inputs to see the fair price and the basis.",
      inputs: [
        { id: "s", label: "Spot price", min: 100, max: 10000, value: 3000, log: true, fmt: function (v) { return usd(v); } },
        { id: "r", label: "Funding cost r (per year)", min: 0, max: 0.2, step: 0.0025, value: 0.05, fmt: function (v) { return pct(v, 2); } },
        { id: "q", label: "Yield on spot q (staking)", min: 0, max: 0.1, step: 0.0025, value: 0.03, fmt: function (v) { return pct(v, 2); } },
        { id: "t", label: "Days to expiry", min: 7, max: 365, step: 1, value: 90, fmt: function (v) { return num(v, 0) + " days"; } }
      ],
      compute: function (v) {
        var T = v.t / 365, F = v.s * Math.exp((v.r - v.q) * T), basis = F - v.s;
        return {
          outs: [["Fair futures price", usd(F), 1], ["Basis (F − S)", usd(basis)], ["Annualized basis", pct(basis / v.s / T)], ["Cash-and-carry earns", basis >= 0 ? "Long spot, short future" : "Short spot, long future"]],
          chart: { label: "Fair price by expiry", x: { label: "Days to expiry", min: 0, max: 365, fmt: function (x) { return num(x, 0); } }, y: { label: "Futures price", fmt: compact },
            series: [{ name: "Fair price", points: sample(function (d) { return v.s * Math.exp((v.r - v.q) * d / 365); }, 0, 365, 60) }], markers: [{ x: v.t, y: F, label: usd(F) }] }
        };
      },
      predict: "Set the staking yield above the funding cost. Does the future trade above or below spot?",
      answer: "Below spot (backwardation). Holding spot now earns more than it costs, so the future must be cheaper. That's why staked-asset futures can trade at a discount."
    });
  };

  W.cascade = function (el) {
    build(el, {
      title: "Liquidation cascade",
      intro: "2,000 leveraged longs opened at $100. A shock moves the price; every liquidation sells into the market, which moves the price again. Market and funding liquidity feed each other.",
      inputs: [
        { id: "shock", label: "Initial shock", min: 0, max: 0.3, step: 0.005, value: 0.08, fmt: function (v) { return "−" + pct(v, 1); } },
        { id: "lev", label: "Average leverage", min: 2, max: 30, step: 0.5, value: 10, fmt: function (v) { return num(v, 1) + "×"; } },
        { id: "impact", label: "Price impact per 1% of open interest sold", min: 0.02, max: 1, step: 0.01, value: 0.3, fmt: function (v) { return pct(v / 100, 2); } },
        { id: "mode", label: "Liquidation style", options: [["full", "Dump the whole position"], ["partial", "Partial liquidation + backstop vault"]], value: "full" }
      ],
      compute: function (v) {
        var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        var liqPx = [];
        for (var i = 0; i < 2000; i++) { var lev = clamp(v.lev * Math.exp((rnd() - 0.5) * 1.2), 1.1, 50); liqPx.push(100 * (1 - 1 / lev) / (1 - 0.005)); }
        var price = 100 * (1 - v.shock), path = [[0, 100], [1, price]], gone = new Array(2000).fill(false), total = 0, round = 1;
        var k = v.mode === "partial" ? 0.35 : 1;
        while (round < 40) {
          var n = 0; for (var j = 0; j < 2000; j++) if (!gone[j] && liqPx[j] >= price) { gone[j] = true; n++; }
          if (!n) break;
          total += n; price *= 1 - v.impact / 100 * (n / 2000 * 100) * k; round++; path.push([round, price]);
        }
        var drop = 1 - price / 100;
        return {
          outs: [["Final price", usd(price), 1], ["Total drop", pct(drop, 1)], ["Amplification", v.shock > 0 ? num(drop / v.shock, 1) + "× the shock" : "—"], ["Positions liquidated", num(total / 20, 1) + "%"], ["Rounds", String(round - 1)]],
          chart: { label: "Price by round", x: { label: "Round", min: 0, max: Math.max(5, round), fmt: function (x) { return num(x, 0); } }, y: { label: "Price ($)", min: 0, max: 105, fmt: function (y) { return num(y, 0); } },
            series: [{ name: "Price", points: path, area: true }], markers: [{ x: path[path.length - 1][0], y: price, label: usd(price), right: false }] }
        };
      },
      predict: "Keep the shock at 8% and raise average leverage from 5× to 20×. What happens to the final drop?",
      answer: "At low leverage almost nobody is liquidated and the drop stays near 8%. At high leverage the first wave of liquidations pushes the price into the next wave, and the drop can be several times the shock. Switching to partial liquidation with a backstop shrinks the spiral, which is the design point of Unit 9's loss waterfall."
    });
  };

  W.merkle = function (el) {
    var id = "w" + (++uid);
    el.innerHTML = '<div class="w"><div class="w-head"><h3 class="w-title">Build a Merkle tree and a proof</h3><p class="w-intro">Each line is a leaf. Leaves are hashed with SHA-256, then hashed in pairs up to one root. Pick a leaf to see the siblings a proof needs: log₂(n) hashes, not the whole tree.</p></div>' +
      '<div class="w-body"><div class="w-controls"><div class="w-ctl"><label for="' + id + 't">Leaves (one per line)</label><textarea id="' + id + 't" rows="7">alice: 120\nbob: 75\ncarol: 300\ndave: 12\nerin: 64\nfrank: 9\ngrace: 410\nheidi: 33</textarea></div>' +
      '<div class="w-ctl"><label for="' + id + 's">Prove leaf <output></output></label><input type="range" id="' + id + 's" min="0" max="7" step="1" value="2"></div></div>' +
      '<div class="w-results"><dl class="w-outs" aria-live="polite"></dl><div class="w-tree"></div></div></div>' +
      '<div class="w-predict"><p><b>Predict first:</b> how many sibling hashes does a proof need for 8 leaves? For 1,000,000?</p><details><summary>What you should see</summary><p>3 for 8 leaves (log₂ 8), and only 20 for a million. Change one character in any leaf and watch the root change: that is why a 32-byte root can commit to an entire state.</p></details></div></div>';
    var ta = el.querySelector("textarea"), sl = el.querySelector('input[type="range"]'), out = el.querySelector("output"), outs = el.querySelector(".w-outs"), tree = el.querySelector(".w-tree");
    var enc = new TextEncoder();
    function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
    function h(bytes) { return crypto.subtle.digest("SHA-256", bytes).then(function (b) { return new Uint8Array(b); }); }
    function cat(a, b) { var c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }
    var token = 0;
    function render() {
      var my = ++token, leaves = ta.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 16);
      if (!leaves.length) { outs.innerHTML = "<div><dt>Leaves</dt><dd>Add at least one line</dd></div>"; tree.innerHTML = ""; return; }
      sl.max = String(leaves.length - 1); var idx = Math.min(+sl.value, leaves.length - 1); out.textContent = "#" + idx + " (" + leaves[idx] + ")";
      if (!crypto.subtle) { outs.innerHTML = "<div><dt>Hashing</dt><dd>Not available in this browser context</dd></div>"; return; }
      Promise.all(leaves.map(function (l) { return h(enc.encode(l)); })).then(function (level0) {
        var levels = [level0];
        function up(cur) {
          if (cur.length === 1) return Promise.resolve();
          var pairs = []; for (var i = 0; i < cur.length; i += 2) pairs.push(h(cat(cur[i], cur[i + 1] || cur[i])));
          return Promise.all(pairs).then(function (next) { levels.push(next); return up(next); });
        }
        return up(level0).then(function () { return levels; });
      }).then(function (levels) {
        if (my !== token) return;
        var path = [], i = idx;
        levels.forEach(function (lv, d) { if (d < levels.length - 1) { path.push({ d: d, i: i ^ 1 < lv.length ? i ^ 1 : i }); } i = Math.floor(i / 2); });
        var onPath = {}, sib = {}; i = idx;
        levels.forEach(function (_lv, d) { onPath[d + ":" + i] = 1; i = Math.floor(i / 2); });
        path.forEach(function (p) { sib[p.d + ":" + p.i] = 1; });
        var root = hex(levels[levels.length - 1][0]);
        outs.innerHTML = '<div class="hl"><dt>Root</dt><dd class="mono">' + root.slice(0, 16) + "…</dd></div><div><dt>Leaves</dt><dd>" + leaves.length + "</dd></div><div><dt>Proof size</dt><dd>" + path.length + " hashes</dd></div><div><dt>Tree depth</dt><dd>" + (levels.length - 1) + "</dd></div>";
        tree.innerHTML = levels.slice().reverse().map(function (lv, r) {
          var d = levels.length - 1 - r;
          return '<div class="w-row">' + lv.map(function (node, j) {
            var cls = onPath[d + ":" + j] ? "path" : sib[d + ":" + j] ? "sib" : "";
            return '<span class="w-node ' + cls + '" title="' + hex(node) + '">' + hex(node).slice(0, 6) + "</span>";
          }).join("") + "</div>";
        }).join("") + '<p class="w-legend"><span><i class="w-key w-k1"></i>path to the root</span><span><i class="w-key w-k2"></i>sibling hashes in the proof</span></p>';
      });
    }
    ta.addEventListener("input", render); sl.addEventListener("input", render); render();
  };

  W.basefee = function (el) {
    build(el, {
      title: "EIP-1559 base fee",
      intro: "Blocks target 50% full. Above target, the base fee rises up to 12.5% per block; below it, it falls. Set how much demand there is and watch 40 blocks.",
      inputs: [
        { id: "demand", label: "Demand (gas wanted ÷ target)", min: 0, max: 2, step: 0.05, value: 1.6, fmt: function (v) { return num(v * 100, 0) + "% of target"; } },
        { id: "start", label: "Starting base fee", min: 1, max: 100, step: 1, value: 10, fmt: function (v) { return num(v, 0) + " gwei"; } }
      ],
      compute: function (v) {
        var fee = v.start, pts = [[0, fee]], used = Math.min(v.demand, 2);
        for (var b = 1; b <= 40; b++) { fee = fee * (1 + 0.125 * (used - 1)); pts.push([b, fee]); }
        var dbl = v.demand > 1 ? Math.log(2) / Math.log(1 + 0.125 * (used - 1)) : Infinity;
        return {
          outs: [["Fee after 10 blocks", num(pts[10][1], 1) + " gwei", 1], ["After 40 blocks (8 min)", num(fee, 1) + " gwei"], ["Doubles every", isFinite(dbl) ? num(dbl, 1) + " blocks" : "never (demand ≤ target)"], ["Who gets it", "Burned, not paid to validators"]],
          chart: { label: "Base fee per block", x: { label: "Block", min: 0, max: 40, fmt: function (x) { return num(x, 0); } }, y: { label: "Base fee (gwei)", min: 0, fmt: function (y) { return num(y, y < 10 ? 1 : 0); } }, series: [{ name: "Base fee", points: pts }], markers: [{ x: 40, y: fee, label: num(fee, 1) + " gwei", right: false }] }
        };
      },
      predict: "With blocks 100% full (200% of target), how many blocks until the fee doubles?",
      answer: "About 6 blocks (1.125⁶ ≈ 2.03), roughly 72 seconds. Exponential growth quickly prices out low-value demand, which is why full blocks don't stay full for long."
    });
  };

  W.cpmm = function (el) {
    build(el, {
      title: "Swap on x · y = k",
      intro: "A pool holds ETH and USD. You sell ETH into it. Watch how far your execution price falls below the starting price as the trade grows.",
      inputs: [
        { id: "x", label: "ETH in the pool", min: 10, max: 100000, value: 1000, log: true, fmt: function (v) { return compact(v) + " ETH"; } },
        { id: "p", label: "Starting ETH price", min: 100, max: 10000, value: 3000, log: true, fmt: function (v) { return usd(v); } },
        { id: "dx", label: "You sell (share of the pool's ETH)", min: 0.0005, max: 0.5, value: 0.01, log: true, fmt: function (v) { return pct(v, v < 0.01 ? 2 : 1); } },
        { id: "fee", label: "Pool fee", min: 0, max: 0.01, step: 0.0005, value: 0.003, fmt: function (v) { return pct(v, 2); } }
      ],
      compute: function (v) {
        var x = v.x, y = v.x * v.p, dx = v.dx * x, dy = ammOut(dx, x, y, v.fee), exec = dy / dx, x2 = x + dx, y2 = y - dy;
        return {
          outs: [["You receive", usd(dy), 1], ["Average price", usd(exec)], ["Worse than start by", pct(1 - exec / v.p)], ["New pool price", usd(y2 / x2)], ["k grew by (fees)", pct(x2 * y2 / (x * y) - 1, 3)]],
          chart: { label: "Constant-product curve", x: { label: "ETH in pool", min: x * 0.4, max: x * 2, fmt: compact }, y: { label: "USD in pool", min: 0, max: y * 2.6, fmt: compact },
            series: [{ name: "x · y = k", points: sample(function (a) { return x * y / a; }, x * 0.4, x * 2, 80) }],
            markers: [{ x: x, y: y, label: "before" }, { x: x2, y: y2, label: "after", color: 2 }] }
        };
      },
      predict: "Sell 1% of the pool, then 10%. Roughly how much worse than the starting price is each?",
      answer: "About 1.3% at 1% of the pool (1% impact plus the 0.3% fee) and about 9.3% at 10%. Impact grows roughly with trade size ÷ reserves, which is why big trades get split across pools by aggregators."
    });
  };

  W.il = function (el) {
    build(el, {
      title: "Impermanent loss and LVR",
      intro: "IL compares an LP with holding. LVR measures what arbitrageurs take from the LP every day the price moves. The LP is profitable only if fees beat LVR.",
      inputs: [
        { id: "r", label: "Price change (new ÷ old)", min: 0.1, max: 10, value: 2, log: true, fmt: function (v) { return num(v, 2) + "×"; } },
        { id: "vol", label: "Volatility (per year)", min: 0.1, max: 2, step: 0.05, value: 0.8, fmt: function (v) { return pct(v, 0); } },
        { id: "tvl", label: "Pool value", min: 1e5, max: 1e9, value: 1e7, log: true, fmt: usd },
        { id: "apr", label: "Fee income (APR)", min: 0, max: 0.6, step: 0.01, value: 0.06, fmt: function (v) { return pct(v, 0); } }
      ],
      compute: function (v) {
        var il = 2 * Math.sqrt(v.r) / (1 + v.r) - 1, lvr = v.vol * v.vol / 8, fees = v.apr;
        return {
          outs: [["Impermanent loss", pct(il), 1], ["LVR (per year, % of pool)", pct(lvr)], ["LVR in dollars per year", usd(lvr * v.tvl)], ["Fees per year", usd(fees * v.tvl)], ["LP net vs rebalancing", (fees - lvr >= 0 ? "+" : "") + pct(fees - lvr)]],
          chart: { label: "Impermanent loss by price change", x: { label: "Price change (×)", min: 0.1, max: 10, log: true, fmt: function (x) { return num(x, x < 1 ? 2 : 0) + "×"; } }, y: { label: "IL", min: -0.6, max: 0.02, fmt: function (y) { return pct(y, 0); } },
            series: [{ name: "IL", points: sample(function (r) { return 2 * Math.sqrt(r) / (1 + r) - 1; }, 0.1, 10, 100, true) }], markers: [{ x: v.r, y: il, label: pct(il, 1) }], hlines: [{ y: 0, label: "no loss" }] }
        };
      },
      predict: "Double the volatility from 40% to 80%. By how much does LVR change?",
      answer: "It quadruples (2% → 8% of the pool per year), because LVR scales with σ². A pool that was profitable at 6% fees in a calm market loses money when volatility doubles."
    });
  };

  W.v3range = function (el) {
    build(el, {
      title: "Concentrated liquidity range",
      intro: "Choose a price range for $10,000 of liquidity around ETH at $2,000. Narrow ranges act like much bigger pools (capital efficiency), but only while the price stays inside.",
      inputs: [
        { id: "lo", label: "Range lower bound", min: 0.1, max: 0.99, step: 0.01, value: 0.8, fmt: function (v) { return usd(2000 * v) + " (−" + num((1 - v) * 100, 0) + "%)"; } },
        { id: "hi", label: "Range upper bound", min: 1.01, max: 10, value: 1.25, log: true, fmt: function (v) { return usd(2000 * v) + " (+" + num((v - 1) * 100, 0) + "%)"; } },
        { id: "p", label: "Current price", min: 0.5, max: 2, value: 1, log: true, fmt: function (v) { return usd(2000 * v); } }
      ],
      compute: function (v) {
        var P0 = 2000, Pa = P0 * v.lo, Pb = P0 * v.hi, P = P0 * v.p, sa = Math.sqrt(Pa), sb = Math.sqrt(Pb), s0 = Math.sqrt(P0);
        var xPerL = 1 / s0 - 1 / sb, yPerL = s0 - sa, L = 10000 / (xPerL * P0 + yPerL), eff = L / (10000 / (2 * s0));
        var sp = clamp(Math.sqrt(P), sa, sb), x = L * (1 / sp - 1 / sb), y = L * (sp - sa), val = x * P + y;
        var hodl = L * xPerL * P + L * yPerL, inRange = P >= Pa && P <= Pb;
        return {
          outs: [["Capital efficiency vs full range", num(eff, 1) + "×", 1], ["Position now", num(x, 3) + " ETH + " + usd(y)], ["Value now", usd(val)], ["vs just holding", pct(val / hodl - 1)], ["Earning fees?", inRange ? "Yes, price is in range" : "No, out of range: 100% " + (P < Pa ? "ETH" : "USD")]],
          chart: { label: "Position value by price", x: { label: "ETH price", min: 1000, max: 4000, fmt: function (p) { return usd(p); } }, y: { label: "Value ($)", fmt: compact },
            series: [{ name: "LP position", points: sample(function (p) { var q = clamp(Math.sqrt(p), sa, sb); return L * (1 / q - 1 / sb) * p + L * (q - sa); }, 1000, 4000, 90) }, { name: "Just holding", color: 2, points: sample(function (p) { return L * xPerL * p + L * yPerL; }, 1000, 4000, 30) }],
            markers: [{ x: P, y: val, label: usd(val) }], vlines: [{ x: Pa, label: "lower" }, { x: Pb, label: "upper" }] }
        };
      },
      predict: "Shrink the range to ±5%. How does capital efficiency change, and what happens to the position when the price drops 20%?",
      answer: "Efficiency jumps to roughly 40×, so you earn fees like a much bigger LP. But a 20% drop takes the price out of range: you end up holding only ETH, bought all the way down, and earn nothing until it returns. The curve bends below 'just holding' on both sides: that's the short-option payoff from Unit 1."
    });
  };

  W.rates = function (el) {
    build(el, {
      title: "Kinked interest-rate curve",
      intro: "Borrow rates follow utilization. Above the kink the curve gets steep, which pulls in suppliers and pushes borrowers to repay, so withdrawals stay possible.",
      inputs: [
        { id: "u", label: "Utilization now", min: 0, max: 1, step: 0.01, value: 0.85, fmt: function (v) { return pct(v, 0); } },
        { id: "kink", label: "Kink (optimal utilization)", min: 0.5, max: 0.95, step: 0.01, value: 0.8, fmt: function (v) { return pct(v, 0); } },
        { id: "s1", label: "Slope below kink", min: 0, max: 0.2, step: 0.005, value: 0.04, fmt: function (v) { return pct(v, 1); } },
        { id: "s2", label: "Slope above kink", min: 0.1, max: 3, step: 0.05, value: 0.6, fmt: function (v) { return pct(v, 0); } },
        { id: "rf", label: "Reserve factor", min: 0, max: 0.5, step: 0.01, value: 0.1, fmt: function (v) { return pct(v, 0); } }
      ],
      compute: function (v) {
        var br = function (u) { return u <= v.kink ? v.s1 * u / v.kink : v.s1 + v.s2 * (u - v.kink) / (1 - v.kink); };
        var sr = function (u) { return br(u) * u * (1 - v.rf); };
        return {
          outs: [["Borrow APR", pct(br(v.u)), 1], ["Supply APR", pct(sr(v.u))], ["Protocol keeps", pct(br(v.u) * v.u * v.rf)], ["At 100% utilization", pct(br(1))]],
          chart: { label: "Rates by utilization", x: { label: "Utilization", min: 0, max: 1, fmt: function (x) { return pct(x, 0); } }, y: { label: "APR", min: 0, fmt: function (y) { return pct(y, 0); } },
            series: [{ name: "Borrow", points: sample(br, 0, 1, 100) }, { name: "Supply", color: 2, points: sample(sr, 0, 1, 100) }],
            markers: [{ x: v.u, y: br(v.u), label: pct(br(v.u), 1), right: false }, { x: v.u, y: sr(v.u), color: 2 }], vlines: [{ x: v.kink, label: "kink" }] }
        };
      },
      predict: "Move utilization from 80% to 90% with the default settings. How much does the borrow rate change?",
      answer: "From 4% to 34%. Ten points of utilization past the kink costs borrowers 30 points of APR, which is exactly the pressure that refills the pool before suppliers get stuck."
    });
  };

  W.health = function (el) {
    build(el, {
      title: "Health factor and liquidation",
      intro: "Borrow USD against ETH. Then drag the price down and watch the health factor cross 1, and what a liquidator does next.",
      inputs: [
        { id: "c", label: "ETH collateral", min: 1, max: 100, step: 0.5, value: 10, fmt: function (v) { return num(v, 1) + " ETH"; } },
        { id: "d", label: "USD borrowed", min: 1000, max: 200000, step: 500, value: 15000, fmt: usd },
        { id: "p", label: "ETH price", min: 500, max: 5000, step: 10, value: 2000, fmt: usd },
        { id: "lt", label: "Liquidation threshold", min: 0.5, max: 0.95, step: 0.01, value: 0.85, fmt: function (v) { return pct(v, 0); } }
      ],
      compute: function (v) {
        var hf = v.c * v.p * v.lt / v.d, liqP = v.d / (v.c * v.lt);
        var outs = [["Health factor", num(hf, 3), 1], ["Liquidation price", usd(liqP)], ["Price drop to liquidation", hf >= 1 ? pct(1 - liqP / v.p, 1) : "already liquidatable"]];
        if (hf < 1) {
          var repay = v.d * 0.5, seized = Math.min(v.c, repay * 1.05 / v.p), hf2 = (v.c - seized) * v.p * v.lt / (v.d - repay);
          outs.push(["Liquidator repays", usd(repay)], ["…and seizes", num(seized, 3) + " ETH (" + usd(seized * v.p) + ")"], ["Health factor after", num(hf2, 3)]);
        } else outs.push(["Liquidator action", "None: the position is healthy"]);
        return {
          outs: outs,
          chart: { label: "Health factor by ETH price", x: { label: "ETH price", min: 500, max: 5000, fmt: function (x) { return usd(x); } }, y: { label: "Health factor", min: 0, max: 3, fmt: function (y) { return num(y, 1); } },
            series: [{ name: "Health factor", points: sample(function (p) { return v.c * p * v.lt / v.d; }, 500, 5000, 90) }], markers: [{ x: v.p, y: Math.min(hf, 3), label: "HF " + num(hf, 2) }], hlines: [{ y: 1, label: "liquidation line" }] }
        };
      },
      predict: "With 10 ETH, $15,000 borrowed and an 85% threshold, at what ETH price does liquidation start?",
      answer: "About $1,765 (15,000 ÷ (10 × 0.85)), a 12% drop from $2,000. After a liquidation the health factor goes up, because the liquidator repays half the debt but takes only a little more than that in collateral."
    });
  };

  W.cdp = function (el) {
    build(el, {
      title: "CDP vault and the redemption floor",
      intro: "Mint a stablecoin against ETH at a 110% minimum ratio. Then move the stablecoin's market price and see why redemptions pull it back to $1.",
      inputs: [
        { id: "c", label: "ETH locked", min: 1, max: 100, step: 0.5, value: 10, fmt: function (v) { return num(v, 1) + " ETH"; } },
        { id: "d", label: "Stablecoin minted", min: 100, max: 50000, step: 100, value: 12000, fmt: usd },
        { id: "p", label: "ETH price", min: 500, max: 5000, step: 10, value: 2000, fmt: usd },
        { id: "m", label: "Stablecoin market price", min: 0.9, max: 1.15, step: 0.001, value: 0.97, fmt: function (v) { return "$" + num(v, 3); } }
      ],
      compute: function (v) {
        var cr = v.c * v.p / v.d, liqP = 1.1 * v.d / v.c, redeemProfit = 10000 * 0.995 - 10000 * v.m;
        var arb = v.m < 0.995 ? "Buy below $1, redeem for $1 of ETH: +" + usd(redeemProfit) + " per 10K" : v.m > 1.1 ? "Open a vault at 110%, mint and sell: the price can't stay above ~$1.10" : "No arbitrage: inside the band";
        return {
          outs: [["Collateral ratio", pct(cr, 0), 1], ["Liquidated below", usd(liqP) + " ETH"], ["Max you could mint", usd(v.c * v.p / 1.1)], ["Peg arbitrage", arb]],
          chart: { label: "Collateral ratio by ETH price", x: { label: "ETH price", min: 500, max: 5000, fmt: function (x) { return usd(x); } }, y: { label: "Collateral ratio", min: 0, max: 4, fmt: function (y) { return pct(y, 0); } },
            series: [{ name: "Collateral ratio", points: sample(function (p) { return v.c * p / v.d; }, 500, 5000, 90) }], markers: [{ x: v.p, y: Math.min(cr, 4), label: pct(cr, 0) }], hlines: [{ y: 1.1, label: "110% minimum" }] }
        };
      },
      predict: "Set the market price to $0.97. Who profits from redeeming, and what does that do to the price?",
      answer: "Anyone can buy 10,000 tokens for $9,700 and redeem them for $9,950 of ETH (after the 0.5% fee). Buying pushes the price up and redeeming shrinks supply, so the price is pulled back toward $1. That's the floor; the ceiling is ~$1.10, because above it anyone can mint at 110% and sell. The CDP lab implements both."
    });
  };

  W.perp = function (el) {
    build(el, {
      title: "Perp position: liquidation price and funding",
      intro: "Open a $10,000 position. Leverage sets your margin and so your liquidation price; funding is paid or received every hour while you hold it.",
      inputs: [
        { id: "side", label: "Side", options: [["long", "Long"], ["short", "Short"]], value: "long" },
        { id: "lev", label: "Leverage", min: 1, max: 50, step: 0.5, value: 10, fmt: function (v) { return num(v, 1) + "×"; } },
        { id: "mmr", label: "Maintenance margin", min: 0.005, max: 0.05, step: 0.0025, value: 0.0125, fmt: function (v) { return pct(v, 2); } },
        { id: "f", label: "Funding rate per hour", min: -0.0005, max: 0.0005, step: 0.00001, value: 0.0000125, fmt: function (v) { return pct(v, 4); } }
      ],
      compute: function (v) {
        var P0 = 100, s = v.side === "long" ? 1 : -1, N = 10000, q = N / P0, margin = N / v.lev;
        var liq = s > 0 ? P0 * (1 - 1 / v.lev) / (1 - v.mmr) : P0 * (1 + 1 / v.lev) / (1 + v.mmr);
        var daily = -s * N * v.f * 24, apr = v.f * 24 * 365;
        var eq = function (p) { return margin + s * q * (p - P0); };
        return {
          outs: [["Margin posted", usd(margin), 1], ["Liquidation at", num(liq, 2) + " (" + (s > 0 ? "−" : "+") + pct(Math.abs(liq / P0 - 1), 1) + ")"], ["Funding per day", (daily >= 0 ? "you receive " : "you pay ") + usd(Math.abs(daily))], ["Funding, annualized", pct(apr, 1) + (apr >= 0 ? " (longs pay)" : " (shorts pay)")], ["Days of funding to lose 10% of margin", Math.abs(daily) > 0 ? num(margin * 0.1 / Math.abs(daily), 1) : "—"]],
          chart: { label: "Equity by price", x: { label: "Price (entry = 100)", min: 70, max: 130, fmt: function (x) { return num(x, 0); } }, y: { label: "Equity ($)", fmt: compact },
            series: [{ name: "Equity", points: sample(eq, 70, 130, 60) }], markers: [{ x: 100, y: margin, label: "entry" }, { x: liq, y: eq(liq), label: "liquidated", color: 2, right: s < 0 }], hlines: [{ y: 0, label: "bankrupt" }] }
        };
      },
      predict: "Go long at 25× with 1.25% maintenance margin. How far can the price fall before liquidation?",
      answer: "About 2.8% (100 × (1 − 1/25) ÷ (1 − 0.0125) ≈ 97.2). High leverage turns ordinary noise into liquidation. And at 0.01%/hour funding you'd also pay about 88% a year to hold the long."
    });
  };

  W.sandwich = function (el) {
    build(el, {
      title: "Anatomy of a sandwich attack",
      intro: "You buy ETH with USD from a pool of 1,000 ETH at $2,000. A searcher sees your pending swap, buys first, lets yours fill at a worse price, then sells. Your slippage tolerance sets how much they can take.",
      inputs: [
        { id: "a", label: "Your trade size", min: 1000, max: 500000, value: 50000, log: true, fmt: usd },
        { id: "tol", label: "Your slippage tolerance", min: 0.0005, max: 0.05, value: 0.01, log: true, fmt: function (v) { return pct(v, 2); } }
      ],
      compute: function (v) {
        var X0 = 2000000, Y0 = 1000, f = 0.003;
        function attack(a, tol) {
          var quote = ammOut(a, X0, Y0, f), minOut = quote * (1 - tol), lo = 0, hi = X0 * 3;
          for (var i = 0; i < 80; i++) {
            var m = (lo + hi) / 2, e = ammOut(m, X0, Y0, f), out = ammOut(a, X0 + m, Y0 - e, f);
            if (out >= minOut) lo = m; else hi = m;
          }
          var fr = lo, eth = ammOut(fr, X0, Y0, f), x1 = X0 + fr, y1 = Y0 - eth, vout = ammOut(a, x1, y1, f), x2 = x1 + a, y2 = y1 - vout, back = ammOut(eth, y2, x2, f);
          return { profit: back - fr, loss: (quote - vout) * 2000, front: fr };
        }
        var r = attack(v.a, v.tol);
        return {
          outs: [["Attacker's front-run", usd(r.front)], ["Attacker's profit (before gas)", usd(r.profit), 1], ["Your loss vs no attack", usd(r.loss)], ["Your loss as % of trade", pct(r.loss / v.a)]],
          chart: { label: "Attacker profit by slippage tolerance", x: { label: "Slippage tolerance", min: 0.0005, max: 0.05, log: true, fmt: function (x) { return pct(x, x < 0.01 ? 2 : 0); } }, y: { label: "Attacker profit", min: 0, fmt: usd },
            series: [{ name: "Profit", points: sample(function (t) { return Math.max(0, attack(v.a, t).profit); }, 0.0005, 0.05, 40, true), area: true }], markers: [{ x: v.tol, y: Math.max(0, r.profit), label: usd(r.profit) }] }
        };
      },
      predict: "Keep a $50,000 trade and change tolerance from 0.1% to 3%. What happens to the attacker's profit?",
      answer: "It grows from almost nothing to over a thousand dollars. Tolerance is a promise of how much worse you'll accept, and the searcher takes almost all of it. Defenses: tight tolerance, private RPCs, and order-flow auctions or batch auctions (U11·L3)."
    });
  };

  W.loop = function (el) {
    build(el, {
      title: "Leverage loop",
      intro: "Deposit a yield-bearing token, borrow against it, buy more, repeat. Leverage multiplies the spread between yield and borrow cost, and shrinks your margin for a depeg.",
      inputs: [
        { id: "y", label: "Collateral yield", min: 0, max: 0.25, step: 0.0025, value: 0.08, fmt: function (v) { return pct(v, 1); } },
        { id: "b", label: "Borrow rate", min: 0, max: 0.25, step: 0.0025, value: 0.05, fmt: function (v) { return pct(v, 1); } },
        { id: "ltv", label: "Max loan-to-value", min: 0.5, max: 0.95, step: 0.01, value: 0.9, fmt: function (v) { return pct(v, 0); } },
        { id: "use", label: "Use of max leverage", min: 0, max: 0.98, step: 0.01, value: 0.8, fmt: function (v) { return pct(v, 0); } }
      ],
      compute: function (v) {
        var maxL = 1 / (1 - v.ltv), L = 1 + (maxL - 1) * v.use, net = v.y + (v.y - v.b) * (L - 1), lt = Math.min(0.99, v.ltv + 0.03);
        var liq = 1 - (L - 1) / (L * lt);
        return {
          outs: [["Leverage", num(L, 2) + "× (max " + num(maxL, 1) + "×)"], ["Net APY on your equity", pct(net), 1], ["Liquidated if collateral depegs by", pct(liq, 1)], ["If borrow rate rises to the yield", "net APY = " + pct(v.y)]],
          chart: { label: "Net APY by leverage", x: { label: "Leverage (×)", min: 1, max: maxL, fmt: function (x) { return num(x, 1) + "×"; } }, y: { label: "Net APY", fmt: function (y) { return pct(y, 0); } },
            series: [{ name: "Net APY", points: sample(function (l) { return v.y + (v.y - v.b) * (l - 1); }, 1, maxL, 40) }], markers: [{ x: L, y: net, label: pct(net, 1) }], hlines: [{ y: 0, label: "break-even" }] }
        };
      },
      predict: "At 90% LTV and 80% of max leverage, raise the borrow rate above the collateral yield. What happens?",
      answer: "Net APY goes negative and gets worse the more leverage you use, while a depeg of only a few percent liquidates you. Loops pay most when nobody needs the exit: exactly the conditions that end in a rush to unwind."
    });
  };

  W.pendle = function (el) {
    build(el, {
      title: "Pendle: fixed rate from a PT price",
      intro: "A principal token redeems for 1 at maturity. Its discount today is a fixed yield. The yield token gets all the floating yield until then.",
      inputs: [
        { id: "pt", label: "PT price", min: 0.8, max: 0.999, step: 0.001, value: 0.95, fmt: function (v) { return num(v, 3); } },
        { id: "days", label: "Days to maturity", min: 7, max: 365, step: 1, value: 120, fmt: function (v) { return num(v, 0) + " days"; } },
        { id: "fl", label: "Floating yield you expect", min: 0, max: 0.4, step: 0.005, value: 0.12, fmt: function (v) { return pct(v, 1); } }
      ],
      compute: function (v) {
        var T = v.days / 365, fixed = Math.pow(1 / v.pt, 1 / T) - 1, yt = 1 - v.pt, earned = Math.pow(1 + v.fl, T) - 1, ytRoi = earned / yt - 1;
        return {
          outs: [["Implied fixed APY (buy PT)", pct(fixed), 1], ["YT price", num(yt, 3) + " per unit"], ["YT return if yield averages " + pct(v.fl, 0), pct(ytRoi, 1)], ["Better bet", v.fl > fixed ? "YT (you expect more than the implied rate)" : "PT (lock the fixed rate)"]],
          chart: { label: "YT return by realized yield", x: { label: "Realized floating yield", min: 0, max: 0.4, fmt: function (x) { return pct(x, 0); } }, y: { label: "YT return", fmt: function (y) { return pct(y, 0); } },
            series: [{ name: "YT return", points: sample(function (f) { return (Math.pow(1 + f, T) - 1) / yt - 1; }, 0, 0.4, 40) }], markers: [{ x: v.fl, y: ytRoi, label: pct(ytRoi, 0) }], hlines: [{ y: 0, label: "break-even" }], vlines: [{ x: fixed, label: "implied" }] }
        };
      },
      predict: "With PT at 0.95 and 120 days left, what's the fixed APY? Where does the YT break even?",
      answer: "About 16.9% fixed. YT breaks even when realized yield equals that implied rate. Above it YT wins, with leverage; below it YT loses fast, and it's worth zero at maturity."
    });
  };

  W.lmsr = function (el) {
    build(el, {
      title: "LMSR prediction market",
      intro: "An automated market maker for YES/NO shares. Buying YES raises its price; prices always sum to 1. The liquidity parameter b sets depth and caps the market maker's loss.",
      inputs: [
        { id: "b", label: "Liquidity b", min: 10, max: 2000, value: 200, log: true, fmt: function (v) { return num(v, 0); } },
        { id: "y", label: "YES shares bought", min: 0, max: 1500, step: 10, value: 300, fmt: function (v) { return num(v, 0); } },
        { id: "n", label: "NO shares bought", min: 0, max: 1500, step: 10, value: 100, fmt: function (v) { return num(v, 0); } }
      ],
      compute: function (v) {
        var C = function (y, n) { var m = Math.max(y, n) / v.b; return v.b * (m + Math.log(Math.exp(y / v.b - m) + Math.exp(n / v.b - m))); };
        var py = function (y) { return 1 / (1 + Math.exp((v.n - y) / v.b)); };
        return {
          outs: [["YES price (probability)", pct(py(v.y), 1), 1], ["NO price", pct(1 - py(v.y), 1)], ["Total paid by traders", usd(C(v.y, v.n) - C(0, 0))], ["Market maker's max loss", usd(v.b * Math.log(2))]],
          chart: { label: "YES price as YES shares are bought", x: { label: "YES shares bought", min: 0, max: 1500, fmt: function (x) { return num(x, 0); } }, y: { label: "YES price", min: 0, max: 1, fmt: function (y) { return pct(y, 0); } },
            series: [{ name: "YES price", points: sample(py, 0, 1500, 80) }], markers: [{ x: v.y, y: py(v.y), label: pct(py(v.y), 0) }] }
        };
      },
      predict: "Buy 300 YES at b = 50, then at b = 1,000. How much does each move the price?",
      answer: "At b = 50 the price shoots to nearly 100% (thin market). At b = 1,000 it barely moves. Deeper markets cost the market maker more in the worst case: b × ln 2."
    });
  };

  W.bonding = function (el) {
    build(el, {
      title: "Bonding curve launch",
      intro: "A pump.fun-style curve: constant product over virtual reserves. Early buyers get many tokens per SOL; graduation comes when 793.1M tokens are sold.",
      inputs: [
        { id: "vs", label: "Virtual SOL reserve", min: 10, max: 100, step: 1, value: 30, fmt: function (v) { return num(v, 0) + " SOL"; } },
        { id: "sold", label: "Already sold", min: 0, max: 0.99, step: 0.01, value: 0.2, fmt: function (v) { return pct(v, 0) + " of curve supply"; } },
        { id: "buy", label: "You buy with", min: 0.1, max: 50, value: 2, log: true, fmt: function (v) { return num(v, 2) + " SOL"; } }
      ],
      compute: function (v) {
        var VT = 1073e6, CS = 793.1e6, k = v.vs * VT, s = v.sold * CS, vt = VT - s, vsol = k / vt;
        var out = Math.min(vt * v.buy / (vsol + v.buy), CS - s), vt2 = vt - out, price = function (tokSold) { var t = VT - tokSold; return (k / t) / t * 1e6; };
        return {
          outs: [["Tokens you get", compact(out), 1], ["Spot price now", num(price(s), 2) + " SOL per 1M"], ["Your average price", num(v.buy / out * 1e6, 2) + " SOL per 1M"], ["Progress to graduation", pct((s + out) / CS, 1)], ["SOL raised so far", num(k / vt2 - v.vs, 1) + " of ~" + num(k / (VT - CS) - v.vs, 0)]],
          chart: { label: "Price along the curve", x: { label: "Share of curve sold", min: 0, max: 1, fmt: function (x) { return pct(x, 0); } }, y: { label: "SOL per 1M tokens", min: 0, fmt: function (y) { return num(y, y < 10 ? 1 : 0); } },
            series: [{ name: "Price", points: sample(function (f) { return price(f * CS); }, 0, 1, 80), area: true }], markers: [{ x: v.sold, y: price(s), label: "now" }, { x: (s + out) / CS, y: price(s + out), label: "after you", color: 2 }] }
        };
      },
      predict: "Compare buying 2 SOL at 0% sold with buying 2 SOL at 90% sold. How many fewer tokens do you get?",
      answer: "Roughly 9× fewer (about 67M tokens versus 8M). Price rises steeply toward graduation, about 15× from start to finish with the default 30 SOL virtual reserve, which is why snipers fight for the first slots."
    });
  };

  return {
    has: function (id) { return !!W[id]; },
    mount: function (el, id) { if (W[id]) W[id](el); }
  };
})();

/* which lessons get which simulators */
window.BP_LESSON_WIDGETS = {
  u1l3: ["carry"], u1l5: ["cascade"], u2l1: ["merkle"], u2l3: ["basefee"],
  u6l1: ["cpmm"], u6l2: ["il"], u6l3: ["v3range"], u7l1: ["rates"], u7l2: ["health"],
  u8l2: ["cdp"], u9l2: ["perp"], u11l1: ["sandwich"], u14l2: ["pendle"], u14l3: ["loop"], u14l4: ["lmsr"], u20l1: ["bonding"]
};
