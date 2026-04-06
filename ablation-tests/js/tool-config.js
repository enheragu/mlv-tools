(function () {
  if (window.AblationTestsToolConfig) return;

  window.AblationTestsToolConfig = {
    toolId: 'AblationTests',
    title: 'Ablation Tests',
    presets: {
      mnist: {
        metrics: {
          accuracy: {
            scale: 'percent',
            table: {
              file: '../raw_data/mnist_ablation_table.csv',
              metricColumn: ['accuracy', 'Accuracy'],
              fieldAliases: {
                batch_size: ['batch size', 'batch-size', 'batch'],
                learning_rate: ['learning rate', 'learning-rate', 'lr'],
                index: ['run', 'group', 'group_id'],
                seed: ['seed', 'Seed']
              },
              groupField: 'index',
              seedColumn: 'seed',
              factors: [
                { field: 'batch_size', label: 'B' },
                { field: 'learning_rate', label: 'L' }
              ],
              modelTemplate: 'CNN_14L_B{batch_size}_L{learning_rate}'
            }
          }
        }
      },
      detection: {
        metrics: {
          map50: {
            scale: 'ratio',
            table: {
              file: '../raw_data/detection_ablation_table.csv',
              metricColumn: ['mAP50', 'mAP@50', 'Mean Average Precision @50'],
              fieldAliases: {
                fusion: ['fusion method', 'fusion_method'],
                rgb_eq: ['rgb_equalization', 'rgb equalization', 'rgb-eq', 'rgb eq'],
                th_eq: ['th_equalization', 'thermal_equalization', 'th equalization', 'th-eq', 'th eq'],
                P: ['precision', 'Precision'],
                R: ['recall', 'Recall'],
                'mAP50-95': ['mAP@50-95', 'mAP 50-95', 'Mean Average Precision @50-95']
              },
              factors: [
                { field: 'fusion', label: 'fusion' },
                { field: 'rgb_eq', label: 'rgb' },
                { field: 'th_eq', label: 'th' }
              ],
              modelTemplate: 'LLVIP_{fusion}_rgb-{rgb_eq}_th-{th_eq}'
            }
          },
          map5095: {
            scale: 'ratio',
            table: {
              file: '../raw_data/detection_ablation_table.csv',
              metricColumn: ['mAP50-95', 'mAP@50-95', 'mAP 50-95', 'Mean Average Precision @50-95'],
              fieldAliases: {
                fusion: ['fusion method', 'fusion_method'],
                rgb_eq: ['rgb_equalization', 'rgb equalization', 'rgb-eq', 'rgb eq'],
                th_eq: ['th_equalization', 'thermal_equalization', 'th equalization', 'th-eq', 'th eq'],
                P: ['precision', 'Precision'],
                R: ['recall', 'Recall'],
                mAP50: ['mAP@50', 'Mean Average Precision @50']
              },
              factors: [
                { field: 'fusion', label: 'fusion' },
                { field: 'rgb_eq', label: 'rgb' },
                { field: 'th_eq', label: 'th' }
              ],
              modelTemplate: 'LLVIP_{fusion}_rgb-{rgb_eq}_th-{th_eq}'
            }
          },
          precision: {
            scale: 'ratio',
            table: {
              file: '../raw_data/detection_ablation_table.csv',
              metricColumn: ['P', 'Precision', 'precision'],
              fieldAliases: {
                fusion: ['fusion method', 'fusion_method'],
                rgb_eq: ['rgb_equalization', 'rgb equalization', 'rgb-eq', 'rgb eq'],
                th_eq: ['th_equalization', 'thermal_equalization', 'th equalization', 'th-eq', 'th eq'],
                R: ['recall', 'Recall'],
                mAP50: ['mAP@50', 'Mean Average Precision @50'],
                'mAP50-95': ['mAP@50-95', 'mAP 50-95', 'Mean Average Precision @50-95']
              },
              factors: [
                { field: 'fusion', label: 'fusion' },
                { field: 'rgb_eq', label: 'rgb' },
                { field: 'th_eq', label: 'th' }
              ],
              modelTemplate: 'LLVIP_{fusion}_rgb-{rgb_eq}_th-{th_eq}'
            }
          },
          recall: {
            scale: 'ratio',
            table: {
              file: '../raw_data/detection_ablation_table.csv',
              metricColumn: ['R', 'Recall', 'recall'],
              fieldAliases: {
                fusion: ['fusion method', 'fusion_method'],
                rgb_eq: ['rgb_equalization', 'rgb equalization', 'rgb-eq', 'rgb eq'],
                th_eq: ['th_equalization', 'thermal_equalization', 'th equalization', 'th-eq', 'th eq'],
                P: ['precision', 'Precision'],
                mAP50: ['mAP@50', 'Mean Average Precision @50'],
                'mAP50-95': ['mAP@50-95', 'mAP 50-95', 'Mean Average Precision @50-95']
              },
              factors: [
                { field: 'fusion', label: 'fusion' },
                { field: 'rgb_eq', label: 'rgb' },
                { field: 'th_eq', label: 'th' }
              ],
              modelTemplate: 'LLVIP_{fusion}_rgb-{rgb_eq}_th-{th_eq}'
            }
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
