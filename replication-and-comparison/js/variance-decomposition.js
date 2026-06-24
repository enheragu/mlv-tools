/*
 * Bespoke "Variance sources" view for the Replication & Comparison tool.
 *
 * The 2-D extension of the 1-D per-seed distribution: for a preset whose
 * tool-config carries a `decomposition` URL (init x order factorial), it draws
 * one heatmap per SELECTED model (rows = init seed, cols = data-order seed,
 * colour = MSE) as a mini plot card with axes, a per-card colour key, hover
 * tooltips and click/expand-to-modal, plus a slicing-modes table. Structure
 * mirrors the ablation seed-percentile mini-charts (standard theme classes);
 * data-driven, so presets without the extra never show the section.
 */
(function () {
  if (window.ReplicationVarDecomp) return;
  window.ReplicationVarDecomp = true;

  var EVENT = 'replication-comparison:data-update';
  var cache = {};

  var STR = {
    en: {
      title: 'Variance sources',
      intro: 'Each heatmap cell is the error (MSE×100) of one run, at one (initialisation seed, data-order seed) pair. Read the map by eye: horizontal bands mean the initialisation seed drives the spread, vertical bands mean data order does, and a uniform speckle means the two interact. The percentages above each map make that split exact — a two-way variance decomposition that partitions the grid\'s total sum of squares into init (rows), order (columns) and their interaction (the remainder; each cell is deterministic given its seeds, so the remainder is pure interaction, not noise). The three shares sum to 100%; the slicing table below gives the matching magnitudes (σ) in MSE×100.',
      axisInit: 'init seed', axisOrder: 'data-order seed',
      expand: 'Expand', modalTitle: 'Variance heatmap',
      legendLow: 'lower', legendHigh: 'higher',
      slicingTitle: 'Spread (σ of MSE×100) measured along different slices',
      thMode: 'Slicing mode',
      modes: {
        init_only: 'init-only (vary inits, fix order)', order_only: 'order-only (vary orders, fix init)',
        init_mean: 'init marginal (mean over orders)', order_mean: 'order marginal (mean over inits)',
        diagonal: 'diagonal (initᵢ with orderᵢ)', full: 'full factorial',
      },
      tip: function (i, j, v) { return 'init #' + i + ' · order #' + j + '  —  MSE×100 = ' + v.toFixed(3); },
      pct: function (d) { return 'init ' + d.init + '% · order ' + d.order + '% · interaction ' + d.interaction + '%'; },
    },
    es: {
      title: 'Fuentes de varianza',
      intro: 'Cada celda del heatmap es el error (MSE×100) de un run, en un par (semilla de inicialización, semilla de orden de datos). El mapa se lee a ojo: bandas horizontales = domina la inicialización, bandas verticales = domina el orden de datos, y un moteado uniforme = ambas interactúan. Los porcentajes sobre cada mapa hacen ese reparto exacto — una descomposición de varianza de dos vías que parte la suma de cuadrados total de la rejilla en init (filas), order (columnas) y su interacción (el resto; cada celda es determinista dadas sus semillas, así que el resto es interacción pura, no ruido). Las tres fracciones suman 100%; la tabla de slicing de abajo da las magnitudes correspondientes (σ) en MSE×100.',
      axisInit: 'semilla init', axisOrder: 'semilla de orden',
      expand: 'Ampliar', modalTitle: 'Heatmap de varianza',
      legendLow: 'menor', legendHigh: 'mayor',
      slicingTitle: 'Dispersión (σ de MSE×100) medida en distintos cortes',
      thMode: 'Modo de corte',
      modes: {
        init_only: 'solo-init (varía inits, fija orden)', order_only: 'solo-order (varía órdenes, fija init)',
        init_mean: 'marginal init (media sobre órdenes)', order_mean: 'marginal order (media sobre inits)',
        diagonal: 'diagonal (initᵢ con orderᵢ)', full: 'factorial completo',
      },
      tip: function (i, j, v) { return 'init #' + i + ' · order #' + j + '  —  MSE×100 = ' + v.toFixed(3); },
      pct: function (d) { return 'init ' + d.init + '% · order ' + d.order + '% · interacción ' + d.interaction + '%'; },
    },
  };
  function tr(lang) { return STR[lang === 'es' ? 'es' : 'en']; }

  // Theme-coherent perceptual ramp, built from theme tokens (getDataColors):
  // deep blue -> blue -> cyan -> green -> amber. Multi-hue so adjacent values read
  // apart, ascending lightness, and no red (avoids the non-perceptual "jet" look).
  function hexToRgb(h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h || '0', 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lighten(c, f) {
    return [Math.round(c[0] + (255 - c[0]) * f), Math.round(c[1] + (255 - c[1]) * f), Math.round(c[2] + (255 - c[2]) * f)];
  }
  function buildStops() {
    var dc = {};
    try { if (window.SharedChartLegend && window.SharedChartLegend.getDataColors) dc = window.SharedChartLegend.getDataColors(); } catch (e) { /* ignore */ }
    var blue = hexToRgb(dc.blue || '#58a6ff');
    var cyan = hexToRgb(dc.cyan || '#56d4dd');
    var green = hexToRgb(dc.green || '#3fb950');
    var amber = hexToRgb(dc.yellow || '#d29922');
    var deep = [Math.round(blue[0] * 0.34), Math.round(blue[1] * 0.36), Math.round(blue[2] * 0.46)];
    return [deep, blue, cyan, lighten(green, 0.12), lighten(amber, 0.22)];
  }
  var STOPS = buildStops();
  function gradientCss() {
    var parts = [];
    for (var i = 0; i < STOPS.length; i++) {
      parts.push('rgb(' + STOPS[i].join(',') + ') ' + Math.round(i / (STOPS.length - 1) * 100) + '%');
    }
    return 'linear-gradient(90deg,' + parts.join(',') + ')';
  }
  function colorFor(t) {
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    var seg = t * (STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(seg));
    var f = seg - i, a = STOPS[i], b = STOPS[i + 1];
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f) +
      ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }
  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    var idx = (sorted.length - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }
  function themeText() {
    try {
      if (window.SharedChartLegend && window.SharedChartLegend.getChartTheme) {
        return window.SharedChartLegend.getChartTheme().text || '#9aa4b2';
      }
    } catch (e) { /* ignore */ }
    return '#9aa4b2';
  }

  function drawHeatmap(canvas, grid, lang, sizeW, sizeH) {
    var t = tr(lang), n = grid.length;
    var flat = [];
    for (var r = 0; r < n; r++) for (var c = 0; c < grid[r].length; c++) flat.push(grid[r][c]);
    flat.sort(function (x, y) { return x - y; });
    var lo = percentile(flat, 0.02), hi = percentile(flat, 0.98);
    if (hi <= lo) hi = lo + 1e-9;

    var dpr = window.devicePixelRatio || 1, W, H;
    if (sizeW) { W = sizeW; H = sizeH || sizeW; }
    else {
      var wrap = canvas.parentElement;
      var pw = (wrap && wrap.clientWidth) || canvas.clientWidth || 200;
      var ph = (wrap && wrap.clientHeight) || 180;
      W = H = Math.max(120, Math.floor(Math.min(pw, ph)));  // square, fits the card height
    }
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var ML = 30, MB = 20, MT = 4, MR = 6;
    var px = ML, py = MT, pw = W - ML - MR, ph = H - MT - MB;
    var cw = pw / n, ch = ph / n;
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < grid[i].length; j++) {
        ctx.fillStyle = colorFor((grid[i][j] - lo) / (hi - lo));
        ctx.fillRect(px + j * cw, py + i * ch, Math.ceil(cw) + 0.5, Math.ceil(ch) + 0.5);
      }
    }
    var col = themeText();
    ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);
    ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1', px + cw / 2, py + ph + 10);
    ctx.fillText(String(n), px + pw - cw / 2, py + ph + 10);
    ctx.fillText(t.axisOrder + ' →', px + pw / 2, H - 2);
    ctx.textAlign = 'right';
    ctx.fillText('1', px - 3, py + ch);
    ctx.fillText(String(n), px - 3, py + ph);
    ctx.save();
    ctx.translate(8, py + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText(t.axisInit + ' →', 0, 0);
    ctx.restore();

    canvas._hm = { grid: grid, px: px, py: py, cw: cw, ch: ch, n: n };
  }

  function tooltipEl() {
    var el = document.getElementById('vardecomp-tooltip');
    if (!el) { el = document.createElement('div'); el.id = 'vardecomp-tooltip'; el.className = 'vardecomp-tooltip'; document.body.appendChild(el); }
    return el;
  }
  function attachTooltip(canvas, lang) {
    var t = tr(lang);
    canvas.onmousemove = function (ev) {
      var hm = canvas._hm; if (!hm) return;
      var rect = canvas.getBoundingClientRect();
      var j = Math.floor((ev.clientX - rect.left - hm.px) / hm.cw);
      var i = Math.floor((ev.clientY - rect.top - hm.py) / hm.ch);
      var tip = tooltipEl();
      if (i < 0 || j < 0 || i >= hm.n || j >= (hm.grid[i] || []).length) { tip.style.display = 'none'; return; }
      tip.textContent = t.tip(i + 1, j + 1, hm.grid[i][j]);
      tip.style.display = 'block';
      tip.style.left = (ev.clientX + 12) + 'px'; tip.style.top = (ev.clientY + 12) + 'px';
    };
    canvas.onmouseleave = function () { var tip = document.getElementById('vardecomp-tooltip'); if (tip) tip.style.display = 'none'; };
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function openModal(model, grid, dec, lang) {
    var t = tr(lang);
    document.getElementById('vardecomp-modal-title').textContent = model + ' — ' + t.pct(dec);
    var overlay = document.getElementById('vardecomp-modal-overlay');
    overlay.classList.remove('hidden');
    var c = document.getElementById('vardecomp-modal-canvas');
    // Fill the whole modal content area (width x height) so the heatmap covers it.
    var modal = overlay.querySelector('.chart-modal');
    var head = overlay.querySelector('.chart-modal-head');
    var cs = window.getComputedStyle(modal);
    var cw = modal.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var ch = modal.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (head ? head.offsetHeight : 40) - 6;
    var s = Math.max(240, Math.floor(Math.min(cw, ch)));  // square, centred (the grid is 35x35)
    drawHeatmap(c, grid, lang, s);
    attachTooltip(c, lang);
  }
  function closeModal() { var o = document.getElementById('vardecomp-modal-overlay'); if (o) o.classList.add('hidden'); }

  function buildCard(model, grid, dec, lang) {
    var t = tr(lang);
    var card = el('section', 'panel panel-chart card shared-plot-card vardecomp-mini');
    var head = el('div', 'card-headline shared-plot-headline');
    head.appendChild(el('h3', 'shared-plot-title shared-plot-title--sm', model));
    var btn = el('button', 'btn-outline btn-chart-expand', t.expand);
    btn.type = 'button';
    btn.addEventListener('click', function () { openModal(model, grid, dec, lang); });
    head.appendChild(btn);
    card.appendChild(head);
    card.appendChild(el('div', 'vardecomp-pct', t.pct(dec)));
    var wrap = el('div', 'chart-wrap chart-wrap--mini');
    var canvas = el('canvas', 'shared-plot-canvas');
    canvas.title = t.expand;
    canvas.addEventListener('click', function () { openModal(model, grid, dec, lang); });
    wrap.appendChild(canvas);
    card.appendChild(wrap);
    var leg = el('div', 'vardecomp-key');
    leg.innerHTML = '<span>' + t.legendLow + '</span><span class="vardecomp-keybar"></span><span>' + t.legendHigh + '</span>';
    var bar = leg.querySelector('.vardecomp-keybar');
    if (bar) bar.style.background = gradientCss();
    card.appendChild(leg);
    card._draw = function () { drawHeatmap(canvas, grid, lang); attachTooltip(canvas, lang); };
    return card;
  }

  function setText(id, v) { var e = document.getElementById(id); if (e && v != null) e.textContent = v; }

  function render(data, lang, selected) {
    var t = tr(lang);
    var section = document.getElementById('variance-decomposition-section');
    if (!section || !data) return;
    setText('vardecomp-title', t.title);
    setText('vardecomp-intro', t.intro);

    var models = (data.models || []).filter(function (m) {
      return (!selected || !selected.length || selected.indexOf(m) !== -1) && (data.grids || {})[m];
    });

    var grids = document.getElementById('vardecomp-grids');
    grids.innerHTML = '';
    var cards = [];
    models.forEach(function (m) {
      var card = buildCard(m, data.grids[m], (data.decomposition || {})[m] || {}, lang);
      grids.appendChild(card); cards.push(card);
    });
    cards.forEach(function (c) { c._draw(); });

    var modeKeys = ['init_only', 'order_only', 'init_mean', 'order_mean', 'diagonal', 'full'];
    var html = '<p class="results-note">' + t.slicingTitle + '</p>' +
      '<div class="results-table-wrap shared-results-table-wrap">' +
      '<table class="results-table shared-results-table shared-results-table--num shared-results-table--head-center shared-results-table--zebra shared-results-table--hover">' +
      '<thead><tr><th scope="col">' + t.thMode + '</th>';
    models.forEach(function (m) { html += '<th scope="col">' + m + '</th>'; });
    html += '</tr></thead><tbody>';
    modeKeys.forEach(function (mk) {
      html += '<tr><td class="shared-cell-text">' + (t.modes[mk] || mk) + '</td>';
      models.forEach(function (m) {
        var v = ((data.slicing || {})[m] || {})[mk];
        html += '<td class="shared-cell-num">' + (v == null ? '—' : Number(v).toFixed(3)) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    document.getElementById('vardecomp-slicing').innerHTML = html;

    section.classList.remove('hidden');
  }

  function onUpdate(snapshot) {
    var section = document.getElementById('variance-decomposition-section');
    var preset = snapshot && snapshot.preset;
    var cfg = window.ReplicationComparisonToolConfig;
    var presetCfg = cfg && cfg.presets && preset ? cfg.presets[preset] : null;
    var url = presetCfg && presetCfg.decomposition;
    if (!url) { if (section) section.classList.add('hidden'); return; }
    var lang = (window.ReplicationComparisonI18n && window.ReplicationComparisonI18n.getLang &&
      window.ReplicationComparisonI18n.getLang()) || 'en';
    var selected = (snapshot && snapshot.selected) || [];
    if (cache[url]) { render(cache[url], lang, selected); return; }
    fetch(url).then(function (r) { return r.json(); }).then(function (d) { cache[url] = d; render(d, lang, selected); })
      .catch(function (e) { console.error('[VarDecomp] load failed', e); });
  }

  document.addEventListener(EVENT, function (ev) { onUpdate(ev.detail); });
  document.addEventListener('click', function (ev) {
    if (ev.target && (ev.target.id === 'vardecomp-modal-close' || ev.target.id === 'vardecomp-modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeModal(); });
})();
