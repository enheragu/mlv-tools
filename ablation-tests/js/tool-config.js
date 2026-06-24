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
      },
      cpc18: {
        // CPC18 ablations. Metric is mean prediction error (MSE x100), so
        // lower is better: the shared comparison core flags lowerIsBetter so
        // best run = min and misranking is computed in the negated space while
        // the displayed value stays positive. The higher-is-better presets
        // above stay unflagged.
        metrics: {
          b1: {
            // BourginMLP batch_size x learning_rate factorial (9 conditions x 800 seeds).
            scale: 'percent',
            lowerIsBetter: true,
            table: {
              file: '../raw_data/cpc18_ablation_b1_table.csv',
              metricColumn: ['mse_x100', 'MSE x100', 'mse'],
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
              modelTemplate: 'BourginMLP_B{batch_size}_L{learning_rate}'
            }
          },
          b3: {
            // SparseMLP epsilon x learning_rate factorial (9 conditions x 800 seeds).
            scale: 'percent',
            lowerIsBetter: true,
            table: {
              file: '../raw_data/cpc18_ablation_b3_table.csv',
              metricColumn: ['mse_x100', 'MSE x100', 'mse'],
              fieldAliases: {
                epsilon: ['eps', 'epsilon'],
                learning_rate: ['learning rate', 'learning-rate', 'lr'],
                index: ['run', 'group', 'group_id'],
                seed: ['seed', 'Seed']
              },
              groupField: 'index',
              seedColumn: 'seed',
              factors: [
                { field: 'epsilon', label: 'E' },
                { field: 'learning_rate', label: 'L' }
              ],
              modelTemplate: 'SparseMLP_E{epsilon}_L{learning_rate}'
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
      },
      cpc18: {
        b1: 'yaml',
        b3: 'yaml'
      }
    },
    selectAllByDefault: true,
    defaultAutoselectCount: 4
  };
})();
