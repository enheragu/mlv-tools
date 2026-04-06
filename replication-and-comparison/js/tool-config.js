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

    modelAutoselectPolicy: {
      mnist: {
        accuracy: 4
      },
      detection: {
        map50: 3,
        map5095: 3,
        precision: 3,
        recall: 3
      }
    },

    defaultAutoselectCount: 4
  };
})();
