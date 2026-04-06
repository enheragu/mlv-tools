# Tool Core

Shared utilities for mlv-tools pages. All tools use `comparison-app-core.js` as the state machine, initialized via a per-tool `bootstrap.js`.

## Module map

```
tool-core.js              StatToolCore      — YAML parsing, order policies, autoselection
mlva/
  ui-core.js              StatMlvaUiCore    — tab/checklist renderers
  simulation-core.js      StatMlvaSimulationCore — API payload + fetch
  page-shell.js           StatMlvaPageShell — page init (theme, i18n, related-work)
  comparison-app-core.js  StatMlvaComparisonCore — full state machine, model summary,
                                                    normality, simulation, decision tree
  comparison-i18n-core.js StatMlvaComparisonI18nCore — bilingual string factory
  comparison-shell.css    — layout for comparison tools
```

## Per-tool file structure

```
<tool-name>/
  index.html
  css/style.css
  js/
    tool-config.js   — presets, metrics, order/autoselect policies
    i18n.js          — StatMlvaComparisonI18nCore.create({ overrides })
    bootstrap.js     — StatMlvaComparisonCore.init({ toolConfig, i18nApi, ... })
```

No standalone `app.js` — all tools wire through `comparison-app-core.js`.

## Adding shared logic

Add helpers to `tool-core.js` only when at least two tools need the same function. Tool-specific logic stays in the tool's own JS files.

See `docs/projects/MLV_TOOLS_GUIDE.md` for the full reference.
