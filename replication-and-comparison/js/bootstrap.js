(function () {
  if (window.ReplicationComparisonApp) return;

  function boot() {
    if (!window.StatMlvaComparisonCore || !window.ReplicationComparisonToolConfig || !window.ReplicationComparisonI18n) {
      console.error('[ReplicationComparison] Missing shared dependencies.');
      return;
    }

    window.StatMlvaComparisonCore.init({
      toolConfig: window.ReplicationComparisonToolConfig,
      i18nApi: window.ReplicationComparisonI18n,
      chartMode: 'histogram',
      appNamespace: 'ReplicationComparisonApp',
      toolTitle: 'Replication and Comparison',
      toolId: 'ReplicationAndComparison',
      fallbackLang: 'en',
    });
  }

  boot();
})();
