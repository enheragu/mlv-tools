# Changelog

All notable changes to this project are documented in this file. The format follows the spirit of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/): an `[Unreleased]` section plus
versioned, dated entries in reverse-chronological order (SemVer), with changes listed as
flat bullets prefixed by type (`Bugfix:`, `Feature:`, …) rather than grouped into
Added/Changed/Fixed sections. Each release links to its git tag. The versions before this file
existed were reconstructed from the git history.

Versioning note: minor releases mark visible feature jumps; patch releases cover bugfixes and
maintenance updates, including text and style polish that does not change behavior.

## [1.2.2](https://github.com/enheragu/mlv-tools/releases/tag/v1.2.2) - 2026-11-06
- License: the code is released under the MIT License, except the sample images of the Model & Data Inspector, which keep the licenses of MNIST and KAIST, shown next to them (v1.0.0 was deposited in Zenodo under CC BY 4.0).
- Docs: citation metadata, Zenodo DOI badge, *How to cite* section and this changelog.
- Bugfix: a tie between two models no longer counts as a switched order in the replication simulations; only a strict inversion does, as in the analysis code of the MNIST article. Ties are frequent in MNIST accuracies, so some Bootstrap probabilities drop (CNN_14L against its batch size 25 variant goes from 0.71 to 0.66 with one run per model). The optional local API applies the same rule.
- Data: the CPC18 variance decomposition reports the paired diagonal (each initialization seed with its own data-order seed, the regime of a single training stream), as the article does; BourginMLP goes from 0.307 to 0.357.
- Data: the object detection cases hold only the valid YOLOv8 runs of the per-trial data deposit of the MNIST article (269 runs in 10 groups, exported from the deposit in the order of the figures of the article), so the viewer shows the same runs as the article; the four groups without valid runs are gone and the LLVIP ablation keeps 195 runs. The MNIST files are regenerated from the same deposit, with no change in their values.
- Cleanup: the detection cases of Standardizing Comparisons no longer load a second file with the LLVIP groups, which duplicated the first one and was ignored.
- Docs: the related work section and the data folder cite the archived training and analysis code of the articles by DOI; the per-trial data deposits will follow when their articles are published.

## [1.2.1](https://github.com/enheragu/mlv-tools/releases/tag/v1.2.1) - 2026-10-26
- Bugfix: the landing and About pages were blank in production after the July theme refactor, because their scripts were loaded from a path that does not exist on the published site; they now load through the shared theme.
- Refactor: more of the layout and styles come from the shared theme, removing duplicated code.
- Docs: corrected Spanish wording.

## [1.2.0](https://github.com/enheragu/mlv-tools/releases/tag/v1.2.0) - 2026-06-25
- Feature: CPC18 (Choice Prediction Competition 2018, prediction of risky choices scored by MSE, lower is better) as a new case in the four tools, with every model retrained over 800 random seeds.
- Feature: "CPC18 - variance sources" case in Replication and Comparison: models retrained over a grid of initialization × data-order seeds, with heatmaps that split the variance between both sources and their interaction.
- UI: CPC18 histograms focus on the relevant range instead of the outliers; introductions rewritten to be more descriptive and less repetitive.

## [1.1.0](https://github.com/enheragu/mlv-tools/releases/tag/v1.1.0) - 2026-05-29
- Feature: About page with the context of the study and the research group.
- UI: text sizes and title styles taken from the shared theme, without the local fallbacks that could drift from it.
- Bugfix: asset paths of the online version, and a stray title in the landing page.

## [1.0.0](https://github.com/enheragu/mlv-tools/releases/tag/v1.0.0) - 2026-05-18
- Docs: texts and translations aligned with the final version of the paper "The Impact of Performance Variability on Neural Network Evaluation and its Implications for Model Design".
- First release, archived in Zenodo by manual upload, [10.5281/zenodo.20268238](https://doi.org/10.5281/zenodo.20268238).

## [0.4.0](https://github.com/enheragu/mlv-tools/releases/tag/v0.4.0) - 2026-05-04
- Feature: new Model & Data Inspector, with the architecture diagrams, parameter counts, dataset reference and sample images of every model in the study; diagrams follow the light/dark theme.
- Bugfix: the ablation tree shows all its branches, and results render only when the whole computation has finished.
- UI: refreshed og-images.

## [0.3.0](https://github.com/enheragu/mlv-tools/releases/tag/v0.3.0) - 2026-04-27
- UI: plots are read-only in the compact view and support pan, zoom and reset when maximized.
- Bugfix: switching language re-renders the tools correctly.

## [0.2.0](https://github.com/enheragu/mlv-tools/releases/tag/v0.2.0) - 2026-04-24
- Feature: the analyses run in the browser with Pyodide, with a vectorized ablation tree and Monte Carlo and Bootstrap in two parallel instances for faster results.
- UI: Standardizing Comparisons plots share a common legend and behavior; og-images, favicon, sitemap and metadata for search engines.
- Bugfix: script loading in the online deployment and the CI check of the Python backend.

## [0.1.0](https://github.com/enheragu/mlv-tools/releases/tag/v0.1.0) - 2026-04-06
- First version: landing page with Replication and Comparison, Ablation Tests and Standardizing Comparisons.
