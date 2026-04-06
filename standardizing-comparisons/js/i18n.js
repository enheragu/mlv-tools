(function () {
  if (window.StandardizingComparisonsI18n) return;
  window.StandardizingComparisonsI18n = window.StatMlvaComparisonI18nCore.create({
    overrides: {
      en: {
        pageTitle: 'Standardizing Comparisons - ML Variance Analysis Tools',
        subtitle: 'Align metrics and protocols before comparing models',
        introTitle: 'Standardization workspace',
        introText: 'Single reported results often reflect one fortuitous run. The P90 or P95 percentile offers a fairer comparison metric: it accounts for variance, is easy to compute from just a few runs, and balances between optimistic peak performance and realistic expected behavior \\cite{heredia2026variance_analysis_ml}. Visualize the survival function \u2014 the probability that at least one of N training runs exceeds a given percentile \u2014 to plan how many repetitions are needed for a target confidence level (Section 4.1).',
        chartTitle: 'Survival function plot',
        resultsIntro: 'Two complementary methods are used: Monte Carlo assumes the data follows a normal distribution (parametric), while Bootstrap resamples directly from the observed data (non-parametric). The normality check below helps decide how much to trust Monte Carlo \u2014 if normality is weak, rely on Bootstrap as the robust reference.',
        simConfigText: 'Monte Carlo draws synthetic replicates from a fitted Gaussian, making it efficient and interpretable when normality holds. Bootstrap resamples with replacement from the real observations, so it remains valid regardless of the underlying distribution. Reporting both lets you assess sensitivity to parametric assumptions.',
        resultsMethodNote: 'The survival curves show the probability P(at least 1 > P_x) as a function of sample size N. With only 7 training runs, the probability of observing at least one value above the P90 threshold is nearly 50% on average across hyperparameter settings. Achieving P95 target performance does not require excessive runs either \u2014 with 13 runs there is a 20% probability.',
        normalityNote: 'Normality is assessed qualitatively (skewness, kurtosis, mean\u2013median gap) and quantitatively (Shapiro-Wilk test). The Shapiro-Wilk p-value tests the null hypothesis that the data come from a strict normal distribution: a low p-value (&lt;5%) rejects that hypothesis, but the test is very sensitive and flags even minor deviations without measuring effect size. If skewness and kurtosis remain moderate and mean \u2248 median, the data can still be considered reasonably normal for simulation purposes. In the paper, Bootstrap and Monte Carlo conclusions are consistent, confirming that the normality assumption does not materially affect the results \\cite{heredia2026variance_analysis_ml}.',
        samplingErrorTitle: 'Sampling error vs. sample size',
        samplingErrorNote: 'The sampling error (standard error) measures how much a statistic (mean or std) varies across repeated experiments. For the mean it decreases as \u03c3/\u221aN; for the standard deviation as \u03c3/\u221a(2(N\u22121)). Three estimation methods are shown: Analytical (closed-form formula \u2014 solid line), Bootstrap (resampling with replacement \u2014 dashed), and Monte Carlo (parametric sampling \u2014 dotted). The derivative highlights where diminishing returns set in (Section 4.2).',
        samplingErrorTabMean: 'Mean',
        samplingErrorTabStd: 'Std',
      },
      es: {
        pageTitle: 'Standardizing Comparisons - ML Variance Analysis Tools',
        subtitle: 'Alinea m\u00e9tricas y protocolos antes de comparar modelos',
        introTitle: 'Espacio de estandarizaci\u00f3n',
        introText: 'Un solo resultado publicado puede reflejar una ejecuci\u00f3n afortunada. El percentil P90 o P95 ofrece una m\u00e9trica de comparaci\u00f3n m\u00e1s justa: tiene en cuenta la varianza, es f\u00e1cil de calcular con pocas repeticiones y equilibra entre el rendimiento \u00f3ptimo y el comportamiento esperado realista \\cite{heredia2026variance_analysis_ml}. Visualiza la funci\u00f3n de supervivencia \u2014 la probabilidad de que al menos una de N ejecuciones supere un percentil dado \u2014 para planificar cu\u00e1ntas repeticiones se necesitan para un nivel de confianza objetivo (Secci\u00f3n 4.1).',
        chartTitle: 'Funci\u00f3n de supervivencia',
        resultsIntro: 'Se usan dos m\u00e9todos complementarios: Monte Carlo asume que los datos siguen una distribuci\u00f3n normal (param\u00e9trico), mientras que Bootstrap remuestrea directamente los datos observados (no param\u00e9trico). El test de normalidad de abajo ayuda a decidir cu\u00e1nto confiar en Monte Carlo \u2014 si la normalidad es d\u00e9bil, Bootstrap es la referencia robusta.',
        simConfigText: 'Monte Carlo genera r\u00e9plicas sint\u00e9ticas a partir de una Gaussiana ajustada, siendo eficiente e interpretable cuando se cumple la normalidad. Bootstrap remuestrea con reemplazo de las observaciones reales, por lo que es v\u00e1lido independientemente de la distribuci\u00f3n subyacente. Reportar ambos permite evaluar la sensibilidad a los supuestos param\u00e9tricos.',
        resultsMethodNote: 'Las curvas de supervivencia muestran la probabilidad P(al menos 1 > P_x) en funci\u00f3n del tama\u00f1o de muestra N. Con solo 7 ejecuciones de entrenamiento, la probabilidad de observar al menos un valor por encima del umbral P90 es de casi el 50% de media entre configuraciones de hiperpar\u00e1metros. Alcanzar el rendimiento objetivo P95 tampoco requiere un n\u00famero excesivo de ejecuciones \u2014 con 13 ejecuciones hay un 20% de probabilidad.',
        normalityNote: 'La normalidad se eval\u00faa cualitativamente (asimetr\u00eda, curtosis, diferencia media\u2013mediana) y cuantitativamente (test de Shapiro-Wilk). El p-valor de Shapiro-Wilk contrasta la hip\u00f3tesis nula de que los datos proceden de una normal estricta: un p-valor bajo (&lt;5%) la rechaza, pero el test es muy sensible y se\u00f1ala incluso desviaciones menores sin medir el tama\u00f1o del efecto. Si la asimetr\u00eda y la curtosis se mantienen moderadas y media \u2248 mediana, los datos pueden considerarse razonablemente normales para las simulaciones. En el art\u00edculo, las conclusiones de Bootstrap y Monte Carlo son consistentes, confirmando que la asunci\u00f3n de normalidad no afecta materialmente a los resultados \\cite{heredia2026variance_analysis_ml}.',
        samplingErrorTitle: 'Error de muestreo vs. tama\u00f1o de muestra',
        samplingErrorNote: 'El error de muestreo (error est\u00e1ndar) mide cu\u00e1nto var\u00eda un estad\u00edstico (media o desviaci\u00f3n t\u00edpica) entre experimentos repetidos. Para la media decrece como \u03c3/\u221aN; para la desviaci\u00f3n t\u00edpica como \u03c3/\u221a(2(N\u22121)). Se muestran tres m\u00e9todos de estimaci\u00f3n: Anal\u00edtico (f\u00f3rmula cerrada \u2014 l\u00ednea continua), Bootstrap (remuestreo con reemplazo \u2014 discontinua) y Monte Carlo (muestreo param\u00e9trico \u2014 punteada). La derivada resalta d\u00f3nde se alcanzan rendimientos decrecientes (Secci\u00f3n 4.2).',
        samplingErrorTabMean: 'Media',
        samplingErrorTabStd: 'Desv. t\u00edpica',
      }
    }
  });
})();
