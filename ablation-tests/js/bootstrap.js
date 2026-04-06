(function () {
  if (window.AblationTestsApp) return;

  function boot() {
    if (!window.StatMlvaComparisonCore || !window.AblationTestsToolConfig || !window.AblationTestsI18n) {
      console.error('[AblationTests] Missing shared dependencies.');
      return;
    }

    window.StatMlvaComparisonCore.init({
      toolConfig: window.AblationTestsToolConfig,
      i18nApi: window.AblationTestsI18n,
      chartMode: 'histogram',
      resultsMode: 'ablation',
      appNamespace: 'AblationTestsApp',
      toolTitle: 'Ablation Tests',
      toolId: 'AblationTests',
      fallbackLang: 'en',
      onRenderChart: function (snapshot) {
        document.dispatchEvent(new CustomEvent('ablation-tests:data-update', { detail: snapshot }));
      },
    });
  }

  boot();
})();
