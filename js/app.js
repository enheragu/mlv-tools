(function () {
  var tools = [
    {
      key: 'modelInspector',
      section: 'mlv-tools',
      href: '/mlv-tools/model-inspector/',
      imageDark: '/mlv-tools/model-inspector/assets/og-image.svg',
      imageLight: '/mlv-tools/model-inspector/assets/og-image-light.svg'
    },
    {
      key: 'replicationComparison',
      section: 'mlv-tools',
      href: '/mlv-tools/replication-and-comparison/',
      imageDark: '/mlv-tools/replication-and-comparison/assets/og-image.svg',
      imageLight: '/mlv-tools/replication-and-comparison/assets/og-image-light.svg'
    },
    {
      key: 'ablationTests',
      section: 'mlv-tools',
      href: '/mlv-tools/ablation-tests/',
      imageDark: '/mlv-tools/ablation-tests/assets/og-image.svg',
      imageLight: '/mlv-tools/ablation-tests/assets/og-image-light.svg'
    },
    {
      key: 'standardizingComparisons',
      section: 'mlv-tools',
      href: '/mlv-tools/standardizing-comparisons/',
      imageDark: '/mlv-tools/standardizing-comparisons/assets/og-image.svg',
      imageLight: '/mlv-tools/standardizing-comparisons/assets/og-image-light.svg'
    }
  ];

  var landingSections = [
    {
      sectionId: 'mlv-tools',
      gridId: 'ml-tools-grid',
      catalogUrl: '/mlv-tools/tools-catalog.json',
    }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    window.SharedToolLandingEngine.create({
      i18nGlobal: 'StatToolsLandingI18n',
      tools: tools,
      landingSections: landingSections,
      fallbackImage: '/mlv-tools/assets/og-image.png',
      toolsTitleElId: 'ml-tools-title',
      toolsTitleI18nKey: 'mlToolsTitle',
      relatedWorkSourceUrl: '/mlv-tools/assets/related-work.json',
    }).init();
  });
})();
