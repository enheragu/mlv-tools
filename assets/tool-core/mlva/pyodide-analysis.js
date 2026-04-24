(function () {
  if (window.PyodideAnalysis) return;

  // sim_method in payload selects which simulation to run ('mc' | 'bs' | 'both').
  // Workers always receive 'mc' or 'bs'; merge is done in JS after Promise.all.
  var ANALYSIS_PY = `
import json
import numpy as np

def _validate(payload):
    if len(payload['selected_models']) < 2:
        raise ValueError('Select at least two models.')
    n_min = payload.get('n_samples_min', 1)
    n_max = payload.get('n_samples_max', 5)
    if n_min < 1 or n_max < n_min:
        raise ValueError('Invalid sample range.')
    if payload.get('montecarlo_trials', 6000) < 50 or payload.get('bootstrap_trials', 6000) < 50:
        raise ValueError('Trials too low.')
    for model in payload['selected_models']:
        if not payload['metric_data'].get(model):
            raise ValueError('Model ' + repr(model) + ' has no values.')

def _expected_order(metric_data, selected):
    maxes = [float(np.max(metric_data[m])) for m in selected]
    return [selected[i] for i in np.argsort(maxes).tolist()]

def _kurtosis_fisher(x):
    n = len(x)
    if n < 4:
        return 0.0
    m = np.mean(x)
    diff = x - m
    m2 = np.mean(diff ** 2)
    if m2 < 1e-14:
        return 0.0
    m4 = np.mean(diff ** 4)
    k = m4 / (m2 ** 2) - 3
    return float(((n + 1) * k + 6) * (n - 1) / ((n - 2) * (n - 3)))

def _normality_rows(metric_data, selected):
    try:
        from scipy.stats import shapiro as _shapiro
    except Exception:
        _shapiro = None
    rows = []
    for model in selected:
        values = metric_data[model]
        n = int(values.size)
        sw, sp = None, None
        if _shapiro and n >= 3:
            try:
                sw, sp = _shapiro(values)
                sw, sp = float(sw), float(sp)
            except Exception:
                pass
        rows.append({
            'model': model, 'n': n,
            'median': float(np.median(values)),
            'mean': float(np.mean(values)),
            'kurtosis_fisher': _kurtosis_fisher(values),
            'shapiro_w': sw, 'shapiro_p': sp,
        })
    return rows

def _simulate_switched(metric_data, expected_order, n_samples, trials, method):
    model_max = np.array([float(np.max(metric_data[m])) for m in expected_order])
    orig_idx = np.argsort(model_max)
    if method == 'mc':
        means = np.array([float(np.mean(metric_data[m])) for m in expected_order])
        stds = np.clip([float(np.std(metric_data[m], ddof=0)) for m in expected_order], 1e-12, None)
        groups = [np.random.normal(means[i], stds[i], size=(trials, n_samples)) for i in range(len(expected_order))]
    else:
        groups = [np.random.choice(metric_data[m], size=(trials, n_samples), replace=True) for m in expected_order]
    best = np.column_stack([np.max(g, axis=1) for g in groups])
    sim_orders = np.argsort(best, axis=1)
    return float(np.count_nonzero(np.any(sim_orders != orig_idx, axis=1)) / trials)

def _simulate_decision_paths(metric_data, selected_models, condition_meta, trials, method):
    from itertools import product as iproduct

    factor_order = [str(x) for x in (condition_meta.get('factor_order') or []) if str(x)]
    model_factors = condition_meta.get('model_factors') or {}
    if len(factor_order) < 2:
        return []
    active_models = [m for m in selected_models if m in model_factors]
    if len(active_models) < 2:
        return []

    n_models = len(active_models)
    global_best = max(active_models, key=lambda m: float(np.max(metric_data[m])))
    global_best_factors = model_factors.get(global_best, {})
    global_best_idx = active_models.index(global_best)

    factor_values = {}
    for f in factor_order:
        vals = sorted({str(model_factors[m].get(f, '')) for m in active_models if str(model_factors[m].get(f, ''))})
        factor_values[f] = vals
    level_idx = {f: {v: i for i, v in enumerate(factor_values[f])} for f in factor_order}
    n_factors = len(factor_order)
    level_counts = [len(factor_values[f]) for f in factor_order]

    model_lidx = np.array([
        [level_idx[factor_order[fi]].get(str(model_factors[m].get(factor_order[fi], '')), -1) for fi in range(n_factors)]
        for m in active_models
    ], dtype=np.int32)

    combos = list(iproduct(*[range(lc) for lc in level_counts]))
    n_combos = len(combos)
    combo_arr = np.array(combos, dtype=np.int32)

    combo_model_lists = []
    for ci in range(n_combos):
        combo_model_lists.append(np.where(np.all(model_lidx == combo_arr[ci], axis=1))[0])

    if method == 'mc':
        means = np.array([float(np.mean(metric_data[m])) for m in active_models])
        stds = np.clip([float(np.std(metric_data[m], ddof=0)) for m in active_models], 1e-12, None)
        all_samples = np.random.normal(means[:, None], stds[:, None], size=(n_models, trials))
    else:
        all_samples = np.vstack([np.random.choice(metric_data[m], size=trials, replace=True) for m in active_models])

    combo_scores = np.full((n_combos, trials), -np.inf)
    for ci, mlist in enumerate(combo_model_lists):
        if len(mlist) > 0:
            combo_scores[ci] = np.max(all_samples[mlist, :], axis=0)

    rows = []
    for sf_fi, start_factor in enumerate(factor_order):
        remaining = [f for f in factor_order if f != start_factor]
        remaining_fi = [factor_order.index(f) for f in remaining]

        for start_value in factor_values[start_factor]:
            sv_li = level_idx[start_factor][start_value]

            eligible = (combo_arr[:, sf_fi] == sv_li)[:, None] * np.ones((1, trials), dtype=bool)

            chosen_li = {}
            for rem_f, rem_fi in zip(remaining, remaining_fi):
                n_lev = len(factor_values[rem_f])
                level_scores = np.full((n_lev, trials), -np.inf)
                for li in range(n_lev):
                    lf = (combo_arr[:, rem_fi] == li)[:, None]
                    level_scores[li] = np.max(np.where(eligible & lf, combo_scores, -np.inf), axis=0)
                chosen = np.argmax(level_scores, axis=0)
                chosen_li[rem_f] = chosen
                eligible = eligible & (combo_arr[:, rem_fi:rem_fi+1] == chosen[None, :])

            n_sf_lev = len(factor_values[start_factor])
            sf_scores = np.full((n_sf_lev, trials), -np.inf)
            for si in range(n_sf_lev):
                sf_elig = (combo_arr[:, sf_fi] == si)[:, None]
                rem_elig = np.ones((n_combos, trials), dtype=bool)
                for rem_f, rem_fi in zip(remaining, remaining_fi):
                    rem_elig &= (combo_arr[:, rem_fi:rem_fi+1] == chosen_li[rem_f][None, :])
                sf_scores[si] = np.max(np.where(sf_elig & rem_elig, combo_scores, -np.inf), axis=0)
            chosen_sf = np.argmax(sf_scores, axis=0)
            chosen_sf_vals = np.array([factor_values[start_factor][i] for i in chosen_sf])

            full_enc = np.zeros(trials, dtype=np.int64)
            mult = 1
            for fi in range(n_factors - 1, -1, -1):
                f = factor_order[fi]
                lv = chosen_sf if f == start_factor else chosen_li[f]
                full_enc += lv.astype(np.int64) * mult
                mult *= level_counts[fi]

            winners = np.full(trials, -1, dtype=np.int32)
            for enc in np.unique(full_enc):
                trial_mask = full_enc == enc
                d = int(enc)
                clev = []
                for fi in range(n_factors - 1, -1, -1):
                    clev.append(d % level_counts[fi])
                    d //= level_counts[fi]
                clev.reverse()
                ci_list = np.where(np.all(combo_arr == np.array(clev, dtype=np.int32), axis=1))[0]
                if len(ci_list) == 0:
                    continue
                mlist = combo_model_lists[ci_list[0]]
                if len(mlist) == 0:
                    continue
                tidx = np.where(trial_mask)[0]
                winners[tidx] = mlist[np.argmax(all_samples[np.ix_(mlist, tidx)], axis=0)]

            valid_mask = winners >= 0
            total = int(np.sum(valid_mask))
            if total == 0:
                continue

            step1_ok_mask = valid_mask.copy()
            for rem_f in remaining:
                gb_li = level_idx[rem_f].get(str(global_best_factors.get(rem_f, '')), -1)
                step1_ok_mask &= (chosen_li[rem_f] == gb_li)

            gb_sf_li = level_idx[start_factor].get(str(global_best_factors.get(start_factor, '')), -1)
            step2_ok_mask = (chosen_sf == gb_sf_li) & valid_mask
            reach_ok_mask = (winners == global_best_idx) & valid_mask

            p_step1_ok = float(np.sum(step1_ok_mask) / total)
            p_step2_ok = float(np.sum(step2_ok_mask) / total)
            p_reach_ok = float(np.sum(reach_ok_mask) / total)

            if remaining:
                sk_enc = np.zeros(trials, dtype=np.int64)
                for rem_f in remaining:
                    sk_enc = sk_enc * len(factor_values[rem_f]) + chosen_li[rem_f]
                unique_sk_encs = np.unique(sk_enc[valid_mask])
                enc_to_str = {}
                for e in unique_sk_encs:
                    d = int(e)
                    parts = []
                    for rem_f in reversed(remaining):
                        n_lev = len(factor_values[rem_f])
                        parts.append('{}={}'.format(rem_f, factor_values[rem_f][d % n_lev]))
                        d //= n_lev
                    enc_to_str[e] = ' | '.join(reversed(parts))
            else:
                sk_enc = np.zeros(trials, dtype=np.int64)
                enc_to_str = {0: '(none)'}
                unique_sk_encs = np.array([0], dtype=np.int64)

            branches = []
            for sk_e in sorted(unique_sk_encs):
                sk = enc_to_str[sk_e]
                sk_mask = (sk_enc == sk_e) & valid_mask
                sc = int(np.sum(sk_mask))
                is_best_step1 = bool(np.any(step1_ok_mask & sk_mask))
                options = []
                for sv_val in sorted(np.unique(chosen_sf_vals[sk_mask])):
                    sv_mask = sk_mask & (chosen_sf_vals == sv_val)
                    c2 = int(np.sum(sv_mask))
                    r2 = int(np.sum(sv_mask & reach_ok_mask))
                    options.append({
                        'step2_value': sv_val, 'step2_label': '{}={}'.format(start_factor, sv_val),
                        'is_global_best_step2': sv_val == str(global_best_factors.get(start_factor, '')),
                        'p_step2': float(c2 / sc) if sc > 0 else 0.0,
                        'p_reach_given_step2': float(r2 / c2) if c2 > 0 else 0.0,
                        'p_reach_joint': float(r2 / total) if total > 0 else 0.0,
                    })
                branches.append({
                    'step1_key': sk, 'step1_label': sk,
                    'is_global_best_step1': is_best_step1,
                    'p_step1': float(sc / total) if total > 0 else 0.0,
                    'step2_options': options,
                })

            rows.append({
                'start': '{}={}'.format(start_factor, start_value),
                'start_label': '{}={}'.format(start_factor, start_value),
                'start_factor': start_factor, 'start_value': start_value,
                'step1_factors': remaining, 'global_best_model': global_best,
                'is_global_best_start': str(global_best_factors.get(start_factor, '')) == str(start_value),
                'p_step1_ok': p_step1_ok, 'p_step2_ok': p_step2_ok, 'p_reach_best': p_reach_ok,
                'branches': branches,
            })
    return rows

def analyze(payload_json_str):
    payload = json.loads(payload_json_str)
    _validate(payload)
    sim_method = (payload.get('sim_method') or 'both').lower()
    metric_data = {m: np.array(payload['metric_data'][m], dtype=float) for m in payload['selected_models']}
    expected_order = _expected_order(metric_data, payload['selected_models'])
    normality = _normality_rows(metric_data, payload['selected_models'])
    mode = (payload.get('analysis_mode') or 'auto').lower().strip()

    if mode == 'ablation':
        condition_meta = payload.get('condition_meta') or {}
        mc_t = int(payload.get('montecarlo_trials', 6000))
        bs_t = int(payload.get('bootstrap_trials', 6000))
        if sim_method == 'mc':
            rows = _simulate_decision_paths(metric_data, payload['selected_models'], condition_meta, mc_t, 'mc')
        elif sim_method == 'bs':
            rows = _simulate_decision_paths(metric_data, payload['selected_models'], condition_meta, bs_t, 'bs')
        else:
            rows = []
        return json.dumps({'expected_order': expected_order, 'normality': normality, 'switched': [], 'decision_paths': rows})

    switched = []
    for n in range(payload.get('n_samples_min', 1), payload.get('n_samples_max', 5) + 1):
        row = {'n_samples': n}
        if sim_method in ('mc', 'both'):
            row['montecarlo_p_switched'] = _simulate_switched(metric_data, expected_order, n, int(payload.get('montecarlo_trials', 6000)), 'mc')
        if sim_method in ('bs', 'both'):
            row['bootstrap_p_switched'] = _simulate_switched(metric_data, expected_order, n, int(payload.get('bootstrap_trials', 6000)), 'bs')
        switched.append(row)
    return json.dumps({'expected_order': expected_order, 'normality': normality, 'switched': switched, 'decision_paths': []})
`;

  var WORKER_SRC = [
    "importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js');",
    'var _pyodide = null;',
    'async function _init(pythonCode) {',
    '  _pyodide = await loadPyodide();',
    "  await _pyodide.loadPackage(['numpy']);",
    '  _pyodide.runPython(pythonCode);',
    "  _pyodide.loadPackage(['scipy']).catch(function () {});",
    "  postMessage({ type: 'ready' });",
    '}',
    'onmessage = function (e) {',
    '  var d = e.data;',
    "  if (d.type === 'init') { _init(d.pythonCode); return; }",
    "  if (d.type === 'analyze') {",
    '    try {',
    "      _pyodide.globals.set('_payload_json', d.payload);",
    "      var result = _pyodide.runPython('analyze(_payload_json)');",
    "      postMessage({ type: 'result', id: d.id, result: result });",
    '    } catch (err) {',
    "      postMessage({ type: 'error', id: d.id, error: String(err) });",
    '    }',
    '  }',
    '};',
  ].join('\n');

  var _workers = null;
  var _workersReady = null;
  var _callbacks = {};
  var _callId = 0;

  function _getWorkers() {
    if (_workersReady) return _workersReady;
    _workersReady = new Promise(function (resolve, reject) {
      var ws = [null, null];
      var ready = 0;

      function makeWorker(idx) {
        var blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
        var url = URL.createObjectURL(blob);
        var w = new Worker(url);
        URL.revokeObjectURL(url);

        w.addEventListener('message', function (e) {
          var d = e.data;
          if (d.type === 'ready') {
            ready += 1;
            if (ready === 2) { _workers = ws; resolve(ws); }
            return;
          }
          var cb = _callbacks[d.id];
          if (!cb) return;
          delete _callbacks[d.id];
          if (d.type === 'result') cb.resolve(JSON.parse(d.result));
          else cb.reject(new Error(d.error));
        });

        w.onerror = function (err) {
          _workersReady = null;
          _workers = null;
          reject(new Error('Pyodide worker failed: ' + (err.message || err)));
        };

        ws[idx] = w;
        w.postMessage({ type: 'init', pythonCode: ANALYSIS_PY });
      }

      makeWorker(0);
      makeWorker(1);
    });

    _workersReady.catch(function () {
      _workersReady = null;
      _workers = null;
    });

    return _workersReady;
  }

  function _dispatch(worker, payload) {
    return new Promise(function (resolve, reject) {
      var id = ++_callId;
      _callbacks[id] = { resolve: resolve, reject: reject };
      worker.postMessage({ type: 'analyze', id: id, payload: JSON.stringify(payload) });
    });
  }

  function _mergeSwitched(mc, bs) {
    var byN = {};
    (mc || []).forEach(function (r) {
      byN[r.n_samples] = { n_samples: r.n_samples, montecarlo_p_switched: r.montecarlo_p_switched };
    });
    (bs || []).forEach(function (r) {
      if (byN[r.n_samples]) byN[r.n_samples].bootstrap_p_switched = r.bootstrap_p_switched;
      else byN[r.n_samples] = { n_samples: r.n_samples, bootstrap_p_switched: r.bootstrap_p_switched };
    });
    return Object.values(byN).sort(function (a, b) { return a.n_samples - b.n_samples; });
  }

  function _mergeDecisionPaths(mcRows, bsRows) {
    var byStart = {};

    (mcRows || []).forEach(function (row) {
      byStart[row.start] = {
        start: row.start, start_label: row.start_label,
        start_factor: row.start_factor, start_value: row.start_value,
        step1_factors: row.step1_factors, global_best_model: row.global_best_model,
        is_global_best_start: row.is_global_best_start,
        montecarlo_p_step1_ok: row.p_step1_ok, bootstrap_p_step1_ok: 0,
        montecarlo_p_step2_ok: row.p_step2_ok, bootstrap_p_step2_ok: 0,
        montecarlo_p_reach_best: row.p_reach_best, bootstrap_p_reach_best: 0,
        branches: (row.branches || []).map(function (b) {
          return {
            step1_key: b.step1_key, step1_label: b.step1_label,
            is_global_best_step1: b.is_global_best_step1,
            montecarlo_p_step1: b.p_step1, bootstrap_p_step1: 0,
            step2_options: (b.step2_options || []).map(function (o) {
              return {
                step2_value: o.step2_value, step2_label: o.step2_label,
                is_global_best_step2: o.is_global_best_step2,
                montecarlo_p_step2: o.p_step2, bootstrap_p_step2: 0,
                montecarlo_p_reach_given_step2: o.p_reach_given_step2, bootstrap_p_reach_given_step2: 0,
                montecarlo_p_reach_joint: o.p_reach_joint, bootstrap_p_reach_joint: 0,
              };
            }),
          };
        }),
      };
    });

    (bsRows || []).forEach(function (row) {
      var entry = byStart[row.start];
      if (!entry) {
        entry = byStart[row.start] = {
          start: row.start, start_label: row.start_label,
          start_factor: row.start_factor, start_value: row.start_value,
          step1_factors: row.step1_factors, global_best_model: row.global_best_model,
          is_global_best_start: row.is_global_best_start,
          montecarlo_p_step1_ok: 0, bootstrap_p_step1_ok: row.p_step1_ok,
          montecarlo_p_step2_ok: 0, bootstrap_p_step2_ok: row.p_step2_ok,
          montecarlo_p_reach_best: 0, bootstrap_p_reach_best: row.p_reach_best,
          branches: [],
        };
      } else {
        entry.bootstrap_p_step1_ok = row.p_step1_ok;
        entry.bootstrap_p_step2_ok = row.p_step2_ok;
        entry.bootstrap_p_reach_best = row.p_reach_best;
      }
      var branchMap = {};
      entry.branches.forEach(function (b) { branchMap[b.step1_key] = b; });
      (row.branches || []).forEach(function (branch) {
        var bdst = branchMap[branch.step1_key];
        if (!bdst) {
          bdst = {
            step1_key: branch.step1_key, step1_label: branch.step1_label,
            is_global_best_step1: branch.is_global_best_step1,
            montecarlo_p_step1: 0, bootstrap_p_step1: branch.p_step1,
            step2_options: [],
          };
          branchMap[branch.step1_key] = bdst;
          entry.branches.push(bdst);
        } else {
          bdst.bootstrap_p_step1 = branch.p_step1;
        }
        var optMap = {};
        bdst.step2_options.forEach(function (o) { optMap[o.step2_value] = o; });
        (branch.step2_options || []).forEach(function (opt) {
          var odst = optMap[opt.step2_value];
          if (!odst) {
            odst = {
              step2_value: opt.step2_value, step2_label: opt.step2_label,
              is_global_best_step2: opt.is_global_best_step2,
              montecarlo_p_step2: 0, bootstrap_p_step2: 0,
              montecarlo_p_reach_given_step2: 0, bootstrap_p_reach_given_step2: 0,
              montecarlo_p_reach_joint: 0, bootstrap_p_reach_joint: 0,
            };
            optMap[opt.step2_value] = odst;
            bdst.step2_options.push(odst);
          }
          odst.bootstrap_p_step2 = opt.p_step2;
          odst.bootstrap_p_reach_given_step2 = opt.p_reach_given_step2;
          odst.bootstrap_p_reach_joint = opt.p_reach_joint;
        });
        bdst.step2_options.sort(function (a, b) { return String(a.step2_value) < String(b.step2_value) ? -1 : 1; });
      });
      entry.branches.sort(function (a, b) { return String(a.step1_key) < String(b.step1_key) ? -1 : 1; });
    });

    return Object.values(byStart).sort(function (a, b) { return String(a.start) < String(b.start) ? -1 : 1; });
  }

  async function analyze(payload) {
    var workers = await _getWorkers();
    var results = await Promise.all([
      _dispatch(workers[0], Object.assign({}, payload, { sim_method: 'mc' })),
      _dispatch(workers[1], Object.assign({}, payload, { sim_method: 'bs' })),
    ]);
    var mc = results[0];
    var bs = results[1];
    var mode = String(payload.analysis_mode || 'auto').toLowerCase().trim();
    return {
      expected_order: mc.expected_order,
      normality: mc.normality,
      switched: mode === 'ablation' ? [] : _mergeSwitched(mc.switched, bs.switched),
      decision_paths: mode === 'ablation' ? _mergeDecisionPaths(mc.decision_paths, bs.decision_paths) : [],
    };
  }

  window.PyodideAnalysis = { analyze: analyze };

  // Pre-warm both workers as soon as the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { _getWorkers().catch(function () {}); });
  } else {
    _getWorkers().catch(function () {});
  }
})();
