(function () {
  if (window.StandardizingComparisonsToolConfig) return;

  window.StandardizingComparisonsToolConfig = {
    toolId: 'StandardizingComparisons',
    title: 'Standardizing Comparisons',
    presets: {
      mnist: {
        metrics: {
          accuracy: {
            files: [
              '../raw_data/accuracy_data_raw.yaml',
              '../raw_data/ablation_accuracy_data_raw.yaml'
            ],
            scale: 'percent'
          }
        }
      },
      detection: {
        metrics: {
          map50: {
            files: [
              '../raw_data/mAP50_data_raw.yaml',
              '../raw_data/ablation_mAP50_data_raw.yaml'
            ],
            scale: 'ratio'
          },
          map5095: {
            files: [
              '../raw_data/mAP50-95_data_raw.yaml',
              '../raw_data/ablation_mAP50-95_data_raw.yaml'
            ],
            scale: 'ratio'
          },
          precision: {
            files: [
              '../raw_data/P_data_raw.yaml',
              '../raw_data/ablation_P_data_raw.yaml'
            ],
            scale: 'ratio'
          },
          recall: {
            files: [
              '../raw_data/R_data_raw.yaml',
              '../raw_data/ablation_R_data_raw.yaml'
            ],
            scale: 'ratio'
          }
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
      }
    },
    selectAllByDefault: true,
    defaultAutoselectCount: 4
  };
})();
