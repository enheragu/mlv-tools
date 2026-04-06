(function () {
  if (window.StandardizingComparisonsApp) return;

  function boot() {
    if (!window.StatMlvaComparisonCore || !window.StandardizingComparisonsToolConfig || !window.StandardizingComparisonsI18n) {
      console.error('[StandardizingComparisons] Missing shared dependencies.');
      return;
    }

    window.StatMlvaComparisonCore.init({
      toolConfig: window.StandardizingComparisonsToolConfig,
      i18nApi: window.StandardizingComparisonsI18n,
      chartMode: 'placeholder',
      appNamespace: 'StandardizingComparisonsApp',
      toolTitle: 'Standardizing Comparisons',
      toolId: 'StandardizingComparisons',
      fallbackLang: 'en',
      onRenderChart: function (snapshot) {
        document.dispatchEvent(new CustomEvent('standardizing-comparisons:data-update', { detail: snapshot }));
      },
      onSimulationStart: function (snapshot) {
        document.dispatchEvent(new CustomEvent('standardizing-comparisons:sim-start', { detail: snapshot }));
      },
    });
  }

  boot();
})();
