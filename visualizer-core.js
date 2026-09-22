/* Visualizer core: Project / Dataset / Series / Plot / Canvas. No DOM. */
(function (root) {
  "use strict";

  var APP_INFO = Object.freeze({
    name: "Visualizer",
    version: "0.2.4",
    repositoryOwner: "aidisen975-cmd",
    repositoryName: "Visualizer",
    updateChannel: "stable"
  });
  var SOFTWARE_VERSION = APP_INFO.version;
  var PROJECT_FORMAT_VERSION = "1.0";
  var SUPPORTED_PROJECT_FORMATS = ["1.0"];
  var TIME_IN_SECONDS = { ms: 0.001, s: 1, min: 60, h: 3600 };
  var TIME_LABELS = { ms: "ms", s: "s", min: "min", h: "h" };
  var MAX_MAJOR_TICKS = 500;
  var ZOOM_MIN = 0.25;
  var ZOOM_MAX = 3;
  var ZOOM_STEP = 0.1;
  var SNAP_SCREEN_PX = 8;
  var DEFAULT_FIGURE_WIDTH = 1280;
  var DEFAULT_FIGURE_HEIGHT = 800;
  var LAYOUT_PADDING = 40;
  var LAYOUT_GAP = 24;
  var DEFAULT_UI = {
    leftPanelWidth: 268,
    rightPanelWidth: 300,
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    canvasZoom: 1
  };
  var LEGEND_POSITIONS = [
    "auto", "top-left", "top-center", "top-right", "middle-left", "middle-right",
    "bottom-left", "bottom-center", "bottom-right", "free",
    "top", "bottom", "left", "right", "inside-tl", "inside-tr", "inside-bl", "inside-br", "floating"
  ];
  var LEGEND_POSITION_ALIASES = {
    top: "top-center",
    bottom: "bottom-center",
    left: "middle-left",
    right: "middle-right",
    "inside-tl": "top-left",
    "inside-tr": "top-right",
    "inside-bl": "bottom-left",
    "inside-br": "bottom-right",
    floating: "free"
  };
  var LINE_STYLES = [
    { id: "solid", label: "实线", dash: null },
    { id: "dashed", label: "虚线", dash: "6 4" },
    { id: "dotted", label: "点线", dash: "1.5 3" },
    { id: "dash-dot", label: "点划线", dash: "8 4 1.5 4" },
    { id: "long-dash", label: "长虚线", dash: "14 6" }
  ];
  var LINE_TYPES = LINE_STYLES.map(function (item) { return item.id; });
  var LINE_DASH = {};
  LINE_STYLES.forEach(function (item) { LINE_DASH[item.id] = item.dash; });
  var DEFAULT_FONT = "Aptos, Helvetica Neue, Noto Sans SC, sans-serif";
  var FONT_FAMILIES = [
    { value: DEFAULT_FONT, label: "系统默认" },
    { value: '"Microsoft YaHei", "微软雅黑", Arial, sans-serif', label: "微软雅黑" },
    { value: 'SimSun, "宋体", serif', label: "宋体" },
    { value: "Arial, Helvetica, sans-serif", label: "Arial" },
    { value: "Times New Roman, Times, serif", label: "Times New Roman" }
  ];
  var LINE_WIDTH_MIN = 0.5;
  var LINE_WIDTH_MAX = 12;
  var LINE_WIDTH_STEP = 0.1;
  var FIGURE_LAYOUT = {
    outerPadding: 10,
    titleGap: 8,
    axisTitleGap: 6,
    tickLabelGap: 4,
    legendGap: 8,
    minPlotWidth: 160,
    minPlotHeight: 110
  };
  var LAYOUT_TEMPLATES = {
    single: { id: "single", label: "单图全幅", cols: 1, rows: 1, spans: [[0, 0, 1, 1]], slots: ["main"] },
    splitH: { id: "splitH", label: "1:1 左右", cols: 2, rows: 1, spans: [[0, 0, 1, 1], [1, 0, 1, 1]], slots: ["left", "right"] },
    leftWide: { id: "leftWide", label: "左大右小", cols: 3, rows: 1, spans: [[0, 0, 2, 1], [2, 0, 1, 1]], slots: ["large", "small"] },
    rightWide: { id: "rightWide", label: "左小右大", cols: 3, rows: 1, spans: [[0, 0, 1, 1], [1, 0, 2, 1]], slots: ["small", "large"] },
    triple: { id: "triple", label: "三等分", cols: 3, rows: 1, spans: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1]], slots: ["left", "center", "right"] },
    onePlusTwo: { id: "onePlusTwo", label: "一大两小", cols: 2, rows: 2, spans: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]], slots: ["large", "smallTop", "smallBottom"] },
    grid2x2: { id: "grid2x2", label: "2×2", cols: 2, rows: 2, spans: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]], slots: ["tl", "tr", "bl", "br"] },
    grid3x2: { id: "grid3x2", label: "3×2", cols: 3, rows: 2, spans: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1]], slots: ["r1c1", "r1c2", "r1c3", "r2c1", "r2c2", "r2c3"] }
  };
  var DEFAULT_GROUPS = [
    { id: "group-1", label: "T1–T7", start: 1, end: 7, color: "#2477b6" },
    { id: "group-2", label: "T8–T22", start: 8, end: 22, color: "#25884d" },
    { id: "group-3", label: "T23–T37", start: 23, end: 37, color: "#d36518" },
    { id: "group-4", label: "T38–T52", start: 38, end: 52, color: "#6b52a8" }
  ];
  var SERIES_COLORS = ["#2477b6", "#d36518", "#25884d", "#6b52a8", "#d14e3d", "#167b91", "#8b5a9d", "#272b2e"];

  function defaultTextStyle(overrides) {
    var style = {
      fontFamily: DEFAULT_FONT,
      fontSize: 12,
      fontColor: "",
      fontWeight: "400",
      italic: false
    };
    Object.keys(overrides || {}).forEach(function (key) { style[key] = overrides[key]; });
    return style;
  }

  function normalizeTextStyle(raw, fallback) {
    var base = defaultTextStyle(fallback || {});
    var style = raw && typeof raw === "object" ? raw : {};
    var fontSize = Number(style.fontSize);
    var weight = style.fontWeight;
    return {
      fontFamily: String(style.fontFamily || base.fontFamily || DEFAULT_FONT),
      fontSize: Number.isFinite(fontSize) ? clamp(fontSize, 6, 72) : base.fontSize,
      fontColor: style.fontColor == null || style.fontColor === "" ? String(base.fontColor || "") : String(style.fontColor),
      fontWeight: weight === "700" || weight === "bold" || weight === 700 ? "700" : (weight === "600" ? "600" : "400"),
      italic: style.italic == null ? !!base.italic : !!style.italic
    };
  }

  function normalizeTitleAlign(value) {
    return value === "center" || value === "right" ? value : "left";
  }

  function normalizePlotTextStyles(raw) {
    var styles = raw && typeof raw === "object" ? raw : {};
    var title = normalizeTextStyle(styles.title, { fontSize: 14, fontWeight: "700" });
    title.align = normalizeTitleAlign(styles.title && styles.title.align);
    return {
      title: title,
      xAxisTitle: normalizeTextStyle(styles.xAxisTitle, { fontSize: 11, fontWeight: "600" }),
      yAxisTitle: normalizeTextStyle(styles.yAxisTitle, { fontSize: 11, fontWeight: "600" }),
      xTick: normalizeTextStyle(styles.xTick, { fontSize: 10 }),
      yTick: normalizeTextStyle(styles.yTick, { fontSize: 10 }),
      legend: normalizeTextStyle(styles.legend, { fontSize: 12 }),
      annotation: normalizeTextStyle(styles.annotation, { fontSize: 11 })
    };
  }

  function normalizeSeriesStyle(raw, color) {
    var style = raw && typeof raw === "object" ? raw : {};
    var lineWidth = Number(style.lineWidth);
    var opacity = Number(style.opacity);
    var lineType = LINE_TYPES.indexOf(style.lineType) >= 0 ? style.lineType : "solid";
    return {
      color: style.color ? String(style.color) : (color ? String(color) : null),
      lineWidth: Number.isFinite(lineWidth) ? clamp(lineWidth, LINE_WIDTH_MIN, LINE_WIDTH_MAX) : 1.5,
      lineType: lineType,
      opacity: Number.isFinite(opacity) ? clamp(opacity, 0, 1) : 1
    };
  }

  function strokeDasharray(lineType) {
    return Object.prototype.hasOwnProperty.call(LINE_DASH, lineType) ? LINE_DASH[lineType] : null;
  }

  function normalizeHexColor(value) {
    var text = String(value == null ? "" : value).trim();
    if (!text) return null;
    if (text.charAt(0) !== "#") text = "#" + text;
    if (!/^#[0-9a-fA-F]{6}$/.test(text)) return null;
    return text.toLowerCase();
  }

  function isValidHexColor(value) {
    return normalizeHexColor(value) != null;
  }

  function cssColorToHex(value) {
    var direct = normalizeHexColor(value);
    if (direct) return direct;
    var match = /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i.exec(String(value == null ? "" : value).trim());
    if (!match) return null;
    var h = ((Number(match[1]) % 360) + 360) % 360 / 360;
    var s = Math.min(100, Math.max(0, Number(match[2]))) / 100;
    var l = Math.min(100, Math.max(0, Number(match[3]))) / 100;
    function channel(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var r;
    var g;
    var b;
    if (s === 0) r = g = b = l;
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = channel(p, q, h + 1 / 3);
      g = channel(p, q, h);
      b = channel(p, q, h - 1 / 3);
    }
    function byte(n) {
      var v = Math.round(Math.min(1, Math.max(0, n)) * 255);
      return (v < 16 ? "0" : "") + v.toString(16);
    }
    return "#" + byte(r) + byte(g) + byte(b);
  }

  function patchStyleObject(style, patch, fallbackColor) {
    var next = normalizeSeriesStyle(style, fallbackColor);
    if (!patch) return next;
    if (patch.lineWidth != null && Number.isFinite(Number(patch.lineWidth))) {
      next.lineWidth = clamp(Number(patch.lineWidth), LINE_WIDTH_MIN, LINE_WIDTH_MAX);
    }
    if (patch.lineType != null && LINE_TYPES.indexOf(patch.lineType) >= 0) next.lineType = patch.lineType;
    if (patch.opacity != null && Number.isFinite(Number(patch.opacity))) {
      next.opacity = clamp(Number(patch.opacity), 0, 1);
    }
    if (patch.color != null && patch.color !== "") {
      var hex = normalizeHexColor(patch.color);
      if (hex) next.color = hex;
    }
    return next;
  }

  function makeId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function finiteNumber(value, message) {
    var number = Number(value);
    if (!Number.isFinite(number)) throw new Error(message);
    return number;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeHeader(value) {
    return String(value || "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_:\-]/g, "");
  }

  function parseColumnHeader(header) {
    var originalHeader = String(header == null ? "" : header).replace(/^\uFEFF/, "").trim();
    if (!originalHeader) return { originalHeader: "", name: "", unit: "" };
    var match = originalHeader.match(/^(.*?)\s*[\(（]\s*([^()（）]+?)\s*[\)）]\s*$/);
    if (match && match[1].trim()) {
      return { originalHeader: originalHeader, name: match[1].trim(), unit: match[2].trim() };
    }
    match = originalHeader.match(/^(.*?)\s*[\[【]\s*([^\[\]【】]+?)\s*[\]】]\s*$/);
    if (match && match[1].trim()) {
      return { originalHeader: originalHeader, name: match[1].trim(), unit: match[2].trim() };
    }
    match = originalHeader.match(/^(.*?)\s+\/\s+(.+)$/);
    if (match && match[1].trim() && match[2].trim()) {
      return { originalHeader: originalHeader, name: match[1].trim(), unit: match[2].trim() };
    }
    return { originalHeader: originalHeader, name: originalHeader, unit: "" };
  }

  function isTimeHeader(metaOrString) {
    var meta = typeof metaOrString === "object" && metaOrString
      ? metaOrString
      : parseColumnHeader(metaOrString);
    var normalized = normalizeHeader(meta.name || meta.originalHeader || "");
    return (
      normalized === "time" ||
      normalized === "times" ||
      normalized === "timestamp" ||
      normalized === "timestamps" ||
      normalized === "seconds" ||
      normalized === "second" ||
      normalized === "t" ||
      normalized === "时间"
    );
  }

  function sensorIdFromHeader(header) {
    var match = String(header || "").match(/(?:^|[^a-z0-9])t\s*(\d+)(?!\d)/i);
    return match ? Number(match[1]) : null;
  }

  function isTemperatureName(name) {
    var text = String(name || "").trim();
    if (/^t\d+$/i.test(text)) return true;
    if (/温度/.test(text)) return true;
    if (/temperature/i.test(text)) return true;
    if (/^temp\d*$/i.test(text)) return true;
    return false;
  }

  function groupForSensor(sensorId, groups) {
    return (groups || DEFAULT_GROUPS).find(function (group) {
      return sensorId >= Number(group.start) && sensorId <= Number(group.end);
    }) || null;
  }

  function sensorColor(sensorId, group) {
    var base = group ? group.color : "#5d646b";
    var lightness = 46 + (sensorId % 7) * 5;
    var hueMap = {
      "#2477b6": "hsl(205, 68%, " + lightness + "%)",
      "#25884d": "hsl(140, 57%, " + lightness + "%)",
      "#d36518": "hsl(26, 74%, " + lightness + "%)",
      "#6b52a8": "hsl(257, 41%, " + lightness + "%)"
    };
    return hueMap[base] || base;
  }

  function parseNumericCell(value) {
    if (value == null) return NaN;
    var text = String(value).trim();
    if (!text) return NaN;
    if (/^(na|n\/a|nan|null|#n\/a|#value!|-|--)$/i.test(text)) return NaN;
    var number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function isMostlyNumericColumn(rows, columnIndex, startRow) {
    var seen = 0;
    var numeric = 0;
    for (var rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
      var cell = rows[rowIndex] ? rows[rowIndex][columnIndex] : "";
      if (String(cell == null ? "" : cell).trim() === "") continue;
      seen += 1;
      if (Number.isFinite(parseNumericCell(cell))) numeric += 1;
    }
    return seen > 0 && numeric / seen >= 0.8;
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var field = "";
    var quoted = false;
    var source = String(text || "");
    for (var index = 0; index < source.length; index += 1) {
      var character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (character === '"') {
          quoted = false;
        } else {
          field += character;
        }
      } else if (character === '"') {
        quoted = true;
      } else if (character === ",") {
        row.push(field);
        field = "";
      } else if (character === "\n" || character === "\r") {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        row.push(field);
        if (row.some(function (item) { return item.trim() !== ""; })) rows.push(row);
        row = [];
        field = "";
      } else {
        field += character;
      }
    }
    if (quoted) throw new Error("CSV 引号未闭合。");
    row.push(field);
    if (row.some(function (item) { return item.trim() !== ""; })) rows.push(row);
    if (rows.length < 2) throw new Error("CSV 至少需要一行表头和一行数值数据。");
    return rows;
  }

  function seriesId(datasetId, localId) {
    return String(datasetId) + "::" + String(localId);
  }

  function uniqueLocalId(preferred, index, used) {
    var base = String(preferred || "").replace(/::/g, "-").trim();
    if (!base) base = "Column " + (index + 1);
    var local = base;
    var suffix = 2;
    while (used.has(local)) {
      local = base + " " + suffix;
      suffix += 1;
    }
    used.add(local);
    return local;
  }

  function parseDatasetFromCsv(text, options) {
    var rows = parseCsv(text);
    var headers = rows[0].map(function (header) { return String(header).replace(/^\uFEFF/, "").trim(); });
    var name = options && options.name ? options.name : "导入数据";
    var groups = (options && options.groups) || DEFAULT_GROUPS;
    var datasetId = options && options.id ? String(options.id) : makeId("ds");
    var warnings = [];
    var parsedHeaders = headers.map(function (header, columnIndex) {
      var meta = parseColumnHeader(header);
      if (!meta.name) {
        meta.name = "Column " + (columnIndex + 1);
      }
      return meta;
    });
    var numericFlags = headers.map(function (_, columnIndex) {
      return isMostlyNumericColumn(rows, columnIndex, 1);
    });
    var xIndex = -1;
    for (var timeIndex = 0; timeIndex < parsedHeaders.length; timeIndex += 1) {
      if (isTimeHeader(parsedHeaders[timeIndex]) && numericFlags[timeIndex]) {
        xIndex = timeIndex;
        break;
      }
    }
    if (xIndex < 0) {
      for (var fallback = 0; fallback < numericFlags.length; fallback += 1) {
        if (numericFlags[fallback]) {
          xIndex = fallback;
          break;
        }
      }
    }
    if (xIndex < 0) throw new Error("无法确定有效横坐标列。");

    var seriesColumns = [];
    parsedHeaders.forEach(function (meta, columnIndex) {
      if (columnIndex === xIndex) return;
      if (numericFlags[columnIndex]) {
        seriesColumns.push(columnIndex);
        return;
      }
      warnings.push("已跳过非数值列：" + (meta.name || headers[columnIndex] || ("Column " + (columnIndex + 1))));
    });
    if (!seriesColumns.length) throw new Error("未找到可绘制的数值数据列。");

    var xs = [];
    var ys = seriesColumns.map(function () { return []; });
    for (var rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      var row = rows[rowIndex] || [];
      var xValue = parseNumericCell(row[xIndex]);
      if (!Number.isFinite(xValue)) continue;
      xs.push(xValue);
      seriesColumns.forEach(function (columnIndex, seriesIndex) {
        ys[seriesIndex].push(parseNumericCell(row[columnIndex]));
      });
    }
    if (xs.length < 2) throw new Error("无法确定有效横坐标列。");

    var xMeta = parsedHeaders[xIndex];
    var xIsTime = isTimeHeader(xMeta);
    var usedLocalIds = new Set();
    var series = seriesColumns.map(function (columnIndex, seriesIndex) {
      var meta = parsedHeaders[columnIndex];
      var sensorId = sensorIdFromHeader(meta.name || meta.originalHeader);
      var preferred = sensorId != null ? "T" + sensorId : (meta.name || meta.originalHeader);
      var localId = uniqueLocalId(preferred, columnIndex, usedLocalIds);
      var group = sensorId != null ? groupForSensor(sensorId, groups) : null;
      var color = sensorId != null ? sensorColor(sensorId, group) : SERIES_COLORS[seriesIndex % SERIES_COLORS.length];
      var style = normalizeSeriesStyle({ color: color }, color);
      return {
        id: seriesId(datasetId, localId),
        datasetId: datasetId,
        localId: localId,
        label: meta.name || localId,
        name: meta.name || localId,
        unit: meta.unit || "",
        originalHeader: meta.originalHeader || meta.name || localId,
        originalName: meta.originalHeader || meta.name || localId,
        displayName: meta.name || localId,
        sourceLabel: meta.originalHeader || meta.name || localId,
        kind: "raw",
        role: sensorId != null ? "sensor" : "numeric",
        sensorId: sensorId,
        color: style.color || color,
        style: style,
        x: xs.slice(),
        y: ys[seriesIndex].slice()
      };
    });
    return {
      id: datasetId,
      name: String(name).replace(/\.[^.]+$/, "") || "未命名数据",
      sourceFilename: (options && options.sourceFilename) || "",
      importedAt: (options && options.importedAt) || new Date().toISOString(),
      headers: headers,
      timeUnit: (options && options.timeUnit) || "s",
      xHeader: xMeta.originalHeader || xMeta.name,
      xName: xMeta.name || (xIsTime ? "Time" : ""),
      xUnit: xMeta.unit || "",
      xIsTime: xIsTime,
      rawCsv: String(text),
      warnings: warnings,
      series: series
    };
  }

  function createProject(partial) {
    return {
      projectFormatVersion: PROJECT_FORMAT_VERSION,
      softwareVersion: SOFTWARE_VERSION,
      projectName: (partial && (partial.projectName || partial.name)) || "未命名工程",
      savedAt: null,
      datasets: [],
      plots: [],
      canvas: { width: 1280, height: 800, zoom: 1 },
      options: {
        displayTimeUnit: (partial && partial.displayTimeUnit) || "s",
        sourceTimeUnit: (partial && partial.sourceTimeUnit) || "s",
        theme: (partial && partial.theme) || "light"
      },
      ui: normalizeUi(partial && partial.ui)
    };
  }

  function findDataset(project, datasetId) {
    return (project.datasets || []).find(function (dataset) { return dataset.id === datasetId; }) || null;
  }

  function findSeries(project, seriesRefId) {
    var datasets = project.datasets || [];
    for (var i = 0; i < datasets.length; i += 1) {
      var found = datasets[i].series.find(function (series) { return series.id === seriesRefId; });
      if (found) return found;
    }
    return null;
  }

  function allSeriesIds(project) {
    var ids = [];
    (project.datasets || []).forEach(function (dataset) {
      dataset.series.forEach(function (series) { ids.push(series.id); });
    });
    return ids;
  }

  function assertUniqueSeriesIds(project) {
    var seen = new Set();
    allSeriesIds(project).forEach(function (id) {
      if (seen.has(id)) throw new Error("曲线 ID 冲突：" + id);
      seen.add(id);
    });
    return true;
  }

  function addDataset(project, dataset) {
    if (project.datasets.some(function (item) { return item.id === dataset.id; })) {
      throw new Error("数据源 ID 已存在：" + dataset.id);
    }
    project.datasets.push(dataset);
    assertUniqueSeriesIds(project);
    return dataset;
  }

  function nextPlotLayout(project) {
    var index = (project && project.plots && project.plots.length) || 0;
    var offset = (index % 6) * 36;
    return {
      x: LAYOUT_PADDING + offset,
      y: LAYOUT_PADDING + offset,
      width: DEFAULT_FIGURE_WIDTH,
      height: DEFAULT_FIGURE_HEIGHT
    };
  }

  function formatQuantityTitle(name, unit) {
    var quantity = String(name || "").trim();
    var unitText = String(unit || "").trim();
    if (quantity && unitText) return quantity + " (" + unitText + ")";
    if (quantity) return quantity;
    if (unitText) return "Value (" + unitText + ")";
    return "Value";
  }

  function plotTimeSettings(plot, dataset) {
    var time = plot && plot.xAxis && plot.xAxis.time ? plot.xAxis.time : {};
    var datasetIsTime = !dataset || dataset.xIsTime !== false;
    var enabled = time.enabled == null ? datasetIsTime : !!time.enabled;
    return {
      enabled: enabled,
      sourceUnit: TIME_IN_SECONDS[time.sourceUnit] ? time.sourceUnit : ((dataset && TIME_IN_SECONDS[dataset.timeUnit]) ? dataset.timeUnit : "s"),
      displayUnit: TIME_IN_SECONDS[time.displayUnit] ? time.displayUnit : "s"
    };
  }

  function computeAutoXTitle(project, plot) {
    var items = resolvePlotSeries(project, plot);
    if (!items.length) return "Value";
    var metas = items.map(function (item) {
      var dataset = findDataset(project, item.series.datasetId);
      var time = plotTimeSettings(plot, dataset);
      return {
        name: dataset && dataset.xName ? dataset.xName : (time.enabled ? "Time" : ""),
        unit: time.enabled ? (TIME_LABELS[time.displayUnit] || time.displayUnit) : ((dataset && dataset.xUnit) || ""),
        xIsTime: time.enabled
      };
    });
    var first = metas[0];
    var sameName = metas.every(function (item) { return item.name === first.name; });
    var sameUnit = metas.every(function (item) { return item.unit === first.unit; });
    if (sameName && sameUnit) return formatQuantityTitle(first.name, first.unit);
    if (sameName) return first.name || "Value";
    return "Value";
  }

  function computeAutoYTitle(project, plot) {
    var items = resolvePlotSeries(project, plot);
    if (!items.length) return "Value";
    var metas = items.map(function (item) {
      var series = item.series;
      return {
        name: String(series.name || series.label || "").trim(),
        unit: String(series.unit || "").trim()
      };
    });
    var first = metas[0];
    var sameName = metas.every(function (item) { return item.name === first.name; });
    var sameUnit = metas.every(function (item) { return item.unit === first.unit; });
    if (metas.length === 1) return formatQuantityTitle(first.name, first.unit);
    if (sameName && sameUnit) return formatQuantityTitle(first.name, first.unit);
    if (sameName && !sameUnit) return first.name || "Value";
    if (sameUnit && metas.every(function (item) { return isTemperatureName(item.name); })) {
      var quantity = metas.every(function (item) { return /温度/.test(item.name); }) ? "温度" : "Temperature";
      return formatQuantityTitle(quantity, first.unit);
    }
    if (sameUnit) return formatQuantityTitle("Value", first.unit);
    return "Value";
  }

  function resolvedAxisTitle(axis) {
    if (axis && axis.titleMode === "custom") return String(axis.customTitle == null ? "" : axis.customTitle);
    return String(axis && axis.autoTitle ? axis.autoTitle : "");
  }

  function syncPlotAxisAutoTitles(project, plot) {
    if (!plot.xAxis || typeof plot.xAxis !== "object") plot.xAxis = normalizeAxis(plot.xAxis);
    if (!plot.yAxis || typeof plot.yAxis !== "object") plot.yAxis = normalizeAxis(plot.yAxis);
    plot.xAxis.autoTitle = computeAutoXTitle(project, plot);
    plot.yAxis.autoTitle = computeAutoYTitle(project, plot);
    return plot;
  }

  function syncAllPlotAxisAutoTitles(project) {
    (project.plots || []).forEach(function (plot) { syncPlotAxisAutoTitles(project, plot); });
    return project;
  }

  function createPlot(project, partial) {
    var index = ((project && project.plots && project.plots.length) || 0) + 1;
    var plot = {
      id: (partial && partial.id) || makeId("plot"),
      title: (partial && partial.title) || ("Figure " + index),
      subtitle: (partial && partial.subtitle) || "",
      note: (partial && partial.note) || "",
      seriesRefs: Array.isArray(partial && partial.seriesRefs)
        ? partial.seriesRefs.map(function (ref) { return normalizeSeriesRef(ref); })
        : [],
      xAxis: normalizeAxis(partial && partial.xAxis),
      yAxis: normalizeAxis(partial && partial.yAxis),
      layout: (partial && partial.layout) || nextPlotLayout(project),
      layoutSlot: partial && partial.layoutSlot ? String(partial.layoutSlot) : null,
      legendVisible: partial && partial.legendVisible === false ? false : true,
      legend: normalizeLegend(partial && partial.legend, partial && partial.legendVisible),
      textStyles: normalizePlotTextStyles(partial && partial.textStyles),
      background: partial && partial.background ? String(partial.background) : "",
      annotations: Array.isArray(partial && partial.annotations) ? partial.annotations.slice() : [],
      lockAspect: !!(partial && partial.lockAspect),
      aspectRatio: Number.isFinite(Number(partial && partial.aspectRatio))
        ? Number(partial.aspectRatio)
        : null
    };
    if (!plot.aspectRatio && plot.layout.height) {
      plot.aspectRatio = plot.layout.width / plot.layout.height;
    }
    project.plots.push(plot);
    syncPlotAxisAutoTitles(project, plot);
    return plot;
  }

  function addSeriesToPlot(project, plot, seriesIds) {
    var ids = Array.isArray(seriesIds) ? seriesIds : [seriesIds];
    ids.forEach(function (id) {
      var series = findSeries(project, id);
      if (!series) throw new Error("找不到曲线：" + id);
      if (plot.seriesRefs.some(function (ref) { return ref.seriesId === id; })) return;
      var style = normalizeSeriesStyle(series.style, series.color);
      plot.seriesRefs.push(normalizeSeriesRef({
        seriesId: id,
        visible: true,
        selected: false,
        color: style.color || series.color,
        style: style
      }));
    });
    syncPlotAxisAutoTitles(project, plot);
    return plot;
  }

  function removeDataset(project, datasetId) {
    var removedIds = new Set();
    var dataset = findDataset(project, datasetId);
    if (!dataset) return;
    dataset.series.forEach(function (series) { removedIds.add(series.id); });
    project.datasets = project.datasets.filter(function (item) { return item.id !== datasetId; });
    project.plots.forEach(function (plot) {
      plot.seriesRefs = plot.seriesRefs.filter(function (ref) { return !removedIds.has(ref.seriesId); });
    });
    syncAllPlotAxisAutoTitles(project);
  }

  function resolvePlotSeries(project, plot) {
    return plot.seriesRefs.map(function (ref) {
      var series = findSeries(project, ref.seriesId);
      if (!series) return null;
      var style = normalizeSeriesStyle(ref.style, ref.color || series.color);
      if (ref.color) style.color = ref.color;
      return {
        series: series,
        ref: ref,
        visible: ref.visible !== false,
        selected: !!ref.selected,
        color: ref.color || style.color || series.color,
        style: style
      };
    }).filter(Boolean);
  }

  function selectedSeriesIds(plot) {
    return (plot && plot.seriesRefs ? plot.seriesRefs : []).filter(function (ref) {
      return !!ref.selected;
    }).map(function (ref) { return ref.seriesId; });
  }

  function resolveRenameTarget(project, plot, scope, datasetId) {
    if (scope === "selected") return plot ? selectedSeriesIds(plot) : [];
    if (scope === "cluster") {
      var dataset = findDataset(project, datasetId) || ((project.datasets && project.datasets[0]) || null);
      return dataset ? dataset.series.map(function (series) { return series.id; }) : [];
    }
    if (!plot) return [];
    return (plot.seriesRefs || []).map(function (ref) { return ref.seriesId; });
  }

  function applyRenameToSeriesIds(project, seriesIds, previewRows) {
    (seriesIds || []).forEach(function (id, index) {
      if (!previewRows || !previewRows[index]) return;
      var series = findSeries(project, id);
      if (!series) return;
      series.displayName = String(previewRows[index].after || "");
      series.label = series.displayName;
    });
    return seriesIds;
  }

  function applySeriesStyle(plot, seriesIds, patch) {
    var idSet = {};
    (seriesIds || []).forEach(function (id) { idSet[id] = true; });
    (plot.seriesRefs || []).forEach(function (ref) {
      if (!idSet[ref.seriesId]) return;
      ref.style = patchStyleObject(ref.style, patch, ref.color);
      ref.color = ref.style.color || ref.color;
    });
    return plot;
  }

  function applyStyleToSeries(project, seriesIds, patch) {
    var idSet = {};
    (seriesIds || []).forEach(function (id) { idSet[id] = true; });
    (project.datasets || []).forEach(function (dataset) {
      (dataset.series || []).forEach(function (series) {
        if (!idSet[series.id]) return;
        series.style = patchStyleObject(series.style, patch, series.color);
        if (series.style.color) series.color = series.style.color;
      });
    });
    return seriesIds || [];
  }

  function applyStyleToDataset(project, datasetId, patch) {
    var dataset = findDataset(project, datasetId);
    if (!dataset) return [];
    var ids = dataset.series.map(function (series) { return series.id; });
    applyStyleToSeries(project, ids, patch);
    (project.plots || []).forEach(function (plot) { applySeriesStyle(plot, ids, patch); });
    return ids;
  }

  function convertSeriesX(series, sourceUnit, displayUnit, xIsTime) {
    if (xIsTime === false) return series.x;
    var sourceFactor = TIME_IN_SECONDS[sourceUnit] || 1;
    var targetFactor = TIME_IN_SECONDS[displayUnit] || 1;
    if (sourceFactor === targetFactor) return series.x;
    return series.x.map(function (value) { return value * sourceFactor / targetFactor; });
  }

  function numericExtent(values, paddingRatio) {
    var low = Infinity;
    var high = -Infinity;
    values.forEach(function (value) {
      if (!Number.isFinite(value)) return;
      if (value < low) low = value;
      if (value > high) high = value;
    });
    if (!Number.isFinite(low) || !Number.isFinite(high)) return [0, 1];
    if (low === high) {
      var fallback = Math.max(Math.abs(low) * 0.04, 1);
      return [low - fallback, high + fallback];
    }
    var pad = (paddingRatio == null ? 0.045 : Number(paddingRatio)) * (high - low);
    return [low - pad, high + pad];
  }

  function axisRange(axis, values, paddingRatio) {
    if (axis && axis.mode === "manual" && Number.isFinite(Number(axis.min)) && Number.isFinite(Number(axis.max)) && Number(axis.min) < Number(axis.max)) {
      return [Number(axis.min), Number(axis.max)];
    }
    return numericExtent(values, paddingRatio);
  }

  function seriesXForPlot(project, plot, series, dataset) {
    var time = plotTimeSettings(plot, dataset);
    return convertSeriesX(series, time.sourceUnit, time.displayUnit, time.enabled);
  }

  function plotExtents(project, plot) {
    var visible = resolvePlotSeries(project, plot).filter(function (item) { return item.visible; });
    var xs = [];
    var ys = [];
    visible.forEach(function (item) {
      var dataset = findDataset(project, item.series.datasetId);
      seriesXForPlot(project, plot, item.series, dataset).forEach(function (value) { xs.push(value); });
      item.series.y.forEach(function (value) { ys.push(value); });
    });
    return {
      x: axisRange(plot.xAxis, xs, 0),
      y: axisRange(plot.yAxis, ys, 0.04),
      visibleCount: visible.length
    };
  }

  function normalizeAxisTime(raw) {
    var time = raw && typeof raw === "object" ? raw : {};
    return {
      enabled: time.enabled === false ? false : true,
      sourceUnit: TIME_IN_SECONDS[time.sourceUnit] ? time.sourceUnit : "s",
      displayUnit: TIME_IN_SECONDS[time.displayUnit] ? time.displayUnit : "s"
    };
  }

  function normalizeAxis(raw) {
    var axis = raw && typeof raw === "object" ? raw : {};
    var decimals = axis.decimals == null || axis.decimals === "" ? null : Number(axis.decimals);
    var majorTick = axis.majorTick == null || axis.majorTick === "" ? null : Number(axis.majorTick);
    var minorTick = axis.minorTick == null || axis.minorTick === "" ? null : Number(axis.minorTick);
    var lineWidth = Number(axis.lineWidth);
    return {
      mode: axis.mode === "manual" ? "manual" : "auto",
      min: axis.min == null || axis.min === "" ? null : Number(axis.min),
      max: axis.max == null || axis.max === "" ? null : Number(axis.max),
      autoTitle: axis.autoTitle == null ? "" : String(axis.autoTitle),
      customTitle: axis.customTitle == null ? "" : String(axis.customTitle),
      titleMode: axis.titleMode === "custom" ? "custom" : "auto",
      tickMode: axis.tickMode === "manual" ? "manual" : "auto",
      majorTick: Number.isFinite(majorTick) && majorTick > 0 ? majorTick : null,
      minorTickMode: axis.minorTickMode === "off" || axis.minorTickMode === "custom" ? axis.minorTickMode : "auto",
      minorTick: Number.isFinite(minorTick) && minorTick > 0 ? minorTick : null,
      formatMode: axis.formatMode === "fixed" || axis.formatMode === "scientific" ? axis.formatMode : "auto",
      decimals: Number.isFinite(decimals) && decimals >= 0 ? Math.min(8, Math.round(decimals)) : null,
      lineColor: axis.lineColor ? String(axis.lineColor) : "",
      lineWidth: Number.isFinite(lineWidth) ? clamp(lineWidth, 0.5, 6) : 1.1,
      time: normalizeAxisTime(axis.time)
    };
  }

  function coerceStoredNumber(value, message) {
    if (value == null || value === "") return NaN;
    var number = Number(value);
    if (Number.isFinite(number)) return number;
    if (typeof value === "number" && Number.isNaN(value)) return NaN;
    throw new Error(message);
  }

  function normalizeSeries(raw, datasetId) {
    if (!raw || typeof raw !== "object") throw new Error("曲线必须是对象。");
    if (!Array.isArray(raw.x) || !Array.isArray(raw.y) || raw.x.length !== raw.y.length || raw.x.length < 2) {
      throw new Error("曲线必须提供长度一致且至少两点的独立 x/y。");
    }
    var localId = String(raw.localId || raw.id || "series");
    if (localId.indexOf("::") >= 0) localId = localId.split("::").pop();
    var id = raw.id ? String(raw.id) : seriesId(datasetId, localId);
    if (id.indexOf(datasetId + "::") !== 0) id = seriesId(datasetId, localId);
    var originalHeader = String(raw.originalHeader || raw.sourceLabel || raw.label || localId);
    var parsed = parseColumnHeader(originalHeader);
    var name = String(raw.name || parsed.name || raw.label || localId);
    var unit = raw.unit == null || raw.unit === "" ? (parsed.unit || "") : String(raw.unit);
    if (raw.unit === undefined && raw.originalHeader == null && raw.sourceLabel && raw.sourceLabel === (raw.label || localId)) {
      unit = parsed.unit || "";
    }
    var originalName = String(raw.originalName || originalHeader || name);
    var displayName = String(raw.displayName || raw.label || name || localId);
    var style = normalizeSeriesStyle(raw.style, raw.color || "#5d646b");
    return {
      id: id,
      datasetId: datasetId,
      localId: localId,
      label: String(raw.label || displayName || name || localId),
      name: name,
      unit: unit,
      originalHeader: originalHeader,
      originalName: originalName,
      displayName: displayName,
      sourceLabel: String(raw.sourceLabel || originalHeader),
      kind: "raw",
      role: raw.role || "numeric",
      sensorId: raw.sensorId == null ? null : Number(raw.sensorId),
      color: style.color || String(raw.color || "#5d646b"),
      style: style,
      x: raw.x.map(function (value, index) { return finiteNumber(value, "曲线 " + localId + " x[" + index + "] 无效。"); }),
      y: raw.y.map(function (value, index) { return coerceStoredNumber(value, "曲线 " + localId + " y[" + index + "] 无效。"); })
    };
  }

  function normalizeDataset(raw) {
    if (!raw || typeof raw !== "object") throw new Error("数据源必须是对象。");
    var datasetId = String(raw.id || makeId("ds"));
    if (!Array.isArray(raw.series) || !raw.series.length) throw new Error("数据源至少需要一条曲线。");
    var xMeta = parseColumnHeader(raw.xHeader || raw.xName || "");
    var xIsTime = raw.xIsTime === false ? false : (raw.xIsTime === true ? true : (xMeta.name ? isTimeHeader(xMeta) : true));
    return {
      id: datasetId,
      name: String(raw.name || "未命名数据"),
      sourceFilename: String(raw.sourceFilename || ""),
      importedAt: String(raw.importedAt || ""),
      headers: Array.isArray(raw.headers) ? raw.headers.map(String) : [],
      timeUnit: TIME_IN_SECONDS[raw.timeUnit] ? raw.timeUnit : "s",
      xHeader: String(raw.xHeader || xMeta.originalHeader || ""),
      xName: String(raw.xName || xMeta.name || (xIsTime ? "Time" : "")),
      xUnit: raw.xUnit == null ? (xMeta.unit || "") : String(raw.xUnit),
      xIsTime: xIsTime,
      rawCsv: String(raw.rawCsv || ""),
      warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String) : [],
      series: raw.series.map(function (item) { return normalizeSeries(item, datasetId); })
    };
  }

  function normalizeUi(raw) {
    var ui = raw && typeof raw === "object" ? raw : {};
    var left = Number(ui.leftPanelWidth);
    var right = Number(ui.rightPanelWidth);
    var zoom = Number(ui.canvasZoom);
    if (!Number.isFinite(zoom) && raw && Number.isFinite(Number(raw.zoom))) zoom = Number(raw.zoom);
    return {
      leftPanelWidth: Number.isFinite(left) ? clamp(left, 220, 600) : DEFAULT_UI.leftPanelWidth,
      rightPanelWidth: Number.isFinite(right) ? clamp(right, 260, 650) : DEFAULT_UI.rightPanelWidth,
      leftPanelCollapsed: !!ui.leftPanelCollapsed,
      rightPanelCollapsed: !!ui.rightPanelCollapsed,
      canvasZoom: Number.isFinite(zoom) ? clampZoom(zoom) : 1
    };
  }

  function normalizeLegend(raw, legendVisible) {
    var legend = raw && typeof raw === "object" ? raw : {};
    var rawPosition = legend.position;
    var posX = legend.x;
    var posY = legend.y;
    if (rawPosition && typeof rawPosition === "object") {
      posX = rawPosition.x;
      posY = rawPosition.y;
      rawPosition = rawPosition.mode === "free" ? "free" : (rawPosition.mode || rawPosition.position || "top-right");
    }
    if (LEGEND_POSITION_ALIASES[rawPosition]) rawPosition = LEGEND_POSITION_ALIASES[rawPosition];
    var position = LEGEND_POSITIONS.indexOf(rawPosition) >= 0 ? rawPosition : "auto";
    if (position === "floating") position = "free";
    var columns = legend.columns === "auto" || legend.columns == null || legend.columns === ""
      ? "auto"
      : Math.max(1, Math.round(Number(legend.columns) || 1));
    var rows = legend.rows === "auto" || legend.rows == null || legend.rows === ""
      ? "auto"
      : Math.max(1, Math.round(Number(legend.rows) || 1));
    var visible = legend.visible;
    if (visible == null) visible = legendVisible !== false;
    var x = Number.isFinite(Number(posX)) ? clamp(Number(posX), 0, 1) : (Number.isFinite(Number(legend.floatingX)) ? clamp(Number(legend.floatingX), 0, 1) : 0.72);
    var y = Number.isFinite(Number(posY)) ? clamp(Number(posY), 0, 1) : (Number.isFinite(Number(legend.floatingY)) ? clamp(Number(legend.floatingY), 0, 1) : 0.08);
    var bg = Number(legend.backgroundOpacity);
    var padding = Number(legend.padding);
    var borderWidth = Number(legend.borderWidth);
    var borderRadius = Number(legend.borderRadius);
    var showBorder = legend.showBorder != null ? !!legend.showBorder : !!legend.border;
    return {
      visible: visible !== false,
      position: position,
      x: x,
      y: y,
      floatingX: x,
      floatingY: y,
      fontFamily: String(legend.fontFamily || DEFAULT_FONT),
      fontSize: Number.isFinite(Number(legend.fontSize)) ? clamp(Number(legend.fontSize), 8, 24) : 12,
      fontColor: legend.fontColor ? String(legend.fontColor) : "",
      fontWeight: legend.fontWeight === "700" || legend.fontWeight === "bold" ? "700" : "400",
      italic: !!legend.italic,
      orientation: legend.orientation === "horizontal" || legend.orientation === "vertical" ? legend.orientation : "auto",
      columns: columns,
      rows: rows,
      rowGap: Number.isFinite(Number(legend.rowGap)) ? clamp(Number(legend.rowGap), 0, 24) : 4,
      columnGap: Number.isFinite(Number(legend.columnGap)) ? clamp(Number(legend.columnGap), 0, 48) : 12,
      sampleLength: Number.isFinite(Number(legend.sampleLength)) ? clamp(Number(legend.sampleLength), 8, 48) : 16,
      maxWidth: legend.maxWidth == null || legend.maxWidth === "" ? null : Math.max(40, Number(legend.maxWidth)),
      showBackground: legend.showBackground !== false,
      backgroundColor: legend.backgroundColor ? String(legend.backgroundColor) : "#ffffff",
      backgroundOpacity: Number.isFinite(bg) ? clamp(bg, 0, 1) : 0.85,
      showBorder: showBorder,
      border: showBorder,
      borderColor: legend.borderColor ? String(legend.borderColor) : "#cccccc",
      borderWidth: Number.isFinite(borderWidth) ? clamp(borderWidth, 0, 8) : 1,
      borderRadius: Number.isFinite(borderRadius) ? clamp(borderRadius, 0, 16) : 4,
      padding: Number.isFinite(padding) ? clamp(padding, 0, 24) : 6,
      wrap: legend.wrap !== false
    };
  }

  function normalizeSeriesRef(ref) {
    if (!ref || !ref.seriesId) throw new Error("Plot 的 seriesRefs 缺少 seriesId。");
    var color = ref.color ? String(ref.color) : (ref.style && ref.style.color ? String(ref.style.color) : null);
    var style = normalizeSeriesStyle(ref.style, color);
    if (color) style.color = color;
    return {
      seriesId: String(ref.seriesId),
      visible: ref.visible !== false,
      selected: !!ref.selected,
      color: style.color || color,
      style: style
    };
  }

  function normalizePlot(raw) {
    if (!raw || typeof raw !== "object") throw new Error("图必须是对象。");
    var layout = raw.layout && typeof raw.layout === "object" ? raw.layout : {};
    var width = Number.isFinite(Number(layout.width)) ? Math.max(240, Number(layout.width)) : DEFAULT_FIGURE_WIDTH;
    var height = Number.isFinite(Number(layout.height)) ? Math.max(180, Number(layout.height)) : DEFAULT_FIGURE_HEIGHT;
    var legend = normalizeLegend(raw.legend, raw.legendVisible);
    var aspectRatio = Number.isFinite(Number(raw.aspectRatio)) ? Number(raw.aspectRatio) : (height ? width / height : 1.6);
    var textStyles = normalizePlotTextStyles(raw.textStyles);
    if (!raw.textStyles || !raw.textStyles.legend) {
      textStyles.legend = normalizeTextStyle(textStyles.legend, {
        fontFamily: legend.fontFamily,
        fontSize: legend.fontSize,
        fontColor: legend.fontColor,
        fontWeight: legend.fontWeight,
        italic: legend.italic
      });
    }
    return {
      id: String(raw.id || makeId("plot")),
      title: String(raw.title || "未命名图"),
      subtitle: String(raw.subtitle || ""),
      note: String(raw.note || ""),
      seriesRefs: Array.isArray(raw.seriesRefs) ? raw.seriesRefs.map(normalizeSeriesRef) : [],
      xAxis: normalizeAxis(raw.xAxis),
      yAxis: normalizeAxis(raw.yAxis),
      layout: {
        x: Number.isFinite(Number(layout.x)) ? Number(layout.x) : LAYOUT_PADDING,
        y: Number.isFinite(Number(layout.y)) ? Number(layout.y) : LAYOUT_PADDING,
        width: width,
        height: height
      },
      layoutSlot: raw.layoutSlot ? String(raw.layoutSlot) : null,
      legendVisible: legend.visible,
      legend: legend,
      textStyles: textStyles,
      background: raw.background ? String(raw.background) : "",
      annotations: Array.isArray(raw.annotations) ? raw.annotations.slice() : [],
      lockAspect: !!raw.lockAspect,
      aspectRatio: aspectRatio
    };
  }

  function parseProject(text, options) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error("工程文件不是有效的 JSON。");
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("工程文件格式无效。");
    }
    if (!data.projectFormatVersion) {
      throw new Error("缺少 projectFormatVersion，无法打开该工程。");
    }
    if (SUPPORTED_PROJECT_FORMATS.indexOf(String(data.projectFormatVersion)) < 0) {
      throw new Error("不支持的工程版本 " + data.projectFormatVersion + "。当前支持 " + SUPPORTED_PROJECT_FORMATS.join(", ") + "。");
    }
    var canvas = data.canvas && typeof data.canvas === "object" ? data.canvas : {};
    var optionsIn = data.options && typeof data.options === "object" ? data.options : {};
    var filename = options && options.filename ? options.filename : "";
    var projectName = String(data.projectName || data.name || "").trim();
    if (!projectName || (projectName === "未命名工程" && filename)) {
      var fromFile = projectNameFromFilename(filename);
      if (fromFile) projectName = fromFile;
    }
    if (!projectName) projectName = "未命名工程";
    var uiSource = data.ui && typeof data.ui === "object" ? data.ui : {};
    if (uiSource.canvasZoom == null && canvas.zoom != null) uiSource.canvasZoom = canvas.zoom;
    var dataPlots = Array.isArray(data.plots) ? data.plots : [];
    var project = {
      projectFormatVersion: PROJECT_FORMAT_VERSION,
      softwareVersion: SOFTWARE_VERSION,
      projectName: projectName,
      savedAt: data.savedAt ? String(data.savedAt) : null,
      datasets: Array.isArray(data.datasets) ? data.datasets.map(normalizeDataset) : [],
      plots: dataPlots.map(normalizePlot),
      canvas: {
        width: Number.isFinite(Number(canvas.width)) ? Math.max(400, Number(canvas.width)) : 1280,
        height: Number.isFinite(Number(canvas.height)) ? Math.max(300, Number(canvas.height)) : 800,
        zoom: clampZoom(Number(canvas.zoom))
      },
      options: {
        displayTimeUnit: TIME_IN_SECONDS[optionsIn.displayTimeUnit] ? optionsIn.displayTimeUnit : "s",
        sourceTimeUnit: TIME_IN_SECONDS[optionsIn.sourceTimeUnit] ? optionsIn.sourceTimeUnit : "s",
        theme: optionsIn.theme === "dark" ? "dark" : "light"
      },
      ui: normalizeUi(uiSource)
    };
    if (project.ui.canvasZoom && project.canvas.zoom === 1 && Number(canvas.zoom) !== 1) {
      project.canvas.zoom = project.ui.canvasZoom;
    } else {
      project.ui.canvasZoom = project.canvas.zoom = clampZoom(project.ui.canvasZoom || project.canvas.zoom || 1);
    }
    project.plots.forEach(function (plot, index) {
      var rawPlot = dataPlots[index] || {};
      var rawAxis = rawPlot.xAxis && typeof rawPlot.xAxis === "object" ? rawPlot.xAxis : {};
      if (!rawAxis.time) {
        var firstRef = plot.seriesRefs[0];
        var dataset = firstRef ? findDataset(project, (findSeries(project, firstRef.seriesId) || {}).datasetId) : null;
        plot.xAxis.time.sourceUnit = (dataset && TIME_IN_SECONDS[dataset.timeUnit])
          ? dataset.timeUnit
          : (TIME_IN_SECONDS[optionsIn.sourceTimeUnit] ? optionsIn.sourceTimeUnit : "s");
        plot.xAxis.time.displayUnit = TIME_IN_SECONDS[optionsIn.displayTimeUnit] ? optionsIn.displayTimeUnit : "s";
        if (dataset && dataset.xIsTime === false) plot.xAxis.time.enabled = false;
      }
    });
    if (!project.plots.length) ensureDefaultPlot(project);
    assertUniqueSeriesIds(project);
    project.plots.forEach(function (plot) {
      plot.seriesRefs.forEach(function (ref) {
        if (!findSeries(project, ref.seriesId)) {
          throw new Error("图「" + plot.title + "」引用了不存在的曲线：" + ref.seriesId);
        }
      });
    });
    syncAllPlotAxisAutoTitles(project);
    syncCanvasToPlots(project);
    return project;
  }

  function serializeLegend(legend) {
    var copy = cloneJson(legend || {});
    if (copy.position === "free") {
      copy.position = { mode: "free", x: copy.x, y: copy.y };
    }
    return copy;
  }

  function normalizeVersionTag(tag) {
    var text = String(tag == null ? "" : tag).trim();
    if (text.charAt(0) === "v" || text.charAt(0) === "V") text = text.slice(1);
    return text;
  }

  function parseSemVer(version) {
    var match = /^(\d+)\.(\d+)\.(\d+)$/.exec(normalizeVersionTag(version));
    if (!match) return null;
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
  }

  function compareSemVer(leftVersion, rightVersion) {
    var left = parseSemVer(leftVersion);
    var right = parseSemVer(rightVersion);
    if (!left || !right) return null;
    if (left.major !== right.major) return left.major < right.major ? -1 : 1;
    if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
    if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1;
    return 0;
  }

  function githubReleasesApiUrl() {
    return "https://api.github.com/repos/" + APP_INFO.repositoryOwner + "/" + APP_INFO.repositoryName + "/releases/latest";
  }

  function githubReleasesPageUrl() {
    return "https://github.com/" + APP_INFO.repositoryOwner + "/" + APP_INFO.repositoryName + "/releases";
  }

  function buildExpectedAssetName(tagName) {
    return "Visualizer-" + String(tagName == null ? "" : tagName) + ".zip";
  }

  function findReleaseAsset(release) {
    if (!release || typeof release !== "object" || !release.tag_name || !Array.isArray(release.assets)) return null;
    var expected = buildExpectedAssetName(release.tag_name);
    for (var i = 0; i < release.assets.length; i += 1) {
      var asset = release.assets[i];
      if (asset && asset.name === expected) return asset;
    }
    return null;
  }

  var UPDATE_ERROR_MESSAGES = {
    NETWORK_ERROR: "无法连接到 GitHub，请检查网络后重试。",
    HTTP_ERROR: "暂时无法读取 GitHub Release。这不会影响 Visualizer 的正常使用。",
    RATE_LIMIT: "GitHub 暂时限制了请求，请稍后再试。这不会影响 Visualizer 的正常使用。",
    INVALID_RELEASE: "收到的 Release 信息无法识别。这不会影响 Visualizer 的正常使用。",
    INVALID_VERSION: "无法识别版本号。这不会影响 Visualizer 的正常使用。",
    NOT_STABLE: "GitHub 返回的不是正式稳定版本。这不会影响 Visualizer 的正常使用。"
  };

  function createUpdateState(version) {
    return {
      status: "idle",
      currentVersion: version || APP_INFO.version,
      latestVersion: null,
      releaseName: null,
      releaseNotes: null,
      publishedAt: null,
      releaseUrl: null,
      downloadUrl: null,
      errorCode: null,
      errorMessage: null
    };
  }

  function evaluateLatestRelease(localVersion, release) {
    var state = createUpdateState(localVersion);
    state.releaseUrl = githubReleasesPageUrl();
    if (!release || typeof release !== "object" || Array.isArray(release) || !release.tag_name) {
      state.status = "error";
      state.errorCode = "INVALID_RELEASE";
      state.errorMessage = UPDATE_ERROR_MESSAGES.INVALID_RELEASE;
      return state;
    }
    if (release.draft === true || release.prerelease === true) {
      state.status = "error";
      state.errorCode = "NOT_STABLE";
      state.errorMessage = UPDATE_ERROR_MESSAGES.NOT_STABLE;
      return state;
    }
    if (typeof release.html_url === "string" && release.html_url) state.releaseUrl = release.html_url;
    var latest = normalizeVersionTag(release.tag_name);
    var order = compareSemVer(localVersion, latest);
    if (order === null) {
      state.status = "error";
      state.errorCode = "INVALID_VERSION";
      state.errorMessage = UPDATE_ERROR_MESSAGES.INVALID_VERSION;
      return state;
    }
    state.latestVersion = latest;
    state.releaseName = typeof release.name === "string" ? release.name : "";
    state.releaseNotes = typeof release.body === "string" ? release.body : "";
    state.publishedAt = typeof release.published_at === "string" ? release.published_at : "";
    if (order < 0) {
      state.status = "available";
      var asset = findReleaseAsset(release);
      if (asset && typeof asset.browser_download_url === "string" && asset.browser_download_url) {
        state.downloadUrl = asset.browser_download_url;
      } else {
        state.errorCode = "ASSET_NOT_FOUND";
        state.errorMessage = "未找到 " + buildExpectedAssetName(release.tag_name) + "。";
      }
      return state;
    }
    state.status = "up-to-date";
    return state;
  }

  function fetchLatestRelease(fetchImpl) {
    var doFetch = fetchImpl;
    if (typeof doFetch !== "function" && root && typeof root.fetch === "function") {
      doFetch = root.fetch.bind(root);
    }
    if (typeof doFetch !== "function") {
      var missing = new Error("fetch unavailable");
      missing.code = "NETWORK_ERROR";
      return Promise.reject(missing);
    }
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : 0;
    function finish() {
      if (timer) clearTimeout(timer);
    }
    return Promise.resolve().then(function () {
      var init = {
        method: "GET",
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store"
      };
      if (controller) init.signal = controller.signal;
      return doFetch(githubReleasesApiUrl(), init);
    }).then(function (response) {
      if (!response || !response.ok) {
        var httpError = new Error("HTTP " + (response && response.status));
        httpError.code = "HTTP_ERROR";
        httpError.status = response ? response.status : 0;
        throw httpError;
      }
      return Promise.resolve()
        .then(function () { return response.json(); })
        .catch(function () {
          var invalid = new Error("invalid release json");
          invalid.code = "INVALID_RELEASE";
          throw invalid;
        });
    }).then(function (release) {
      finish();
      return release;
    }, function (error) {
      finish();
      if (error && (error.code === "HTTP_ERROR" || error.code === "INVALID_RELEASE")) throw error;
      var network = new Error(error && error.message ? error.message : "network");
      network.code = "NETWORK_ERROR";
      throw network;
    });
  }

  function checkForUpdates(options) {
    var localVersion = (options && options.version) || APP_INFO.version;
    return fetchLatestRelease(options && options.fetch).then(function (release) {
      return evaluateLatestRelease(localVersion, release);
    }).catch(function (error) {
      var state = createUpdateState(localVersion);
      state.status = "error";
      var code = error && error.code;
      if (error && (error.status === 403 || error.status === 429)) code = "RATE_LIMIT";
      if (code !== "HTTP_ERROR" && code !== "INVALID_RELEASE" && code !== "NETWORK_ERROR" && code !== "RATE_LIMIT") code = "NETWORK_ERROR";
      state.errorCode = code;
      state.errorMessage = UPDATE_ERROR_MESSAGES[code] || UPDATE_ERROR_MESSAGES.NETWORK_ERROR;
      state.releaseUrl = githubReleasesPageUrl();
      return state;
    });
  }

  function serializeProject(project) {
    assertUniqueSeriesIds(project);
    var payload = {
      projectFormatVersion: PROJECT_FORMAT_VERSION,
      softwareVersion: SOFTWARE_VERSION,
      projectName: project.projectName,
      savedAt: new Date().toISOString(),
      datasets: project.datasets,
      plots: (project.plots || []).map(function (plot) {
        var copy = cloneJson(plot);
        copy.legend = serializeLegend(plot.legend);
        return copy;
      }),
      canvas: project.canvas,
      options: project.options,
      ui: normalizeUi(project.ui)
    };
    return JSON.stringify(payload, null, 2);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampZoom(value) {
    var zoom = Number(value);
    if (!Number.isFinite(zoom) || zoom <= 0) return 1;
    return clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  }

  function projectNameFromFilename(filename) {
    var base = String(filename || "").split(/[/\\]/).pop() || "";
    base = base.replace(/\.tvproj\.json$/i, "").replace(/\.tvproj$/i, "").replace(/\.json$/i, "").trim();
    return base;
  }

  function seriesDisplayName(series) {
    if (!series) return "";
    return String(series.displayName || series.label || series.name || series.localId || "");
  }

  function seriesOriginalName(series) {
    if (!series) return "";
    return String(series.originalName || series.originalHeader || series.sourceLabel || series.label || "");
  }

  function commonPrefix(strings) {
    if (!strings || !strings.length) return "";
    var first = String(strings[0] || "");
    var i = 0;
    while (i < first.length) {
      var ch = first.charAt(i);
      for (var n = 1; n < strings.length; n += 1) {
        if (String(strings[n] || "").charAt(i) !== ch) break;
      }
      if (n < strings.length) break;
      i += 1;
    }
    if (i === first.length && strings.every(function (text) { return String(text || "") === first; })) {
      return first;
    }
    while (i > 0 && !/[/\\_\-:\s]/.test(first.charAt(i - 1))) i -= 1;
    return first.slice(0, i);
  }

  function commonSuffix(strings) {
    if (!strings || !strings.length) return "";
    var reversed = strings.map(function (text) { return String(text || "").split("").reverse().join(""); });
    return commonPrefix(reversed).split("").reverse().join("");
  }

  function applyRenameTemplate(template, original, index, start) {
    var n = (Number(start) || 1) + index;
    return String(template == null ? "{original}" : template)
      .replace(/\{n\}/g, String(n))
      .replace(/\{original\}/g, String(original == null ? "" : original));
  }

  function previewBatchRename(names, spec) {
    var mode = spec && spec.mode ? spec.mode : "replace";
    var originals = (names || []).map(function (name) { return String(name == null ? "" : name); });
    var prefix = commonPrefix(originals);
    var suffix = commonSuffix(originals);
    if (suffix && suffix === prefix && originals.length > 1) suffix = "";
    return originals.map(function (name, index) {
      var next = name;
      if (mode === "replace") {
        var find = spec.find == null ? "" : String(spec.find);
        next = find ? name.split(find).join(spec.replace == null ? "" : String(spec.replace)) : name;
      } else if (mode === "stripPrefix") {
        next = prefix && name.indexOf(prefix) === 0 ? name.slice(prefix.length) : name;
      } else if (mode === "stripSuffix") {
        next = suffix && name.length >= suffix.length && name.slice(-suffix.length) === suffix
          ? name.slice(0, name.length - suffix.length)
          : name;
      } else if (mode === "addPrefix") {
        next = String(spec.prefix || "") + name;
      } else if (mode === "addSuffix") {
        next = name + String(spec.suffix || "");
      } else if (mode === "template") {
        next = applyRenameTemplate(spec.template || "{original}", name, index, spec.start);
      }
      return { before: name, after: next };
    });
  }

  function applyBatchRename(seriesList, previewRows) {
    (seriesList || []).forEach(function (series, index) {
      if (!series || !previewRows || !previewRows[index]) return;
      series.displayName = String(previewRows[index].after || "");
      series.label = series.displayName;
    });
    return seriesList;
  }

  function ensureDefaultPlot(project) {
    if (project.plots && project.plots.length) return project.plots[0];
    return createPlot(project, { title: "Figure 1" });
  }

  function screenToWorld(x, y, zoom) {
    var z = clampZoom(zoom);
    return { x: x / z, y: y / z };
  }

  function worldToScreen(x, y, zoom) {
    var z = clampZoom(zoom);
    return { x: x * z, y: y * z };
  }

  function plotsBoundingBox(plots) {
    if (!plots || !plots.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    plots.forEach(function (plot) {
      var layout = plot.layout || {};
      var x = Number(layout.x) || 0;
      var y = Number(layout.y) || 0;
      var width = Number(layout.width) || 0;
      var height = Number(layout.height) || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, width: maxX - minX, height: maxY - minY };
  }

  function fitViewZoom(plots, viewportWidth, viewportHeight, padding) {
    var box = plotsBoundingBox(plots);
    var pad = padding == null ? LAYOUT_PADDING : padding;
    if (!box.width || !box.height) return 1;
    var zoom = Math.min(
      (Math.max(1, viewportWidth) - pad * 2) / box.width,
      (Math.max(1, viewportHeight) - pad * 2) / box.height
    );
    return clampZoom(zoom);
  }

  function syncCanvasToPlots(project) {
    if (!project || !project.canvas) return project;
    if (!project.plots || !project.plots.length) return project;
    var box = plotsBoundingBox(project.plots);
    project.canvas.width = Math.max(400, Math.ceil(Math.max(project.canvas.width || 0, box.maxX + LAYOUT_PADDING)));
    project.canvas.height = Math.max(300, Math.ceil(Math.max(project.canvas.height || 0, box.maxY + LAYOUT_PADDING)));
    return project;
  }

  function setPlotSize(plot, width, height, fromWidth) {
    var nextW = Math.max(240, Math.round(Number(width) || plot.layout.width));
    var nextH = Math.max(180, Math.round(Number(height) || plot.layout.height));
    if (plot.lockAspect && plot.aspectRatio > 0) {
      if (fromWidth === "height") nextW = Math.max(240, Math.round(nextH * plot.aspectRatio));
      else nextH = Math.max(180, Math.round(nextW / plot.aspectRatio));
    }
    plot.layout.width = nextW;
    plot.layout.height = nextH;
    if (!plot.lockAspect) plot.aspectRatio = nextH ? nextW / nextH : plot.aspectRatio;
    return plot;
  }

  function layoutSlots(template, area) {
    var spec = typeof template === "string" ? LAYOUT_TEMPLATES[template] : template;
    if (!spec) spec = LAYOUT_TEMPLATES.single;
    var padding = area.padding == null ? LAYOUT_PADDING : area.padding;
    var gap = area.gap == null ? LAYOUT_GAP : area.gap;
    var width = Math.max(240, (area.width || 1280) - padding * 2);
    var height = Math.max(180, (area.height || 800) - padding * 2);
    var colW = (width - gap * (spec.cols - 1)) / spec.cols;
    var rowH = (height - gap * (spec.rows - 1)) / spec.rows;
    return spec.spans.map(function (span) {
      var col = span[0];
      var row = span[1];
      var colSpan = span[2];
      var rowSpan = span[3];
      return {
        x: Math.round(padding + col * (colW + gap)),
        y: Math.round(padding + row * (rowH + gap)),
        width: Math.round(colW * colSpan + gap * (colSpan - 1)),
        height: Math.round(rowH * rowSpan + gap * (rowSpan - 1))
      };
    });
  }

  function applyLayoutTemplate(plots, templateId, area, options) {
    var spec = LAYOUT_TEMPLATES[templateId] || LAYOUT_TEMPLATES.single;
    var slots = layoutSlots(templateId, area || {});
    var names = spec.slots || slots.map(function (_, index) { return "slot" + index; });
    var list = (plots || []).slice();
    var primaryId = options && options.primaryPlotId;
    if (primaryId) {
      var primaryIndex = list.findIndex(function (plot) { return plot.id === primaryId; });
      if (primaryIndex > 0) {
        var primary = list.splice(primaryIndex, 1)[0];
        if (templateId === "onePlusTwo" || templateId === "leftWide") list.unshift(primary);
        else if (templateId === "rightWide") list.splice(1, 0, primary);
        else list.unshift(primary);
      }
    }
    list.forEach(function (plot, index) {
      var slot = slots[index];
      if (!slot) return;
      plot.layout.x = slot.x;
      plot.layout.y = slot.y;
      plot.layout.width = Math.max(240, slot.width);
      plot.layout.height = Math.max(180, slot.height);
      plot.layoutSlot = names[index] || ("slot" + index);
      if (!plot.lockAspect) plot.aspectRatio = plot.layout.height ? plot.layout.width / plot.layout.height : plot.aspectRatio;
    });
    return plots;
  }

  function snapThresholdWorld(zoom) {
    return SNAP_SCREEN_PX / clampZoom(zoom);
  }

  function nearestSnap(value, candidates, threshold) {
    var best = null;
    (candidates || []).forEach(function (candidate) {
      var delta = Math.abs(value - candidate);
      if (delta <= threshold && (!best || delta < best.delta)) best = { value: candidate, delta: delta };
    });
    return best;
  }

  function collectEdgeGuides(plot, others, canvas) {
    var vertical = [0];
    var horizontal = [0];
    if (canvas) {
      vertical.push(canvas.width || 0, (canvas.width || 0) / 2);
      horizontal.push(canvas.height || 0, (canvas.height || 0) / 2);
    }
    (others || []).forEach(function (other) {
      if (!other || !other.layout) return;
      var x = other.layout.x;
      var y = other.layout.y;
      var right = x + other.layout.width;
      var bottom = y + other.layout.height;
      vertical.push(x, right, x + other.layout.width / 2);
      horizontal.push(y, bottom, y + other.layout.height / 2);
    });
    return { vertical: vertical, horizontal: horizontal };
  }

  function equalSpacingCandidates(moving, others, axis) {
    var results = [];
    if (!others || others.length < 2) return results;
    var boxes = others.map(function (item) {
      return {
        start: axis === "x" ? item.layout.x : item.layout.y,
        size: axis === "x" ? item.layout.width : item.layout.height
      };
    }).sort(function (a, b) { return a.start - b.start; });
    var movingSize = axis === "x" ? moving.layout.width : moving.layout.height;
    for (var i = 0; i < boxes.length - 1; i += 1) {
      var gap = boxes[i + 1].start - (boxes[i].start + boxes[i].size);
      if (!(gap > 0)) continue;
      results.push(boxes[i].start + boxes[i].size + gap);
      results.push(boxes[i + 1].start - gap - movingSize);
      results.push({ after: boxes[i + 1].start + boxes[i + 1].size + gap });
    }
    return results.map(function (item) {
      return typeof item === "number" ? item : item.after;
    }).filter(function (value) { return Number.isFinite(value); });
  }

  function snapPlotMove(plot, others, canvas, zoom) {
    var threshold = snapThresholdWorld(zoom);
    var guides = collectEdgeGuides(plot, others, canvas);
    var spacingX = equalSpacingCandidates(plot, others, "x");
    var spacingY = equalSpacingCandidates(plot, others, "y");
    var left = nearestSnap(plot.layout.x, guides.vertical.concat(spacingX), threshold);
    var right = nearestSnap(plot.layout.x + plot.layout.width, guides.vertical, threshold);
    var cx = nearestSnap(plot.layout.x + plot.layout.width / 2, guides.vertical, threshold);
    var top = nearestSnap(plot.layout.y, guides.horizontal.concat(spacingY), threshold);
    var bottom = nearestSnap(plot.layout.y + plot.layout.height, guides.horizontal, threshold);
    var cy = nearestSnap(plot.layout.y + plot.layout.height / 2, guides.horizontal, threshold);
    var lines = [];
    if (left && (!right || left.delta <= right.delta) && (!cx || left.delta <= cx.delta)) {
      plot.layout.x = left.value;
      lines.push({ axis: "x", value: left.value });
    } else if (right && (!cx || right.delta <= cx.delta)) {
      plot.layout.x = right.value - plot.layout.width;
      lines.push({ axis: "x", value: right.value });
    } else if (cx) {
      plot.layout.x = cx.value - plot.layout.width / 2;
      lines.push({ axis: "x", value: cx.value });
    }
    if (top && (!bottom || top.delta <= bottom.delta) && (!cy || top.delta <= cy.delta)) {
      plot.layout.y = top.value;
      lines.push({ axis: "y", value: top.value });
    } else if (bottom && (!cy || bottom.delta <= cy.delta)) {
      plot.layout.y = bottom.value - plot.layout.height;
      lines.push({ axis: "y", value: bottom.value });
    } else if (cy) {
      plot.layout.y = cy.value - plot.layout.height / 2;
      lines.push({ axis: "y", value: cy.value });
    }
    plot.layout.x = Math.round(plot.layout.x);
    plot.layout.y = Math.round(plot.layout.y);
    return { plot: plot, guides: lines };
  }

  function snapPlotResize(plot, others, canvas, zoom) {
    var threshold = snapThresholdWorld(zoom);
    var guides = collectEdgeGuides(plot, others, canvas);
    var right = nearestSnap(plot.layout.x + plot.layout.width, guides.vertical, threshold);
    var bottom = nearestSnap(plot.layout.y + plot.layout.height, guides.horizontal, threshold);
    var lines = [];
    if (right) {
      plot.layout.width = Math.max(240, Math.round(right.value - plot.layout.x));
      lines.push({ axis: "x", value: right.value });
    }
    if (bottom) {
      plot.layout.height = Math.max(180, Math.round(bottom.value - plot.layout.y));
      lines.push({ axis: "y", value: bottom.value });
    }
    if (plot.lockAspect && plot.aspectRatio > 0) {
      plot.layout.height = Math.max(180, Math.round(plot.layout.width / plot.aspectRatio));
    } else {
      plot.aspectRatio = plot.layout.height ? plot.layout.width / plot.layout.height : plot.aspectRatio;
    }
    return { plot: plot, guides: lines };
  }

  function niceStep(rawStep) {
    var power = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1e-9))));
    var fraction = rawStep / power;
    var nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return nice * power;
  }

  function autoTicks(low, high, count) {
    var step = niceStep((high - low) / Math.max(1, (count || 5) - 1));
    var first = Math.ceil(low / step) * step;
    var results = [];
    for (var value = first; value <= high + step * 0.2; value += step) {
      results.push(Number(value.toPrecision(8)));
    }
    return results.length ? results : [low, high];
  }

  function validateTickInterval(interval, min, max) {
    if (!Number.isFinite(Number(interval)) || Number(interval) <= 0) return "刻度间隔必须为正数。";
    var span = Number(max) - Number(min);
    if (!Number.isFinite(span) || span <= 0) return "最小值必须小于最大值。";
    if (span / Number(interval) > MAX_MAJOR_TICKS) return "刻度间隔过小，请增大刻度间隔。";
    return null;
  }

  function ticksFromInterval(low, high, interval) {
    var step = Number(interval);
    var error = validateTickInterval(step, low, high);
    if (error) return { values: autoTicks(low, high, 5), error: error };
    var start = Math.ceil(low / step - 1e-9) * step;
    var values = [];
    var guard = 0;
    for (var value = start; value <= high + step * 1e-6 && guard < MAX_MAJOR_TICKS; value += step) {
      values.push(Number(value.toPrecision(10)));
      guard += 1;
    }
    return { values: values.length ? values : [low, high], error: null };
  }

  function axisTickSet(axis, low, high, fallbackCount) {
    var major;
    if (axis && axis.tickMode === "manual" && Number.isFinite(Number(axis.majorTick)) && Number(axis.majorTick) > 0) {
      major = ticksFromInterval(low, high, axis.majorTick);
    } else {
      major = { values: autoTicks(low, high, fallbackCount || 5), error: null };
    }
    var minor = [];
    var minorMode = axis && axis.minorTickMode ? axis.minorTickMode : "auto";
    if (minorMode !== "off" && major.values.length >= 2) {
      var minorInterval = null;
      if (minorMode === "custom" && Number.isFinite(Number(axis.minorTick)) && Number(axis.minorTick) > 0) {
        minorInterval = Number(axis.minorTick);
      } else if (minorMode === "auto") {
        minorInterval = (major.values[1] - major.values[0]) / 5;
      }
      if (minorInterval && (high - low) / minorInterval <= MAX_MAJOR_TICKS * 4) {
        var start = Math.ceil(low / minorInterval - 1e-9) * minorInterval;
        var majorSet = {};
        major.values.forEach(function (value) { majorSet[String(Number(value.toPrecision(8)))] = true; });
        for (var value = start; value <= high + minorInterval * 1e-6; value += minorInterval) {
          var key = String(Number(value.toPrecision(8)));
          if (!majorSet[key]) minor.push(Number(value.toPrecision(10)));
        }
      }
    }
    return { major: major.values, minor: minor, error: major.error };
  }

  function compactNumber(value) {
    var abs = Math.abs(value);
    if (abs >= 100 || abs === 0) return value.toFixed(0);
    if (abs >= 10) return value.toFixed(1);
    return value.toFixed(2);
  }

  function formatTickValue(value, axis) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "";
    var decimals = axis && axis.decimals != null ? Number(axis.decimals) : null;
    var mode = axis && axis.formatMode ? axis.formatMode : "auto";
    if (mode === "scientific") {
      return number.toExponential(Number.isFinite(decimals) ? decimals : 1);
    }
    if (mode === "fixed" || Number.isFinite(decimals)) {
      return number.toFixed(Number.isFinite(decimals) ? decimals : 0);
    }
    return compactNumber(number);
  }

  function resolveLegendPosition(legend) {
    var position = legend && legend.position ? legend.position : "auto";
    if (position && typeof position === "object") {
      position = position.mode === "free" ? "free" : (position.mode || "auto");
    }
    if (LEGEND_POSITION_ALIASES[position]) position = LEGEND_POSITION_ALIASES[position];
    if (position !== "auto") return position;
    return "top";
  }

  function legendAnchor(position) {
    var map = {
      "top-left": [0, 0],
      "top-center": [0.5, 0],
      "top-right": [1, 0],
      "middle-left": [0, 0.5],
      "middle-right": [1, 0.5],
      "bottom-left": [0, 1],
      "bottom-center": [0.5, 1],
      "bottom-right": [1, 1],
      top: [0.5, 0],
      bottom: [0.5, 1],
      left: [0, 0.5],
      right: [1, 0.5]
    };
    return map[position] || [0.72, 0.08];
  }

  function resolveLegendColumns(legend, itemCount, orientation) {
    if (legend && legend.columns && legend.columns !== "auto") return Math.max(1, Number(legend.columns) || 1);
    if (legend && legend.rows && legend.rows !== "auto") {
      return Math.max(1, Math.ceil((itemCount || 1) / Math.max(1, Number(legend.rows) || 1)));
    }
    if (orientation === "vertical") return 1;
    if (itemCount > 8) return Math.min(6, Math.max(2, Math.ceil(itemCount / 8)));
    return itemCount > 4 ? 2 : 1;
  }

  function layoutLegendItems(items, options) {
    var opts = options || {};
    var fontSize = opts.fontSize || 12;
    var sampleLength = opts.sampleLength || 16;
    var rowGap = opts.rowGap == null ? 4 : opts.rowGap;
    var columnGap = opts.columnGap == null ? 12 : opts.columnGap;
    var measure = opts.measure || function (text) { return String(text || "").length * fontSize * 0.62; };
    var maxWidth = Math.max(40, opts.maxWidth || 240);
    var maxHeight = Math.max(16, opts.maxHeight || 120);
    var orientation = opts.orientation === "vertical" || opts.orientation === "horizontal"
      ? opts.orientation
      : "horizontal";
    var itemCount = (items || []).length;
    var explicitCols = opts.columns && opts.columns !== "auto";
    var explicitRows = opts.rows && opts.rows !== "auto";
    var colCount = resolveLegendColumns(opts, itemCount, orientation);
    var rowH = fontSize + 4;
    var widths = (items || []).map(function (item) {
      return sampleLength + 6 + measure(item.label) + 4;
    });
    if (orientation === "vertical") colCount = 1;
    if (explicitRows && !explicitCols) {
      colCount = Math.max(1, Math.ceil(itemCount / Math.max(1, Number(opts.rows) || 1)));
    }
    var rows = Math.max(1, Math.ceil(itemCount / Math.max(1, colCount)));
    if (!explicitCols && !explicitRows && orientation !== "vertical") {
      while (colCount < 12 && rows * rowH + (rows - 1) * rowGap > maxHeight) {
        colCount += 1;
        rows = Math.ceil(itemCount / colCount);
      }
    }
    var colWidths = [];
    for (var col = 0; col < colCount; col += 1) colWidths[col] = 0;
    (items || []).forEach(function (item, index) {
      var column = index % colCount;
      colWidths[column] = Math.max(colWidths[column], widths[index]);
    });
    var placed = [];
    var overflow = 0;
    (items || []).forEach(function (item, index) {
      var column = index % colCount;
      var row = Math.floor(index / colCount);
      var x = 0;
      for (var c = 0; c < column; c += 1) x += colWidths[c] + columnGap;
      var y = row * (rowH + rowGap);
      if (opts.wrap === false && y + rowH > maxHeight + 0.5) {
        overflow += 1;
        return;
      }
      placed.push({ x: x, y: y, width: colWidths[column], height: rowH, item: item });
    });
    var width = colWidths.reduce(function (sum, value) { return sum + value; }, 0) + columnGap * Math.max(0, colCount - 1);
    var height = placed.length ? Math.max.apply(null, placed.map(function (entry) { return entry.y + entry.height; })) : 0;
    if (!explicitCols) width = Math.min(maxWidth, Math.max(width, 0));
    else width = Math.max(width, 0);
    return { placed: placed, width: width, height: height, overflow: overflow, columns: colCount, rows: rows };
  }

  function dockLegendPosition(localX, localY, width, height) {
    var edge = 28;
    if (localY <= edge) return "top";
    if (localY >= height - edge) return "bottom";
    if (localX <= edge) return "left";
    if (localX >= width - edge) return "right";
    var nx = clamp(localX / Math.max(1, width), 0, 1);
    var ny = clamp(localY / Math.max(1, height), 0, 1);
    if (nx < 0.33 && ny < 0.33) return "inside-tl";
    if (nx > 0.67 && ny < 0.33) return "inside-tr";
    if (nx < 0.33 && ny > 0.67) return "inside-bl";
    if (nx > 0.67 && ny > 0.67) return "inside-br";
    return "floating";
  }

  function applyMultiSelect(state, action) {
    var ids = (state && state.ids) || [];
    var selected = {};
    ((state && state.selectedIds) || []).forEach(function (item) { selected[item] = true; });
    var anchorId = state && state.anchorId != null ? state.anchorId : null;
    action = action || {};
    var type = action.type;
    var id = action.id;

    function selectedList() {
      var inOrder = ids.filter(function (item) { return selected[item]; });
      Object.keys(selected).forEach(function (item) {
        if (selected[item] && ids.indexOf(item) < 0) inOrder.push(item);
      });
      return inOrder;
    }

    if (type === "selectAll") {
      ids.forEach(function (item) { selected[item] = true; });
      return { selectedIds: selectedList(), anchorId: ids[0] || anchorId };
    }
    if (type === "clear") {
      ids.forEach(function (item) { delete selected[item]; });
      return { selectedIds: selectedList(), anchorId: null };
    }
    if (id == null || ids.indexOf(id) < 0) {
      return { selectedIds: selectedList(), anchorId: anchorId };
    }
    if (type === "range" || action.shiftKey) {
      var from = ids.indexOf(anchorId);
      var to = ids.indexOf(id);
      if (from < 0) {
        selected[id] = true;
        return { selectedIds: selectedList(), anchorId: id };
      }
      var start = Math.min(from, to);
      var end = Math.max(from, to);
      for (var i = start; i <= end; i += 1) selected[ids[i]] = true;
      return { selectedIds: selectedList(), anchorId: anchorId };
    }
    if (selected[id]) delete selected[id];
    else selected[id] = true;
    return { selectedIds: selectedList(), anchorId: id };
  }

  function createMultiSelectController(options) {
    options = options || {};
    var selectedIds = (options.selectedIds || []).slice();
    var anchorId = options.anchorId || null;

    function currentIds() {
      return typeof options.getIds === "function" ? options.getIds() : (options.ids || []);
    }

    function emit() {
      if (typeof options.onSelectionChange === "function") options.onSelectionChange(selectedIds.slice(), anchorId);
    }

    function apply(action) {
      var next = applyMultiSelect({
        ids: currentIds(),
        selectedIds: selectedIds,
        anchorId: anchorId
      }, action);
      selectedIds = next.selectedIds;
      anchorId = next.anchorId;
      emit();
      return next;
    }

    return {
      click: function (id, mods) {
        mods = mods || {};
        return apply({
          type: mods.shiftKey ? "range" : "toggle",
          id: id,
          shiftKey: !!mods.shiftKey,
          ctrlKey: !!mods.ctrlKey,
          metaKey: !!mods.metaKey
        });
      },
      toggle: function (id) { return apply({ type: "toggle", id: id }); },
      range: function (id) { return apply({ type: "range", id: id }); },
      selectAll: function () { return apply({ type: "selectAll" }); },
      clear: function () { return apply({ type: "clear" }); },
      selectedIds: function () { return selectedIds.slice(); },
      anchorId: function () { return anchorId; }
    };
  }

  function legendLayoutSlot(position) {
    var resolved = resolveLegendPosition({ position: position });
    if (resolved === "free" || resolved === "floating") return "overlay";
    if (resolved === "top" || resolved === "top-left" || resolved === "top-center" || resolved === "top-right") return "top";
    if (resolved === "bottom" || resolved === "bottom-left" || resolved === "bottom-center" || resolved === "bottom-right") return "bottom";
    if (resolved === "left" || resolved === "middle-left") return "left";
    if (resolved === "right" || resolved === "middle-right") return "right";
    return "overlay";
  }

  function boxSize(value) {
    value = value || {};
    return {
      width: Number(value.width) || 0,
      height: Number(value.height) || 0,
      ascent: Number(value.ascent) || 0,
      descent: Number(value.descent) || 0
    };
  }

  function computePlotLayout(figureWidth, figureHeight, metrics) {
    var G = FIGURE_LAYOUT;
    metrics = metrics || {};
    var title = boxSize(metrics.title);
    var subtitle = boxSize(metrics.subtitle);
    var note = boxSize(metrics.note);
    var xTitle = boxSize(metrics.xAxisTitle);
    var yTitle = boxSize(metrics.yAxisTitle);
    var xTick = boxSize(metrics.xTick);
    var yTick = boxSize(metrics.yTick);
    var legend = boxSize(metrics.legend);
    var slot = legendLayoutSlot(metrics.legendPosition);
    var legendW = legend.width;
    var legendH = legend.height;
    var header = 0;
    if (title.height) header += title.height;
    if (subtitle.height) header += (header ? 4 : 0) + subtitle.height;
    if (note.height) header += (header ? 4 : 0) + note.height;

    var top = G.outerPadding + header;
    if (header) top += G.titleGap;
    if (slot === "top" && legendH) top += legendH + G.legendGap;
    top += Math.max(yTick.height, xTick.height) / 2;

    var bottom = G.outerPadding + G.tickLabelGap + xTick.height;
    if (xTitle.height) bottom += G.axisTitleGap + xTitle.height;
    if (slot === "bottom" && legendH) bottom += G.legendGap + legendH;

    var left = G.outerPadding;
    if (yTitle.height) left += yTitle.height + G.axisTitleGap;
    left += yTick.width + G.tickLabelGap;
    if (slot === "left" && legendW) left += legendW + G.legendGap;

    var right = Math.max(G.outerPadding, xTick.width / 2 + 4);
    if (slot === "right" && legendW) right += legendW + G.legendGap;

    var neededWidth = left + G.minPlotWidth + right;
    var titleSpan = (title.width || 0) + G.outerPadding * 2;
    if (titleSpan > neededWidth) neededWidth = titleSpan;
    var neededHeight = top + G.minPlotHeight + bottom;
    var width = Math.max(Number(figureWidth) || 0, neededWidth);
    var height = Math.max(Number(figureHeight) || 0, neededHeight);
    var plotWidth = Math.max(G.minPlotWidth, width - left - right);
    var plotHeight = Math.max(G.minPlotHeight, height - top - bottom);
    var titleAlign = metrics.titleAlign === "center" || metrics.titleAlign === "right" ? metrics.titleAlign : "left";
    var titleAnchor = titleAlign === "center" ? "middle" : (titleAlign === "right" ? "end" : "start");
    var titleX = titleAlign === "center" ? width / 2 : (titleAlign === "right" ? width - G.outerPadding : G.outerPadding);
    var titleY = G.outerPadding + (title.ascent || title.height);
    var subtitleY = titleY + (subtitle.height ? 4 + (subtitle.ascent || subtitle.height) : 0);
    var noteY = (subtitle.height ? subtitleY : titleY) + (note.height ? 4 + (note.ascent || note.height) : 0);
    var legendBox = { x: left, y: top, width: legendW, height: legendH, slot: slot, pad: 0 };
    var alignRight = metrics.legendPosition === "top-right" || metrics.legendPosition === "bottom-right";
    var alignCenter = metrics.legendPosition === "top-center" || metrics.legendPosition === "bottom-center"
      || metrics.legendPosition === "top" || metrics.legendPosition === "bottom" || metrics.legendPosition === "auto";
    if (slot === "top") {
      legendBox.y = G.outerPadding + header + (header ? G.titleGap : 0);
      legendBox.x = alignRight ? left + Math.max(0, plotWidth - legendW) : (alignCenter ? left + Math.max(0, (plotWidth - legendW) / 2) : left);
    } else if (slot === "bottom") {
      legendBox.y = height - G.outerPadding - legendH;
      legendBox.x = alignRight ? left + Math.max(0, plotWidth - legendW) : (alignCenter ? left + Math.max(0, (plotWidth - legendW) / 2) : left);
    } else if (slot === "left") {
      legendBox.x = G.outerPadding;
      legendBox.y = top;
    } else if (slot === "right") {
      legendBox.x = width - G.outerPadding - legendW;
      legendBox.y = top;
    }
    var yTitleX = G.outerPadding + (slot === "left" ? legendW + G.legendGap : 0) + yTitle.height / 2;
    var xTitleY = height - G.outerPadding - (slot === "bottom" ? legendH + G.legendGap : 0) - (xTitle.descent || 0);
    return {
      width: width,
      height: height,
      grown: width > (Number(figureWidth) || 0) + 0.5 || height > (Number(figureHeight) || 0) + 0.5,
      margin: { top: top, right: right, bottom: bottom, left: left },
      plotArea: { x: left, y: top, width: plotWidth, height: plotHeight },
      legendBox: legendBox,
      titleAlign: titleAlign,
      titleAnchor: titleAnchor,
      titlePos: { x: titleX, y: titleY },
      subtitlePos: { x: titleX, y: subtitleY },
      notePos: { x: titleX, y: noteY },
      xAxisTitlePos: { x: left + plotWidth / 2, y: xTitleY },
      yAxisTitlePos: { x: yTitleX, y: top + plotHeight / 2 },
      xTickY: top + plotHeight + G.tickLabelGap + (xTick.ascent || xTick.height * 0.8),
      yTickX: left - G.tickLabelGap
    };
  }

  var api = {
    APP_INFO: APP_INFO,
    SOFTWARE_VERSION: SOFTWARE_VERSION,
    PROJECT_FORMAT_VERSION: PROJECT_FORMAT_VERSION,
    githubReleasesApiUrl: githubReleasesApiUrl,
    githubReleasesPageUrl: githubReleasesPageUrl,
    normalizeVersionTag: normalizeVersionTag,
    parseSemVer: parseSemVer,
    compareSemVer: compareSemVer,
    buildExpectedAssetName: buildExpectedAssetName,
    findReleaseAsset: findReleaseAsset,
    createUpdateState: createUpdateState,
    evaluateLatestRelease: evaluateLatestRelease,
    fetchLatestRelease: fetchLatestRelease,
    checkForUpdates: checkForUpdates,
    SUPPORTED_PROJECT_FORMATS: SUPPORTED_PROJECT_FORMATS,
    TIME_IN_SECONDS: TIME_IN_SECONDS,
    TIME_LABELS: TIME_LABELS,
    LINE_TYPES: LINE_TYPES,
    LINE_STYLES: LINE_STYLES,
    normalizeHexColor: normalizeHexColor,
    isValidHexColor: isValidHexColor,
    cssColorToHex: cssColorToHex,
    applyStyleToSeries: applyStyleToSeries,
    applyStyleToDataset: applyStyleToDataset,
    LINE_WIDTH_MIN: LINE_WIDTH_MIN,
    LINE_WIDTH_MAX: LINE_WIDTH_MAX,
    LINE_WIDTH_STEP: LINE_WIDTH_STEP,
    DEFAULT_FONT: DEFAULT_FONT,
    FONT_FAMILIES: FONT_FAMILIES,
    FIGURE_LAYOUT: FIGURE_LAYOUT,
    DEFAULT_GROUPS: DEFAULT_GROUPS,
    MAX_MAJOR_TICKS: MAX_MAJOR_TICKS,
    ZOOM_MIN: ZOOM_MIN,
    ZOOM_MAX: ZOOM_MAX,
    ZOOM_STEP: ZOOM_STEP,
    DEFAULT_FIGURE_WIDTH: DEFAULT_FIGURE_WIDTH,
    DEFAULT_FIGURE_HEIGHT: DEFAULT_FIGURE_HEIGHT,
    LAYOUT_PADDING: LAYOUT_PADDING,
    LAYOUT_GAP: LAYOUT_GAP,
    LAYOUT_TEMPLATES: LAYOUT_TEMPLATES,
    makeId: makeId,
    cloneJson: cloneJson,
    clamp: clamp,
    clampZoom: clampZoom,
    parseCsv: parseCsv,
    parseColumnHeader: parseColumnHeader,
    parseDatasetFromCsv: parseDatasetFromCsv,
    createProject: createProject,
    parseProject: parseProject,
    serializeProject: serializeProject,
    addDataset: addDataset,
    removeDataset: removeDataset,
    createPlot: createPlot,
    ensureDefaultPlot: ensureDefaultPlot,
    addSeriesToPlot: addSeriesToPlot,
    findDataset: findDataset,
    findSeries: findSeries,
    allSeriesIds: allSeriesIds,
    assertUniqueSeriesIds: assertUniqueSeriesIds,
    seriesId: seriesId,
    resolvePlotSeries: resolvePlotSeries,
    convertSeriesX: convertSeriesX,
    seriesXForPlot: seriesXForPlot,
    plotTimeSettings: plotTimeSettings,
    plotExtents: plotExtents,
    numericExtent: numericExtent,
    axisRange: axisRange,
    formatQuantityTitle: formatQuantityTitle,
    computeAutoXTitle: computeAutoXTitle,
    computeAutoYTitle: computeAutoYTitle,
    resolvedAxisTitle: resolvedAxisTitle,
    syncPlotAxisAutoTitles: syncPlotAxisAutoTitles,
    syncAllPlotAxisAutoTitles: syncAllPlotAxisAutoTitles,
    isTimeHeader: isTimeHeader,
    projectNameFromFilename: projectNameFromFilename,
    seriesDisplayName: seriesDisplayName,
    seriesOriginalName: seriesOriginalName,
    commonPrefix: commonPrefix,
    commonSuffix: commonSuffix,
    previewBatchRename: previewBatchRename,
    applyBatchRename: applyBatchRename,
    selectedSeriesIds: selectedSeriesIds,
    resolveRenameTarget: resolveRenameTarget,
    applyRenameToSeriesIds: applyRenameToSeriesIds,
    applySeriesStyle: applySeriesStyle,
    normalizeSeriesStyle: normalizeSeriesStyle,
    normalizeSeriesRef: normalizeSeriesRef,
    normalizeTextStyle: normalizeTextStyle,
    normalizePlotTextStyles: normalizePlotTextStyles,
    strokeDasharray: strokeDasharray,
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen,
    plotsBoundingBox: plotsBoundingBox,
    fitViewZoom: fitViewZoom,
    syncCanvasToPlots: syncCanvasToPlots,
    setPlotSize: setPlotSize,
    layoutSlots: layoutSlots,
    applyLayoutTemplate: applyLayoutTemplate,
    snapPlotMove: snapPlotMove,
    snapPlotResize: snapPlotResize,
    snapThresholdWorld: snapThresholdWorld,
    validateTickInterval: validateTickInterval,
    axisTickSet: axisTickSet,
    formatTickValue: formatTickValue,
    compactNumber: compactNumber,
    autoTicks: autoTicks,
    layoutLegendItems: layoutLegendItems,
    resolveLegendPosition: resolveLegendPosition,
    legendAnchor: legendAnchor,
    legendLayoutSlot: legendLayoutSlot,
    dockLegendPosition: dockLegendPosition,
    applyMultiSelect: applyMultiSelect,
    createMultiSelectController: createMultiSelectController,
    computePlotLayout: computePlotLayout,
    normalizeUi: normalizeUi,
    normalizeLegend: normalizeLegend,
    normalizeAxis: normalizeAxis,
    normalizePlot: normalizePlot
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VisualizerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
