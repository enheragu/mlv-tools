// Survival function plot and double slider logic for standardizing-comparisons
// Uses Chart.js and SharedUiCore for range controls


document.addEventListener('DOMContentLoaded', function () {
  // Subtle fill for legend circles (border = full color, fill = 40% opacity)
  var LEGEND_FILL_ALPHA = 0.40;
  function legendBg(color) {
    var wA = window.SharedChartLegend && window.SharedChartLegend.withAlpha;
    return wA ? wA(color, LEGEND_FILL_ALPHA) : color;
  }

  // Elements — main
  const minSlider   = document.getElementById('percentile-range-slider-min');
  const maxSlider   = document.getElementById('percentile-range-slider-max');
  const minVal      = document.getElementById('val-percentile-min');
  const maxVal      = document.getElementById('val-percentile-max');
  const rangeTrack  = document.getElementById('percentile-range-track');
  const plotCanvas  = document.getElementById('survival-chart');
  const expandBtn   = document.getElementById('btn-expand-chart');
  const overlay     = document.getElementById('chart-modal-overlay');

  // Elements — modal
  const modalCanvas  = document.getElementById('survival-chart-modal');
  const minSliderM   = document.getElementById('percentile-range-slider-min-modal');
  const maxSliderM   = document.getElementById('percentile-range-slider-max-modal');
  const minValM      = document.getElementById('val-percentile-min-modal');
  const maxValM      = document.getElementById('val-percentile-max-modal');
  const rangeTrackM  = document.getElementById('percentile-range-track-modal');

  // i18n
  function getI18n() {
    return (window.StandardizingComparisonsI18n && typeof window.StandardizingComparisonsI18n.getCopy === 'function')
      ? window.StandardizingComparisonsI18n.getCopy(window.StandardizingComparisonsI18n.getLang())
      : { chartTitle: 'Survival function plot', percentile: 'Percentile', survival: 'Survival (1-CDF)' };
  }

  // Snapshot populated by the 'standardizing-comparisons:data-update' event
  let currentSnapshot = null;

  // Get selected model data from the last snapshot received via onRenderChart callback
  function getSelectedModelData() {
    if (!currentSnapshot) return [];
    const { selected, dataByModel, displayByModel, colorByModel } = currentSnapshot;
    return (selected || []).map(model => ({
      key: model,
      label: (displayByModel || {})[model] || model,
      color: (colorByModel || {})[model] || '#58a6ff',
      values: Array.isArray((dataByModel || {})[model]) ? dataByModel[model].slice().sort((a, b) => a - b) : []
    }));
  }

  // Replace trailing zeros with null so Chart.js stops drawing the line there
  function trimTrailingZeros(arr) {
    let last = arr.length - 1;
    while (last > 0 && (arr[last] === 0 || arr[last] === null)) last--;
    return arr.map((v, i) => (i > last ? null : v));
  }

  // Compute survival function (empirical P(X > x_p) [%]) using fitted normal thresholds
  function computeSurvivalFittedNormal(values) {
    if (!values.length) return Array(101).fill(null);
    const n = values.length;
    const percentiles = Array.from({length: 101}, (_, i) => i); // 0..100
    const data = values.filter(v => Number.isFinite(v));
    if (!data.length) return Array(101).fill(null);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const std = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);
    if (std < 1e-9) return Array(101).fill(null);
    // For each percentile, compute the normal threshold and empirical rate
    const raw = percentiles.map(p => {
      const threshold = normalPpf(p / 100, mean, std);
      const survivors = data.filter(v => v > threshold).length;
      return (survivors / n) * 100;
    });
    return trimTrailingZeros(raw);
  }

  // Normal inverse CDF (ppf) using approximation (for browser, no scipy)
  // Source: https://stackoverflow.com/a/36641438
  function normalPpf(p, mean, std) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    // Approximation for inverse error function
    const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
    const a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
    const b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
    const b4 = 66.8013118877197, b5 = -13.2806815528857;
    const c1 = -0.00778489400243029, c2 = -0.322396458041136, c3 = -2.40075827716184;
    const c4 = -2.54973253934373, c5 = 4.37466414146497, c6 = 2.93816398269878;
    const d1 = 0.00778469570904146, d2 = 0.32246712907004, d3 = 2.445134137143;
    const d4 = 3.75440866190742;
    const pLow = 0.02425, pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return mean + std * (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return mean + std * (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
        (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return mean - std * (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
  }

  // ── Double-thumb helpers ──

  // Set CSS custom properties on track element so ::after fill renders correctly
  function updateTrackFill(trackEl, min, max) {
    if (!trackEl) return;
    const pct = v => (v / 100 * 100).toFixed(2) + '%';
    trackEl.style.setProperty('--range-fill-start', pct(min));
    trackEl.style.setProperty('--range-fill-end', pct(max));
  }

  // Restore neutral z-index
  function updateZIndex(minEl, maxEl, min, max) {
    if (!minEl || !maxEl) return;
    if (min >= max - 1) {
      maxEl.style.zIndex = '2';
      minEl.style.zIndex = '1';
    } else {
      minEl.style.zIndex = '';
      maxEl.style.zIndex = '';
    }
  }

  // Bind full drag-handling on the track container.
  // Inputs have pointer-events:none so the track intercepts everything.
  function bindDoubleSlider(trackEl, minEl, maxEl, onInput) {
    if (!trackEl || !minEl || !maxEl) return;
    let active = null;

    function valueFromX(clientX) {
      const rect = trackEl.getBoundingClientRect();
      return Math.max(0, Math.min(100, Math.round((clientX - rect.left) / rect.width * 100)));
    }

    function nearest(value) {
      const minV = parseInt(minEl.value, 10);
      const maxV = parseInt(maxEl.value, 10);
      return Math.abs(value - minV) <= Math.abs(value - maxV) ? 'min' : 'max';
    }

    trackEl.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      const value = valueFromX(e.clientX);
      active = nearest(value);
      const el = active === 'min' ? minEl : maxEl;
      el.focus();
      trackEl.setPointerCapture(e.pointerId);
      el.value = value;
      onInput(active);
      e.preventDefault();
    });

    trackEl.addEventListener('pointermove', function (e) {
      if (!active) return;
      const value = valueFromX(e.clientX);
      const el = active === 'min' ? minEl : maxEl;
      el.value = value;
      onInput(active);
    });

    trackEl.addEventListener('pointerup',     () => { active = null; });
    trackEl.addEventListener('pointercancel', () => { active = null; });
  }

  // Apply a range to ALL UI elements (main + modal) and re-render chart(s)
  function applyRange(min, max, skipModal) {
    // Main slider UI
    if (minSlider) minSlider.value = min;
    if (maxSlider) maxSlider.value = max;
    if (minVal)    minVal.textContent = min;
    if (maxVal)    maxVal.textContent = max;
    updateTrackFill(rangeTrack, min, max);
    updateZIndex(minSlider, maxSlider, min, max);

    // Modal slider UI
    if (!skipModal) {
      if (minSliderM) minSliderM.value = min;
      if (maxSliderM) maxSliderM.value = max;
      if (minValM)    minValM.textContent = min;
      if (maxValM)    maxValM.textContent = max;
      updateTrackFill(rangeTrackM, min, max);
      updateZIndex(minSliderM, maxSliderM, min, max);
    }

    // Re-render main chart
    updatePlot(min, max, false);

    // Re-render modal chart only if modal is open
    if (overlay && !overlay.classList.contains('hidden')) {
      updatePlot(min, max, true);
    }
  }

  // Chart.js plot setup (real data)
  let chart = null;
  async function updatePlot(min, max, assignToModal = false) {
    const i18n = getI18n();
    const modelData = getSelectedModelData();
    const allLabels = Array.from({length: 101}, (_, i) => i); // 0..100
    const start = Math.max(0, min);
    const end = Math.min(100, max);
    const labels = allLabels.slice(start, end + 1);

    // Validación de datos
    if (!modelData.length || modelData.every(m => !m.values.length)) {
      if (!assignToModal) setStatus('No hay datos seleccionados para graficar.', 'error');
      return;
    }

    // Línea teórica: 100 - p
    const theoretical = labels.map(p => 100 - p);
    let datasets = [
      {
        label: 'Theoretical normal: 100 − P %',
        data: theoretical,
        borderColor: (window.SharedChartLegend && window.SharedChartLegend.getChartTheme)
          ? window.SharedChartLegend.getChartTheme().text
          : '#888',
        backgroundColor: legendBg((window.SharedChartLegend && window.SharedChartLegend.getChartTheme)
          ? window.SharedChartLegend.getChartTheme().text
          : '#888'),
        borderDash: [6, 4],
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0,
        tension: 0,
        order: 0
      }
    ];

    // Survival curves computed in JS (fitted normal thresholds, empirical rate)
    datasets = datasets.concat(modelData.map(m => {
      const allData = computeSurvivalFittedNormal(m.values);
      return {
        label: m.label,
        data: allData.slice(start, end + 1),
        borderColor: m.color, backgroundColor: legendBg(m.color),
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        order: 1
      };
    }));

    // Si todos los datasets (excepto theoretical) están vacíos, mostrar advertencia
    const hasData = datasets.slice(1).some(ds => Array.isArray(ds.data) && ds.data.some(v => v !== null && !isNaN(v)));
    if (!hasData) {
      if (!assignToModal) setStatus('No hay datos válidos en el rango seleccionado.', 'error');
      console.warn('[SurvivalPlot] Todos los datasets están vacíos o nulos.', datasets);
      return;
    }

    const cL = window.SharedChartLegend;
    const options = cL
      ? cL.buildChartOptions({
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: cL.buildLinearScale(i18n.percentile || 'Percentile P (of fitted normal)', min, max),
            y: cL.buildLinearScale(i18n.survival || 'Empirical P(X > x_p) [%]', 0),
          },
          plugins: {
            legend: cL.createLegendOptions({ position: 'top' }),
            title: { display: false },
          },
        })
      : {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true },
            title: { display: false },
          },
          scales: {
            x: { title: { display: true, text: i18n.percentile || 'Percentile' }, min, max },
            y: { title: { display: true, text: i18n.survival || 'Survival (1-CDF)' }, min: 0 },
          },
        };
    const canvas = assignToModal ? modalCanvas : plotCanvas;
    if (!canvas) return;
    if (assignToModal) {
      if (window.SharedChartInteractions && typeof window.SharedChartInteractions.detach === 'function') {
        window.SharedChartInteractions.detach(canvas);
      }
      if (canvas._chartInstance) {
        canvas._chartInstance.destroy();
        canvas._chartInstance = null;
      }
    } else {
      if (chart) { chart.destroy(); chart = null; }
    }
    const newChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options
    });
    if (assignToModal) {
      canvas._chartInstance = newChart;
      if (window.SharedChartInteractions && typeof window.SharedChartInteractions.attach === 'function') {
        window.SharedChartInteractions.attach({
          canvas: canvas,
          getChart: () => canvas._chartInstance,
          defaults: {
            xMin: 0, xMax: 100, yMin: 0, mode: 'y'
          }
        });
      }
    } else {
      chart = newChart;
      if (window.SharedChartInteractions && typeof window.SharedChartInteractions.attach === 'function') {
        window.SharedChartInteractions.attach({
          canvas: canvas,
          getChart: () => chart,
          defaults: {
            xMin: 0, xMax: 100, yMin: 0, mode: 'y'
          }
        });
      }
      // Clear any previous error status on successful render
      setStatus('', '');
    }
  }

  // Actualiza el elemento #sim-progress con el mensaje y tipo de estado estándar
  function setStatus(text, type) {
    const el = document.getElementById('sim-progress');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-busy', false);
    el.dataset.type = (type === 'error' || type === 'ok') ? type : '';
  }

  // ── Slider event wiring ──

  function onMainInput(from) {
    let min = parseInt(minSlider.value, 10);
    let max = parseInt(maxSlider.value, 10);
    if (from === 'min' && min >= max) { min = max - 1; minSlider.value = min; }
    if (from === 'max' && max <= min) { max = min + 1; maxSlider.value = max; }
    applyRange(min, max, true); // skipModal=true while dragging main
  }

  function onModalInput(from) {
    let min = parseInt(minSliderM.value, 10);
    let max = parseInt(maxSliderM.value, 10);
    if (from === 'min' && min >= max) { min = max - 1; minSliderM.value = min; }
    if (from === 'max' && max <= min) { max = min + 1; maxSliderM.value = max; }
    // Update modal UI
    if (minVal)   minVal.textContent = min;
    if (maxVal)   maxVal.textContent = max;
    if (minValM)  minValM.textContent = min;
    if (maxValM)  maxValM.textContent = max;
    updateTrackFill(rangeTrack, min, max);
    updateTrackFill(rangeTrackM, min, max);
    updateZIndex(minSlider, maxSlider, min, max);
    updateZIndex(minSliderM, maxSliderM, min, max);
    if (minSlider) minSlider.value = min;
    if (maxSlider) maxSlider.value = max;
    updatePlot(min, max, true);
    updatePlot(min, max, false);
  }

  // Keyboard support (arrow keys when input is focused — pointer-events:none doesn't block keyboard)
  if (minSlider) minSlider.addEventListener('input', () => onMainInput('min'));
  if (maxSlider) maxSlider.addEventListener('input', () => onMainInput('max'));
  if (minSliderM) minSliderM.addEventListener('input', () => onModalInput('min'));
  if (maxSliderM) maxSliderM.addEventListener('input', () => onModalInput('max'));

  // ── Modal open/close ──

  function closeChartModal() {
    if (!overlay) return;
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    if (modalCanvas && modalCanvas._chartInstance) {
      if (window.SharedChartInteractions && typeof window.SharedChartInteractions.detach === 'function') {
        window.SharedChartInteractions.detach(modalCanvas);
      }
      modalCanvas._chartInstance.destroy();
      modalCanvas._chartInstance = null;
    }
  }

  if (expandBtn && overlay && modalCanvas) {
    expandBtn.addEventListener('click', function () {
      const min = parseInt(minSlider.value, 10);
      const max = parseInt(maxSlider.value, 10);
      // Sync modal sliders to current main values before opening
      if (minSliderM) minSliderM.value = min;
      if (maxSliderM) maxSliderM.value = max;
      if (minValM) minValM.textContent = min;
      if (maxValM) maxValM.textContent = max;
      updateTrackFill(rangeTrackM, min, max);
      updateZIndex(minSliderM, maxSliderM, min, max);
      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      updatePlot(min, max, true);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeChartModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeChartModal();
    });
    const closeBtn = document.getElementById('btn-close-chart-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeChartModal);
  }

  // ── Data event ──

  document.addEventListener('standardizing-comparisons:data-update', function (e) {
    currentSnapshot = e.detail;
    const min = minSlider ? parseInt(minSlider.value, 10) : 85;
    const max = maxSlider ? parseInt(maxSlider.value, 10) : 100;
    applyRange(min, max);
  });

  // Initial track fill and drag binding
  updateTrackFill(rangeTrack, 85, 100);
  updateTrackFill(rangeTrackM, 85, 100);
  bindDoubleSlider(rangeTrack,  minSlider,  maxSlider,  key => onMainInput(key));
  bindDoubleSlider(rangeTrackM, minSliderM, maxSliderM, key => onModalInput(key));

  // ══════════════════════════════════════════════════════
  // ── Sampling / Exceedance probability computation ──
  // ══════════════════════════════════════════════════════

  const SAMPLE_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const SAMPLING_ITERATIONS = 4000; // matches Python default

  // Box-Muller normal sample
  function normalSample(mean, std) {
    let u;
    do { u = Math.random(); } while (u === 0);
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
  }

  // Empirical percentile (linear interpolation)
  function empiricalPercentile(sortedData, p) {
    const idx = p / 100 * (sortedData.length - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return sortedData[lo] + (sortedData[hi] - sortedData[lo]) * (idx - lo);
  }

  // P(at least 1 of N > threshold_p) for all sample sizes
  // Returns array of length SAMPLE_SIZES.length, values in [0,1]
  function computeExceedanceCurve(data, percentile, method) {
    const n = data.length;
    if (!n) return SAMPLE_SIZES.map(() => null);

    if (method === 'analytical') {
      const pSingle = 1 - percentile / 100;
      return SAMPLE_SIZES.map(s => 1 - Math.pow(1 - pSingle, s));
    }

    const sorted = data.slice().sort((a, b) => a - b);
    const threshold = empiricalPercentile(sorted, percentile);
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
    if (std < 1e-9) return SAMPLE_SIZES.map(() => null);

    return SAMPLE_SIZES.map(s => {
      let successes = 0;
      for (let i = 0; i < SAMPLING_ITERATIONS; i++) {
        for (let j = 0; j < s; j++) {
          const val = method === 'bootstrap'
            ? data[Math.floor(Math.random() * n)]
            : normalSample(mean, std);
          if (val > threshold) { successes++; break; }
        }
      }
      return successes / SAMPLING_ITERATIONS;
    });
  }

  // Cache: resultsCache[method][percentile][modelKey] = Float32Array(SAMPLE_SIZES.length)
  let resultsCache = null;

  // Chart references for sampling sections
  let samplingCharts = { bs: null, mc: null, avgBs: null, avgMc: null };

  function destroySamplingChart(key) {
    const canvasMap = { bs: 'sampling-bs-chart', mc: 'sampling-mc-chart', avgBs: 'sampling-avg-bs-chart', avgMc: 'sampling-avg-mc-chart' };
    const canvas = document.getElementById(canvasMap[key]);
    if (canvas && window.SharedChartInteractions) window.SharedChartInteractions.detach(canvas);
    if (samplingCharts[key]) { samplingCharts[key].destroy(); samplingCharts[key] = null; }
  }

  function attachInteractions(canvas, chartKey, yMax) {
    if (!canvas || !window.SharedChartInteractions) return;
    window.SharedChartInteractions.attach({
      canvas: canvas,
      getChart: () => samplingCharts[chartKey],
      defaults: { xMin: 1, xMax: 15, yMin: 0, yMax: yMax != null ? yMax : 100 }
    });
  }

  async function runSamplingComputation(snapshot) {
    const { selected, dataByModel, displayByModel, colorByModel } = snapshot;
    const models = (selected || []).filter(m =>
      Array.isArray(dataByModel[m]) && dataByModel[m].length > 0
    );
    if (!models.length) return;

    const pMinEl = document.getElementById('sampling-pmin-input');
    const pMaxEl = document.getElementById('sampling-pmax-input');
    const pMin = parseInt(pMinEl ? pMinEl.value : 85, 10);
    const pMax = parseInt(pMaxEl ? pMaxEl.value : 100, 10);
    const percentiles = [];
    for (let p = pMin; p <= pMax; p++) percentiles.push(p);
    if (!percentiles.length) return;

    setStatus('Computing sampling curves…', '');

    // Ensure results section is visible
    const resultsSection = document.getElementById('results-section');
    const resultsBlock   = document.getElementById('results-output-block');
    if (resultsSection) resultsSection.classList.remove('hidden');
    if (resultsBlock)   resultsBlock.classList.remove('hidden');

    resultsCache = { bootstrap: {}, montecarlo: {} };

    // Compute — yield to browser every few percentiles
    for (let pi = 0; pi < percentiles.length; pi++) {
      const p = percentiles[pi];
      resultsCache.bootstrap[p]  = {};
      resultsCache.montecarlo[p] = {};
      for (const model of models) {
        const data = dataByModel[model].filter(v => Number.isFinite(v));
        resultsCache.bootstrap[p][model]  = computeExceedanceCurve(data, p, 'bootstrap');
        resultsCache.montecarlo[p][model] = computeExceedanceCurve(data, p, 'montecarlo');
      }
      // Yield every 4 percentiles so the browser doesn't freeze
      if (pi % 4 === 3) await new Promise(r => setTimeout(r, 0));
    }

    // Update slider range to match computed percentiles
    const slider = document.getElementById('sampling-percentile-slider');
    if (slider) {
      slider.min   = pMin;
      slider.max   = pMax;
      slider.value = Math.min(Math.max(parseInt(slider.value, 10), pMin), pMax);
    }

    // Build display helpers
    const modelDisplay = model => (displayByModel || {})[model] || model;
    const modelColor   = model => (colorByModel  || {})[model] || '#58a6ff';

    renderExceedanceCharts(models, modelDisplay, modelColor);
    renderAverageCharts(models, modelDisplay, percentiles);

    ['sampling-exceedance-block',
     'sampling-avg-block'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });

    setStatus('Computation complete.', 'ok');
  }

  // ── Render section 1: per-model + average for selected percentile P ──

  function renderExceedanceCharts(models, modelDisplay, modelColor) {
    const slider = document.getElementById('sampling-percentile-slider');
    const p = parseInt(slider ? slider.value : 95, 10);
    renderExceedanceChart('bs',  'bootstrap',  p, models, modelDisplay, modelColor);
    renderExceedanceChart('mc',  'montecarlo', p, models, modelDisplay, modelColor);
  }

  // Theme-aware color for the average line (visible in both light and dark)
  function avgLineColor() {
    const cL = window.SharedChartLegend;
    if (cL && cL.getChartTheme) return cL.getChartTheme().text;
    return document.documentElement.classList.contains('dark') ? '#e6edf3' : '#1b1f23';
  }

  function renderExceedanceChart(key, method, p, models, modelDisplay, modelColor) {
    if (!resultsCache || !resultsCache[method][p]) return;
    const canvasId = key === 'bs' ? 'sampling-bs-chart' : 'sampling-mc-chart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const cL = window.SharedChartLegend;
    const datasets = [];

    // Per-model lines
    for (const model of models) {
      const curve = resultsCache[method][p][model];
      if (!curve) continue;
      datasets.push({
        label: modelDisplay(model),
        data: curve.map(v => v !== null ? +(v * 100).toFixed(2) : null),
        borderColor: modelColor(model), backgroundColor: legendBg(modelColor(model)),
        fill: false, tension: 0.2, pointRadius: 0, borderWidth: 1.5, order: 1
      });
    }

    // Average line
    const avgCurve = SAMPLE_SIZES.map((_, i) => {
      const vals = models.map(m => resultsCache[method][p][m]?.[i]).filter(v => v !== null && Number.isFinite(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    datasets.push({
      label: 'Average',
      data: avgCurve.map(v => v !== null ? +(v * 100).toFixed(2) : null),
      borderColor: avgLineColor(), backgroundColor: legendBg(avgLineColor()),
      borderWidth: 2.5, fill: false, tension: 0.2, pointRadius: 0, order: 0
    });

    // Auto-scale Y to data max (ceil to nearest 5)
    const allVals = datasets.flatMap(ds => ds.data).filter(v => v !== null && Number.isFinite(v));
    const yMax = allVals.length ? Math.min(100, Math.ceil(Math.max(...allVals) / 5) * 5 + 5) : 100;

    const options = cL ? cL.buildChartOptions({
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: cL.buildLinearScale('Sample size (N)', 1, 15),
        y: cL.buildLinearScale('P(≥1 > threshold) [%]', 0, yMax),
      },
      plugins: {
        legend: cL.createLegendOptions({ position: 'top' }),
        title: { display: false },
      },
    }) : {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Sample size (N)' }, min: 1, max: 15 },
        y: { title: { display: true, text: 'P(≥1 > threshold) [%]' }, min: 0, max: yMax },
      },
    };

    destroySamplingChart(key);
    samplingCharts[key] = new Chart(canvas.getContext('2d'), {
      type: 'line', data: { labels: SAMPLE_SIZES, datasets }, options
    });
    attachInteractions(canvas, key, yMax);
  }

  // ── Render section 2: per-percentile average across models ──

  function renderAverageCharts(models, modelDisplay, percentiles) {
    renderAverageChart('avgBs', 'bootstrap',  models, percentiles);
    renderAverageChart('avgMc', 'montecarlo', models, percentiles);
  }

  function renderAverageChart(key, method, models, percentiles) {
    if (!resultsCache) return;
    const canvasId = key === 'avgBs' ? 'sampling-avg-bs-chart' : 'sampling-avg-mc-chart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const cL = window.SharedChartLegend;

    // Color gradient across percentiles using data palette
    const palette = (cL && cL.getDataPalette) ? cL.getDataPalette() : null;

    const datasets = percentiles.map((p, pi) => {
      const avgCurve = SAMPLE_SIZES.map((_, i) => {
        const vals = models.map(m => resultsCache[method][p]?.[m]?.[i]).filter(v => v !== null && Number.isFinite(v));
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      });
      const color = palette ? palette[pi % palette.length] : `hsl(${200 + pi * (120 / Math.max(percentiles.length, 1))}, 65%, 55%)`;
      return {
        label: `p${p}`,
        data: avgCurve.map(v => v !== null ? +(v * 100).toFixed(2) : null),
        borderColor: color, backgroundColor: legendBg(color),
        fill: false, tension: 0.2, pointRadius: 0, borderWidth: 1.5,
      };
    });

    const options = cL ? cL.buildChartOptions({
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: cL.buildLinearScale('Sample size (N)', 1, 15),
        y: cL.buildLinearScale('Avg P(≥1 > threshold) [%]', 0, 100),
      },
      plugins: {
        legend: cL.createLegendOptions({ position: 'top' }),
        title: { display: false },
      },
    }) : {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Sample size (N)' }, min: 1, max: 15 },
        y: { title: { display: true, text: 'Avg P(≥1 > threshold) [%]' }, min: 0, max: 100 },
      },
    };

    destroySamplingChart(key);
    samplingCharts[key] = new Chart(canvas.getContext('2d'), {
      type: 'line', data: { labels: SAMPLE_SIZES, datasets }, options
    });
    attachInteractions(canvas, key);
  }

  // ── Percentile slider for section 1 ──

  const samplingSlider = document.getElementById('sampling-percentile-slider');
  const samplingSliderVal = document.getElementById('val-sampling-percentile');

  if (samplingSlider) {
    samplingSlider.addEventListener('input', function () {
      const p = parseInt(this.value, 10);
      if (samplingSliderVal) samplingSliderVal.textContent = p;
      if (!resultsCache || !currentSnapshot) return;
      const { selected, dataByModel, displayByModel, colorByModel } = currentSnapshot;
      const models = (selected || []).filter(m => Array.isArray(dataByModel[m]) && dataByModel[m].length > 0);
      renderExceedanceChart('bs', 'bootstrap',  p, models,
        m => (displayByModel || {})[m] || m, m => (colorByModel  || {})[m] || '#58a6ff');
      renderExceedanceChart('mc', 'montecarlo', p, models,
        m => (displayByModel || {})[m] || m, m => (colorByModel  || {})[m] || '#58a6ff');
    });
  }

  // ── Sampling expand / modal ──

  const samplingModalOverlay = document.getElementById('sampling-modal-overlay');
  const samplingModalCanvas  = document.getElementById('sampling-modal-canvas');
  const samplingModalCanvasDeriv = document.getElementById('sampling-modal-canvas-deriv');
  const samplingModalTitle   = document.getElementById('sampling-modal-title');
  let samplingModalChart = null;
  let samplingModalChartDeriv = null;

  function closeSamplingModal() {
    if (!samplingModalOverlay) return;
    samplingModalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    if (samplingModalCanvas && window.SharedChartInteractions) {
      window.SharedChartInteractions.detach(samplingModalCanvas);
    }
    if (samplingModalCanvasDeriv && window.SharedChartInteractions) {
      window.SharedChartInteractions.detach(samplingModalCanvasDeriv);
    }
    if (samplingModalChart) { samplingModalChart.destroy(); samplingModalChart = null; }
    if (samplingModalChartDeriv) { samplingModalChartDeriv.destroy(); samplingModalChartDeriv = null; }
    if (seModalLegendEl) seModalLegendEl.innerHTML = '';
  }

  function openSamplingModal(chartKey, title) {
    const srcChart = samplingCharts[chartKey];
    if (!srcChart || !samplingModalOverlay || !samplingModalCanvas) return;
    closeSamplingModal();

    if (samplingModalTitle) samplingModalTitle.textContent = title;
    samplingModalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    var derivWrap = samplingModalCanvasDeriv && samplingModalCanvasDeriv.parentNode;
    if (derivWrap) derivWrap.style.display = 'none';
    if (seModalLegendEl) seModalLegendEl.style.display = 'none';

    var cL = window.SharedChartLegend;
    var srcScales = srcChart.config.options.scales || {};
    var srcY = srcScales.y || {};
    var yLabel = srcY.title && srcY.title.text || '';
    var yMin = Number.isFinite(srcY.min) ? srcY.min : 0;
    var yMax = Number.isFinite(srcY.max) ? srcY.max : undefined;
    var opts = cL ? cL.buildChartOptions({
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: cL.buildLinearScale('Sample size (N)', 1, 15),
        y: cL.buildLinearScale(yLabel, yMin, yMax),
      },
      plugins: {
        legend: cL.createLegendOptions({ position: 'top' }),
        title: { display: false },
      },
    }) : {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { min: 1, max: 15 }, y: { min: yMin } },
    };
    samplingModalChart = new Chart(samplingModalCanvas.getContext('2d'), buildModalChartConfig(srcChart, opts));
    if (window.SharedChartInteractions) {
      window.SharedChartInteractions.attach({
        canvas: samplingModalCanvas,
        getChart: function () { return samplingModalChart; },
        defaults: { xMin: 1, xMax: 15, yMin: 0 }
      });
    }
  }

  // Wire expand buttons
  var expandMap = {
    'btn-expand-sampling-bs':     { key: 'bs',    title: 'Bootstrap — P(≥1 above threshold)' },
    'btn-expand-sampling-mc':     { key: 'mc',    title: 'Monte Carlo — P(≥1 above threshold)' },
    'btn-expand-sampling-avg-bs': { key: 'avgBs', title: 'Bootstrap — Model-average exceedance' },
    'btn-expand-sampling-avg-mc': { key: 'avgMc', title: 'Monte Carlo — Model-average exceedance' },
  };
  Object.keys(expandMap).forEach(function (btnId) {
    var btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', function () {
      openSamplingModal(expandMap[btnId].key, expandMap[btnId].title);
    });
  });

  // Modal close
  if (samplingModalOverlay) {
    samplingModalOverlay.addEventListener('click', function (e) {
      if (e.target === samplingModalOverlay) closeSamplingModal();
    });
    var closeBtn = document.getElementById('btn-close-sampling-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeSamplingModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !samplingModalOverlay.classList.contains('hidden')) closeSamplingModal();
    });
  }

  // ══════════════════════════════════════════════════════
  // ── Sampling Error curves (analytical/bootstrap/MC, mean/std) ──
  // ══════════════════════════════════════════════════════

  // 4 charts: mean-error, mean-deriv, std-error, std-deriv
  var samplingErrorCharts = {};
  var seActiveParam = 'mean'; // current tab

  function destroySamplingErrorChart(key) {
    if (!samplingErrorCharts[key]) return;
    var canvas = samplingErrorCharts[key].canvas;
    if (canvas && window.SharedChartInteractions) window.SharedChartInteractions.detach(canvas);
    samplingErrorCharts[key].destroy();
    samplingErrorCharts[key] = null;
  }

  function destroyAllSamplingErrorCharts() {
    Object.keys(samplingErrorCharts).forEach(destroySamplingErrorChart);
    samplingErrorCharts = {};
  }

  // Build an X scale for sample-size charts with consistent integer ticks.
  // When labelsHidden is true, grid lines are still drawn but tick labels
  // and the axis title are invisible so the chart takes no extra vertical
  // space — this keeps vertical grid lines aligned with the paired chart.
  function buildSampleSizeXScale(label, labelsHidden) {
    var cL = window.SharedChartLegend;
    var theme = cL ? cL.getChartTheme() : {};
    if (!cL) {
      var s = {
        min: 1, max: 15,
        ticks: { stepSize: 1, maxRotation: 0, autoSkip: false },
        grid: {},
        border: { display: !labelsHidden },
      };
      if (labelsHidden) {
        s.ticks.display = false;
        s.title = { display: false };
      } else {
        if (label) s.title = { display: true, text: label };
      }
      return s;
    }
    var scale = cL.buildLinearScale(label || '', 1, 15);
    scale.ticks.stepSize = 1;
    scale.ticks.maxRotation = 0;
    scale.ticks.autoSkip = false;
    if (labelsHidden) {
      scale.ticks.display = false;
      scale.title = { display: false };
      scale.border = { display: false };
    }
    return scale;
  }

  // Align two stacked charts so their chartArea left & right edges match
  // exactly, producing perfectly continuous vertical grid lines.
  // Left edge is controlled by Y-axis width; right edge by layout padding.
  function syncChartAreas(chartA, chartB) {
    if (!chartA || !chartB) return;
    var aArea = chartA.chartArea || {};
    var bArea = chartB.chartArea || {};
    if (!aArea.left || !bArea.left) return;

    var targetLeft = Math.max(aArea.left, bArea.left);
    var targetRight = Math.min(aArea.right, bArea.right);
    if (targetRight <= targetLeft) return;

    function apply(chart, area) {
      var opts = chart.options;
      // Force Y-axis width so left edge = targetLeft
      var padLeft = opts.layout && opts.layout.padding
        ? (typeof opts.layout.padding === 'number' ? opts.layout.padding : (opts.layout.padding.left || 0))
        : 0;
      var needYWidth = targetLeft - padLeft;
      if (opts.scales && opts.scales.y) {
        opts.scales.y.afterFit = function (axis) { axis.width = needYWidth; };
      }
      // Force right padding so right edge = targetRight
      var canvasW = chart.width || chart.canvas.width;
      var needRightPad = canvasW - targetRight;
      if (!opts.layout) opts.layout = {};
      if (!opts.layout.padding || typeof opts.layout.padding === 'number') {
        var p = opts.layout.padding || 0;
        opts.layout.padding = { top: p, right: p, bottom: p, left: p };
      }
      opts.layout.padding.right = needRightPad;
    }

    apply(chartA, aArea);
    apply(chartB, bArea);
    chartA.update('none');
    chartB.update('none');
  }

  function attachSamplingErrorInteractions(canvas, chartKey, yMin, yMax) {
    if (!canvas || !window.SharedChartInteractions) return;
    var defs = { xMin: 1, xMax: 15 };
    if (Number.isFinite(yMin)) defs.yMin = yMin;
    if (Number.isFinite(yMax)) defs.yMax = yMax;
    window.SharedChartInteractions.attach({
      canvas: canvas,
      getChart: function () { return samplingErrorCharts[chartKey]; },
      defaults: defs
    });
  }

  // ── Gaussian random (Box-Muller) ──
  function randNormal(mean, std) {
    var u1 = Math.random(), u2 = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // ── Compute sampling-error curve for one model ──
  // method: 'analytical' | 'bootstrap' | 'montecarlo'
  // parameter: 'mean' | 'std'
  // Returns array of SE values, one per SAMPLE_SIZES entry
  function computeSamplingErrorCurve(data, method, parameter, nIterations) {
    var n = data.length;
    var gMean = data.reduce(function (a, b) { return a + b; }, 0) / n;
    var gStd = Math.sqrt(data.reduce(function (a, b) { return a + Math.pow(b - gMean, 2); }, 0) / (n - 1));

    if (method === 'analytical') {
      return SAMPLE_SIZES.map(function (ns) {
        if (parameter === 'mean') return gStd / Math.sqrt(ns);
        // SE of std: σ / √(2(N-1))
        return ns < 2 ? NaN : gStd / Math.sqrt(2 * (ns - 1));
      });
    }

    // Bootstrap or MonteCarlo
    return SAMPLE_SIZES.map(function (ns) {
      if (ns < 2 && parameter === 'std') return NaN;
      var estimates = new Float64Array(nIterations);
      for (var it = 0; it < nIterations; it++) {
        var sum = 0;
        var vals = new Float64Array(ns);
        for (var s = 0; s < ns; s++) {
          var v = method === 'bootstrap'
            ? data[Math.floor(Math.random() * n)]
            : randNormal(gMean, gStd);
          vals[s] = v;
          sum += v;
        }
        if (parameter === 'mean') {
          estimates[it] = sum / ns;
        } else {
          var sampleMean = sum / ns;
          var ssq = 0;
          for (var s2 = 0; s2 < ns; s2++) ssq += Math.pow(vals[s2] - sampleMean, 2);
          estimates[it] = Math.sqrt(ssq / (ns - 1));
        }
      }
      // SE = std of estimates
      var eMean = 0;
      for (var i = 0; i < nIterations; i++) eMean += estimates[i];
      eMean /= nIterations;
      var eVar = 0;
      for (var i2 = 0; i2 < nIterations; i2++) eVar += Math.pow(estimates[i2] - eMean, 2);
      return Math.sqrt(eVar / (nIterations - 1));
    });
  }

  // Method definitions
  var SE_METHODS = [
    { key: 'analytical', label: 'Analytical' },
    { key: 'bootstrap',  label: 'Bootstrap' },
    { key: 'montecarlo', label: 'Monte Carlo' },
  ];

  function renderSamplingErrorCharts(snapshot) {
    var selected = snapshot.selected || [];
    var dataByModel = snapshot.dataByModel || {};
    var displayByModel = snapshot.displayByModel || {};
    var colorByModel = snapshot.colorByModel || {};
    var models = selected.filter(function (m) {
      return Array.isArray(dataByModel[m]) && dataByModel[m].length > 1;
    });
    if (!models.length) return;

    // Apply i18n
    if (window.StandardizingComparisonsI18n && typeof window.StandardizingComparisonsI18n.getCopy === 'function') {
      var copy = window.StandardizingComparisonsI18n.getCopy(window.StandardizingComparisonsI18n.getLang());
      var titleEl = document.getElementById('sampling-error-title');
      var noteEl = document.getElementById('sampling-error-note');
      if (titleEl && copy.samplingErrorTitle) titleEl.textContent = copy.samplingErrorTitle;
      if (noteEl && copy.samplingErrorNote) noteEl.textContent = copy.samplingErrorNote;
      // Tab labels
      var tabBtns = document.querySelectorAll('#sampling-error-param-tabs .shared-tab');
      tabBtns.forEach(function (btn) {
        var param = btn.getAttribute('data-se-param');
        if (param === 'mean' && copy.samplingErrorTabMean) btn.textContent = copy.samplingErrorTabMean;
        if (param === 'std' && copy.samplingErrorTabStd) btn.textContent = copy.samplingErrorTabStd;
      });
    }

    // Read trial counts from UI
    var mcInput = document.getElementById('mc-trials-input');
    var bsInput = document.getElementById('bs-trials-input');
    var mcTrials = mcInput ? Math.max(200, Math.min(300000, parseInt(mcInput.value, 10) || 3000)) : 3000;
    var bsTrials = bsInput ? Math.max(200, Math.min(300000, parseInt(bsInput.value, 10) || 3000)) : 3000;

    destroyAllSamplingErrorCharts();

    var cL = window.SharedChartLegend;

    // Pre-compute all curves for both parameters
    var allCurves = {}; // allCurves[param][methodKey] = { models: [...], avg: [...] }
    ['mean', 'std'].forEach(function (param) {
      allCurves[param] = {};
      SE_METHODS.forEach(function (m) {
        var nIter = m.key === 'bootstrap' ? bsTrials : mcTrials;
        var modelCurves = models.map(function (model) {
          var data = dataByModel[model].filter(function (v) { return Number.isFinite(v); });
          return {
            model: model,
            curve: computeSamplingErrorCurve(data, m.key, param, nIter)
          };
        });
        var avg = SAMPLE_SIZES.map(function (_, i) {
          var vals = modelCurves.map(function (mc) { return mc.curve[i]; }).filter(function (v) { return Number.isFinite(v); });
          return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
        });
        allCurves[param][m.key] = { models: modelCurves, avg: avg };
      });
    });

    // Collect paired chart refs for X-axis sync
    var sePairsByParam = [];

    // Render one chart per method per parameter (3 methods × 2 charts × 2 params = 12 charts)
    ['mean', 'std'].forEach(function (param) {
      var paramLabel = param === 'mean' ? '\u03c3/\u221aN' : '\u03c3/\u221a(2(N\u22121))';

      SE_METHODS.forEach(function (m) {
        var mData = allCurves[param][m.key];

        // Build per-model datasets for this single method
        var errorDatasets = [];
        var derivDatasets = [];

        mData.models.forEach(function (mc) {
          var label = displayByModel[mc.model] || mc.model;
          var color = colorByModel[mc.model] || '#58a6ff';
          var errorCurve = mc.curve.map(function (v) { return Number.isFinite(v) ? +v.toFixed(6) : null; });
          var derivCurve = errorCurve.map(function (v, i) {
            if (i === 0 || v === null || errorCurve[i - 1] === null) return null;
            return +(v - errorCurve[i - 1]).toFixed(6);
          });
          errorDatasets.push({
            label: label, data: errorCurve,
            borderColor: color, backgroundColor: legendBg(color), fill: false, tension: 0.2,
            pointRadius: 0, borderWidth: 1.5, order: 1
          });
          derivDatasets.push({
            label: label, data: derivCurve,
            borderColor: color, backgroundColor: legendBg(color), fill: false, tension: 0.2,
            pointRadius: 0, borderWidth: 1.5, order: 1
          });
        });

        // Average line
        var avgError = mData.avg.map(function (v) { return v !== null ? +v.toFixed(6) : null; });
        var avgDeriv = avgError.map(function (v, i) {
          if (i === 0 || v === null || avgError[i - 1] === null) return null;
          return +(v - avgError[i - 1]).toFixed(6);
        });
        errorDatasets.push({
          label: 'Avg', data: avgError,
          borderColor: avgLineColor(), backgroundColor: legendBg(avgLineColor()), borderWidth: 2.5,
          fill: false, tension: 0.2, pointRadius: 0, order: 0
        });
        derivDatasets.push({
          label: 'Avg', data: avgDeriv,
          borderColor: avgLineColor(), backgroundColor: legendBg(avgLineColor()), borderWidth: 2.5,
          fill: false, tension: 0.2, pointRadius: 0, order: 0
        });

        // Y-axis ranges
        var allEVals = errorDatasets.flatMap(function (ds) { return ds.data; }).filter(function (v) { return v !== null && Number.isFinite(v); });
        var eYMax = allEVals.length ? Math.ceil(Math.max.apply(null, allEVals) * 1.1 * 1000) / 1000 : 1;
        var allDVals = derivDatasets.flatMap(function (ds) { return ds.data; }).filter(function (v) { return v !== null && Number.isFinite(v); });
        var dYMin = allDVals.length ? Math.floor(Math.min.apply(null, allDVals) * 1.1 * 1000) / 1000 : -1;

        // Canvas IDs: se-{param}-{method}-chart, se-{param}-{method}-deriv-chart
        var errorCanvasId = 'se-' + param + '-' + m.key + '-chart';
        var derivCanvasId = 'se-' + param + '-' + m.key + '-deriv-chart';

        // Error chart (top) — no legend (shared external), x-axis fully hidden
        var errorCanvas = document.getElementById(errorCanvasId);
        var chartKey = param + '-' + m.key + '-error';
        if (errorCanvas) {
          var errorOpts = cL ? cL.buildChartOptions({
            responsive: true, maintainAspectRatio: false,
            layoutPadding: { bottom: 0 },
            scales: {
              x: buildSampleSizeXScale('', true),
              y: cL.buildLinearScale('SE (' + paramLabel + ')', 0, eYMax),
            },
            plugins: {
              legend: { display: false },
              title: { display: false },
            },
          }) : {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 3, right: 8, left: 6, bottom: 0 } },
            scales: {
              x: buildSampleSizeXScale('', true),
              y: { title: { display: true, text: 'SE (' + paramLabel + ')' }, min: 0, max: eYMax },
            },
            plugins: { legend: { display: false } },
          };
          samplingErrorCharts[chartKey] = new Chart(errorCanvas.getContext('2d'), {
            type: 'line', data: { labels: SAMPLE_SIZES, datasets: errorDatasets }, options: errorOpts
          });
          attachSamplingErrorInteractions(errorCanvas, chartKey, 0, eYMax);
        }

        // Derivative chart (bottom) — no legend, x-axis labels visible
        var derivCanvas = document.getElementById(derivCanvasId);
        var dKey = param + '-' + m.key + '-deriv';
        if (derivCanvas) {
          var derivOpts = cL ? cL.buildChartOptions({
            responsive: true, maintainAspectRatio: false,
            layoutPadding: { top: 0 },
            scales: {
              x: buildSampleSizeXScale('N'),
              y: cL.buildLinearScale('\u0394SE / \u0394N', dYMin, 0),
            },
            plugins: {
              legend: { display: false },
              title: { display: false },
            },
          }) : {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 0, right: 8, left: 6, bottom: 3 } },
            scales: {
              x: buildSampleSizeXScale('N'),
              y: { title: { display: true, text: '\u0394SE / \u0394N' }, min: dYMin, max: 0 },
            },
            plugins: { legend: { display: false } },
          };
          samplingErrorCharts[dKey] = new Chart(derivCanvas.getContext('2d'), {
            type: 'line', data: { labels: SAMPLE_SIZES, datasets: derivDatasets }, options: derivOpts
          });
          attachSamplingErrorInteractions(derivCanvas, dKey, dYMin, 0);
        }

        // Sync X zoom between error and derivative charts
        if (errorCanvas && derivCanvas) {
          sePairsByParam.push({ errorKey: chartKey, derivKey: dKey, errorCanvas: errorCanvas, derivCanvas: derivCanvas });
        }
      });
    });

    // ── Wire shared X-axis zoom between paired error/derivative charts ──
    // Override Chart.update on each paired chart to sync X after any update.
    sePairsByParam.forEach(function (pair) {
      var syncing = false;
      function syncX(sourceKey, targetKey) {
        if (syncing) return;
        var src = samplingErrorCharts[sourceKey];
        var tgt = samplingErrorCharts[targetKey];
        if (!src || !tgt || !src.scales || !src.scales.x || !tgt.options.scales || !tgt.options.scales.x) return;
        var xMin = src.scales.x.min;
        var xMax = src.scales.x.max;
        if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) return;
        if (tgt.options.scales.x.min === xMin && tgt.options.scales.x.max === xMax) return;
        syncing = true;
        tgt.options.scales.x.min = xMin;
        tgt.options.scales.x.max = xMax;
        tgt.update('none');
        syncing = false;
      }
      function wrapUpdate(chartKey, peerKey) {
        var chart = samplingErrorCharts[chartKey];
        if (!chart) return;
        var origUpdate = chart.update.bind(chart);
        chart.update = function (mode) {
          origUpdate(mode);
          syncX(chartKey, peerKey);
        };
      }
      wrapUpdate(pair.errorKey, pair.derivKey);
      wrapUpdate(pair.derivKey, pair.errorKey);
    });

    // ── Shared external legend using standard withAlpha pattern ──
    var wA = cL && typeof cL.withAlpha === 'function' ? cL.withAlpha : null;

    // Apply legend hover across all 6 charts for a given param
    function applySharedLegendHover(param, activeIdx) {
      SE_METHODS.forEach(function (m) {
        ['error', 'deriv'].forEach(function (type) {
          var chart = samplingErrorCharts[param + '-' + m.key + '-' + type];
          if (!chart) return;
          chart.data.datasets.forEach(function (ds, di) {
            if (!ds._legendHoverOriginal) {
              ds._legendHoverOriginal = {
                borderColor: ds.borderColor,
                backgroundColor: ds.backgroundColor,
              };
            }
            var orig = ds._legendHoverOriginal;
            var active = activeIdx < 0 || di === activeIdx;
            if (active) {
              ds.borderColor = orig.borderColor;
              ds.backgroundColor = orig.backgroundColor;
            } else {
              if (wA && typeof orig.borderColor === 'string') ds.borderColor = wA(orig.borderColor, 0.22);
              if (wA && typeof orig.backgroundColor === 'string') ds.backgroundColor = wA(orig.backgroundColor, 0.22);
            }
          });
          chart.update('none');
        });
      });
    }

    ['mean', 'std'].forEach(function (param) {
      var legendContainer = document.getElementById('se-shared-legend-' + param);
      if (!legendContainer) return;
      legendContainer.innerHTML = '';
      var refKey = param + '-' + SE_METHODS[0].key + '-error';
      var refChart = samplingErrorCharts[refKey];
      if (!refChart) return;
      refChart.data.datasets.forEach(function (ds, dsIdx) {
        var item = document.createElement('span');
        item.className = 'shared-chart-legend-item';
        item.innerHTML = '<span class="shared-chart-legend-swatch" style="border-color:' + ds.borderColor + ';background:' + (ds.backgroundColor || legendBg(ds.borderColor)) + '"></span>' + ds.label;
        item.addEventListener('click', function () {
          var dimmed = item.classList.toggle('dimmed');
          SE_METHODS.forEach(function (m) {
            ['error', 'deriv'].forEach(function (type) {
              var chart = samplingErrorCharts[param + '-' + m.key + '-' + type];
              if (!chart) return;
              var meta = chart.getDatasetMeta(dsIdx);
              if (meta) meta.hidden = dimmed;
              chart.update('none');
            });
          });
        });
        item.addEventListener('mouseenter', function () { applySharedLegendHover(param, dsIdx); });
        item.addEventListener('mouseleave', function () { applySharedLegendHover(param, -1); });
        legendContainer.appendChild(item);
      });
    });

    // Show section and activate correct tab
    var block = document.getElementById('sampling-error-block');
    if (block) block.classList.remove('hidden');
    switchSamplingErrorTab(seActiveParam);
  }

  // ── Tab switching ──
  function switchSamplingErrorTab(param) {
    seActiveParam = param;
    ['mean', 'std'].forEach(function (p) {
      var panel = document.getElementById('sampling-error-tab-' + p);
      if (panel) panel.classList.toggle('hidden', p !== param);
    });
    var btns = document.querySelectorAll('#sampling-error-param-tabs .shared-tab');
    btns.forEach(function (btn) {
      var isActive = btn.getAttribute('data-se-param') === param;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    // Sync chart areas now that the tab is visible (charts have real dimensions)
    requestAnimationFrame(function () {
      SE_METHODS.forEach(function (m) {
        var errChart = samplingErrorCharts[param + '-' + m.key + '-error'];
        var drvChart = samplingErrorCharts[param + '-' + m.key + '-deriv'];
        if (errChart && drvChart) {
          // Chart.js needs a resize first if it was created while hidden
          errChart.resize();
          drvChart.resize();
          syncChartAreas(errChart, drvChart);
        }
      });
    });
  }

  // Wire tab buttons
  var seTabBtns = document.querySelectorAll('#sampling-error-param-tabs .shared-tab');
  seTabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchSamplingErrorTab(btn.getAttribute('data-se-param'));
    });
  });

  // Wire expand buttons for sampling error — one button per method pair
  function buildSamplingErrorExpandMap() {
    var map = {};
    ['mean', 'std'].forEach(function (param) {
      var pLabel = param === 'mean' ? 'Mean' : 'Std';
      SE_METHODS.forEach(function (m) {
        map['btn-expand-se-' + param + '-' + m.key] = {
          errorKey: param + '-' + m.key + '-error',
          derivKey: param + '-' + m.key + '-deriv',
          title: m.label + ' \u2014 Sampling Error (' + pLabel + ')'
        };
      });
    });
    return map;
  }
  var samplingErrorExpandMap = buildSamplingErrorExpandMap();

  // Build a fresh chart config from a source chart's data (avoids JSON.stringify pitfalls)
  function buildModalChartConfig(srcChart, optsOverride) {
    var srcData = srcChart.config.data;
    return {
      type: 'line',
      data: {
        labels: srcData.labels.slice(),
        datasets: srcData.datasets.map(function (ds) {
          return Object.assign({}, ds, { data: ds.data.slice() });
        })
      },
      options: optsOverride
    };
  }

  // Build HTML side-legend for the modal (spans both charts vertically)
  var seModalLegendEl = document.getElementById('se-modal-legend');

  function buildModalSideLegend(datasets) {
    if (!seModalLegendEl) return;
    seModalLegendEl.innerHTML = '';
    datasets.forEach(function (ds, idx) {
      var item = document.createElement('span');
      item.className = 'shared-chart-legend-item';
      item.dataset.idx = idx;
      var swatch = document.createElement('span');
      swatch.className = 'shared-chart-legend-swatch';
      swatch.style.borderColor = ds.borderColor || '#888';
      swatch.style.background = ds.backgroundColor || legendBg(ds.borderColor || '#888');
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(ds.label));
      // Click — toggle visibility on both charts
      item.addEventListener('click', function () {
        var hidden = !item.classList.contains('dimmed');
        item.classList.toggle('dimmed', hidden);
        [samplingModalChart, samplingModalChartDeriv].forEach(function (chart) {
          if (!chart) return;
          var meta = chart.getDatasetMeta(idx);
          meta.hidden = hidden;
          chart.update('none');
        });
      });
      // Hover — highlight across both charts
      item.addEventListener('mouseenter', function () {
        applyModalLegendHover(idx);
      });
      item.addEventListener('mouseleave', function () {
        applyModalLegendHover(-1);
      });
      seModalLegendEl.appendChild(item);
    });
  }

  function applyModalLegendHover(activeIdx) {
    var wA = window.SharedChartLegend && typeof window.SharedChartLegend.withAlpha === 'function'
      ? window.SharedChartLegend.withAlpha : null;
    [samplingModalChart, samplingModalChartDeriv].forEach(function (chart) {
      if (!chart) return;
      chart.data.datasets.forEach(function (ds, di) {
        if (!ds._legendHoverOriginal) {
          ds._legendHoverOriginal = { borderColor: ds.borderColor, backgroundColor: ds.backgroundColor };
        }
        var orig = ds._legendHoverOriginal;
        var active = activeIdx < 0 || di === activeIdx;
        if (active) {
          ds.borderColor = orig.borderColor;
          ds.backgroundColor = orig.backgroundColor;
        } else {
          if (wA && typeof orig.borderColor === 'string') ds.borderColor = wA(orig.borderColor, 0.22);
          if (wA && typeof orig.backgroundColor === 'string') ds.backgroundColor = wA(orig.backgroundColor, 0.22);
        }
      });
      chart.update('none');
    });
  }

  Object.keys(samplingErrorExpandMap).forEach(function (btnId) {
    var btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', function () {
      var info = samplingErrorExpandMap[btnId];
      var srcError = samplingErrorCharts[info.errorKey];
      var srcDeriv = samplingErrorCharts[info.derivKey];
      if (!srcError || !samplingModalOverlay || !samplingModalCanvas) return;
      closeSamplingModal();
      if (samplingModalTitle) samplingModalTitle.textContent = info.title;
      samplingModalOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      if (seModalLegendEl) seModalLegendEl.style.display = '';

      buildModalSideLegend(srcError.config.data.datasets);

      var cL = window.SharedChartLegend;
      var hasDeriv = !!srcDeriv;
      var derivWrap = samplingModalCanvasDeriv && samplingModalCanvasDeriv.parentNode;
      if (derivWrap) derivWrap.style.display = hasDeriv ? '' : 'none';

      var srcErrorScales = srcError.config.options.scales || {};
      var srcErrorY = srcErrorScales.y || {};

      var errorOpts = cL ? cL.buildChartOptions({
        responsive: true, maintainAspectRatio: false,
        layoutPadding: hasDeriv ? { bottom: 0 } : undefined,
        scales: {
          x: buildSampleSizeXScale(hasDeriv ? '' : 'N', hasDeriv),
          y: cL.buildLinearScale(
            srcErrorY.title && srcErrorY.title.text || 'SE',
            Number.isFinite(srcErrorY.min) ? srcErrorY.min : 0,
            Number.isFinite(srcErrorY.max) ? srcErrorY.max : undefined
          ),
        },
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
      }) : {
        responsive: true, maintainAspectRatio: false,
        layout: hasDeriv ? { padding: { top: 3, right: 8, left: 6, bottom: 0 } } : undefined,
        scales: {
          x: buildSampleSizeXScale(hasDeriv ? '' : 'N', hasDeriv),
          y: { min: 0 },
        },
      };
      samplingModalChart = new Chart(samplingModalCanvas.getContext('2d'), buildModalChartConfig(srcError, errorOpts));
      if (window.SharedChartInteractions) {
        window.SharedChartInteractions.attach({
          canvas: samplingModalCanvas,
          getChart: function () { return samplingModalChart; },
          defaults: { xMin: 1, xMax: 15, yMin: 0 }
        });
      }

      if (hasDeriv && samplingModalCanvasDeriv) {
        var srcDerivScales = srcDeriv.config.options.scales || {};
        var srcDerivY = srcDerivScales.y || {};
        var derivOpts = cL ? cL.buildChartOptions({
          responsive: true, maintainAspectRatio: false,
          layoutPadding: { top: 0 },
          scales: {
            x: buildSampleSizeXScale('N'),
            y: cL.buildLinearScale(
              srcDerivY.title && srcDerivY.title.text || '\u0394SE / \u0394N',
              Number.isFinite(srcDerivY.min) ? srcDerivY.min : undefined,
              Number.isFinite(srcDerivY.max) ? srcDerivY.max : 0
            ),
          },
          plugins: {
            legend: { display: false },
            title: { display: false },
          },
        }) : {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 0, right: 8, left: 6, bottom: 3 } },
          scales: { x: buildSampleSizeXScale('N'), y: { max: 0 } },
          plugins: { legend: { display: false } },
        };
        samplingModalChartDeriv = new Chart(samplingModalCanvasDeriv.getContext('2d'), buildModalChartConfig(srcDeriv, derivOpts));
        if (window.SharedChartInteractions) {
          window.SharedChartInteractions.attach({
            canvas: samplingModalCanvasDeriv,
            getChart: function () { return samplingModalChartDeriv; },
            defaults: { xMin: 1, xMax: 15 }
          });
        }
        syncChartAreas(samplingModalChart, samplingModalChartDeriv);
      }
    });
  });

  // ── Sim-start event ──

  document.addEventListener('standardizing-comparisons:sim-start', function (e) {
    resultsCache = null;
    destroySamplingChart('bs');
    destroySamplingChart('mc');
    destroySamplingChart('avgBs');
    destroySamplingChart('avgMc');
    destroyAllSamplingErrorCharts();
    ['sampling-exceedance-block',
     'sampling-avg-block',
     'sampling-error-block'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    runSamplingComputation(e.detail).then(() => {
      renderSamplingErrorCharts(e.detail);
    });
  });
});
