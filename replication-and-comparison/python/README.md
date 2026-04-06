# Replication and Comparison Python API

Minimal local API to run statistical routines that are hard to reproduce exactly in browser JS.

## Features

- Shapiro-Wilk normality test (`scipy.stats.shapiro`)
- Fisher kurtosis (`scipy.stats.kurtosis`)
- Switched-order probability simulations:
  - Monte Carlo from fitted Normal per model
  - Bootstrap from empirical model values

## Run locally

```bash
cd mlv-tools/replication-and-comparison/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

API starts on `http://localhost:8010`.

## Endpoints

- `GET /health`
- `POST /api/analysis`

### Request body

```json
{
  "metric_data": {
    "ModelA": [0.91, 0.92, 0.90],
    "ModelB": [0.88, 0.89, 0.90]
  },
  "selected_models": ["ModelA", "ModelB"],
  "montecarlo_trials": 6000,
  "bootstrap_trials": 6000,
  "n_samples_min": 1,
  "n_samples_max": 5
}
```

The frontend tries this API first and falls back to browser-only simulation if unavailable.
