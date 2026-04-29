(function () {
  if (window.ModelInspectorApp) return;

  var state = {
    preset: 'mnist',
    sortKey: null,
    sortDir: 1,
    diagramModelName: null
  };

  // ============================================================
  // MODEL DATA
  // ============================================================

  var MODELS = {
    mnist: [
      { name: 'SimplePerceptron',        type: 'Perceptron',        layers: 2,  params: 7850,      memory: 0.03, hasDiagram: true },
      { name: 'HiddenLayerPerceptron',   type: 'MLP',               layers: 3,  params: 636010,    memory: 2.4,  hasDiagram: true },
      { name: 'DNN_6L',                  type: 'DNN',               layers: 7,  params: 11972510,  memory: 45.7, hasDiagram: true },
      { name: 'CNN_3L',                  type: 'CNN',               layers: 14, params: 239006,    memory: 0.9,  hasDiagram: true },
      { name: 'CNN_4L',                  type: 'CNN',               layers: 16, params: 528306,    memory: 2.0,  hasDiagram: true },
      { name: 'CNN_5L',                  type: 'CNN',               layers: 20, params: 534270,    memory: 2.0,  hasDiagram: true },
      { name: 'CNN_14L',                 type: 'CNN',               layers: 47, params: 5497226,   memory: 21.0, hasDiagram: true },
      { name: 'BatchNormMaxoutNetInNet', type: 'CNN (MaxOut-NIN)',   layers: 46, params: 425220,    memory: 1.6,  hasDiagram: true }
    ],
    detection: [
      { name: 'YOLOCh3m', type: 'Object Detector (YOLOv8m)', layers: 295, params: 25858057, memory: 98.7, hasDiagram: false,
        externalRef: 'https://docs.ultralytics.com/models/yolov8/' }
    ]
  };

  // ============================================================
  // DATASET DATA
  // ============================================================

  var DATASETS = {
    mnist: {
      name: 'MNIST',
      fullName: 'Modified National Institute of Standards and Technology',
      year: 1998,
      authors: 'LeCun, Y., Bottou, L., Bengio, Y. &amp; Haffner, P.',
      citation: 'LeCun, Y., Bottou, L., Bengio, Y. &amp; Haffner, P. (1998). Gradient-Based Learning Applied to Document Recognition. <em>Proceedings of the IEEE</em>, 86(11), 2278–2324.',
      stats: [
        { label: 'Training samples', label_es: 'Muestras de entrenamiento', value: '60,000' },
        { label: 'Test samples',     label_es: 'Muestras de test',          value: '10,000' },
        { label: 'Image size',       label_es: 'Tamaño de imagen',          value: '28 × 28 px, grayscale' },
        { label: 'Classes',          label_es: 'Clases',                    value: '10 (digits 0–9)' },
        { label: 'Format',           label_es: 'Formato',                   value: 'Grayscale PNG / IDX binary' }
      ],
      sampleDir: 'assets/sample-images/mnist/',
      sampleFiles: [
        'image_0.png', 'image_1.png', 'image_2.png', 'image_3.png',
        'image_4.png', 'image_5.png', 'image_7.png', 'image_13.png',
        'image_15.png', 'image_17.png'
      ],
      sampleGroups: null
    },
    detection: {
      name: 'KAIST',
      fullName: 'KAIST Multispectral Pedestrian Detection Benchmark',
      year: 2015,
      authors: 'Hwang, S., Park, J., Kim, N., Choi, Y. &amp; Kweon, I. S.',
      citation: 'Hwang, S., Park, J., Kim, N., Choi, Y. &amp; Kweon, I. S. (2015). Multispectral Pedestrian Detection: Benchmark Dataset and Baselines. <em>Proceedings of CVPR 2015</em>.',
      stats: [
        { label: 'Image pairs',  label_es: 'Pares de imágenes', value: '95,000+' },
        { label: 'Modalities',   label_es: 'Modalidades',       value: 'RGB (visible) + LWIR (thermal)' },
        { label: 'Scenarios',    label_es: 'Escenarios',        value: 'Day and night, outdoor' },
        { label: 'Task',         label_es: 'Tarea',             value: 'Pedestrian detection' },
        { label: 'Model',        label_es: 'Modelo',            value: 'YOLOv8 with multiple fusion strategies' }
      ],
      sampleDir: 'assets/sample-images/kaist/',
      sampleGroups: [
        { key: 'kaistDay', pairs: [
          { rgb: { subdir: 'day-rgb/',   file: 'train_set00_V000_visible_I01689.png' },
            lwir: { subdir: 'day-lwir/', file: 'train_set00_V000_lwir_I01689.jpg'    } },
          { rgb: { subdir: 'day-rgb/',   file: 'train_set02_V004_visible_I00451.png' },
            lwir: { subdir: 'day-lwir/', file: 'train_set02_V004_lwir_I00451.jpg'    } }
        ]},
        { key: 'kaistNight', pairs: [
          { rgb: { subdir: 'night-rgb/',   file: 'test_set03_V000_visible_I00947.png'  },
            lwir: { subdir: 'night-lwir/', file: 'test_set03_V000_lwir_I00947.jpg'     } },
          { rgb: { subdir: 'night-rgb/',   file: 'train_set05_V000_visible_I00451.png' },
            lwir: { subdir: 'night-lwir/', file: 'train_set05_V000_lwir_I00451.jpg'    } }
        ]}
      ]
    }
  };

  // ============================================================
  // LIGHTBOX
  // ============================================================

  var lbItems = [];        // { src, text } – flat list for current preset
  var lbIndex = -1;

  function lbOpen(idx) {
    if (idx < 0 || idx >= lbItems.length) return;
    lbIndex = idx;
    var item = lbItems[idx];
    var lb    = document.getElementById('inspector-lightbox');
    var img   = document.getElementById('inspector-lb-img');
    var cap   = document.getElementById('inspector-lb-caption');
    var ctr   = document.getElementById('inspector-lb-counter');
    if (!lb || !img) return;

    img.style.visibility = 'hidden';
    img.removeAttribute('src');
    img.alt = '';
    if (item.pixelArt) {
      img.setAttribute('data-pixel-art', '1');
    } else {
      img.removeAttribute('data-pixel-art');
    }
    lb.classList.add('active', 'is-loading');
    document.body.style.overflow = 'hidden';

    if (cap) cap.textContent = item.text;
    if (ctr) ctr.textContent = (idx + 1) + ' / ' + lbItems.length;

    var loader = new Image();
    loader.onload = function () {
      if (lbIndex !== idx) return;
      img.src = item.src;
      img.alt = item.text;
      img.style.visibility = '';
      lb.classList.remove('is-loading');
    };
    loader.onerror = loader.onload;
    loader.src = item.src;
  }

  function lbClose() {
    var lb  = document.getElementById('inspector-lightbox');
    var img = document.getElementById('inspector-lb-img');
    if (lb) lb.classList.remove('active', 'is-loading');
    if (img) { img.removeAttribute('src'); img.style.visibility = ''; }
    document.body.style.overflow = '';
    lbIndex = -1;
  }

  function lbNav(dir) {
    if (!lbItems.length) return;
    lbOpen((lbIndex + dir + lbItems.length) % lbItems.length);
  }

  // ============================================================
  // MERMAID DIAGRAM SOURCES
  // ============================================================

  var DIAGRAMS = {
    SimplePerceptron: `graph TD
    input_image("Input Image (28x28, 1ch)"):::noBox
    Linear_fc1("<b>Linear</b>(784, 10)"):::blockStyle
    output("Output (10)"):::noBox

    classDef blockStyle fill:#0171ba4D,stroke:#0171ba,stroke-width:2px
    classDef noBox fill:none,stroke:none;

    input_image --> Linear_fc1
    Linear_fc1 --> output`,

    HiddenLayerPerceptron: `graph TD
    input_image("Input Image (28x28, 1ch)"):::noBox
    Linear_fc1("<b>Linear</b>(784, 800)"):::blockStyle
    Linear_fc2("<b>Linear</b>(800, 10)"):::blockStyle
    output("Output (10)"):::noBox

    classDef blockStyle fill:#0171ba4D,stroke:#0171ba,stroke-width:2px
    classDef noBox fill:none,stroke:none;

    input_image --> Linear_fc1
    Linear_fc1 --> Linear_fc2
    Linear_fc2 --> output`,

    DNN_6L: `graph TD
    input_image("Input Image (28x28, 1ch)"):::noBox
    Linear_fc1("<b>Linear</b>(784, 2500)"):::blockStyle
    Linear_fc2("<b>Linear</b>(2500, 2000)"):::blockStyle
    Linear_fc3("<b>Linear</b>(2000, 1500)"):::blockStyle
    Linear_fc4("<b>Linear</b>(1500, 1000)"):::blockStyle
    Linear_fc5("<b>Linear</b>(1000, 500)"):::blockStyle
    Linear_fc6("<b>Linear</b>(500, 10)"):::blockStyle
    output("Output (10)"):::noBox

    classDef blockStyle fill:#0171ba4D,stroke:#0171ba,stroke-width:2px
    classDef noBox fill:none,stroke:none;

    input_image --> Linear_fc1
    Linear_fc1 --> Linear_fc2
    Linear_fc2 --> Linear_fc3
    Linear_fc3 --> Linear_fc4
    Linear_fc4 --> Linear_fc5
    Linear_fc5 --> Linear_fc6
    Linear_fc6 --> output`,

    CNN_3L: `graph TD
    input_image("Input Image (28x28, 1ch)"):::noBox
    Conv2d_0("<b>Conv2d</b>((5, 5), 64ch); <b>BatchNorm2d</b>(64); <b>ReLU</b>"):::blockStyle
    MaxPool2d_3("<b>MaxPool2d</b>(2)"):::blockStyle
    Conv2d_4("<b>Conv2d</b>((5, 5), 128ch); <b>BatchNorm2d</b>(128); <b>ReLU</b>"):::blockStyle
    MaxPool2d_7("<b>MaxPool2d</b>(2)"):::blockStyle
    Linear_0("<b>Linear</b>(3200, 10); <b>BatchNorm1d</b>(10)"):::blockStyle
    output("Output (10)"):::noBox

    classDef blockStyle fill:#0171ba4D,stroke:#0171ba,stroke-width:2px
    classDef noBox fill:none,stroke:none;

    input_image --> Conv2d_0
    Conv2d_0 --> MaxPool2d_3
    MaxPool2d_3 --> Conv2d_4
    Conv2d_4 --> MaxPool2d_7
    MaxPool2d_7 --> Linear_0
    Linear_0 --> output`,

    CNN_4L: `graph TD
    input_image("Input Image (28x28, 1ch)"):::noBox
    Conv2d_0("<b>Conv2d</b>((5, 5), 64ch); <b>BatchNorm2d</b>(64); <b>ReLU</b>"):::blockStyle
    MaxPool2d_3("<b>MaxPool2d</b>(2)"):::blockStyle
    Conv2d_4("<b>Conv2d</b>((5, 5), 128ch); <b>BatchNorm2d</b>(128); <b>ReLU</b>"):::blockStyle
    MaxPool2d_7("<b>MaxPool2d</b>(2)"):::blockStyle
    Linear_0("<b>Linear</b>(3200, 100); <b>BatchNorm1d</b>(100)"):::blockStyle
    Linear_2("<b>Linear</b>(100, 10); <b>BatchNorm1d</b>(10)"):::blockStyle
    output("Output (10)"):::noBox

    classDef blockStyle fill:#0171ba4D,stroke:#0171ba,stroke-width:2px
    classDef noBox fill:none,stroke:none;

    input_image --> Conv2d_0
    Conv2d_0 --> MaxPool2d_3
    MaxPool2d_3 --> Conv2d_4
    Conv2d_4 --> MaxPool2d_7
    MaxPool2d_7 --> Linear_0
    Linear_0 --> Linear_2
    Linear_2 --> output`,

    CNN_5L: `graph TD
    input_image("Input Image (28x28, 1ch)"):::noBox
    Conv2d_0("<b>Conv2d</b>((5, 5), 32ch); <b>BatchNorm2d</b>(32); <b>ReLU</b>"):::blockStyle
    Conv2d_3("<b>Conv2d</b>((5, 5), 64ch); <b>BatchNorm2d</b>(64); <b>ReLU</b>"):::blockStyle
    MaxPool2d_6("<b>MaxPool2d</b>(2)"):::blockStyle
    Conv2d_7("<b>Conv2d</b>((5, 5), 96ch); <b>BatchNorm2d</b>(96); <b>ReLU</b>"):::blockStyle
    Conv2d_10("<b>Conv2d</b>((5, 5), 128ch); <b>BatchNorm2d</b>(128); <b>ReLU</b>"):::blockStyle
    MaxPool2d_13("<b>MaxPool2d</b>(2)"):::blockStyle
    Linear_0("<b>Linear</b>(2048, 10); <b>BatchNorm1d</b>(10)"):::blockStyle
    output("Output (10)"):::noBox

    classDef blockStyle fill:#0171ba4D,stroke:#0171ba,stroke-width:2px
    classDef noBox fill:none,stroke:none;

    input_image --> Conv2d_0
    Conv2d_0 --> Conv2d_3
    Conv2d_3 --> MaxPool2d_6
    MaxPool2d_6 --> Conv2d_7
    Conv2d_7 --> Conv2d_10
    Conv2d_10 --> MaxPool2d_13
    MaxPool2d_13 --> Linear_0
    Linear_0 --> output`,

    CNN_14L: `graph TD
    input_image("Input Image (28x28, 1ch)"):::noBox
    Conv2d_0("<b>Conv2d</b>((3, 3), 64ch); <b>BatchNorm2d</b>(64); <b>ReLU</b>"):::blockStyle
    Conv2d_3("<b>Conv2d</b>((3, 3), 128ch); <b>BatchNorm2d</b>(128); <b>ReLU</b>"):::blockStyle
    MaxPool2d_6("<b>MaxPool2d</b>(2)"):::blockStyle
    subgraph subgraph_4 [" "]
        subgraph_4_count("<b>x4</b>"):::noBox
        subgraph_4_block("<b>Conv2d</b>((3, 3), 128ch); <b>BatchNorm2d</b>(128); <b>ReLU</b>"):::blockStyle
    end
    style subgraph_4 fill:#a664974D,stroke:#a66497,stroke-width:2px,rx:10px,ry:10px
    Conv2d_19("<b>Conv2d</b>((3, 3), 256ch); <b>BatchNorm2d</b>(256); <b>ReLU</b>"):::blockStyle
    MaxPool2d_22("<b>MaxPool2d</b>(2)"):::blockStyle
    subgraph subgraph_10 [" "]
        subgraph_10_count("<b>x2</b>"):::noBox
        subgraph_10_block("<b>Conv2d</b>((3, 3), 256ch); <b>BatchNorm2d</b>(256); <b>ReLU</b>"):::blockStyle
    end
    style subgraph_10 fill:#a664974D,stroke:#a66497,stroke-width:2px,rx:10px,ry:10px
    Conv2d_29("<b>Conv2d</b>((3, 3), 512ch); <b>BatchNorm2d</b>(512); <b>ReLU</b>"):::blockStyle
    Conv2d_32("<b>Conv2d</b>((1, 1), 2048ch); <b>BatchNorm2d</b>(2048); <b>ReLU</b>"):::blockStyle
    Conv2d_35("<b>Conv2d</b>((1, 1), 256ch); <b>BatchNorm2d</b>(256); <b>ReLU</b>"):::blockStyle
    MaxPool2d_38("<b>MaxPool2d</b>(2)"):::blockStyle
    Conv2d_39("<b>Conv2d</b>((3, 3), 256ch); <b>BatchNorm2d</b>(256); <b>ReLU</b>"):::blockStyle
    Linear_0("<b>Linear</b>(256, 10)"):::blockStyle
    output("Output (10)"):::noBox

    classDef blockStyle fill:#0171ba4D,stroke:#0171ba,stroke-width:2px
    classDef noBox fill:none,stroke:none;

    input_image --> Conv2d_0
    Conv2d_0 --> Conv2d_3
    Conv2d_3 --> MaxPool2d_6
    MaxPool2d_6 --> subgraph_4
    subgraph_4 --> Conv2d_19
    Conv2d_19 --> MaxPool2d_22
    MaxPool2d_22 --> subgraph_10
    subgraph_10 --> Conv2d_29
    Conv2d_29 --> Conv2d_32
    Conv2d_32 --> Conv2d_35
    Conv2d_35 --> MaxPool2d_38
    MaxPool2d_38 --> Conv2d_39
    Conv2d_39 --> Linear_0
    Linear_0 --> output`,

    BatchNormMaxoutNetInNet: `graph TD
    input_image("Input Image (28x28, 1ch)"):::noBox
    Conv2d_b1("<b>Conv2d</b>((5, 5), 128ch); <b>BatchNorm2d</b>(128)"):::blockStyle
    mlp1_b1_conv("<b>Conv2d</b>((1, 1), 96ch)"):::blockStyle
    mlp1_b1_max("<b>MaxOutLayer</b>(96, 96; k=5); <b>BatchNorm2d</b>(96)"):::blockStyle
    mlp2_b1_conv("<b>Conv2d</b>((1, 1), 48ch)"):::blockStyle
    mlp2_b1_max("<b>MaxOutLayer</b>(48, 48; k=5); <b>BatchNorm2d</b>(48)"):::blockStyle
    pool_b1("<b>AvgPool2d</b>(3; s:2, p=0)"):::blockStyle
    drop_b1("<b>Dropout</b>(0.5)"):::blockStyle
    Conv2d_b2("<b>Conv2d</b>((5, 5), 128ch); <b>BatchNorm2d</b>(128)"):::blockStyle
    mlp1_b2_conv("<b>Conv2d</b>((1, 1), 96ch)"):::blockStyle
    mlp1_b2_max("<b>MaxOutLayer</b>(96, 96; k=5); <b>BatchNorm2d</b>(96)"):::blockStyle
    mlp2_b2_conv("<b>Conv2d</b>((1, 1), 48ch)"):::blockStyle
    mlp2_b2_max("<b>MaxOutLayer</b>(48, 48; k=5); <b>BatchNorm2d</b>(48)"):::blockStyle
    pool_b2("<b>AvgPool2d</b>(3; s:2, p=0)"):::blockStyle
    drop_b2("<b>Dropout</b>(0.5)"):::blockStyle
    Conv2d_b3("<b>Conv2d</b>((3, 3), 128ch); <b>BatchNorm2d</b>(128)"):::blockStyle
    mlp1_b3_conv("<b>Conv2d</b>((1, 1), 96ch)"):::blockStyle
    mlp1_b3_max("<b>MaxOutLayer</b>(96, 96; k=5); <b>BatchNorm2d</b>(96)"):::blockStyle
    mlp2_b3_conv("<b>Conv2d</b>((1, 1), 10ch)"):::blockStyle
    mlp2_b3_max("<b>MaxOutLayer</b>(10, 10; k=5); <b>BatchNorm2d</b>(10)"):::blockStyle
    pool_b3("<b>AvgPool2d</b>(1; s:1, p=0)"):::blockStyle
    drop_b3("<b>Dropout</b>(0.0)"):::blockStyle
    output("Output (10)"):::noBox

    classDef blockStyle fill:#0171ba4D,stroke:#0171ba,stroke-width:2px
    classDef noBox fill:none,stroke:none;

    input_image --> Conv2d_b1
    Conv2d_b1 --> mlp1_b1_conv
    mlp1_b1_conv --> mlp1_b1_max
    mlp1_b1_max --> mlp2_b1_conv
    mlp2_b1_conv --> mlp2_b1_max
    mlp2_b1_max --> pool_b1
    pool_b1 --> drop_b1
    drop_b1 --> Conv2d_b2
    Conv2d_b2 --> mlp1_b2_conv
    mlp1_b2_conv --> mlp1_b2_max
    mlp1_b2_max --> mlp2_b2_conv
    mlp2_b2_conv --> mlp2_b2_max
    mlp2_b2_max --> pool_b2
    pool_b2 --> drop_b2
    drop_b2 --> Conv2d_b3
    Conv2d_b3 --> mlp1_b3_conv
    mlp1_b3_conv --> mlp1_b3_max
    mlp1_b3_max --> mlp2_b3_conv
    mlp2_b3_conv --> mlp2_b3_max
    mlp2_b3_max --> pool_b3
    pool_b3 --> drop_b3
    drop_b3 --> output`
  };

  // ============================================================
  // HELPERS
  // ============================================================

  function getCopy() {
    if (window.ModelInspectorI18n) return window.ModelInspectorI18n.getCopy(window.ModelInspectorI18n.getLang());
    return {};
  }

  function getLang() {
    return window.ModelInspectorI18n ? window.ModelInspectorI18n.getLang() : 'en';
  }

  function fmtParams(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + ' M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' K';
    return String(n);
  }

  function fmtMemory(n) {
    if (n === null || n === undefined) return '—';
    if (n < 0.1) return '< 0.1 MB';
    return n.toFixed(1) + ' MB';
  }

  function fmtLayers(n) {
    return (n !== null && n !== undefined) ? String(n) : '—';
  }

  function isDark() {
    return document.body.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark';
  }

  // ============================================================
  // MERMAID
  // ============================================================

  function mermaidTheme() {
    return isDark() ? 'dark' : 'default';
  }

  var diagramCounter = 0;

  function renderMermaidInto(container, src) {
    if (!window.mermaid) {
      container.textContent = 'Mermaid not loaded.';
      return;
    }
    mermaid.initialize({ startOnLoad: false, theme: mermaidTheme(), securityLevel: 'loose' });
    var id = 'mi-diagram-' + (++diagramCounter);
    mermaid.render(id, src).then(function (result) {
      container.innerHTML = result.svg;
    }).catch(function (err) {
      container.textContent = 'Error rendering diagram.';
      console.error('[ModelInspector] mermaid render error:', err);
    });
  }

  function openDiagramModal(modelName) {
    var src = DIAGRAMS[modelName];
    if (!src) return;
    var overlay = document.getElementById('diagram-modal-overlay');
    var titleEl = document.getElementById('diagram-modal-title');
    var contentEl = document.getElementById('diagram-modal-content');
    if (!overlay || !contentEl) return;
    state.diagramModelName = modelName;
    if (titleEl) titleEl.textContent = modelName + ' — ' + (getCopy().diagramTitle || 'Architecture diagram');
    contentEl.innerHTML = '<p class="diagram-loading">' + (getCopy().diagramLoading || 'Rendering…') + '</p>';
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderMermaidInto(contentEl, src);
  }

  function closeDiagramModal() {
    var overlay = document.getElementById('diagram-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
    state.diagramModelName = null;
  }

  // ============================================================
  // MODEL TABLE
  // ============================================================

  function getSortedModels() {
    var models = (MODELS[state.preset] || []).slice();
    if (!state.sortKey) return models;
    var key = state.sortKey;
    var dir = state.sortDir;
    models.sort(function (a, b) {
      var va = a[key], vb = b[key];
      if (va === null || va === undefined) va = dir > 0 ? Infinity : -Infinity;
      if (vb === null || vb === undefined) vb = dir > 0 ? Infinity : -Infinity;
      return va < vb ? -dir : va > vb ? dir : 0;
    });
    return models;
  }

  function thClass(key) {
    var cls = 'inspector-sortable';
    if (state.sortKey === key) cls += ' sort-' + (state.sortDir > 0 ? 'asc' : 'desc');
    return cls;
  }

  function thAriaSort(key) {
    if (state.sortKey !== key) return '';
    return ' aria-sort="' + (state.sortDir > 0 ? 'ascending' : 'descending') + '"';
  }

  function renderTable() {
    var copy = getCopy();
    var section = document.getElementById('model-table-section');
    if (!section) return;

    var models = getSortedModels();

    var rows = models.map(function (m) {
      var archCell;
      if (m.hasDiagram) {
        archCell = '<button class="btn-ghost btn-sm btn-diagram" data-model="' + m.name + '">' +
          (copy.viewDiagram || 'View') + '</button>';
      } else if (m.externalRef) {
        archCell = '<a href="' + m.externalRef + '" target="_blank" rel="noopener noreferrer" class="btn-ghost btn-sm">' +
          (copy.externalDocs || 'Docs') + '</a>';
      } else {
        archCell = '—';
      }
      return '<tr>' +
        '<td class="col-name">' + m.name + '</td>' +
        '<td class="col-type">' + m.type + '</td>' +
        '<td class="col-layers">' + fmtLayers(m.layers) + '</td>' +
        '<td class="col-params">' + fmtParams(m.params) + '</td>' +
        '<td class="col-memory">' + fmtMemory(m.memory) + '</td>' +
        '<td class="col-arch">' + archCell + '</td>' +
        '</tr>';
    }).join('');

    // For detection, add a note below the (single-row) table
    var noteHtml = '';
    if (state.preset === 'detection' && copy.detectionModelNote) {
      noteHtml = '<p class="inspector-model-note">' + copy.detectionModelNote + '</p>';
    }

    section.innerHTML =
      '<div class="inspector-card panel card">' +
        '<h3 class="shared-card-title inspector-table-title">' + (copy.modelTableTitle || 'Models') + '</h3>' +
        '<div class="inspector-table-wrap">' +
          '<table class="inspector-table" role="grid">' +
            '<thead><tr>' +
              '<th scope="col">' + (copy.colModel || 'Model') + '</th>' +
              '<th scope="col">' + (copy.colType || 'Type') + '</th>' +
              '<th scope="col" class="' + thClass('layers') + '"' + thAriaSort('layers') + ' data-sort-key="layers">' + (copy.colLayers || 'Layers') + '</th>' +
              '<th scope="col" class="' + thClass('params') + '"' + thAriaSort('params') + ' data-sort-key="params">' + (copy.colParams || 'Parameters') + '</th>' +
              '<th scope="col" class="' + thClass('memory') + '"' + thAriaSort('memory') + ' data-sort-key="memory">' + (copy.colMemory || 'Memory') + '</th>' +
              '<th scope="col">' + (copy.colArch || 'Architecture') + '</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
        noteHtml +
      '</div>';

    section.querySelectorAll('th[data-sort-key]').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort-key');
        if (state.sortKey === key) {
          state.sortDir = -state.sortDir;
        } else {
          state.sortKey = key;
          state.sortDir = 1;
        }
        renderTable();
      });
    });

    section.querySelectorAll('.btn-diagram').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openDiagramModal(btn.getAttribute('data-model'));
      });
    });
  }

  // ============================================================
  // DATASET INFO
  // ============================================================

  function renderDatasetInfo() {
    var copy = getCopy();
    var lang = getLang();
    var dataset = DATASETS[state.preset];
    var section = document.getElementById('dataset-info-section');
    if (!section || !dataset) return;

    var statsHtml = dataset.stats.map(function (s) {
      var label = (lang === 'es' && s.label_es) ? s.label_es : s.label;
      return '<tr><th scope="row">' + label + '</th><td>' + s.value + '</td></tr>';
    }).join('');

    lbItems = [];
    var imagesHtml;
    if (dataset.sampleGroups) {
      // KAIST: paired RGB+LWIR groups
      imagesHtml = dataset.sampleGroups.map(function (g) {
        var groupLabel = copy[g.key] || g.key;
        var pairsHtml = (g.pairs || []).map(function (pair, pIdx) {
          function makeItem(side, modality) {
            var src  = dataset.sampleDir + side.subdir + side.file;
            var text = groupLabel + ' · scene ' + (pIdx + 1) + ' — ' + modality;
            var idx  = lbItems.length;
            lbItems.push({ src: src, text: text });
            return '<div class="gallery-item kaist-cell" data-lb-idx="' + idx + '">' +
              '<img src="' + src + '" alt="' + text + '" loading="lazy">' +
              '<div class="gallery-item-overlay"><span>' + modality + '</span></div>' +
              '</div>';
          }
          return '<div class="kaist-pair">' +
            makeItem(pair.rgb, 'RGB') +
            makeItem(pair.lwir, 'LWIR') +
            '</div>';
        }).join('');
        return '<div class="sample-group">' +
          '<h5 class="sample-group-label">' + groupLabel + '</h5>' +
          '<div class="kaist-pairs">' + pairsHtml + '</div>' +
          '</div>';
      }).join('');
    } else {
      // MNIST: 5-column grid
      var mnistImgs = (dataset.sampleFiles || []).map(function (f) {
        var src  = dataset.sampleDir + f;
        var text = 'MNIST sample — ' + f;
        var idx  = lbItems.length;
        lbItems.push({ src: src, text: text, pixelArt: true });
        return '<div class="gallery-item mnist-cell" data-lb-idx="' + idx + '">' +
          '<img src="' + src + '" alt="' + text + '" loading="lazy">' +
          '</div>';
      }).join('');
      imagesHtml = '<div class="mnist-gallery">' +
        (mnistImgs || '<p class="inspector-images-placeholder">' + (copy.sampleImagesPlaceholder || 'Coming soon.') + '</p>') +
        '</div>';
    }

    section.innerHTML =
      '<div class="inspector-card panel card">' +
        '<h3 class="shared-card-title inspector-dataset-title">' +
          (copy.datasetTitle || 'Dataset') + ': ' + dataset.name +
        '</h3>' +
        '<p class="inspector-dataset-fullname">' + dataset.fullName + ' (' + dataset.year + ')</p>' +
        '<div class="inspector-dataset-body">' +
          '<div class="inspector-dataset-meta">' +
            '<table class="inspector-stat-table">' +
              '<tbody>' + statsHtml + '</tbody>' +
            '</table>' +
            '<p class="inspector-citation"><strong>' + (copy.citationLabel || 'Citation') + ':</strong> ' + dataset.citation + '</p>' +
          '</div>' +
          '<div class="inspector-dataset-images">' +
            '<h4 class="inspector-images-title">' + (copy.sampleImagesTitle || 'Sample images') + '</h4>' +
            imagesHtml +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ============================================================
  // TABS
  // ============================================================

  function renderPresetTabs() {
    var copy = getCopy();
    var root = document.getElementById('preset-tabs');
    if (!root || !window.StatMlvaUiCore) return;

    StatMlvaUiCore.renderTabButtons({
      root: root,
      active: state.preset,
      attrName: 'data-preset',
      className: 'shared-tab',
      items: [
        { id: 'mnist',     label: copy.presetMnist     || 'MNIST' },
        { id: 'detection', label: copy.presetDetection || 'Detection' }
      ],
      onSelect: function (preset) {
        if (preset === state.preset) return;
        state.preset = preset;
        state.sortKey = null;
        state.sortDir = 1;
        renderPresetTabs();
        renderTable();
        renderDatasetInfo();
      }
    });
  }

  // ============================================================
  // INIT
  // ============================================================

  function applyLanguage() {
    renderPresetTabs();
    renderTable();
    renderDatasetInfo();
  }

  function init() {
    if (window.mermaid) {
      mermaid.initialize({ startOnLoad: false, theme: mermaidTheme(), securityLevel: 'loose' });
    }

    // Re-render mermaid on theme change
    var observer = new MutationObserver(function () {
      if (state.diagramModelName) {
        var contentEl = document.getElementById('diagram-modal-content');
        if (contentEl) renderMermaidInto(contentEl, DIAGRAMS[state.diagramModelName]);
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Diagram modal keyboard
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeDiagramModal();
        lbClose();
      }
      if (e.key === 'ArrowLeft')  lbNav(-1);
      if (e.key === 'ArrowRight') lbNav(1);
    });

    // Lightbox button wiring
    var lbEl   = document.getElementById('inspector-lightbox');
    var lbStage = document.getElementById('inspector-lb-stage');
    if (lbEl) {
      lbEl.addEventListener('click', function (e) {
        if (e.target === lbEl) lbClose();
      });
    }
    var lbClose_btn = document.getElementById('inspector-lb-close');
    if (lbClose_btn) lbClose_btn.addEventListener('click', lbClose);
    var lbPrev = document.getElementById('inspector-lb-prev');
    if (lbPrev) lbPrev.addEventListener('click', function (e) { e.stopPropagation(); lbNav(-1); });
    var lbNext = document.getElementById('inspector-lb-next');
    if (lbNext) lbNext.addEventListener('click', function (e) { e.stopPropagation(); lbNav(1); });
    if (lbStage) lbStage.addEventListener('click', function (e) { e.stopPropagation(); });

    // Gallery click delegation (dataset section)
    document.getElementById('dataset-info-section').addEventListener('click', function (e) {
      var item = e.target.closest('[data-lb-idx]');
      if (!item) return;
      lbOpen(parseInt(item.getAttribute('data-lb-idx'), 10));
    });

    if (window.StatMlvaPageShell) {
      StatMlvaPageShell.initToolPage({
        toolTitle: 'Model & Data Inspector',
        toolId: 'ModelInspector',
        fallbackLang: 'en',
        i18nApi: window.ModelInspectorI18n,
        relatedWorkSourceUrl: '/mlv-tools/assets/related-work.json',
        publicationsSourceUrl: window.PUBLICATIONS_SOURCE_URL || 'https://enheragu.github.io/publications-data.json',
        onApplyLanguage: applyLanguage
      });
    }

    renderPresetTabs();
    renderTable();
    renderDatasetInfo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ModelInspectorApp = { closeDiagramModal: closeDiagramModal };
})();
