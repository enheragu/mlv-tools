# Data files of the viewer

Every file in this folder is generated from the per-trial data deposits of the articles. Do not edit them by hand;
regenerate them with the exporter of the repository that owns the data and copy the output here.

| Files | Source | Exporter |
|---|---|---|
| `accuracy_data_raw.yaml`, `ablation_accuracy_data_raw.yaml`, `mnist_ablation_table.csv`, `mAP50_data_raw.yaml`, `mAP50-95_data_raw.yaml`, `P_data_raw.yaml`, `R_data_raw.yaml`, `detection_ablation_table.csv` | MNIST and YOLOv8 per-trial results (DOI 10.5281/zenodo.23977922) | `scripts/export_web_data.py` of [mnist-learning-playground](https://github.com/enheragu/mnist-learning-playground) (code archived at [10.5281/zenodo.24003004](https://doi.org/10.5281/zenodo.24003004)): `python3 scripts/export_web_data.py zenodo_export <this folder>` |
| `cpc18_mse_data_raw.yaml`, `cpc18_ablation_b1_table.csv`, `cpc18_ablation_b3_table.csv`, `cpc18_decomp_mse_data_raw.yaml`, `cpc18_variance_decomposition.json` | CPC18 per-trial results (DOI 10.5281/zenodo.23978015) | `scripts/export_web_data.py` of [cpc18-learning-playground](https://github.com/enheragu/cpc18-learning-playground) (code archived at [10.5281/zenodo.24013058](https://doi.org/10.5281/zenodo.24013058)): `python scripts/export_web_data.py --out-dir <this folder>` |

The YAML files hold one line per model or group, `name: [value, value, ...]`, in the order the tools display them; the
CSV tables hold one row per run with its factors. The YOLOv8 files hold only the valid runs of the deposit, and the
MNIST ablation table only the iterations complete for the nine conditions, as in the articles.

The data deposits are published with their articles; until then their DOIs do not resolve, so they are given here as
plain text. The code DOIs are concept DOIs and resolve to the latest release of each repository.
