(function () {
  function applyMlVarianceFooter() {
    var footer = document.querySelector('footer[data-mlva-footer]');
    if (!footer) return;

    var relatedRoot = footer.querySelector('#related-work-root');
    if (relatedRoot && !relatedRoot.hasAttribute('data-related-contextual')) {
      relatedRoot.setAttribute('data-related-contextual', 'true');
    }

    var author = footer.querySelector('[data-mlva-author]');
    if (author) {
      author.innerHTML = 'Author: <a href="https://enheragu.github.io/" target="_blank" rel="noopener noreferrer">Enrique Heredia-Aguado</a>';
    }

    var report = footer.querySelector('#footer-report-problem');
    if (report && !report.getAttribute('data-tool-title')) {
      var toolTitle = footer.getAttribute('data-mlva-tool-title') || 'ML variance analysis';
      report.setAttribute('data-tool-title', toolTitle);
    }
  }

  window.MlVarianceFooter = {
    apply: applyMlVarianceFooter,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyMlVarianceFooter);
  } else {
    applyMlVarianceFooter();
  }
})();
