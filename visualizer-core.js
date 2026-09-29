/* Visualizer core: Project / Dataset / Series / Plot / Canvas. No DOM. */
(function (root) {
  "use strict";

  var APP_INFO = Object.freeze({
    name: "Visualizer",
    version: "0.4.1",
    repositoryOwner: "aidisen975-cmd",
    repositoryName: "Visualizer",
    updateChannel: "stable"
  });
  var SOFTWARE_VERSION = APP_INFO.version;
  var PROJECT_FORMAT_VERSION = "1.0";
  var SCHEMA_VERSION = 2;
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
    splitV: { id: "splitV", label: "1:1 上下", cols: 1, rows: 2, spans: [[0, 0, 1, 1], [0, 1, 1, 1]], slots: ["top", "bottom"] },
    onePlusTwo: { id: "onePlusTwo", label: "一大两小", cols: 2, rows: 2, spans: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]], slots: ["large", "smallTop", "smallBottom"] },
    twoPlusOne: { id: "twoPlusOne", label: "两小一大", cols: 2, rows: 2, spans: [[0, 0, 1, 1], [0, 1, 1, 1], [1, 0, 1, 2]], slots: ["smallTop", "smallBottom", "large"] },
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
  var PALETTE_LIST = [
    { id: "high-contrast", label: "自动高对比" },
    { id: "okabe-ito", label: "色盲友好" },
    { id: "tol-muted", label: "柔和科研配色" },
    { id: "set1", label: "高饱和分类配色" },
    { id: "tableau-10", label: "Tableau 10" },
    { id: "tol-bright", label: "Tol Bright" },
    { id: "dark2", label: "ColorBrewer Dark" }
  ];
  var FIXED_PALETTES = {
    "okabe-ito": ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7", "#56B4E9", "#F0E442", "#000000"],
    "tol-muted": ["#332288", "#88CCEE", "#44AA99", "#117733", "#999933", "#DDCC77", "#CC6677", "#882255", "#AA4499"],
    "set1": ["#E41A1C", "#377EB8", "#4DAF4A", "#984EA3", "#FF7F00", "#A65628", "#F781BF", "#999999", "#FFFF33"],
    "tableau-10": ["#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F", "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC"],
    "tol-bright": ["#4477AA", "#EE6677", "#228833", "#CCBB44", "#66CCEE", "#AA3377", "#BBBBBB"],
    "dark2": ["#1B9E77", "#D95F02", "#7570B3", "#E7298A", "#66A61E", "#E6AB02", "#A6761D", "#666666"]
  };
  var CANVAS_PRESETS = {
    "16:9": { width: 1600, height: 900, label: "16:9" },
    "4:3": { width: 1600, height: 1200, label: "4:3" },
    "a4-land": { width: 1123, height: 794, label: "A4 横向" },
    "a4-port": { width: 794, height: 1123, label: "A4 纵向" }
  };

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
      schemaVersion: SCHEMA_VERSION,
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
    if (!axis || axis.showTitle === false) return "";
    if (axis.titleMode === "custom") return String(axis.customTitle == null ? "" : axis.customTitle);
    return String(axis.autoTitle ? axis.autoTitle : "");
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

  function plotEditorName(plot) {
    if (!plot) return "";
    if (plot.name) return String(plot.name);
    var title = String(plot.title || "");
    if (title && title !== "未命名图") return title;
    return "Figure";
  }

  function plotDisplayTitle(plot) {
    if (!plot || plot.showTitle === false) return "";
    var text = String(plot.title || "").trim();
    if (!text || text === "未命名图") return "";
    return text;
  }

  function normalizeLineStroke(raw, fallback) {
    var style = raw && typeof raw === "object" ? raw : {};
    var width = Number(style.lineWidth);
    var color = style.color ? normalizeHexColor(style.color) : null;
    return {
      color: color || (fallback && fallback.color) || "#1d4e89",
      lineWidth: Number.isFinite(width) ? clamp(width, 0.5, 6) : ((fallback && fallback.lineWidth) || 1.25),
      lineType: LINE_TYPES.indexOf(style.lineType) >= 0 ? style.lineType : ((fallback && fallback.lineType) || "solid")
    };
  }

  function normalizeDetailSource(raw) {
    if (!raw || typeof raw !== "object") return null;
    var range = raw.sourceRange || {};
    var xMin = Number(range.xMin);
    var xMax = Number(range.xMax);
    var yMin = Number(range.yMin);
    var yMax = Number(range.yMax);
    if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) return null;
    if (xMin > xMax) { var swapX = xMin; xMin = xMax; xMax = swapX; }
    if (yMin > yMax) { var swapY = yMin; yMin = yMax; yMax = swapY; }
    var padding = Number(raw.yPaddingRatio);
    var yRangeMode = normalizeYRangeMode(raw);
    return {
      sourceFigureId: String(raw.sourceFigureId || ""),
      sourceRange: { xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax },
      yRangeMode: yRangeMode,
      autoFitY: yRangeMode === "auto-window",
      yPaddingRatio: Number.isFinite(padding) ? clamp(padding, 0, 0.5) : 0.05,
      showSourceBox: raw.showSourceBox !== false,
      showConnectorLines: raw.showConnectorLines !== false,
      boxStyle: normalizeLineStroke(raw.boxStyle, { color: "#1d4e89", lineWidth: 1.25, lineType: "solid" }),
      connectorStyle: normalizeLineStroke(raw.connectorStyle, { color: "#1d4e89", lineWidth: 1, lineType: "dashed" })
    };
  }

  function nextZOrder(project) {
    var max = 0;
    (project && project.plots || []).forEach(function (plot) {
      var z = Number(plot.zOrder);
      if (Number.isFinite(z) && z > max) max = z;
    });
    return max + 1;
  }

  function createPlot(project, partial) {
    var index = ((project && project.plots && project.plots.length) || 0) + 1;
    var isDetail = partial && partial.type === "detail";
    var givenTitle = partial && partial.title != null ? String(partial.title) : "";
    var title = givenTitle || (isDetail ? "" : ("Figure " + index));
    var defaultName = isDetail ? ("局部视图 " + index) : ("主图 " + index);
    var givenZ = Number(partial && partial.zOrder);
    var plot = {
      id: (partial && partial.id) || makeId("plot"),
      name: (partial && partial.name) ? String(partial.name) : defaultName,
      type: isDetail ? "detail" : "normal",
      visible: !(partial && partial.visible === false),
      locked: !!(partial && partial.locked),
      zOrder: Number.isFinite(givenZ) ? givenZ : nextZOrder(project),
      showTitle: partial && partial.showTitle != null ? !!partial.showTitle : title !== "" && title !== "未命名图",
      title: title === "未命名图" ? "" : title,
      subtitle: (partial && partial.subtitle) || "",
      note: (partial && partial.note) || "",
      seriesRefs: Array.isArray(partial && partial.seriesRefs)
        ? partial.seriesRefs.map(function (ref) { return normalizeSeriesRef(ref); })
        : [],
      xAxis: normalizeAxis(partial && partial.xAxis),
      yAxis: normalizeAxis(partial && partial.yAxis),
      topEdge: normalizeEdge(partial && partial.topEdge, "top"),
      rightEdge: normalizeEdge(partial && partial.rightEdge, "right"),
      detailSource: normalizeDetailSource(partial && partial.detailSource),
      layout: (partial && partial.layout) || nextPlotLayout(project),
      layoutSlot: partial && partial.layoutSlot ? String(partial.layoutSlot) : null,
      legendVisible: partial && partial.legendVisible === false ? false : true,
      legend: normalizeLegend(partial && partial.legend, partial && partial.legendVisible),
      textStyles: normalizePlotTextStyles(partial && partial.textStyles),
      background: partial && partial.background ? String(partial.background) : "",
      groupStyles: normalizeGroupStyles(partial && partial.groupStyles),
      annotations: normalizeAnnotations(partial && partial.annotations, (partial && partial.id) || ""),
      insets: normalizeInsets(partial && partial.insets, (partial && partial.id) || ""),
      fixedCursors: normalizeFixedCursors(partial && partial.fixedCursors),
      exportCursors: !!(partial && partial.exportCursors),
      lockAspect: !!(partial && partial.lockAspect),
      aspectRatio: Number.isFinite(Number(partial && partial.aspectRatio))
        ? Number(partial.aspectRatio)
        : null
    };
    if (!plot.aspectRatio && plot.layout.height) {
      plot.aspectRatio = plot.layout.width / plot.layout.height;
    }
    project.plots.push(plot);
    plot.annotations.forEach(function (item) { item.plotId = plot.id; });
    plot.insets.forEach(function (item) { item.sourcePlotId = plot.id; });
    syncPlotAxisAutoTitles(project, plot);
    finalizePlotInspection(project, plot);
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
      prunePlotInspection(project, plot);
    });
    syncAllPlotAxisAutoTitles(project);
  }

  function sourcePlotOf(project, plot) {
    if (!plot || plot.type !== "detail" || !plot.detailSource) return null;
    var id = plot.detailSource.sourceFigureId;
    if (!id || !project) return null;
    var source = (project.plots || []).find(function (item) { return item.id === id && item.id !== plot.id; }) || null;
    if (!source || source.type === "detail") return null;
    return source;
  }

  function resolvePlotSeries(project, plot) {
    var host = sourcePlotOf(project, plot) || plot;
    var palette = {};
    return (host.seriesRefs || []).map(function (ref) {
      var series = findSeries(project, ref.seriesId);
      if (!series) return null;
      var index = palette[series.datasetId] || 0;
      palette[series.datasetId] = index + 1;
      var style = resolveSeriesStyle(host, series, ref, index);
      return {
        series: series,
        ref: ref,
        visible: ref.visible !== false,
        selected: !!ref.selected,
        color: style.color || ref.color || series.color,
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
      if (!ref.styleOverrides) ref.styleOverrides = {};
      if (patch && patch.color != null && patch.color !== "") ref.styleOverrides.color = true;
      if (patch && patch.lineType != null) ref.styleOverrides.lineType = true;
      if (patch && patch.lineWidth != null) ref.styleOverrides.lineWidth = true;
      if (patch && patch.opacity != null) ref.styleOverrides.opacity = true;
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

  function hexByte(value) {
    var text = Math.max(0, Math.min(255, Math.round(value))).toString(16);
    return text.length < 2 ? "0" + text : text;
  }

  function srgbChannelToLinear(channel) {
    var c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function linearToSrgbByte(channel) {
    var c = Math.min(1, Math.max(0, channel));
    var encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return hexByte(encoded * 255);
  }

  function oklabToSrgb(lab) {
    var l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
    var m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
    var s_ = lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b;
    var l = l_ * l_ * l_;
    var m = m_ * m_ * m_;
    var s = s_ * s_ * s_;
    return {
      r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    };
  }

  function hexToOklab(hex) {
    var raw = normalizeHexColor(hex);
    if (!raw) return null;
    var r = srgbChannelToLinear(parseInt(raw.slice(1, 3), 16));
    var g = srgbChannelToLinear(parseInt(raw.slice(3, 5), 16));
    var b = srgbChannelToLinear(parseInt(raw.slice(5, 7), 16));
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return {
      L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    };
  }

  function oklabDistance(left, right) {
    if (!left || !right) return 0;
    var dL = left.L - right.L;
    var da = left.a - right.a;
    var db = left.b - right.b;
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  function buildHighContrastPalette(count) {
    var candidates = [];
    var lights = [0.46, 0.55, 0.64, 0.73];
    var chromas = [0.09, 0.13, 0.17];
    lights.forEach(function (L) {
      chromas.forEach(function (C) {
        for (var hue = 0; hue < 360; hue += 8) {
          var rad = hue * Math.PI / 180;
          var lab = { L: L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
          var rgb = oklabToSrgb(lab);
          if (rgb.r < -0.02 || rgb.r > 1.02 || rgb.g < -0.02 || rgb.g > 1.02 || rgb.b < -0.02 || rgb.b > 1.02) continue;
          candidates.push({
            lab: lab,
            hex: "#" + linearToSrgbByte(rgb.r) + linearToSrgbByte(rgb.g) + linearToSrgbByte(rgb.b)
          });
        }
      });
    });
    if (!candidates.length) return SERIES_COLORS.slice();
    var selected = [candidates[0]];
    var bestSeed = candidates[0];
    var bestSeedScore = -1;
    candidates.forEach(function (item) {
      var score = oklabDistance(item.lab, { L: 0.55, a: -0.02, b: -0.12 });
      if (score < 0.08 && item.lab.L > bestSeedScore) {
        bestSeed = item;
        bestSeedScore = item.lab.L;
      }
    });
    selected = [bestSeed];
    var target = Math.max(1, count || 24);
    while (selected.length < target) {
      var winner = null;
      var winnerDist = -1;
      candidates.forEach(function (item) {
        var minDist = Infinity;
        selected.forEach(function (have) {
          var dist = oklabDistance(item.lab, have.lab);
          if (dist < minDist) minDist = dist;
        });
        if (minDist > winnerDist) {
          winnerDist = minDist;
          winner = item;
        }
      });
      if (!winner) break;
      selected.push(winner);
    }
    return selected.map(function (item) { return item.hex; });
  }

  var HIGH_CONTRAST_PALETTE = buildHighContrastPalette(32);

  function paletteColors(paletteId) {
    if (paletteId === "high-contrast" || !FIXED_PALETTES[paletteId]) return HIGH_CONTRAST_PALETTE;
    return FIXED_PALETTES[paletteId];
  }

  function paletteColor(paletteId, index) {
    var colors = paletteColors(paletteId || "high-contrast");
    var slot = Math.abs(Number(index) || 0) % colors.length;
    return colors[slot];
  }

  function paletteMinDistance(paletteId, count) {
    var total = Math.max(2, Number(count) || 2);
    var labs = [];
    var i;
    for (i = 0; i < total; i += 1) labs.push(hexToOklab(paletteColor(paletteId, i)));
    var minDist = Infinity;
    for (i = 0; i < labs.length; i += 1) {
      for (var j = i + 1; j < labs.length; j += 1) {
        minDist = Math.min(minDist, oklabDistance(labs[i], labs[j]));
      }
    }
    return minDist;
  }

  function normalizeStyleOverrides(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    var out = {};
    if (raw.color) out.color = true;
    if (raw.lineType) out.lineType = true;
    if (raw.lineWidth) out.lineWidth = true;
    if (raw.opacity) out.opacity = true;
    return out;
  }

  function normalizeGroupStyle(raw) {
    if (!raw || typeof raw !== "object") return null;
    var style = { colorMode: raw.colorMode === "palette" ? "palette" : "single" };
    if (raw.paletteId && (raw.paletteId === "high-contrast" || FIXED_PALETTES[raw.paletteId])) style.paletteId = raw.paletteId;
    else if (style.colorMode === "palette") style.paletteId = "high-contrast";
    var color = raw.color ? normalizeHexColor(raw.color) : null;
    if (color) style.color = color;
    if (LINE_TYPES.indexOf(raw.lineType) >= 0) style.lineType = raw.lineType;
    if (Number.isFinite(Number(raw.lineWidth))) style.lineWidth = clamp(Number(raw.lineWidth), LINE_WIDTH_MIN, LINE_WIDTH_MAX);
    return style;
  }

  function normalizeGroupStyles(raw) {
    var out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    Object.keys(raw).forEach(function (key) {
      var style = normalizeGroupStyle(raw[key]);
      if (style) out[String(key)] = style;
    });
    return out;
  }

  function resolveSeriesStyle(plot, series, ref, paletteIndex) {
    var own = normalizeSeriesStyle(ref && ref.style, (ref && ref.color) || (series && series.color));
    var overrides = (ref && ref.styleOverrides) || {};
    var group = plot && plot.groupStyles && series ? plot.groupStyles[series.datasetId] : null;
    if (!group) return own;
    var next = normalizeSeriesStyle(own, own.color);
    if (!overrides.color) {
      if (group.colorMode === "palette") next.color = paletteColor(group.paletteId || "high-contrast", paletteIndex || 0);
      else if (group.color) next.color = group.color;
    }
    if (!overrides.lineType && group.lineType) next.lineType = group.lineType;
    if (!overrides.lineWidth && group.lineWidth != null) next.lineWidth = group.lineWidth;
    return next;
  }

  function applyGroupStyle(project, plot, datasetId, patch) {
    if (!plot || !datasetId) return null;
    if (!plot.groupStyles) plot.groupStyles = {};
    var prev = plot.groupStyles[datasetId] || {};
    var next = {
      colorMode: patch && patch.colorMode === "palette" ? "palette" : (patch && patch.colorMode === "single" ? "single" : (prev.colorMode || "single")),
      paletteId: (patch && patch.paletteId) || prev.paletteId || "high-contrast",
      color: prev.color || null,
      lineType: prev.lineType || null,
      lineWidth: prev.lineWidth != null ? prev.lineWidth : null
    };
    if (patch && patch.color) {
      var hex = normalizeHexColor(patch.color);
      if (hex) next.color = hex;
    }
    if (patch && LINE_TYPES.indexOf(patch.lineType) >= 0) next.lineType = patch.lineType;
    if (patch && patch.lineWidth != null && Number.isFinite(Number(patch.lineWidth))) {
      next.lineWidth = clamp(Number(patch.lineWidth), LINE_WIDTH_MIN, LINE_WIDTH_MAX);
    }
    plot.groupStyles[datasetId] = next;
    var index = 0;
    (plot.seriesRefs || []).forEach(function (ref) {
      var series = findSeries(project, ref.seriesId);
      if (!series || series.datasetId !== datasetId) return;
      ref.styleOverrides = {};
      var color = next.colorMode === "palette" ? paletteColor(next.paletteId, index) : next.color;
      index += 1;
      var stylePatch = {};
      if (color) stylePatch.color = color;
      if (next.lineType) stylePatch.lineType = next.lineType;
      if (next.lineWidth != null) stylePatch.lineWidth = next.lineWidth;
      ref.style = patchStyleObject(ref.style, stylePatch, ref.color);
      ref.color = ref.style.color || ref.color;
    });
    return next;
  }

  function setGroupStyle(plot, datasetId, patch) {
    if (!plot || !datasetId) return null;
    if (!plot.groupStyles) plot.groupStyles = {};
    var prev = plot.groupStyles[datasetId] || {};
    var merged = {
      colorMode: patch && patch.colorMode ? patch.colorMode : prev.colorMode,
      paletteId: patch && patch.paletteId ? patch.paletteId : prev.paletteId,
      color: patch && patch.color ? patch.color : prev.color,
      lineType: patch && patch.lineType ? patch.lineType : prev.lineType,
      lineWidth: patch && patch.lineWidth != null ? patch.lineWidth : prev.lineWidth
    };
    var next = normalizeGroupStyle(merged);
    if (!next) return null;
    plot.groupStyles[datasetId] = next;
    return next;
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

  function seriesExtents(project, plot) {
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

  function plotExtents(project, plot) {
    if (plot && plot.type === "detail" && plot.detailSource) {
      var domain = calculateLocalViewDomain(project, plot);
      return {
        x: domain.x,
        y: domain.y,
        visibleCount: domain.visibleCount,
        emptyWindow: !!domain.emptyWindow
      };
    }
    return seriesExtents(project, plot);
  }

  function normalizeAxisTime(raw) {
    var time = raw && typeof raw === "object" ? raw : {};
    return {
      enabled: time.enabled === false ? false : true,
      sourceUnit: TIME_IN_SECONDS[time.sourceUnit] ? time.sourceUnit : "s",
      displayUnit: TIME_IN_SECONDS[time.displayUnit] ? time.displayUnit : "s"
    };
  }

  function normalizeEdge(raw, side) {
    var quiet = side === "top" || side === "right";
    var edge = raw && typeof raw === "object" ? raw : {};
    return {
      showLine: edge.showLine == null ? !quiet : !!edge.showLine,
      showMajorTicks: edge.showMajorTicks == null ? !quiet : !!edge.showMajorTicks,
      showMinorTicks: edge.showMinorTicks == null ? !quiet : !!edge.showMinorTicks,
      showTickLabels: edge.showTickLabels == null ? !quiet : !!edge.showTickLabels,
      tickDirection: edge.tickDirection === "in" ? "in" : "out"
    };
  }

  function normalizeAxis(raw) {
    var axis = raw && typeof raw === "object" ? raw : {};
    var decimals = axis.decimals == null || axis.decimals === "" ? null : Number(axis.decimals);
    var majorTick = axis.majorTick == null || axis.majorTick === "" ? null : Number(axis.majorTick);
    var minorTick = axis.minorTick == null || axis.minorTick === "" ? null : Number(axis.minorTick);
    var lineWidth = Number(axis.lineWidth);
    var edge = normalizeEdge(axis, "bottom");
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
      showLine: edge.showLine,
      showMajorTicks: edge.showMajorTicks,
      showMinorTicks: edge.showMinorTicks,
      showTickLabels: edge.showTickLabels,
      showTitle: axis.showTitle == null ? true : !!axis.showTitle,
      tickDirection: edge.tickDirection,
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
      style: style,
      styleOverrides: normalizeStyleOverrides(ref.styleOverrides)
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
    var storedTitle = raw.title == null ? "" : String(raw.title);
    var title = storedTitle === "未命名图" ? "" : storedTitle;
    var showTitle = raw.showTitle == null ? title !== "" : !!raw.showTitle;
    var zOrder = Number(raw.zOrder);
    return {
      id: String(raw.id || makeId("plot")),
      name: raw.name ? String(raw.name) : (title || "Figure"),
      type: raw.type === "detail" ? "detail" : "normal",
      visible: raw.visible === false ? false : true,
      locked: !!raw.locked,
      zOrder: Number.isFinite(zOrder) ? zOrder : null,
      showTitle: showTitle,
      title: title,
      subtitle: String(raw.subtitle || ""),
      note: String(raw.note || ""),
      seriesRefs: Array.isArray(raw.seriesRefs) ? raw.seriesRefs.map(normalizeSeriesRef) : [],
      xAxis: normalizeAxis(raw.xAxis),
      yAxis: normalizeAxis(raw.yAxis),
      topEdge: normalizeEdge(raw.topEdge, "top"),
      rightEdge: normalizeEdge(raw.rightEdge, "right"),
      detailSource: normalizeDetailSource(raw.detailSource),
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
      groupStyles: normalizeGroupStyles(raw.groupStyles),
      annotations: normalizeAnnotations(raw.annotations, raw.id),
      insets: normalizeInsets(raw.insets, raw.id),
      fixedCursors: normalizeFixedCursors(raw.fixedCursors),
      exportCursors: !!raw.exportCursors,
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
      schemaVersion: SCHEMA_VERSION,
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
    assignLayerOrder(project);
    project.plots.forEach(function (plot) {
      if (sourcePlotOf(project, plot)) plot.seriesRefs = [];
    });
    assertUniqueSeriesIds(project);
    project.plots.forEach(function (plot) {
      plot.seriesRefs.forEach(function (ref) {
        if (!findSeries(project, ref.seriesId)) {
          throw new Error("图「" + plot.title + "」引用了不存在的曲线：" + ref.seriesId);
        }
      });
    });
    project.plots.forEach(function (plot) { finalizePlotInspection(project, plot); });
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
      schemaVersion: SCHEMA_VERSION,
      softwareVersion: SOFTWARE_VERSION,
      projectName: project.projectName,
      savedAt: new Date().toISOString(),
      datasets: project.datasets,
      plots: (project.plots || []).map(function (plot) {
        var copy = cloneJson(plot);
        if (sourcePlotOf(project, plot)) copy.seriesRefs = [];
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

  function canvasLayoutArea(canvas) {
    return {
      width: Math.max(400, Number(canvas && canvas.width) || 1280),
      height: Math.max(300, Number(canvas && canvas.height) || 800),
      padding: LAYOUT_PADDING,
      gap: LAYOUT_GAP
    };
  }

  function setCanvasSize(project, width, height) {
    if (!project.canvas) project.canvas = { width: 1280, height: 800, zoom: 1 };
    project.canvas.width = Math.max(400, Math.round(Number(width) || project.canvas.width));
    project.canvas.height = Math.max(300, Math.round(Number(height) || project.canvas.height));
    return project.canvas;
  }

  function placePlotInSlot(plot, templateId, slotIndex, canvas) {
    var spec = LAYOUT_TEMPLATES[templateId];
    if (!plot || !spec) return null;
    var slots = layoutSlots(templateId, canvasLayoutArea(canvas));
    var slot = slots[slotIndex];
    if (!slot) return null;
    plot.layout.x = slot.x;
    plot.layout.y = slot.y;
    plot.layout.width = Math.max(240, slot.width);
    plot.layout.height = Math.max(180, slot.height);
    plot.layoutSlot = (spec.slots && spec.slots[slotIndex]) || ("slot" + slotIndex);
    if (!plot.lockAspect) plot.aspectRatio = plot.layout.height ? plot.layout.width / plot.layout.height : plot.aspectRatio;
    return plot;
  }

  function normalizeYRangeMode(raw) {
    var mode = raw && raw.yRangeMode;
    if (mode === "follow-main" || mode === "auto-window" || mode === "manual") return mode;
    if (raw && raw.autoFitY === false) return "manual";
    return "auto-window";
  }

  function setDetailYRangeMode(source, mode) {
    if (!source) return source;
    source.yRangeMode = normalizeYRangeMode({ yRangeMode: mode });
    source.autoFitY = source.yRangeMode === "auto-window";
    return source;
  }

  function localXWindow(plot) {
    var source = plot && plot.detailSource;
    var xMin = Number(plot && plot.xAxis && plot.xAxis.min);
    var xMax = Number(plot && plot.xAxis && plot.xAxis.max);
    if (!(xMax > xMin) && source && source.sourceRange) {
      xMin = Number(source.sourceRange.xMin);
      xMax = Number(source.sourceRange.xMax);
    }
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || !(xMax > xMin)) return null;
    return xMin < xMax ? [xMin, xMax] : [xMax, xMin];
  }

  function getVisibleWindowData(project, plot, xMin, xMax) {
    var lowX = Number(xMin);
    var highX = Number(xMax);
    var ys = [];
    if (!Number.isFinite(lowX) || !Number.isFinite(highX) || !(highX > lowX)) return ys;
    resolvePlotSeries(project, plot).forEach(function (item) {
      if (!item.visible) return;
      var dataset = findDataset(project, item.series.datasetId);
      var xs = seriesXForPlot(project, plot, item.series, dataset);
      var values = item.series.y || [];
      values.forEach(function (y, index) {
        if (y == null || xs[index] == null) return;
        var x = Number(xs[index]);
        var value = Number(y);
        if (!Number.isFinite(x) || !Number.isFinite(value)) return;
        if (x < lowX || x > highX) return;
        ys.push(value);
      });
    });
    return ys;
  }

  function applyRangePadding(min, max, paddingRatio) {
    var low = Number(min);
    var high = Number(max);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
    if (low > high) {
      var swap = low;
      low = high;
      high = swap;
    }
    var ratio = Number(paddingRatio);
    if (!Number.isFinite(ratio) || ratio < 0) ratio = 0;
    if (ratio > 0.5) ratio = 0.5;
    if (high === low) {
      var delta = Math.max(Math.abs(low) * 0.01, 1e-6);
      return [low - delta, high + delta];
    }
    var pad = (high - low) * ratio;
    return [low - pad, high + pad];
  }

  function normalizeDomain(min, max) {
    return applyRangePadding(min, max, 0);
  }

  function calculateAutoYRange(ys, paddingRatio) {
    var low = Infinity;
    var high = -Infinity;
    (ys || []).forEach(function (value) {
      if (!Number.isFinite(value)) return;
      if (value < low) low = value;
      if (value > high) high = value;
    });
    if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
    return applyRangePadding(low, high, paddingRatio);
  }

  function calculateVisibleYRange(project, plot, xMin, xMax, paddingRatio) {
    return calculateAutoYRange(getVisibleWindowData(project, plot, xMin, xMax), paddingRatio);
  }

  function fallbackDetailY(project, plot) {
    var source = plot && plot.detailSource;
    var stored = source && source.sourceRange ? normalizeDomain(source.sourceRange.yMin, source.sourceRange.yMax) : null;
    if (stored) return stored;
    var main = sourcePlotOf(project, plot);
    if (main) return seriesExtents(project, main).y;
    var axis = plot && plot.yAxis ? normalizeDomain(plot.yAxis.min, plot.yAxis.max) : null;
    return axis || [0, 1];
  }

  function calculateLocalViewDomain(project, plot) {
    var source = plot && plot.detailSource;
    var xWindow = localXWindow(plot);
    var x = xWindow || [0, 1];
    var mode = source ? source.yRangeMode : "auto-window";
    var visibleCount = resolvePlotSeries(project, plot).filter(function (item) { return item.visible; }).length;
    if (mode === "manual") {
      var manual = plot && plot.yAxis ? normalizeDomain(plot.yAxis.min, plot.yAxis.max) : null;
      return {
        x: x,
        y: manual || fallbackDetailY(project, plot),
        visibleCount: visibleCount,
        emptyWindow: false,
        mode: mode
      };
    }
    if (mode === "follow-main") {
      var main = sourcePlotOf(project, plot);
      return {
        x: x,
        y: main ? seriesExtents(project, main).y : fallbackDetailY(project, plot),
        visibleCount: visibleCount,
        emptyWindow: false,
        mode: mode
      };
    }
    var fitted = xWindow ? calculateAutoYRange(getVisibleWindowData(project, plot, xWindow[0], xWindow[1]), source ? source.yPaddingRatio : 0.05) : null;
    if (!fitted) {
      return {
        x: x,
        y: fallbackDetailY(project, plot),
        visibleCount: visibleCount,
        emptyWindow: true,
        mode: "auto-window"
      };
    }
    return { x: x, y: fitted, visibleCount: visibleCount, emptyWindow: false, mode: "auto-window" };
  }

  function syncDetailRange(project, plot) {
    if (!plot || plot.type !== "detail" || !plot.detailSource) return null;
    var source = plot.detailSource;
    setDetailYRangeMode(source, source.yRangeMode);
    var domain = calculateLocalViewDomain(project, plot);
    if (domain.x[1] > domain.x[0] && localXWindow(plot)) {
      writeAxisRange(plot.xAxis, domain.x[0], domain.x[1]);
      source.sourceRange.xMin = domain.x[0];
      source.sourceRange.xMax = domain.x[1];
    }
    if (domain.mode === "manual") {
      if (plot.yAxis && Number(plot.yAxis.max) > Number(plot.yAxis.min)) {
        source.sourceRange.yMin = Number(plot.yAxis.min);
        source.sourceRange.yMax = Number(plot.yAxis.max);
      }
      return [source.sourceRange.yMin, source.sourceRange.yMax];
    }
    if (domain.emptyWindow) return null;
    writeAxisRange(plot.yAxis, domain.y[0], domain.y[1]);
    source.sourceRange.yMin = domain.y[0];
    source.sourceRange.yMax = domain.y[1];
    return domain.y;
  }

  function retainInspectorOpen(previous, switched, focusKey, childKey) {
    var next = {};
    var source = previous || {};
    Object.keys(source).forEach(function (key) {
      if (!switched) {
        next[key] = !!source[key];
        return;
      }
      var top = key.split(".")[0];
      if (key === focusKey || key === childKey) next[key] = true;
      else if (top === focusKey) next[key] = false;
      else if (key.indexOf(".") >= 0) next[key] = !!source[key];
      else next[key] = false;
    });
    if (switched && focusKey) next[focusKey] = true;
    if (switched && childKey) next[childKey] = true;
    return next;
  }

  function createLocalPlot(project, source, range) {
    if (!source || !range) return null;
    var detailCount = (project.plots || []).filter(function (item) { return item.type === "detail"; }).length + 1;
    var plot = createPlot(project, {
      name: "局部视图 " + detailCount,
      type: "detail",
      title: "",
      showTitle: false,
      seriesRefs: [],
      xAxis: cloneJson(source.xAxis),
      yAxis: cloneJson(source.yAxis),
      legend: cloneJson(source.legend),
      legendVisible: false,
      textStyles: cloneJson(source.textStyles),
      background: source.background || "",
      lockAspect: !!source.lockAspect,
      aspectRatio: source.aspectRatio
    });
    plot.seriesRefs = [];
    plot.groupStyles = {};
    plot.showTitle = false;
    plot.title = "";
    plot.legend.visible = false;
    plot.legendVisible = false;
    plot.xAxis.showTitle = false;
    plot.yAxis.showTitle = false;
    plot.xAxis.showMinorTicks = false;
    plot.yAxis.showMinorTicks = false;
    plot.topEdge = normalizeEdge(null, "top");
    plot.rightEdge = normalizeEdge(null, "right");
    plot.layout.width = Math.max(420, Math.round((source.layout.width || DEFAULT_FIGURE_WIDTH) * 0.62));
    plot.layout.height = Math.max(280, Math.round((source.layout.height || DEFAULT_FIGURE_HEIGHT) * 0.62));
    var canvasWidth = project.canvas && project.canvas.width ? project.canvas.width : 1280;
    var canvasHeight = project.canvas && project.canvas.height ? project.canvas.height : 800;
    var maxX = Math.max(LAYOUT_PADDING, canvasWidth - plot.layout.width - LAYOUT_PADDING);
    var maxY = Math.max(LAYOUT_PADDING, canvasHeight - plot.layout.height - LAYOUT_PADDING);
    var nextX = Math.round((source.layout.x || 0) + (source.layout.width || 0) + LAYOUT_GAP);
    var nextY = Math.round(source.layout.y || LAYOUT_PADDING);
    if (nextX > maxX) {
      nextX = maxX;
      nextY = Math.min(maxY, Math.round((source.layout.y || LAYOUT_PADDING) + (source.layout.height || 0) * 0.42));
    }
    plot.layout.x = Math.min(Math.max(LAYOUT_PADDING, nextX), maxX);
    plot.layout.y = Math.min(Math.max(LAYOUT_PADDING, nextY), maxY);
    writeAxisRange(plot.xAxis, range.xMin, range.xMax);
    plot.detailSource = normalizeDetailSource({
      sourceFigureId: source.id,
      sourceRange: {
        xMin: Math.min(range.xMin, range.xMax),
        xMax: Math.max(range.xMin, range.xMax),
        yMin: Math.min(range.yMin, range.yMax),
        yMax: Math.max(range.yMin, range.yMax)
      },
      yRangeMode: "auto-window",
      autoFitY: true,
      yPaddingRatio: 0.05,
      showSourceBox: true,
      showConnectorLines: true
    });
    var fitted = syncDetailRange(project, plot);
    if (!fitted && Number(range.yMax) > Number(range.yMin)) {
      writeAxisRange(plot.yAxis, range.yMin, range.yMax);
      if (plot.detailSource) {
        plot.detailSource.sourceRange.yMin = plot.yAxis.min;
        plot.detailSource.sourceRange.yMax = plot.yAxis.max;
      }
    }
    placePlotAbove(project, plot, source);
    return plot;
  }

  function plotsInLayerOrder(project) {
    return (project.plots || []).map(function (plot, index) {
      return { plot: plot, index: index };
    }).sort(function (a, b) {
      var az = Number(a.plot.zOrder);
      var bz = Number(b.plot.zOrder);
      var dz = (Number.isFinite(az) ? az : a.index) - (Number.isFinite(bz) ? bz : b.index);
      if (dz) return dz;
      return a.index - b.index;
    }).map(function (item) { return item.plot; });
  }

  function assignLayerOrder(project) {
    plotsInLayerOrder(project).forEach(function (plot, index) { plot.zOrder = index + 1; });
    return project;
  }

  function placePlotAbove(project, plot, anchor) {
    var ordered = plotsInLayerOrder(project).filter(function (item) { return item.id !== plot.id; });
    var index = ordered.findIndex(function (item) { return anchor && item.id === anchor.id; });
    ordered.splice(index < 0 ? ordered.length : index + 1, 0, plot);
    ordered.forEach(function (item, i) { item.zOrder = i + 1; });
    return plot;
  }

  function movePlotLayer(project, plotId, command) {
    var ordered = plotsInLayerOrder(project);
    var index = ordered.findIndex(function (plot) { return plot.id === plotId; });
    if (index < 0) return ordered;
    var next = index;
    if (command === "up") next = Math.min(ordered.length - 1, index + 1);
    if (command === "down") next = Math.max(0, index - 1);
    if (command === "top") next = ordered.length - 1;
    if (command === "bottom") next = 0;
    if (next !== index) {
      var item = ordered.splice(index, 1)[0];
      ordered.splice(next, 0, item);
    }
    ordered.forEach(function (plot, i) { plot.zOrder = i + 1; });
    return ordered;
  }

  function detailChildren(project, plotId) {
    return (project.plots || []).filter(function (plot) {
      return plot.detailSource && plot.detailSource.sourceFigureId === plotId;
    });
  }

  function removePlot(project, plotId) {
    var drop = {};
    drop[plotId] = true;
    detailChildren(project, plotId).forEach(function (plot) { drop[plot.id] = true; });
    var removed = (project.plots || []).filter(function (plot) { return drop[plot.id]; });
    project.plots = (project.plots || []).filter(function (plot) { return !drop[plot.id]; });
    assignLayerOrder(project);
    return removed;
  }

  function effectiveMagnification(main, inset) {
    function ratio(insetSize, mainSize, mainRange, insetRange) {
      if (!(insetSize > 0) || !(mainSize > 0) || !(mainRange > 0) || !(insetRange > 0)) return null;
      var value = (insetSize * mainRange) / (mainSize * insetRange);
      return Number.isFinite(value) && value > 0 ? value : null;
    }
    var a = main || {};
    var b = inset || {};
    return {
      x: ratio(b.plotWidth, a.plotWidth, Number(a.xMax) - Number(a.xMin), Number(b.xMax) - Number(b.xMin)),
      y: ratio(b.plotHeight, a.plotHeight, Number(a.yMax) - Number(a.yMin), Number(b.yMax) - Number(b.yMin))
    };
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
    var topTick = boxSize(metrics.topTick);
    var rightTick = boxSize(metrics.rightTick);
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
    if (topTick.height) top += G.tickLabelGap + topTick.height;
    top += Math.max(yTick.height, xTick.height) / 2;

    var bottom = G.outerPadding + G.tickLabelGap + xTick.height;
    if (xTitle.height) bottom += G.axisTitleGap + xTitle.height;
    if (slot === "bottom" && legendH) bottom += G.legendGap + legendH;

    var left = G.outerPadding;
    if (yTitle.height) left += yTitle.height + G.axisTitleGap;
    left += yTick.width + G.tickLabelGap;
    if (slot === "left" && legendW) left += legendW + G.legendGap;

    var right = Math.max(G.outerPadding, xTick.width / 2 + 4);
    if (rightTick.width) right += G.tickLabelGap + rightTick.width;
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
      yTickX: left - G.tickLabelGap,
      topTickY: top - G.tickLabelGap,
      rightTickX: left + plotWidth + G.tickLabelGap
    };
  }

  var HISTORY_LIMIT = 100;

  function unitOpacity(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? clamp(n, 0, 1) : fallback;
  }

  function createPlotFrame(xRange, yRange, plotArea) {
    var area = plotArea || { x: 0, y: 0, width: 1, height: 1 };
    var x0 = Number(xRange && xRange[0]);
    var x1 = Number(xRange && xRange[1]);
    var y0 = Number(yRange && yRange[0]);
    var y1 = Number(yRange && yRange[1]);
    var width = Number(area.width) || 1;
    var height = Number(area.height) || 1;
    var dx = x1 - x0 || 1;
    var dy = y1 - y0 || 1;
    var originX = Number(area.x) || 0;
    var originY = Number(area.y) || 0;
    return {
      dataToPixelX: function (x) { return originX + (Number(x) - x0) / dx * width; },
      dataToPixelY: function (y) { return originY + (y1 - Number(y)) / dy * height; },
      pixelToDataX: function (px) { return x0 + (Number(px) - originX) / width * dx; },
      pixelToDataY: function (py) { return y1 - (Number(py) - originY) / height * dy; }
    };
  }

  function normalizeSelectionRange(start, end, plotId) {
    var xMin = Number(start && start.x);
    var xMax = Number(end && end.x);
    var yMin = Number(start && start.y);
    var yMax = Number(end && end.y);
    if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) return null;
    if (xMin > xMax) { var swapX = xMin; xMin = xMax; xMax = swapX; }
    if (yMin > yMax) { var swapY = yMin; yMin = yMax; yMax = swapY; }
    return {
      xMin: xMin,
      xMax: xMax,
      yMin: yMin,
      yMax: yMax,
      plotId: plotId ? String(plotId) : "",
      xOnly: !!(end && end.xOnly)
    };
  }

  function writeAxisRange(axis, min, max) {
    var low = Number(min);
    var high = Number(max);
    if (!axis || !Number.isFinite(low) || !Number.isFinite(high) || low === high) return false;
    if (low > high) { var swap = low; low = high; high = swap; }
    axis.mode = "manual";
    axis.min = low;
    axis.max = high;
    return true;
  }

  function resetPlotView(plot) {
    if (plot && plot.xAxis) plot.xAxis.mode = "auto";
    if (plot && plot.yAxis) plot.yAxis.mode = "auto";
    return plot;
  }

  function sampleSeriesY(xs, ys, x, mode) {
    if (!Number.isFinite(x) || !xs || !ys || xs.length !== ys.length) return null;
    var finite = [];
    var i;
    for (i = 0; i < xs.length; i += 1) {
      if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) finite.push(i);
    }
    if (!finite.length) return null;
    var low = xs[finite[0]];
    var high = low;
    for (i = 1; i < finite.length; i += 1) {
      if (xs[finite[i]] < low) low = xs[finite[i]];
      if (xs[finite[i]] > high) high = xs[finite[i]];
    }
    if (x < low || x > high) return null;
    if (mode === "interpolate") return interpolateSeriesY(xs, ys, x);
    return nearestSeriesY(xs, ys, finite, x);
  }

  function nearestSeriesY(xs, ys, finite, x) {
    var increasing = true;
    var decreasing = true;
    var i;
    for (i = 1; i < finite.length; i += 1) {
      if (xs[finite[i]] < xs[finite[i - 1]]) increasing = false;
      if (xs[finite[i]] > xs[finite[i - 1]]) decreasing = false;
    }
    var best = finite[0];
    if (increasing || decreasing) {
      var lo = 0;
      var hi = finite.length - 1;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        var probe = xs[finite[mid]];
        if (increasing ? probe < x : probe > x) lo = mid + 1;
        else hi = mid;
      }
      best = finite[lo];
      if (lo > 0 && Math.abs(xs[finite[lo - 1]] - x) <= Math.abs(xs[best] - x)) best = finite[lo - 1];
    } else {
      // ponytail: non-monotonic X is a linear scan; binary search only applies when X is sorted
      var bestD = Math.abs(xs[best] - x);
      for (i = 1; i < finite.length; i += 1) {
        var dist = Math.abs(xs[finite[i]] - x);
        if (dist < bestD) { bestD = dist; best = finite[i]; }
      }
    }
    return { x: xs[best], y: ys[best], index: best };
  }

  function interpolateSeriesY(xs, ys, x) {
    var i;
    for (i = 0; i < xs.length; i += 1) {
      if (Number.isFinite(xs[i]) && Number.isFinite(ys[i]) && xs[i] === x) return { x: xs[i], y: ys[i], index: i };
    }
    for (i = 0; i < xs.length - 1; i += 1) {
      if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i]) || !Number.isFinite(xs[i + 1]) || !Number.isFinite(ys[i + 1])) continue;
      var left = xs[i];
      var right = xs[i + 1];
      if (left === right) continue;
      var segLow = Math.min(left, right);
      var segHigh = Math.max(left, right);
      if (x < segLow || x > segHigh) continue;
      var t = (x - left) / (right - left);
      return { x: x, y: ys[i] + t * (ys[i + 1] - ys[i]), index: i };
    }
    return null;
  }

  function findNearestPoint(xs, ys, x) {
    if (!Number.isFinite(x) || !xs || !ys || xs.length !== ys.length) return null;
    var finite = [];
    var i;
    for (i = 0; i < xs.length; i += 1) {
      if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) finite.push(i);
    }
    if (!finite.length) return null;
    return nearestSeriesY(xs, ys, finite, x);
  }

  function findNearestDataPoint(project, plot, frame, pixelX, pixelY) {
    if (!frame || !Number.isFinite(pixelX) || !Number.isFinite(pixelY)) return null;
    var best = null;
    resolvePlotSeries(project, plot).forEach(function (item) {
      if (!item.visible) return;
      var dataset = findDataset(project, item.series.datasetId);
      var xs = seriesXForPlot(project, plot, item.series, dataset);
      var ys = item.series.y;
      var i;
      for (i = 0; i < xs.length; i += 1) {
        if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) continue;
        var px = frame.dataToPixelX(xs[i]);
        var py = frame.dataToPixelY(ys[i]);
        var dist = Math.hypot(px - pixelX, py - pixelY);
        if (!best || dist < best.dist) {
          best = {
            dist: dist,
            seriesId: item.series.id,
            name: seriesDisplayName(item.series),
            unit: String(item.series.unit || ""),
            x: xs[i],
            y: ys[i],
            index: i,
            color: item.color
          };
        }
      }
    });
    return best;
  }

  function snapReadout(project, plot, frame, pixelX, pixelY) {
    var dataX = frame ? frame.pixelToDataX(pixelX) : pixelX;
    var best = null;
    resolvePlotSeries(project, plot).forEach(function (item) {
      if (!item.visible) return;
      var dataset = findDataset(project, item.series.datasetId);
      var xs = seriesXForPlot(project, plot, item.series, dataset);
      var sample = findNearestPoint(xs, item.series.y, dataX);
      if (!sample || !frame) return;
      var dist = Math.hypot(frame.dataToPixelX(sample.x) - pixelX, frame.dataToPixelY(sample.y) - pixelY);
      if (!best || dist < best.dist) best = { dist: dist, seriesId: item.series.id, x: sample.x, y: sample.y };
    });
    return {
      x: best ? best.x : dataX,
      nearestSeriesId: best ? best.seriesId : "",
      rows: readPlotAtX(project, plot, best ? best.x : dataX, "nearest")
    };
  }

  function detailConnectorLines(sourceBox, figureRect) {
    var box = sourceBox || {};
    var fig = figureRect || {};
    var x1 = Number(box.x1);
    var x2 = Number(box.x2);
    var y1 = Number(box.y1);
    var y2 = Number(box.y2);
    var fx = Number(fig.x);
    var fy = Number(fig.y);
    var fw = Number(fig.width);
    var fh = Number(fig.height);
    if (![x1, x2, y1, y2, fx, fy, fw, fh].every(Number.isFinite)) return [];
    var cx = (x1 + x2) / 2;
    var cy = (y1 + y2) / 2;
    var mx = fx + fw / 2;
    var my = fy + fh / 2;
    var from;
    var to;
    if (Math.abs(mx - cx) >= Math.abs(my - cy)) {
      if (mx >= cx) {
        from = [{ x: x2, y: y1 }, { x: x2, y: y2 }];
        to = [{ x: fx, y: fy }, { x: fx, y: fy + fh }];
      } else {
        from = [{ x: x1, y: y1 }, { x: x1, y: y2 }];
        to = [{ x: fx + fw, y: fy }, { x: fx + fw, y: fy + fh }];
      }
    } else if (my >= cy) {
      from = [{ x: x1, y: y2 }, { x: x2, y: y2 }];
      to = [{ x: fx, y: fy }, { x: fx + fw, y: fy }];
    } else {
      from = [{ x: x1, y: y1 }, { x: x2, y: y1 }];
      to = [{ x: fx, y: fy + fh }, { x: fx + fw, y: fy + fh }];
    }
    return [0, 1].map(function (index) {
      return { x1: from[index].x, y1: from[index].y, x2: to[index].x, y2: to[index].y };
    }).filter(function (line) {
      var midX = (line.x1 + line.x2) / 2;
      var midY = (line.y1 + line.y2) / 2;
      return !(midX > fx + 4 && midX < fx + fw - 4 && midY > fy + 4 && midY < fy + fh - 4);
    });
  }

  function readPlotAtX(project, plot, x, mode) {
    return resolvePlotSeries(project, plot).filter(function (item) { return item.visible; }).map(function (item) {
      var dataset = findDataset(project, item.series.datasetId);
      var xs = seriesXForPlot(project, plot, item.series, dataset);
      var sample = sampleSeriesY(xs, item.series.y, x, mode === "interpolate" ? "interpolate" : "nearest");
      return {
        seriesId: item.series.id,
        name: seriesDisplayName(item.series),
        unit: String(item.series.unit || ""),
        color: item.color,
        y: sample ? sample.y : null,
        x: sample ? sample.x : null
      };
    });
  }

  function normalizeFixedCursors(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (cursor) {
      if (!cursor || !Number.isFinite(Number(cursor.x))) return null;
      return { id: cursor.id === "B" ? "B" : "A", x: Number(cursor.x) };
    }).filter(Boolean).slice(0, 2);
  }

  function normalizeInset(raw, plotId) {
    if (!raw || typeof raw !== "object") return null;
    var range = raw.sourceRange || {};
    var rect = raw.rect || {};
    var xMin = Number(range.xMin);
    var xMax = Number(range.xMax);
    var yMin = Number(range.yMin);
    var yMax = Number(range.yMax);
    if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) return null;
    if (xMin > xMax) { var swapX = xMin; xMin = xMax; xMax = swapX; }
    if (yMin > yMax) { var swapY = yMin; yMin = yMax; yMax = swapY; }
    var xAxis = raw.xAxis || {};
    var yAxis = raw.yAxis || {};
    var style = raw.style || {};
    var width = Number(rect.width);
    var height = Number(rect.height);
    return {
      id: String(raw.id || makeId("inset")),
      sourcePlotId: String(raw.sourcePlotId || plotId || ""),
      sourceRange: { xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax },
      rect: {
        x: Number.isFinite(Number(rect.x)) ? Number(rect.x) : 24,
        y: Number.isFinite(Number(rect.y)) ? Number(rect.y) : 24,
        width: Number.isFinite(width) ? Math.max(80, width) : 220,
        height: Number.isFinite(height) ? Math.max(60, height) : 140
      },
      seriesIds: Array.isArray(raw.seriesIds) ? raw.seriesIds.map(String) : [],
      xAxis: {
        auto: xAxis.auto === true,
        min: Number.isFinite(Number(xAxis.min)) ? Number(xAxis.min) : xMin,
        max: Number.isFinite(Number(xAxis.max)) ? Number(xAxis.max) : xMax
      },
      yAxis: {
        auto: yAxis.auto !== false,
        min: Number.isFinite(Number(yAxis.min)) ? Number(yAxis.min) : null,
        max: Number.isFinite(Number(yAxis.max)) ? Number(yAxis.max) : null
      },
      title: raw.title == null ? "" : String(raw.title),
      showLegend: !!raw.showLegend,
      visible: raw.visible !== false,
      style: {
        backgroundColor: style.backgroundColor ? String(style.backgroundColor) : "#ffffff",
        backgroundOpacity: unitOpacity(style.backgroundOpacity, 0.92),
        borderColor: style.borderColor ? String(style.borderColor) : "#1d2024",
        borderWidth: Number.isFinite(Number(style.borderWidth)) ? clamp(Number(style.borderWidth), 0, 8) : 1
      },
      connector: { visible: !raw.connector || raw.connector.visible !== false }
    };
  }

  function normalizeInsets(raw, plotId) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (item) { return normalizeInset(item, plotId); }).filter(Boolean);
  }

  function clampInsetRect(rect, figureWidth, figureHeight) {
    var boundsW = Math.max(1, Number(figureWidth) || 1);
    var boundsH = Math.max(1, Number(figureHeight) || 1);
    var width = clamp(Number(rect.width) || 80, Math.min(80, boundsW), boundsW);
    var height = clamp(Number(rect.height) || 60, Math.min(60, boundsH), boundsH);
    return {
      x: clamp(Number(rect.x) || 0, 0, Math.max(0, boundsW - width)),
      y: clamp(Number(rect.y) || 0, 0, Math.max(0, boundsH - height)),
      width: width,
      height: height
    };
  }

  function normalizeAnnotation(raw, plotId) {
    if (!raw || typeof raw !== "object") return null;
    var types = { text: true, arrow: true, marker: true, region: true, point: true, free: true };
    if (!types[raw.type]) return null;
    var anchor = raw.anchor || {};
    var end = raw.end || {};
    if (!Number.isFinite(Number(anchor.x)) || !Number.isFinite(Number(anchor.y))) return null;
    var style = raw.style || {};
    var endX = Number(end.x);
    var endY = Number(end.y);
    return {
      id: String(raw.id || makeId("ann")),
      plotId: String(raw.plotId || plotId || ""),
      type: raw.type,
      seriesId: raw.seriesId ? String(raw.seriesId) : "",
      coordinateMode: raw.coordinateMode === "canvas" ? "canvas" : (raw.coordinateMode === "plot" ? "plot" : "data"),
      visible: raw.visible !== false,
      name: raw.name ? String(raw.name) : "",
      anchor: { x: Number(anchor.x), y: Number(anchor.y) },
      end: {
        x: Number.isFinite(endX) ? endX : Number(anchor.x),
        y: Number.isFinite(endY) ? endY : Number(anchor.y)
      },
      text: raw.text == null ? "" : String(raw.text),
      marker: raw.marker === "square" || raw.marker === "diamond" ? raw.marker : "circle",
      style: {
        fontFamily: String(style.fontFamily || DEFAULT_FONT),
        fontSize: clamp(Number(style.fontSize) || 12, 6, 72),
        fontWeight: style.fontWeight === "700" || style.fontWeight === "bold" ? "700" : "400",
        color: style.color ? String(style.color) : "#1d2024",
        lineWidth: Number.isFinite(Number(style.lineWidth)) ? clamp(Number(style.lineWidth), 0.5, 8) : 1.2,
        backgroundColor: style.backgroundColor ? String(style.backgroundColor) : "#ffffff",
        backgroundOpacity: unitOpacity(style.backgroundOpacity, 0.85),
        borderColor: style.borderColor ? String(style.borderColor) : "#1d2024",
        borderWidth: Number.isFinite(Number(style.borderWidth)) ? clamp(Number(style.borderWidth), 0, 8) : 1,
        fillColor: style.fillColor ? String(style.fillColor) : "#1e6eaa",
        fillOpacity: unitOpacity(style.fillOpacity, 0.16)
      }
    };
  }

  function normalizeAnnotations(raw, plotId) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (item) { return normalizeAnnotation(item, plotId); }).filter(Boolean);
  }

  function prunePlotInspection(project, plot) {
    var live = {};
    (plot.seriesRefs || []).forEach(function (ref) {
      if (findSeries(project, ref.seriesId)) live[ref.seriesId] = true;
    });
    (plot.insets || []).forEach(function (inset) {
      inset.seriesIds = (inset.seriesIds || []).filter(function (id) { return !!live[id]; });
    });
    return plot;
  }

  function finalizePlotInspection(project, plot) {
    plot.insets = plot.insets || [];
    plot.annotations = plot.annotations || [];
    plot.fixedCursors = plot.fixedCursors || [];
    plot.insets.forEach(function (inset) {
      inset.rect = clampInsetRect(inset.rect, plot.layout.width, plot.layout.height);
    });
    return prunePlotInspection(project, plot);
  }

  function insetYExtent(project, plot, inset) {
    if (inset.yAxis && inset.yAxis.auto === false && Number.isFinite(Number(inset.yAxis.min)) && Number.isFinite(Number(inset.yAxis.max)) && Number(inset.yAxis.min) < Number(inset.yAxis.max)) {
      return [Number(inset.yAxis.min), Number(inset.yAxis.max)];
    }
    var xMin = inset.xAxis && inset.xAxis.auto === false ? Number(inset.xAxis.min) : inset.sourceRange.xMin;
    var xMax = inset.xAxis && inset.xAxis.auto === false ? Number(inset.xAxis.max) : inset.sourceRange.xMax;
    var wanted = {};
    (inset.seriesIds || []).forEach(function (id) { wanted[id] = true; });
    var ys = [];
    resolvePlotSeries(project, plot).forEach(function (item) {
      if (!item.visible || !wanted[item.series.id]) return;
      var dataset = findDataset(project, item.series.datasetId);
      var xs = seriesXForPlot(project, plot, item.series, dataset);
      item.series.y.forEach(function (y, index) {
        if (!Number.isFinite(xs[index]) || !Number.isFinite(y)) return;
        if (xs[index] < xMin || xs[index] > xMax) return;
        ys.push(y);
      });
    });
    return numericExtent(ys, 0.04);
  }

  function insetRanges(project, plot, inset) {
    var xMin = inset.xAxis && inset.xAxis.auto === false ? Number(inset.xAxis.min) : inset.sourceRange.xMin;
    var xMax = inset.xAxis && inset.xAxis.auto === false ? Number(inset.xAxis.max) : inset.sourceRange.xMax;
    if (!(xMin < xMax)) { xMin = inset.sourceRange.xMin; xMax = inset.sourceRange.xMax; }
    return { x: [xMin, xMax], y: insetYExtent(project, plot, inset) };
  }

  function createHistory(limit) {
    var max = Number.isFinite(Number(limit)) ? Number(limit) : HISTORY_LIMIT;
    var past = [];
    var future = [];
    return {
      push: function (entry) {
        past.push(entry);
        if (past.length > max) past.shift();
        future = [];
        return entry;
      },
      undo: function () {
        if (!past.length) return null;
        var entry = past.pop();
        future.push(entry);
        if (typeof entry.undo === "function") entry.undo();
        return entry;
      },
      redo: function () {
        if (!future.length) return null;
        var entry = future.pop();
        past.push(entry);
        if (typeof entry.redo === "function") entry.redo();
        return entry;
      },
      canUndo: function () { return past.length > 0; },
      canRedo: function () { return future.length > 0; },
      clear: function () { past = []; future = []; },
      size: function () { return { undo: past.length, redo: future.length }; }
    };
  }

  function captureEditorState(project) {
    var series = [];
    (project.datasets || []).forEach(function (dataset) {
      (dataset.series || []).forEach(function (item) {
        series.push({
          id: item.id,
          color: item.color,
          style: cloneJson(item.style || {}),
          displayName: item.displayName,
          label: item.label
        });
      });
    });
    return { plots: cloneJson(project.plots || []), series: series };
  }

  function restoreEditorState(project, snap) {
    var copy = cloneJson(snap || { plots: [], series: [] });
    project.plots = (copy.plots || []).map(normalizePlot);
    var saved = {};
    (copy.series || []).forEach(function (item) { saved[item.id] = item; });
    (project.datasets || []).forEach(function (dataset) {
      (dataset.series || []).forEach(function (item) {
        var previous = saved[item.id];
        if (!previous) return;
        item.color = previous.color;
        item.style = cloneJson(previous.style || {});
        item.displayName = previous.displayName;
        item.label = previous.label;
      });
    });
    project.plots.forEach(function (plot) { finalizePlotInspection(project, plot); });
    syncAllPlotAxisAutoTitles(project);
    syncCanvasToPlots(project);
    return project;
  }

  var api = {
    APP_INFO: APP_INFO,
    SOFTWARE_VERSION: SOFTWARE_VERSION,
    PROJECT_FORMAT_VERSION: PROJECT_FORMAT_VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
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
    applyGroupStyle: applyGroupStyle,
    resolveSeriesStyle: resolveSeriesStyle,
    normalizeGroupStyles: normalizeGroupStyles,
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
    CANVAS_PRESETS: CANVAS_PRESETS,
    SERIES_COLORS: SERIES_COLORS,
    PALETTE_LIST: PALETTE_LIST,
    paletteColor: paletteColor,
    paletteMinDistance: paletteMinDistance,
    setGroupStyle: setGroupStyle,
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
    sourcePlotOf: sourcePlotOf,
    convertSeriesX: convertSeriesX,
    seriesXForPlot: seriesXForPlot,
    plotTimeSettings: plotTimeSettings,
    plotExtents: plotExtents,
    plotEditorName: plotEditorName,
    plotDisplayTitle: plotDisplayTitle,
    calculateVisibleYRange: calculateVisibleYRange,
    getVisibleWindowData: getVisibleWindowData,
    calculateAutoYRange: calculateAutoYRange,
    applyRangePadding: applyRangePadding,
    normalizeDomain: normalizeDomain,
    calculateLocalViewDomain: calculateLocalViewDomain,
    normalizeYRangeMode: normalizeYRangeMode,
    setDetailYRangeMode: setDetailYRangeMode,
    retainInspectorOpen: retainInspectorOpen,
    syncDetailRange: syncDetailRange,
    findNearestPoint: findNearestPoint,
    findNearestDataPoint: findNearestDataPoint,
    snapReadout: snapReadout,
    detailConnectorLines: detailConnectorLines,
    normalizeEdge: normalizeEdge,
    normalizeDetailSource: normalizeDetailSource,
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
    canvasLayoutArea: canvasLayoutArea,
    setCanvasSize: setCanvasSize,
    placePlotInSlot: placePlotInSlot,
    createLocalPlot: createLocalPlot,
    plotsInLayerOrder: plotsInLayerOrder,
    assignLayerOrder: assignLayerOrder,
    placePlotAbove: placePlotAbove,
    movePlotLayer: movePlotLayer,
    detailChildren: detailChildren,
    removePlot: removePlot,
    effectiveMagnification: effectiveMagnification,
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
    normalizePlot: normalizePlot,
    HISTORY_LIMIT: HISTORY_LIMIT,
    createPlotFrame: createPlotFrame,
    normalizeSelectionRange: normalizeSelectionRange,
    writeAxisRange: writeAxisRange,
    resetPlotView: resetPlotView,
    sampleSeriesY: sampleSeriesY,
    readPlotAtX: readPlotAtX,
    normalizeFixedCursors: normalizeFixedCursors,
    normalizeInset: normalizeInset,
    normalizeInsets: normalizeInsets,
    clampInsetRect: clampInsetRect,
    normalizeAnnotation: normalizeAnnotation,
    normalizeAnnotations: normalizeAnnotations,
    prunePlotInspection: prunePlotInspection,
    finalizePlotInspection: finalizePlotInspection,
    insetYExtent: insetYExtent,
    insetRanges: insetRanges,
    createHistory: createHistory,
    captureEditorState: captureEditorState,
    restoreEditorState: restoreEditorState
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VisualizerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
