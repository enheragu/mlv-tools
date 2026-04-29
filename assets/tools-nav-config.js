(function () {
  var baseConfig = {
    showBackButton: true,
    homePath: '/mlv-tools/',
    currentPath: '/mlv-tools/',
    preserveLangParam: true,
    backLabel: { en: 'Back to landing', es: 'Volver al inicio' },
    menuSections: [
      {
        items: [
          { href: '/mlv-tools/', label: { en: 'Main page', es: 'Página principal' } }
        ]
      },
      {
        title: { en: 'ML variance analysis', es: 'Análisis de varianza ML' },
        items: [
          { href: '/mlv-tools/model-inspector/', label: { en: 'Model & Data Inspector', es: 'Inspector de Modelos y Datos' } },
          { href: '/mlv-tools/replication-and-comparison/', label: { en: 'Replication and Comparison', es: 'Replication and Comparison' } },
          { href: '/mlv-tools/ablation-tests/', label: { en: 'Ablation Tests', es: 'Ablation Tests' } },
          { href: '/mlv-tools/standardizing-comparisons/', label: { en: 'Standardizing Comparisons', es: 'Standardizing Comparisons' } }
        ]
      }
    ]
  };

  var pageConfig = window.StatToolsNavPageConfig || {};
  var resolved = Object.assign({}, baseConfig, pageConfig);

  if (!Object.prototype.hasOwnProperty.call(pageConfig, 'menuSections')) {
    resolved.menuSections = baseConfig.menuSections;
  }

  if (!Object.prototype.hasOwnProperty.call(pageConfig, 'backLabel')) {
    resolved.backLabel = baseConfig.backLabel;
  }

  window.ToolsNavConfig = resolved;
})();
