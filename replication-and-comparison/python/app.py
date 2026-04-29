#!/usr/bin/env python3
# encoding: utf-8

from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy.stats import kurtosis, shapiro


class AnalysisRequest(BaseModel):
    metric_data: Dict[str, List[float]] = Field(default_factory=dict)
    selected_models: List[str] = Field(default_factory=list)
    montecarlo_trials: int = 6000
    bootstrap_trials: int = 6000
    n_samples_min: int = 1
    n_samples_max: int = 5
    pairing_mode: str = "unpaired"
    grouping_field: str = ""
    analysis_mode: str = "auto"
    condition_meta: Optional[dict] = None


class NormalityRow(BaseModel):
    model: str
    n: int
    median: float
    mean: float
    kurtosis_fisher: float
    shapiro_w: float | None
    shapiro_p: float | None


class SwitchedRow(BaseModel):
    n_samples: int
    montecarlo_p_switched: float
    bootstrap_p_switched: float


class AnalysisResponse(BaseModel):
    expected_order: List[str]
    normality: List[NormalityRow]
    switched: List[SwitchedRow]
    decision_paths: List[dict] = Field(default_factory=list)


app = FastAPI(title="Replication and Comparison API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_payload(payload: AnalysisRequest) -> None:
    if len(payload.selected_models) < 2:
        raise HTTPException(status_code=400, detail="Select at least two models.")

    if payload.n_samples_min < 1 or payload.n_samples_max < payload.n_samples_min:
        raise HTTPException(status_code=400, detail="Invalid sample range.")

    if payload.montecarlo_trials < 50 or payload.bootstrap_trials < 50:
        raise HTTPException(status_code=400, detail="Trials are too low.")

    for model in payload.selected_models:
        values = payload.metric_data.get(model, [])
        if len(values) == 0:
            raise HTTPException(status_code=400, detail=f"Model '{model}' has no values.")


def _draw_sample(metric_data: Dict[str, np.ndarray], model: str, method: str) -> float:
    values = metric_data[model]
    if method == "mc":
        mu = float(np.mean(values))
        sigma = float(np.std(values, ddof=0))
        sigma = sigma if sigma > 1e-12 else 1e-12
        return float(np.random.normal(mu, sigma, size=1)[0])
    if method == "bs":
        return float(np.random.choice(values, size=1, replace=True)[0])
    raise ValueError("Unknown simulation method")


def _simulate_decision_paths(
    metric_data: Dict[str, np.ndarray],
    selected_models: List[str],
    condition_meta: dict,
    trials: int,
    method: str,
) -> List[dict]:
    factor_order = [str(x) for x in (condition_meta.get("factor_order") or []) if str(x)]
    model_factors = condition_meta.get("model_factors") or {}
    if len(factor_order) < 2:
        return []

    active_models = [m for m in selected_models if m in model_factors]
    if len(active_models) < 2:
        return []

    # Best global condition by observed best score (same criterion used elsewhere)
    global_best = max(active_models, key=lambda m: float(np.max(metric_data[m])))
    global_best_factors = model_factors.get(global_best, {})

    # Pre-index models by factor values for fast filtering.
    factor_values: Dict[str, List[str]] = {}
    for f in factor_order:
        vals = sorted({str(model_factors[m].get(f, "")) for m in active_models if str(model_factors[m].get(f, ""))})
        factor_values[f] = vals

    def matches_fixed(model: str, fixed: Dict[str, str]) -> bool:
        factors = model_factors.get(model, {})
        for fk, fv in fixed.items():
            if str(factors.get(fk, "")) != str(fv):
                return False
        return True

    def choose_best_level(current_fixed: Dict[str, str], factor: str) -> Optional[str]:
        best_level = None
        best_score = -float("inf")
        for level in factor_values.get(factor, []):
            scoped = dict(current_fixed)
            scoped[factor] = level
            candidates = [m for m in active_models if matches_fixed(m, scoped)]
            if not candidates:
                continue
            score = max(_draw_sample(metric_data, m, method) for m in candidates)
            if score > best_score:
                best_score = score
                best_level = level
        return best_level

    rows: List[dict] = []
    for start_factor in factor_order:
        for start_value in factor_values.get(start_factor, []):
            step1_ok = 0
            step2_ok = 0
            reach_ok = 0
            total = 0
            step1_counts: Dict[str, int] = {}
            step1_is_best: Dict[str, bool] = {}
            step2_counts: Dict[str, Dict[str, int]] = {}
            reach_counts: Dict[str, Dict[str, int]] = {}
            for _ in range(trials):
                fixed: Dict[str, str] = {start_factor: start_value}
                remaining = [f for f in factor_order if f != start_factor]

                valid = True
                for f in remaining:
                    level = choose_best_level(fixed, f)
                    if level is None:
                        valid = False
                        break
                    fixed[f] = level

                if not valid:
                    continue

                # Step 2: re-optimize the start factor once other factors are fixed.
                fixed_without_start = {k: v for k, v in fixed.items() if k != start_factor}
                start_reselected = choose_best_level(fixed_without_start, start_factor)
                if start_reselected is None:
                    continue
                fixed[start_factor] = start_reselected

                finals = [m for m in active_models if matches_fixed(m, fixed)]
                if not finals:
                    continue

                if remaining:
                    step1_parts = [f"{f}={fixed.get(f, '')}" for f in remaining]
                    step1_key = " | ".join(step1_parts)
                else:
                    step1_key = "(none)"

                if step1_key not in step1_counts:
                    step1_counts[step1_key] = 0
                    step1_is_best[step1_key] = all(
                        str(fixed.get(f, "")) == str(global_best_factors.get(f, "")) for f in remaining
                    )
                    step2_counts[step1_key] = {}
                    reach_counts[step1_key] = {}

                step1_counts[step1_key] += 1
                step2_value = str(fixed.get(start_factor, ""))
                step2_counts[step1_key][step2_value] = step2_counts[step1_key].get(step2_value, 0) + 1

                if all(str(fixed.get(f, "")) == str(global_best_factors.get(f, "")) for f in remaining):
                    step1_ok += 1
                if str(fixed.get(start_factor, "")) == str(global_best_factors.get(start_factor, "")):
                    step2_ok += 1

                chosen = max(finals, key=lambda m: _draw_sample(metric_data, m, method))
                total += 1
                if chosen == global_best:
                    reach_ok += 1
                    reach_counts[step1_key][step2_value] = reach_counts[step1_key].get(step2_value, 0) + 1

            p_step1_ok = float(step1_ok / total) if total > 0 else 0.0
            p_step2_ok = float(step2_ok / total) if total > 0 else 0.0
            p_reach_ok = float(reach_ok / total) if total > 0 else 0.0

            # Guarantee every possible start-factor value appears as a step2 option
            # in each observed step1 bucket, even when the simulation never sampled it.
            # Without this, near-zero probability paths are missing depending on the random seed.
            for sk in list(step1_counts.keys()):
                for val in factor_values[start_factor]:
                    if val not in step2_counts[sk]:
                        step2_counts[sk][val] = 0
                    reach_counts[sk].setdefault(val, 0)

            branches: List[dict] = []
            for step1_key in sorted(step1_counts.keys()):
                step1_count = step1_counts.get(step1_key, 0)
                p_step1 = float(step1_count / total) if total > 0 else 0.0
                options: List[dict] = []
                step2_map = step2_counts.get(step1_key, {})
                for step2_value in sorted(step2_map.keys()):
                    c2 = step2_map.get(step2_value, 0)
                    r2 = reach_counts.get(step1_key, {}).get(step2_value, 0)
                    options.append(
                        {
                            "step2_value": step2_value,
                            "step2_label": f"{start_factor}={step2_value}",
                            "is_global_best_step2": str(global_best_factors.get(start_factor, "")) == str(step2_value),
                            "p_step2": float(c2 / step1_count) if step1_count > 0 else 0.0,
                            "p_reach_given_step2": float(r2 / c2) if c2 > 0 else 0.0,
                            "p_reach_joint": float(r2 / total) if total > 0 else 0.0,
                        }
                    )

                branches.append(
                    {
                        "step1_key": step1_key,
                        "step1_label": step1_key,
                        "is_global_best_step1": bool(step1_is_best.get(step1_key, False)),
                        "p_step1": p_step1,
                        "step2_options": options,
                    }
                )

            rows.append(
                {
                    "start": f"{start_factor}={start_value}",
                    "start_label": f"{start_factor}={start_value}",
                    "start_factor": start_factor,
                    "start_value": start_value,
                    "step1_factors": remaining,
                    "global_best_model": global_best,
                    "is_global_best_start": str(global_best_factors.get(start_factor, "")) == str(start_value),
                    "p_step1_ok": p_step1_ok,
                    "p_step2_ok": p_step2_ok,
                    "p_reach_best": p_reach_ok,
                    "branches": branches,
                }
            )

    return rows


def _compute_expected_order(metric_data: Dict[str, np.ndarray], selected_models: List[str]) -> List[str]:
    model_max = [float(np.max(metric_data[m])) for m in selected_models]
    order_idx = np.argsort(model_max)  # same criterion as python utility (min -> max)
    return [selected_models[i] for i in order_idx]


def _compute_normality_rows(metric_data: Dict[str, np.ndarray], selected_models: List[str]) -> List[NormalityRow]:
    rows: List[NormalityRow] = []
    for model in selected_models:
        values = metric_data[model]
        n = int(values.size)
        med = float(np.median(values))
        mean_val = float(np.mean(values))
        kurt = float(kurtosis(values, fisher=True, bias=False)) if n >= 4 else 0.0

        sh_w: float | None = None
        sh_p: float | None = None
        if 3 <= n:
            try:
                sh_w_val, sh_p_val = shapiro(values)
                sh_w = float(sh_w_val)
                sh_p = float(sh_p_val)
            except Exception:
                sh_w = None
                sh_p = None

        rows.append(
            NormalityRow(
                model=model,
                n=n,
                median=med,
                mean=mean_val,
                kurtosis_fisher=kurt,
                shapiro_w=sh_w,
                shapiro_p=sh_p,
            )
        )
    return rows


def _simulate_switched_probability(
    metric_data: Dict[str, np.ndarray],
    expected_order: List[str],
    n_samples: int,
    trials: int,
    method: str,
) -> float:
    model_max = np.array([float(np.max(metric_data[m])) for m in expected_order], dtype=float)
    original_order_idx = np.argsort(model_max)

    if method == "mc":
        means = np.array([float(np.mean(metric_data[m])) for m in expected_order], dtype=float)
        stds = np.array([float(np.std(metric_data[m], ddof=0)) for m in expected_order], dtype=float)
        samples_per_group = [
            np.random.normal(means[i], stds[i], size=(trials, n_samples))
            for i in range(len(expected_order))
        ]
    elif method == "bs":
        samples_per_group = [
            np.random.choice(metric_data[m], size=(trials, n_samples), replace=True)
            for m in expected_order
        ]
    else:
        raise ValueError("Unknown simulation method")

    best_per_group = np.column_stack([np.max(group_samples, axis=1) for group_samples in samples_per_group])
    simulated_orders = np.argsort(best_per_group, axis=1)
    switched_count = np.count_nonzero(np.any(simulated_orders != original_order_idx, axis=1))
    return float(switched_count / trials)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/analysis", response_model=AnalysisResponse)
def analyze(payload: AnalysisRequest) -> AnalysisResponse:
    _validate_payload(payload)

    metric_data: Dict[str, np.ndarray] = {}
    for model in payload.selected_models:
        metric_data[model] = np.array(payload.metric_data[model], dtype=float)

    expected_order = _compute_expected_order(metric_data, payload.selected_models)
    normality = _compute_normality_rows(metric_data, payload.selected_models)

    analysis_mode = (payload.analysis_mode or "auto").lower().strip()
    if analysis_mode == "ablation":
        condition_meta = payload.condition_meta or {}
        mc_rows = _simulate_decision_paths(metric_data, payload.selected_models, condition_meta, payload.montecarlo_trials, "mc")
        bs_rows = _simulate_decision_paths(metric_data, payload.selected_models, condition_meta, payload.bootstrap_trials, "bs")

        by_start: Dict[str, dict] = {}
        for row in mc_rows:
            start = row.get("start") or row.get("start_label")
            if not start:
                continue
            merged_branches = []
            for branch in row.get("branches", []) or []:
                merged_options = []
                for opt in branch.get("step2_options", []) or []:
                    merged_options.append(
                        {
                            "step2_value": opt.get("step2_value", ""),
                            "step2_label": opt.get("step2_label", ""),
                            "is_global_best_step2": bool(opt.get("is_global_best_step2", False)),
                            "montecarlo_p_step2": float(opt.get("p_step2", 0.0)),
                            "bootstrap_p_step2": 0.0,
                            "montecarlo_p_reach_given_step2": float(opt.get("p_reach_given_step2", 0.0)),
                            "bootstrap_p_reach_given_step2": 0.0,
                            "montecarlo_p_reach_joint": float(opt.get("p_reach_joint", 0.0)),
                            "bootstrap_p_reach_joint": 0.0,
                        }
                    )
                merged_branches.append(
                    {
                        "step1_key": branch.get("step1_key", ""),
                        "step1_label": branch.get("step1_label", ""),
                        "is_global_best_step1": bool(branch.get("is_global_best_step1", False)),
                        "montecarlo_p_step1": float(branch.get("p_step1", 0.0)),
                        "bootstrap_p_step1": 0.0,
                        "step2_options": merged_options,
                    }
                )

            by_start[start] = {
                "start": start,
                "start_label": row.get("start_label", start),
                "start_factor": row.get("start_factor", ""),
                "start_value": row.get("start_value", ""),
                "step1_factors": row.get("step1_factors", []),
                "global_best_model": row.get("global_best_model", ""),
                "is_global_best_start": bool(row.get("is_global_best_start", False)),
                "montecarlo_p_step1_ok": float(row.get("p_step1_ok", 0.0)),
                "bootstrap_p_step1_ok": 0.0,
                "montecarlo_p_step2_ok": float(row.get("p_step2_ok", 0.0)),
                "bootstrap_p_step2_ok": 0.0,
                "montecarlo_p_reach_best": float(row.get("p_reach_best", 0.0)),
                "bootstrap_p_reach_best": 0.0,
                "branches": merged_branches,
            }
        for row in bs_rows:
            start = row.get("start") or row.get("start_label")
            if not start:
                continue
            if start not in by_start:
                by_start[start] = {
                    "start": start,
                    "start_label": row.get("start_label", start),
                    "start_factor": row.get("start_factor", ""),
                    "start_value": row.get("start_value", ""),
                    "step1_factors": row.get("step1_factors", []),
                    "global_best_model": row.get("global_best_model", ""),
                    "is_global_best_start": bool(row.get("is_global_best_start", False)),
                    "montecarlo_p_step1_ok": 0.0,
                    "bootstrap_p_step1_ok": 0.0,
                    "montecarlo_p_step2_ok": 0.0,
                    "bootstrap_p_step2_ok": 0.0,
                    "montecarlo_p_reach_best": 0.0,
                    "bootstrap_p_reach_best": 0.0,
                    "branches": [],
                }
            by_start[start]["bootstrap_p_step1_ok"] = float(row.get("p_step1_ok", 0.0))
            by_start[start]["bootstrap_p_step2_ok"] = float(row.get("p_step2_ok", 0.0))
            by_start[start]["bootstrap_p_reach_best"] = float(row.get("p_reach_best", 0.0))

            branch_map = {str(b.get("step1_key", "")): b for b in by_start[start].get("branches", [])}
            for branch in row.get("branches", []) or []:
                step1_key = str(branch.get("step1_key", ""))
                if step1_key not in branch_map:
                    branch_map[step1_key] = {
                        "step1_key": step1_key,
                        "step1_label": branch.get("step1_label", step1_key),
                        "is_global_best_step1": bool(branch.get("is_global_best_step1", False)),
                        "montecarlo_p_step1": 0.0,
                        "bootstrap_p_step1": 0.0,
                        "step2_options": [],
                    }
                    by_start[start].setdefault("branches", []).append(branch_map[step1_key])

                bdst = branch_map[step1_key]
                bdst["bootstrap_p_step1"] = float(branch.get("p_step1", 0.0))

                opt_map = {str(o.get("step2_value", "")): o for o in bdst.get("step2_options", [])}
                for opt in branch.get("step2_options", []) or []:
                    step2_value = str(opt.get("step2_value", ""))
                    if step2_value not in opt_map:
                        opt_map[step2_value] = {
                            "step2_value": step2_value,
                            "step2_label": opt.get("step2_label", f"{bdst.get('step1_label', '')}"),
                            "is_global_best_step2": bool(opt.get("is_global_best_step2", False)),
                            "montecarlo_p_step2": 0.0,
                            "bootstrap_p_step2": 0.0,
                            "montecarlo_p_reach_given_step2": 0.0,
                            "bootstrap_p_reach_given_step2": 0.0,
                            "montecarlo_p_reach_joint": 0.0,
                            "bootstrap_p_reach_joint": 0.0,
                        }
                        bdst.setdefault("step2_options", []).append(opt_map[step2_value])

                    odst = opt_map[step2_value]
                    odst["bootstrap_p_step2"] = float(opt.get("p_step2", 0.0))
                    odst["bootstrap_p_reach_given_step2"] = float(opt.get("p_reach_given_step2", 0.0))
                    odst["bootstrap_p_reach_joint"] = float(opt.get("p_reach_joint", 0.0))

        for row in by_start.values():
            branches = row.get("branches", []) or []
            branches.sort(key=lambda b: str(b.get("step1_label", b.get("step1_key", ""))))
            for branch in branches:
                options = branch.get("step2_options", []) or []
                options.sort(key=lambda o: str(o.get("step2_value", "")))

        decision_paths = sorted(by_start.values(), key=lambda r: str(r.get("start", "")))
        return AnalysisResponse(expected_order=expected_order, normality=normality, switched=[], decision_paths=decision_paths)

    switched: List[SwitchedRow] = []
    for n_samples in range(payload.n_samples_min, payload.n_samples_max + 1):
        mc = _simulate_switched_probability(metric_data, expected_order, n_samples, payload.montecarlo_trials, "mc")
        bs = _simulate_switched_probability(metric_data, expected_order, n_samples, payload.bootstrap_trials, "bs")
        switched.append(
            SwitchedRow(
                n_samples=n_samples,
                montecarlo_p_switched=mc,
                bootstrap_p_switched=bs,
            )
        )

    return AnalysisResponse(expected_order=expected_order, normality=normality, switched=switched, decision_paths=[])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8010, reload=True)
