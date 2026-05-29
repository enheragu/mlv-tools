(function () {
  if (window.AboutMLVToolsI18n) return;

  var translations = {
    en: {
      headerTitle: 'About',
      headerSubtitle: 'MLV Tools — Machine Learning Variance Analysis',
      introTitle: 'A companion tool for the paper',
      introText: 'This web accompanies a methodological study on ML evaluation variance, providing interactive visualisations and statistical tools to explore the results in depth.',
      aboutSectionTitle: 'About',
      bodyHtml: '<p>This work is part of a PhD thesis in robotics, computer vision, and artificial intelligence at the <strong>Universidad Miguel Hernández de Elche (UMH)</strong>, Spain. The thesis focuses on multispectral fusion techniques for detection tasks on mobile robots. This study is a methodological contribution examining how variance in ML evaluation metrics affects model ranking and reproducibility, and proposing practical protocols to account for it.</p><p>Developed within the <strong>ARVC</strong> (Automation, Robotics and Computer Vision) research group, part of the <strong><a href="https://i3e.umh.es/" target="_blank" rel="noopener noreferrer">I3E</a></strong> research institute at UMH.</p>'
    },
    es: {
      headerTitle: 'Acerca de',
      headerSubtitle: 'MLV Tools — Análisis de varianza en Machine Learning',
      introTitle: 'Herramienta de soporte al artículo',
      introText: 'Esta web acompaña un estudio metodológico sobre la varianza en la evaluación de modelos de ML, ofreciendo visualizaciones interactivas y herramientas estadísticas para explorar los resultados en profundidad.',
      aboutSectionTitle: 'Acerca de',
      bodyHtml: '<p>Este trabajo forma parte de una tesis doctoral en robótica, visión por computador e inteligencia artificial en la <strong>Universidad Miguel Hernández de Elche (UMH)</strong>, España. La tesis se centra en técnicas de fusión multiespectral para tareas de detección a bordo de robots móviles. Este estudio es una contribución metodológica: examina cómo la varianza en las métricas de evaluación de ML afecta al ranking de modelos y a la reproducibilidad, y propone protocolos prácticos para tenerla en cuenta.</p><p>Desarrollado en el grupo de investigación <strong>ARVC</strong> (Automatización, Robótica y Visión por Computador), parte del instituto de investigación <strong><a href="https://i3e.umh.es/" target="_blank" rel="noopener noreferrer">I3E</a></strong> de la UMH.</p>'
    }
  };

  var initialLang = window.SharedUiCore ? window.SharedUiCore.readLangFromUrl('en') : 'en';
  var api = window.SharedI18nCore
    ? window.SharedI18nCore.createI18n(translations, { initialLang: initialLang, fallbackLang: 'en' })
    : {
        getCopy: function (lang) { return translations[lang === 'es' ? 'es' : 'en']; },
        getLang: function () { return initialLang; },
        setLang: function (lang) { initialLang = lang === 'es' ? 'es' : 'en'; return initialLang; },
      };

  window.AboutMLVToolsI18n = api;
})();
