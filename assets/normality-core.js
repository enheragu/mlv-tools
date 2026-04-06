(function () {
  if (window.StatMlvaNormalityCore) return;

  function median(values) {
    if (!Array.isArray(values) || !values.length) return NaN;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
  }

  function sampleSkewness(values, m, s) {
    var n = Array.isArray(values) ? values.length : 0;
    if (n < 3 || !Number.isFinite(s) || s <= 0) return 0;
    var acc = 0;
    for (var i = 0; i < n; i += 1) {
      var z = (values[i] - m) / s;
      acc += z * z * z;
    }
    return (n / ((n - 1) * (n - 2))) * acc;
  }

  function sampleKurtosisFisher(values, m, s) {
    var n = Array.isArray(values) ? values.length : 0;
    if (n < 4 || !Number.isFinite(s) || s <= 0) return 0;
    var acc4 = 0;
    for (var i = 0; i < n; i += 1) {
      var z = (values[i] - m) / s;
      acc4 += z * z * z * z;
    }
    var term1 = (n * (n + 1) * acc4) / ((n - 1) * (n - 2) * (n - 3));
    var term2 = (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
    return term1 - term2;
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Normality indicator: returns { cls, label }
  // cls: 'normality-ok' (green), 'normality-warn' (orange), 'normality-fail' (red)
  function locIndicator(mean, med, std) {
    if (!Number.isFinite(mean) || !Number.isFinite(med) || !Number.isFinite(std) || std <= 0) {
      return { cls: 'normality-na', label: '\u2014' };
    }
    var ratio = Math.abs(mean - med) / std;
    if (ratio < 0.1) return { cls: 'normality-ok', label: '\u2713' };
    if (ratio < 0.3) return { cls: 'normality-warn', label: '\u2248' };
    return { cls: 'normality-fail', label: '\u2717' };
  }

  function shapeIndicator(skew, kurt) {
    if (!Number.isFinite(skew) || !Number.isFinite(kurt)) {
      return { cls: 'normality-na', label: '\u2014' };
    }
    var absSkew = Math.abs(skew);
    var absKurt = Math.abs(kurt);
    if (absSkew < 0.5 && absKurt < 1) return { cls: 'normality-ok', label: '\u2713' };
    if (absSkew < 1 && absKurt < 2) return { cls: 'normality-warn', label: '\u2248' };
    return { cls: 'normality-fail', label: '\u2717' };
  }

  function swIndicator(shapiroP) {
    if (!Number.isFinite(shapiroP)) return { cls: 'normality-na', label: '\u2014' };
    // shapiroP is in [0,1] range (proportion); compare as percentage
    var pPct = shapiroP * 100;
    if (pPct > 5) return { cls: 'normality-ok', label: '\u2713' };
    if (pPct > 1) return { cls: 'normality-warn', label: '\u2248' };
    return { cls: 'normality-fail', label: '\u2717' };
  }

  function indicatorCell(ind) {
    return '<td class="shared-cell-num normality-indicator ' + ind.cls + '">' + ind.label + '</td>';
  }

  function renderTable(options) {
    var tbody = options && options.tbody ? options.tbody : null;
    if (!tbody) return 0;

    var selectedModels = Array.isArray(options.selectedModels) ? options.selectedModels : [];
    var dataByModel = options.dataByModel || {};
    var statsByModel = options.statsByModel || {};
    var displayNameByModel = options.displayNameByModel || {};
    var colorByModel = options.colorByModel || {};
    var formatMetric = typeof options.formatMetric === 'function'
      ? options.formatMetric
      : function (value) { return Number(value).toFixed(4); };

    if (!selectedModels.length) {
      tbody.innerHTML = '';
      return 0;
    }

    var rowsByModel = {};
    if (Array.isArray(options.normalityRows)) {
      options.normalityRows.forEach(function (row) {
        if (row && row.model) rowsByModel[row.model] = row;
      });
    }

    var medianFn = typeof options.medianFn === 'function' ? options.medianFn : median;
    var skewnessFn = typeof options.skewnessFn === 'function' ? options.skewnessFn : sampleSkewness;
    var kurtosisFn = typeof options.kurtosisFn === 'function' ? options.kurtosisFn : sampleKurtosisFisher;

    var rows = selectedModels.map(function (model) {
      var vals = Array.isArray(dataByModel[model]) ? dataByModel[model] : [];
      var st = statsByModel[model] || {};
      var n = Number.isFinite(st.n) ? st.n : vals.length;
      var mean = Number.isFinite(st.mean) ? st.mean : NaN;
      var std = Number.isFinite(st.std) ? st.std : NaN;
      var med = medianFn(vals);
      var skew = skewnessFn(vals, mean, std);
      var kurt = kurtosisFn(vals, mean, std);

      var apiRow = rowsByModel[model] || null;
      var shapiroPRaw = apiRow && Number.isFinite(apiRow.shapiro_p) ? Number(apiRow.shapiro_p) : NaN;
      var shapiroW = apiRow && Number.isFinite(apiRow.shapiro_w)
        ? Number(apiRow.shapiro_w).toFixed(4)
        : 'n/a';
      var shapiroP = Number.isFinite(shapiroPRaw)
        ? (shapiroPRaw < 0.0001
            ? shapiroPRaw.toExponential(2)
            : shapiroPRaw.toFixed(4))
        : 'n/a';
      var modelLabel = String(displayNameByModel[model] || model);
      var modelColor = String(colorByModel[model] || '#58a6ff');

      // Summary indicators
      var loc = locIndicator(mean, med, std);
      var shape = shapeIndicator(skew, kurt);
      var sw = swIndicator(shapiroPRaw);

      return '<tr>' +
        '<td class="shared-cell-text">' +
          '<span class="mlva-model-with-swatch">' +
            '<span class="mlva-model-swatch" style="--swatch-color:' + escapeHtml(modelColor) + ';"></span>' +
            '<span>' + escapeHtml(modelLabel) + ' (n=' + n + ')</span>' +
          '</span>' +
        '</td>' +
        '<td class="shared-cell-num">' + formatMetric(med) + '</td>' +
        '<td class="shared-cell-num">' + formatMetric(mean) + '</td>' +
        '<td class="shared-cell-num">' + (Number.isFinite(skew) ? skew.toFixed(4) : 'n/a') + '</td>' +
        '<td class="shared-cell-num">' + (Number.isFinite(kurt) ? kurt.toFixed(4) : 'n/a') + '</td>' +
        '<td class="shared-cell-num">' + shapiroW + '</td>' +
        '<td class="shared-cell-num">' + shapiroP + '</td>' +
        indicatorCell(loc) +
        indicatorCell(shape) +
        indicatorCell(sw) +
      '</tr>';
    });

    tbody.innerHTML = rows.join('');
    return rows.length;
  }

  window.StatMlvaNormalityCore = {
    renderTable: renderTable,
  };
})();
