(function () {
  if (window.StatMlvaComparisonI18nCore) return;

  var base = {
    en: {
      pageTitle: 'ML Variance Analysis - ML Variance Analysis Tools',
      subtitle: 'Compare models under repeated runs',
      introTitle: 'Variance-aware comparison workspace',
      introText: 'Analyze repeated-run metrics and compare models under uncertainty.',
      caseContextMnist: 'MNIST case uses repeated-run metrics generated externally.',
      caseContextDetection: 'Detection case uses multispectral fusion pipelines from a dedicated utility repository.',
      configTitle: 'Data setup',
      presetLabel: 'Use-case preset',
      metricLabel: 'Metric',
      modelsLabel: 'Models',
      clearAll: 'Clear',
      selectAll: 'Select all',
      chartTitle: 'Histogram + fitted normal',
      expand: 'Expand',
      close: 'Close',
      normalLegendLabel: 'Fitted normal (dotted line)',
      resultsTitle: 'Results',
      prechecksTitle: 'Normality test',
      officialResultsTitle: 'Results',
      resultsIntro: 'Two complementary methods are used: Monte Carlo assumes the data follows a normal distribution (parametric), while Bootstrap resamples directly from the observed data (non-parametric). The normality check below helps decide how much to trust Monte Carlo \u2014 if normality is weak, rely on Bootstrap as the robust reference.',
      simConfigTitle: 'Simulation setup',
      simConfigText: 'Monte Carlo draws synthetic replicates from a fitted Gaussian, making it efficient and interpretable when normality holds. Bootstrap resamples with replacement from the real observations, so it remains valid regardless of the underlying distribution. Reporting both lets you assess sensitivity to parametric assumptions.',
      mcTrialsLabel: 'Monte Carlo simulations',
      bsTrialsLabel: 'Bootstrap resamples',
      runSim: 'Compute results',
      thSamples: 'N samples/model',
      thStartValue: 'Start',
      thPWrongGroup: 'p(!correct order)',
      thPReachBestGroup: 'p(reach global best)',
      thMonteCarlo: 'Monte Carlo',
      thBootstrap: 'Bootstrap',
      thModel: 'Model',
      thMedian: 'Median',
      thMean2: 'Mean',
      thSkewness: 'Skewness',
      thKurtosis: 'Kurtosis (Fisher)',
      thShapiroGroup: 'Shapiro-Wilk',
      thShapiroW: 'W',
      thShapiroP: 'p-value (%)',
      thModelN: 'N',
      modelSummaryTitle: 'Model Summary',
      modelSummarySortHint: 'Click to sort',
      thBestValue: 'Best value',
      thStdDev: 'Std. dev.',
      thNormP90: 'Normal P90',
      resultsMethodNote: 'MC and BS trials are configured above.',
      normalityNote: 'Normality is assessed qualitatively (skewness, kurtosis, mean\u2013median gap) and quantitatively (Shapiro-Wilk test). The Shapiro-Wilk p-value tests the null hypothesis that the data come from a strict normal distribution: a low p-value (&lt;5%) rejects that hypothesis, but the test is very sensitive and flags even minor deviations without measuring effect size. If skewness and kurtosis remain moderate and mean \u2248 median, the data can still be considered reasonably normal for simulation purposes. In the paper, Bootstrap and Monte Carlo conclusions are consistent, confirming that the normality assumption does not materially affect the results \\cite{heredia2026variance_analysis_ml}.',
      resultsSummary: 'Selected conditions: {count}. Trials: Monte Carlo={mcTrials}, Bootstrap={bsTrials}.',
      simComputing: 'Computing...',
      simApiUnavailable: 'Python API unavailable. Start local API to compute probability tables.',
      simDone: 'Results updated.',
      reportProblem: 'Report problem',
      noData: 'No data available for this selection.',
      notEnoughModels: 'Select at least two models to compute p(!correct order).',
      presetMnist: 'Image Classification - MNIST',
      presetDetection: 'Image Detection - Multispectral Images',
      metricAccuracy: 'Accuracy',
      metricMap50: 'mAP50',
      metricMap5095: 'mAP50-95',
      metricP: 'Precision (P)',
      metricR: 'Recall (R)',
      metricAblationAccuracy: 'Ablation Accuracy',
      metricAblationMap50: 'Ablation mAP50',
      metricAblationMap5095: 'Ablation mAP50-95',
      metricAblationP: 'Ablation Precision (P)',
      metricAblationR: 'Ablation Recall (R)'
    },
    es: {
      pageTitle: 'ML Variance Analysis - ML Variance Analysis Tools',
      subtitle: 'Compara modelos bajo ejecuciones repetidas',
      introTitle: 'Espacio de comparaci\u00f3n con varianza',
      introText: 'Analiza m\u00e9tricas repetidas y compara modelos bajo incertidumbre.',
      caseContextMnist: 'El caso MNIST usa m\u00e9tricas de ejecuciones repetidas generadas externamente.',
      caseContextDetection: 'El caso de detecci\u00f3n usa pipelines de fusi\u00f3n multiespectral desde un repositorio dedicado.',
      configTitle: 'Configuraci\u00f3n',
      presetLabel: 'Preset de caso de uso',
      metricLabel: 'M\u00e9trica',
      modelsLabel: 'Modelos',
      clearAll: 'Limpiar',
      selectAll: 'Seleccionar todo',
      chartTitle: 'Histograma + normal ajustada',
      expand: 'Ampliar',
      close: 'Cerrar',
      normalLegendLabel: 'Normal ajustada (l\u00ednea punteada)',
      resultsTitle: 'Resultados',
      prechecksTitle: 'Test de normalidad',
      officialResultsTitle: 'Resultados',
      resultsIntro: 'Se usan dos m\u00e9todos complementarios: Monte Carlo asume que los datos siguen una distribuci\u00f3n normal (param\u00e9trico), mientras que Bootstrap remuestrea directamente los datos observados (no param\u00e9trico). El test de normalidad de abajo ayuda a decidir cu\u00e1nto confiar en Monte Carlo \u2014 si la normalidad es d\u00e9bil, Bootstrap es la referencia robusta.',
      simConfigTitle: 'Configuraci\u00f3n de simulaci\u00f3n',
      simConfigText: 'Monte Carlo genera r\u00e9plicas sint\u00e9ticas a partir de una Gaussiana ajustada, siendo eficiente e interpretable cuando se cumple la normalidad. Bootstrap remuestrea con reemplazo de las observaciones reales, por lo que es v\u00e1lido independientemente de la distribuci\u00f3n subyacente. Reportar ambos permite evaluar la sensibilidad a los supuestos param\u00e9tricos.',
      mcTrialsLabel: 'Simulaciones Monte Carlo',
      bsTrialsLabel: 'Remuestreos Bootstrap',
      runSim: 'Calcular resultados',
      thSamples: 'N muestras/modelo',
      thStartValue: 'Inicio',
      thPWrongGroup: 'p(!orden correcto)',
      thPReachBestGroup: 'p(llegar al mejor global)',
      thMonteCarlo: 'Monte Carlo',
      thBootstrap: 'Bootstrap',
      thModel: 'Modelo',
      thMedian: 'Mediana',
      thMean2: 'Media',
      thSkewness: 'Asimetr\u00eda',
      thKurtosis: 'Curtosis (Fisher)',
      thShapiroGroup: 'Shapiro-Wilk',
      thShapiroW: 'W',
      thShapiroP: 'p-valor (%)',
      thModelN: 'N',
      modelSummaryTitle: 'Resumen de modelos',
      modelSummarySortHint: 'Haz clic para ordenar',
      thBestValue: 'Mejor valor',
      thStdDev: 'Desv. est.',
      thNormP90: 'P90 normal',
      resultsMethodNote: 'Configura arriba las iteraciones MC y BS.',
      normalityNote: 'La normalidad se eval\u00faa cualitativamente (asimetr\u00eda, curtosis, diferencia media\u2013mediana) y cuantitativamente (test de Shapiro-Wilk). El p-valor de Shapiro-Wilk contrasta la hip\u00f3tesis nula de que los datos proceden de una normal estricta: un p-valor bajo (&lt;5%) la rechaza, pero el test es muy sensible y se\u00f1ala incluso desviaciones menores sin medir el tama\u00f1o del efecto. Si la asimetr\u00eda y la curtosis se mantienen moderadas y media \u2248 mediana, los datos pueden considerarse razonablemente normales para las simulaciones. En el art\u00edculo, las conclusiones de Bootstrap y Monte Carlo son consistentes, confirmando que la asunci\u00f3n de normalidad no afecta materialmente a los resultados \\cite{heredia2026variance_analysis_ml}.',
      resultsSummary: 'Condiciones seleccionadas: {count}. Iteraciones: Monte Carlo={mcTrials}, Bootstrap={bsTrials}.',
      simComputing: 'Calculando...',
      simApiUnavailable: 'API de Python no disponible. Inicia la API local para calcular tablas de probabilidad.',
      simDone: 'Resultados actualizados.',
      reportProblem: 'Reportar problema',
      noData: 'No hay datos disponibles para esta selecci\u00f3n.',
      notEnoughModels: 'Selecciona al menos dos modelos para calcular p(!orden correcto).',
      presetMnist: 'Clasificaci\u00f3n de im\u00e1genes - MNIST',
      presetDetection: 'Detecci\u00f3n de im\u00e1genes - Multiespectral',
      metricAccuracy: 'Accuracy',
      metricMap50: 'mAP50',
      metricMap5095: 'mAP50-95',
      metricP: 'Precision (P)',
      metricR: 'Recall (R)',
      metricAblationAccuracy: 'Ablation Accuracy',
      metricAblationMap50: 'Ablation mAP50',
      metricAblationMap5095: 'Ablation mAP50-95',
      metricAblationP: 'Ablation Precision (P)',
      metricAblationR: 'Ablation Recall (R)'
    }
  };

  function mergeLang(baseLang, overrideLang) {
    var out = {};
    Object.keys(baseLang).forEach(function (k) { out[k] = baseLang[k]; });
    Object.keys(overrideLang || {}).forEach(function (k) { out[k] = overrideLang[k]; });
    return out;
  }

  function create(options) {
    var opts = options || {};
    var overrides = opts.overrides || {};
    var translations = {
      en: mergeLang(base.en, overrides.en || {}),
      es: mergeLang(base.es, overrides.es || {})
    };

    var initialLang = window.SharedUiCore ? window.SharedUiCore.readLangFromUrl('en') : 'en';
    var api = window.SharedI18nCore
      ? window.SharedI18nCore.createI18n(translations, { initialLang: initialLang, fallbackLang: 'en' })
      : {
          getCopy: function (lang) { return translations[lang === 'es' ? 'es' : 'en']; },
          getLang: function () { return initialLang; },
          setLang: function (lang) { initialLang = lang === 'es' ? 'es' : 'en'; return initialLang; },
        };

    return {
      getCopy: api.getCopy,
      getLang: api.getLang,
      setLang: api.setLang,
    };
  }

  window.StatMlvaComparisonI18nCore = {
    create: create,
  };
})();
