// ANOVA Interaction Plot for ablation-tests
// Shows mean metric per factor level, with lines grouped by the other factor.
// Non-parallel lines indicate significant interaction effects.

(function () {
  'use strict';

  var interactionCharts = {};
  var modalChart = null;

  function destroyChart(key) {
    if (interactionCharts[key]) {
      var canvas = interactionCharts[key].canvas;
      if (canvas && window.SharedChartInteractions) window.SharedChartInteractions.detach(canvas);
      interactionCharts[key].destroy();
      interactionCharts[key] = null;
    }
  }

  function destroyAll() {
    Object.keys(interactionCharts).forEach(destroyChart);
    interactionCharts = {};
  }

  // Get i18n copy
  function getI18n() {
    if (window.AblationTestsI18n && typeof window.AblationTestsI18n.getCopy === 'function') {
      return window.AblationTestsI18n.getCopy(window.AblationTestsI18n.getLang());
    }
    return {};
  }

  // Build interaction data: for factors [A, B], compute mean(metric) for each (A_level, B_level)
  function buildInteractionData(snapshot) {
    var conditionMeta = snapshot.conditionMeta;
    if (!conditionMeta || !conditionMeta.factor_order || conditionMeta.factor_order.length < 2) return [];
    var factors = conditionMeta.factor_order;
    var modelFactors = conditionMeta.model_factors || {};
    var dataByModel = snapshot.dataByModel || {};
    var selected = snapshot.selected || [];

    // Collect all unique values per factor
    var factorLevels = {};
    factors.forEach(function (f) { factorLevels[f] = []; });

    selected.forEach(function (model) {
      var mf = modelFactors[model];
      if (!mf) return;
      factors.forEach(function (f) {
        var val = String(mf[f] || '');
        if (val && factorLevels[f].indexOf(val) === -1) factorLevels[f].push(val);
      });
    });

    // Sort factor levels (numeric-aware)
    factors.forEach(function (f) {
      factorLevels[f].sort(function (a, b) {
        var na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });
    });

    // Compute mean per (factor_i_level, factor_j_level) combination
    // For each pair of factors, create a plot
    var plots = [];
    for (var i = 0; i < factors.length; i++) {
      for (var j = 0; j < factors.length; j++) {
        if (i === j) continue;
        var xFactor = factors[i]; // X axis
        var lineFactor = factors[j]; // One line per level of this factor
        var xLevels = factorLevels[xFactor];
        var lineLevels = factorLevels[lineFactor];

        // Group data: meanGrid[lineLevel][xLevel] = mean
        var meanGrid = {};
        var countGrid = {};
        lineLevels.forEach(function (ll) {
          meanGrid[ll] = {};
          countGrid[ll] = {};
          xLevels.forEach(function (xl) {
            meanGrid[ll][xl] = 0;
            countGrid[ll][xl] = 0;
          });
        });

        selected.forEach(function (model) {
          var mf = modelFactors[model];
          if (!mf) return;
          var xVal = String(mf[xFactor] || '');
          var lineVal = String(mf[lineFactor] || '');
          if (!xVal || !lineVal) return;
          var data = dataByModel[model];
          if (!Array.isArray(data) || !data.length) return;
          var mean = data.reduce(function (a, b) { return a + b; }, 0) / data.length;
          if (meanGrid[lineVal] && meanGrid[lineVal].hasOwnProperty(xVal)) {
            meanGrid[lineVal][xVal] += mean;
            countGrid[lineVal][xVal] += 1;
          }
        });

        // Finalize means
        lineLevels.forEach(function (ll) {
          xLevels.forEach(function (xl) {
            var c = countGrid[ll][xl];
            meanGrid[ll][xl] = c > 0 ? meanGrid[ll][xl] / c : null;
          });
        });

        plots.push({
          xFactor: xFactor,
          lineFactor: lineFactor,
          xLevels: xLevels,
          lineLevels: lineLevels,
          meanGrid: meanGrid,
        });
      }
    }
    return plots;
  }

  function renderInteractionPlots(snapshot) {
    var plots = buildInteractionData(snapshot);
    var block = document.getElementById('interaction-plot-block');
    var container = document.getElementById('interaction-plot-container');
    if (!block || !container) return;
    if (!plots.length) {
      block.classList.add('hidden');
      return;
    }

    destroyAll();
    container.innerHTML = '';

    // Apply i18n to section heading
    var copy = getI18n();
    var titleEl = document.getElementById('interaction-plot-title');
    var noteEl = document.getElementById('interaction-plot-note');
    if (titleEl && copy.interactionPlotTitle) titleEl.textContent = copy.interactionPlotTitle;
    if (noteEl && copy.interactionPlotNote) noteEl.textContent = copy.interactionPlotNote;

    var cL = window.SharedChartLegend;
    var palette = (cL && cL.getDataPalette) ? cL.getDataPalette() : null;
    var defaultColors = ['#58a6ff', '#f97583', '#d2a8ff', '#79c0ff', '#56d364', '#e3b341', '#ff7b72', '#bc8cff'];

    plots.forEach(function (plot, pi) {
      var canvasId = 'interaction-chart-' + pi;
      var btnId = 'btn-expand-interaction-' + pi;
      var wrap = document.createElement('section');
      wrap.className = 'panel panel-chart card shared-plot-card';
      wrap.innerHTML =
        '<div class="card-headline shared-plot-headline">' +
        '<h3 class="shared-plot-title">' + escapeHtml(plot.lineFactor) + ' vs ' + escapeHtml(plot.xFactor) + '</h3>' +
        '<button id="' + btnId + '" class="btn-outline btn-chart-expand" type="button">Expand</button>' +
        '</div>' +
        '<div class="chart-wrap"><canvas id="' + canvasId + '" class="shared-plot-canvas"></canvas></div>';
      container.appendChild(wrap);

      var canvas = document.getElementById(canvasId);
      if (!canvas) return;

      var datasets = plot.lineLevels.map(function (ll, li) {
        var color = palette ? palette[li % palette.length] : defaultColors[li % defaultColors.length];
        return {
          label: plot.lineFactor + ' = ' + ll,
          data: plot.xLevels.map(function (xl) {
            var v = plot.meanGrid[ll][xl];
            return v !== null ? +v.toFixed(6) : null;
          }),
          borderColor: color,
          backgroundColor: (window.SharedChartLegend && window.SharedChartLegend.withAlpha) ? window.SharedChartLegend.withAlpha(color, 0.40) : color,
          fill: false,
          tension: 0.15,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        };
      });

      var allVals = datasets.flatMap(function (ds) { return ds.data; }).filter(function (v) { return v !== null && Number.isFinite(v); });
      var yMin = allVals.length ? Math.floor(Math.min.apply(null, allVals) * 1000) / 1000 : 0;
      var yMax = allVals.length ? Math.ceil(Math.max.apply(null, allVals) * 1000) / 1000 : 1;
      var yPadding = (yMax - yMin) * 0.1 || 0.01;
      yMin = +(yMin - yPadding).toFixed(6);
      yMax = +(yMax + yPadding).toFixed(6);

      var options = cL ? cL.buildChartOptions({
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: cL.buildCategoryScale(plot.xFactor),
          y: cL.buildLinearScale('Mean metric', yMin, yMax),
        },
        plugins: {
          legend: cL.createLegendOptions({ position: 'top' }),
          title: { display: false },
        },
      }) : {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: plot.xFactor } },
          y: { title: { display: true, text: 'Mean metric' }, min: yMin, max: yMax },
        },
      };

      interactionCharts[canvasId] = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: plot.xLevels, datasets: datasets },
        options: options
      });

      if (window.SharedChartInteractions) {
        window.SharedChartInteractions.attach({
          canvas: canvas,
          getChart: function () { return interactionCharts[canvasId]; },
          defaults: { yMin: yMin, yMax: yMax, mode: 'y' },
          readonly: true
        });
      }

      // Expand button
      var btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', (function (cid, title) {
          return function () { openInteractionModal(cid, title); };
        })(canvasId, plot.lineFactor + ' vs ' + plot.xFactor));
      }
    });

    block.classList.remove('hidden');
    // Also show results section
    var resultsSection = document.getElementById('results-section');
    var resultsBlock = document.getElementById('results-output-block');
    if (resultsSection) resultsSection.classList.remove('hidden');
    if (resultsBlock) resultsBlock.classList.remove('hidden');
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Modal
  var modalOverlay = null;
  var modalCanvas = null;
  var modalTitle = null;

  function initModal() {
    modalOverlay = document.getElementById('interaction-modal-overlay');
    modalCanvas = document.getElementById('interaction-modal-canvas');
    modalTitle = document.getElementById('interaction-modal-title');
    if (!modalOverlay) return;
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeInteractionModal();
    });
    var closeBtn = document.getElementById('btn-close-interaction-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeInteractionModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalOverlay && !modalOverlay.classList.contains('hidden')) closeInteractionModal();
    });
  }

  function closeInteractionModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    if (modalCanvas && window.SharedChartInteractions) window.SharedChartInteractions.detach(modalCanvas);
    if (modalChart) { modalChart.destroy(); modalChart = null; }
  }

  function openInteractionModal(chartId, title) {
    var srcChart = interactionCharts[chartId];
    if (!srcChart || !modalOverlay || !modalCanvas) return;
    closeInteractionModal();
    if (modalTitle) modalTitle.textContent = title;
    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    var srcConfig = srcChart.config;
    var clonedOptions = JSON.parse(JSON.stringify(srcConfig.options));
    clonedOptions.maintainAspectRatio = false;
    modalChart = new Chart(modalCanvas.getContext('2d'), {
      type: srcConfig.type,
      data: {
        labels: srcConfig.data.labels.slice(),
        datasets: srcConfig.data.datasets.map(function (ds) {
          return Object.assign({}, ds, { data: ds.data.slice() });
        })
      },
      options: clonedOptions
    });
    if (window.SharedChartInteractions) {
      window.SharedChartInteractions.attach({
        canvas: modalCanvas,
        getChart: function () { return modalChart; },
        defaults: { mode: 'y' }
      });
    }
  }

  // Listen for data updates
  document.addEventListener('ablation-tests:data-update', function (e) {
    renderInteractionPlots(e.detail);
  });

  // Init modal on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', initModal);
})();
