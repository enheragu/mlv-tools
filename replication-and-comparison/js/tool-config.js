(function () {
  if (window.ReplicationComparisonToolConfig) return;

  window.ReplicationComparisonToolConfig = {
    presets: {
      mnist: {
        metrics: {
          accuracy: { file: '../raw_data/accuracy_data_raw.yaml', scale: 'percent' }
        }
      },
      detection: {
        metrics: {
          map50: { file: '../raw_data/mAP50_data_raw.yaml', scale: 'ratio' },
          map5095: { file: '../raw_data/mAP50-95_data_raw.yaml', scale: 'ratio' },
          precision: { file: '../raw_data/P_data_raw.yaml', scale: 'ratio' },
          recall: { file: '../raw_data/R_data_raw.yaml', scale: 'ratio' }
        }
      },
      cpc18: {
        metrics: {
          // CPC18 mean prediction error (MSE x100). Lower is better, so the
          // shared core flags it lowerIsBetter (best run = min, misranking
          // computed in the negated space; display stays positive).
          mse: { file: '../raw_data/cpc18_mse_data_raw.yaml', scale: 'percent', lowerIsBetter: true }
        }
      },
      // Second CPC18 case: TWO variance sources (init x order, 35x35 factorial).
      // The standard widgets (histogram, summary, misranking) operate on the
      // 1,225 init x order runs per model exactly like a one-source preset; the
      // `decomposition` extra adds the 2-D heatmap view (data-driven: any preset
      // carrying it gets the extra dimension, one-source presets do not).
      cpc18decomp: {
        decomposition: '../raw_data/cpc18_variance_decomposition.json',
        metrics: {
          mse: { file: '../raw_data/cpc18_decomp_mse_data_raw.yaml', scale: 'percent', lowerIsBetter: true }
        }
      }
    },

    modelOrderPolicy: {
      mnist: {
        accuracy: 'yaml'
      },
      detection: {
        map50: 'yaml',
        map5095: 'yaml',
        precision: 'yaml',
        recall: 'yaml'
      },
      cpc18: {
        mse: 'yaml'
      },
      cpc18decomp: {
        mse: 'yaml'
      }
    },

    modelAutoselectPolicy: {
      mnist: {
        accuracy: 4
      },
      detection: {
        map50: 3,
        map5095: 3,
        precision: 3,
        recall: 3
      },
      cpc18: {
        mse: 4
      },
      cpc18decomp: {
        mse: 4
      }
    },

    defaultAutoselectCount: 4
  };
})();
