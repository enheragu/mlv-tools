// Seed Percentile Grid for ablation-tests
// Shows mini-histograms per condition with a shared seed slider.
// A vertical line marks the selected seed's metric value and its percentile.

(function () {
  'use strict';

  var seedCharts = {};
  var seedList = [];     // ordered unique seed values (strings)
  var lastSnapshot = null;

  function destroyChart(key) {
    if (seedCharts[key]) {
      var canvas = seedCharts[key].canvas;
      if (canvas && window.SharedChartInteractions) window.SharedChartInteractions.detach(canvas);
      seedCharts[key].destroy();
      seedCharts[key] = null;
    }
  }

  function destroyAll() {
    Object.keys(seedCharts).forEach(destroyChart);
    seedCharts = {};
  }

  function getI18n() {
    if (window.AblationTestsI18n && typeof window.AblationTestsI18n.getCopy === 'function') {
      return window.AblationTestsI18n.getCopy(window.AblationTestsI18n.getLang());
    }
    return {};
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Compute histogram bins for an array of values
  function computeHistogram(values, nBins) {
    if (!values.length) return { bins: [], edges: [] };
    nBins = nBins || 12;
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    if (min === max) { min -= 0.5; max += 0.5; }
    var step = (max - min) / nBins;
    var bins = new Array(nBins).fill(0);
    var edges = [];
    for (var i = 0; i <= nBins; i++) edges.push(+(min + i * step).toFixed(6));
    values.forEach(function (v) {
      var idx = Math.floor((v - min) / step);
      if (idx >= nBins) idx = nBins - 1;
      if (idx < 0) idx = 0;
      bins[idx]++;
    });
    return { bins: bins, edges: edges };
  }

  // Compute percentile rank of value in sorted array
  function percentileOf(sorted, value) {
    var count = 0;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i] < value) count++;
      else if (sorted[i] === value) count += 0.5;
    }
    return (count / sorted.length) * 100;
  }

  // Vertical line annotation plugin for Chart.js
  var verticalLinePlugin = {
    id: 'seedVerticalLine',
    afterDraw: function (chart) {
      var meta = chart.options.plugins.seedVerticalLine;
      if (!meta || meta.value == null) return;
      var xScale = chart.scales.x;
      if (!xScale) return;
      var xPixel = xScale.getPixelForValue(meta.value);
      var yScale = chart.scales.y;
      var ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xPixel, yScale.top);
      ctx.lineTo(xPixel, yScale.bottom);
      ctx.strokeStyle = meta.color || '#f97583';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      if (meta.label) {
        ctx.fillStyle = meta.color || '#f97583';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(meta.label, xPixel, yScale.top - 4);
      }
      ctx.restore();
    }
  };

  // Register plugin once
  if (window.Chart && !Chart.registry.plugins.get('seedVerticalLine')) {
    Chart.register(verticalLinePlugin);
  }

  function renderSeedPercentileGrid(snapshot) {
    var seedDataByModel = snapshot.seedDataByModel;
    var block = document.getElementById('seed-percentile-block');
    var container = document.getElementById('seed-percentile-container');
    var slider = document.getElementById('seed-index-slider');
    var sliderLabel = document.getElementById('seed-index-label-value');
    var seedIdLabel = document.getElementById('seed-id-value');
    if (!block || !container) return;

    // Apply i18n
    var copy = getI18n();
    var titleEl = document.getElementById('seed-percentile-title');
    var noteEl = document.getElementById('seed-percentile-note');
    if (titleEl && copy.seedPercentileTitle) titleEl.textContent = copy.seedPercentileTitle;
    var sliderLabelText = document.getElementById('seed-index-label-text');
    if (sliderLabelText && copy.seedSliderLabel) sliderLabelText.textContent = copy.seedSliderLabel;
    var sliderRow = block.querySelector('.plot-range-controls');

    // Show no-seed message for presets without seed tracking (e.g. detection)
    if (!seedDataByModel || !Object.keys(seedDataByModel).length) {
      destroyAll();
      container.innerHTML = '';
      if (noteEl) noteEl.textContent = copy.seedNoSeedNote || 'Seed data is not available for this preset.';
      if (sliderRow) sliderRow.classList.add('hidden');
      block.classList.remove('hidden');
      // Ensure results section is visible
      var rS = document.getElementById('results-section');
      var rB = document.getElementById('results-output-block');
      if (rS) rS.classList.remove('hidden');
      if (rB) rB.classList.remove('hidden');
      return;
    }

    if (noteEl && copy.seedPercentileNote) noteEl.textContent = copy.seedPercentileNote;
    if (sliderRow) sliderRow.classList.remove('hidden');

    lastSnapshot = snapshot;
    destroyAll();
    container.innerHTML = '';

    var selected = snapshot.selected || [];
    var displayByModel = snapshot.displayByModel || {};

    // Build unique seed list from first model that has data
    seedList = [];
    var seedSet = {};
    for (var i = 0; i < selected.length; i++) {
      var entries = seedDataByModel[selected[i]];
      if (!entries || !entries.length) continue;
      entries.forEach(function (e) {
        if (!seedSet[e.seed]) {
          seedSet[e.seed] = true;
          seedList.push(e.seed);
        }
      });
      break; // all models share the same seed set
    }

    if (!seedList.length) {
      block.classList.add('hidden');
      return;
    }

    // Setup slider
    if (slider) {
      slider.min = '1';
      slider.max = String(seedList.length);
      slider.value = '1';
    }
    if (sliderLabel) sliderLabel.textContent = '1';
    if (seedIdLabel) seedIdLabel.textContent = seedList[0];

    // Create mini-chart per selected model
    var cL = window.SharedChartLegend;

    selected.forEach(function (model, mi) {
      var entries = seedDataByModel[model];
      if (!entries || !entries.length) return;

      var values = entries.map(function (e) { return e.value; });
      var sorted = values.slice().sort(function (a, b) { return a - b; });
      var hist = computeHistogram(values, 12);

      // Bar labels = bin center
      var labels = [];
      for (var b = 0; b < hist.bins.length; b++) {
        labels.push(+((hist.edges[b] + hist.edges[b + 1]) / 2).toFixed(3));
      }

      var canvasId = 'seed-percentile-chart-' + mi;
      var pctBadgeId = 'seed-pct-badge-' + mi;
      var wrap = document.createElement('section');
      wrap.className = 'panel panel-chart card shared-plot-card seed-percentile-mini';
      var displayName = displayByModel[model] || model;
      wrap.innerHTML =
        '<div class="card-headline shared-plot-headline">' +
        '<h3 class="shared-plot-title shared-plot-title--sm">' + escapeHtml(displayName) + '</h3>' +
        '<span id="' + pctBadgeId + '" class="seed-pct-badge"></span>' +
        '</div>' +
        '<div class="chart-wrap chart-wrap--mini"><canvas id="' + canvasId + '" class="shared-plot-canvas"></canvas></div>';
      container.appendChild(wrap);

      var canvas = document.getElementById(canvasId);
      if (!canvas) return;

      var color = (snapshot.colorByModel || {})[model] || '#58a6ff';

      // Initial seed value and percentile
      var seedIdx = 0;
      var seedEntry = entries.find(function (e) { return e.seed === seedList[seedIdx]; });
      var seedValue = seedEntry ? seedEntry.value : null;
      var pctile = seedValue !== null ? percentileOf(sorted, seedValue) : null;

      var options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: cL ? cL.buildLinearScale('', hist.edges[0], hist.edges[hist.edges.length - 1]) : {
            type: 'linear',
            min: hist.edges[0],
            max: hist.edges[hist.edges.length - 1],
            ticks: { font: { size: 9 } }
          },
          y: { display: false }
        },
        plugins: {
          legend: { display: false },
          title: { display: false },
          seedVerticalLine: {
            value: seedValue,
            color: '#f97583',
            label: pctile !== null ? 'P' + Math.round(pctile) : ''
          }
        }
      };
      if (cL && cL.buildChartOptions) options = cL.buildChartOptions(options);

      seedCharts[canvasId] = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data: hist.bins,
            backgroundColor: color + '66',
            borderColor: color,
            borderWidth: 1,
            barPercentage: 1.0,
            categoryPercentage: 1.0,
          }]
        },
        options: options
      });

      // Set initial badge
      var badge = document.getElementById(pctBadgeId);
      if (badge && pctile !== null) {
        badge.textContent = 'P' + Math.round(pctile);
        badge.style.color = '#f97583';
      }

      // Store metadata for slider updates
      canvas._seedMeta = {
        entries: entries,
        sorted: sorted,
        badgeId: pctBadgeId,
        hist: hist
      };
    });

    block.classList.remove('hidden');
    // Ensure results section is visible
    var resultsSection = document.getElementById('results-section');
    var resultsBlock = document.getElementById('results-output-block');
    if (resultsSection) resultsSection.classList.remove('hidden');
    if (resultsBlock) resultsBlock.classList.remove('hidden');
  }

  // Update vertical lines when slider moves
  function updateSeedIndex(idx) {
    if (idx < 0 || idx >= seedList.length) return;
    var seed = seedList[idx];
    var seedIdLabel = document.getElementById('seed-id-value');
    if (seedIdLabel) seedIdLabel.textContent = seed;

    Object.keys(seedCharts).forEach(function (canvasId) {
      var chart = seedCharts[canvasId];
      if (!chart) return;
      var canvas = chart.canvas;
      var meta = canvas._seedMeta;
      if (!meta) return;

      var entry = meta.entries.find(function (e) { return e.seed === seed; });
      var value = entry ? entry.value : null;
      var pctile = value !== null ? percentileOf(meta.sorted, value) : null;

      // Update badge in title area
      if (meta.badgeId) {
        var badge = document.getElementById(meta.badgeId);
        if (badge) {
          badge.textContent = pctile !== null ? 'P' + Math.round(pctile) : '';
        }
      }

      chart.options.plugins.seedVerticalLine = {
        value: value,
        color: '#f97583',
        label: pctile !== null ? 'P' + Math.round(pctile) : ''
      };
      chart.update('none');
    });
  }

  // Wire slider
  document.addEventListener('DOMContentLoaded', function () {
    var slider = document.getElementById('seed-index-slider');
    var label = document.getElementById('seed-index-label-value');
    if (slider) {
      slider.addEventListener('input', function () {
        var idx = parseInt(slider.value, 10) - 1;
        if (label) label.textContent = String(idx + 1);
        updateSeedIndex(idx);
      });
    }
  });

  // Listen for data updates
  document.addEventListener('ablation-tests:data-update', function (e) {
    renderSeedPercentileGrid(e.detail);
  });
})();
