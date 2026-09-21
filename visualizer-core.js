/* Visualizer v0.2.1 core: Project / Dataset / Series / Plot / Canvas. No DOM. */
(function (root) {
  "use strict";

  var SOFTWARE_VERSION = "0.2.1";
  var PROJECT_FORMAT_VERSION = "1.0";
  var SUPPORTED_PROJECT_FORMATS = ["1.0"];
  var TIME_IN_SECONDS = { s: 1, min: 60, h: 3600 };
  var TIME_LABELS = { s: "s", min: "min", h: "h" };
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
  var LEGEND_POSITIONS = ["auto", "top", "bottom", "left", "right", "inside-tl", "inside-tr", "inside-bl", "inside-br", "floating"];
  var LAYOUT_TEMPLATES = {
    single: { id: "single", label: "单图全幅", cols: 1, rows: 1, spans: [[0, 0, 1, 1]] },
    splitH: { id: "splitH", label: "1:1 左右", cols: 2, rows: 1, spans: [[0, 0, 1, 1], [1, 0, 1, 1]] },
    leftWide: { id: "leftWide", label: "左大右小", cols: 3, rows: 1, spans: [[0, 0, 2, 1], [2, 0, 1, 1]] },
    rightWide: { id: "rightWide", label: "左小右大", cols: 3, rows: 1, spans: [[0, 0, 1, 1], [1, 0, 2, 1]] },
    triple: { id: "triple", label: "三等分", cols: 3, rows: 1, spans: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1]] },
    onePlusTwo: { id: "onePlusTwo", label: "一大两小", cols: 2, rows: 2, spans: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
    grid2x2: { id: "grid2x2", label: "2×2", cols: 2, rows: 2, spans: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
    grid3x2: { id: "grid3x2", label: "3×2", cols: 3, rows: 2, spans: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1]] }
  };
  var DEFAULT_GROUPS = [
    { id: "group-1", label: "T1–T7", start: 1, end: 7, color: "#2477b6" },
    { id: "group-2", label: "T8–T22", start: 8, end: 22, color: "#25884d" },
    { id: "group-3", label: "T23–T37", start: 23, end: 37, color: "#d36518" },
    { id: "group-4", label: "T38–T52", start: 38, end: 52, color: "#6b52a8" }
  ];
  var SERIES_COLORS = ["#2477b6", "#d36518", "#25884d", "#6b52a8", "#d14e3d", "#167b91", "#8b5a9d", "#272b2e"];

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
        color: sensorId != null ? sensorColor(sensorId, group) : SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
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

  function computeAutoXTitle(project, plot) {
    var displayUnit = project.options && project.options.displayTimeUnit ? project.options.displayTimeUnit : "s";
    var items = resolvePlotSeries(project, plot);
    if (!items.length) return "Value";
    var metas = items.map(function (item) {
      var dataset = findDataset(project, item.series.datasetId);
      var xIsTime = !dataset || dataset.xIsTime !== false;
      return {
        name: dataset && dataset.xName ? dataset.xName : (xIsTime ? "Time" : ""),
        unit: xIsTime ? (TIME_LABELS[displayUnit] || displayUnit) : ((dataset && dataset.xUnit) || ""),
        xIsTime: xIsTime
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
    var plot = {
      id: (partial && partial.id) || makeId("plot"),
      title: (partial && partial.title) || "未命名图",
      subtitle: (partial && partial.subtitle) || "",
      note: (partial && partial.note) || "",
      seriesRefs: (partial && partial.seriesRefs) || [],
      xAxis: normalizeAxis(partial && partial.xAxis),
      yAxis: normalizeAxis(partial && partial.yAxis),
      layout: (partial && partial.layout) || nextPlotLayout(project),
      legendVisible: partial && partial.legendVisible === false ? false : true,
      legend: normalizeLegend(partial && partial.legend, partial && partial.legendVisible),
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
      plot.seriesRefs.push({
        seriesId: id,
        visible: true,
        color: series.color
      });
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
      return {
        series: series,
        ref: ref,
        visible: ref.visible !== false,
        color: ref.color || series.color
      };
    }).filter(Boolean);
  }

  function convertSeriesX(series, sourceUnit, displayUnit, xIsTime) {
    if (xIsTime === false) return series.x;
    var sourceFactor = TIME_IN_SECONDS[sourceUnit] || 1;
    var targetFactor = TIME_IN_SECONDS[displayUnit] || 1;
    if (sourceFactor === targetFactor) return series.x;
    return series.x.map(function (value) { return value * sourceFactor / targetFactor; });
  }

  function numericExtent(values) {
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
    var padding = (high - low) * 0.045;
    return [low - padding, high + padding];
  }

  function axisRange(axis, values) {
    if (axis && axis.mode === "manual" && Number.isFinite(Number(axis.min)) && Number.isFinite(Number(axis.max)) && Number(axis.min) < Number(axis.max)) {
      return [Number(axis.min), Number(axis.max)];
    }
    return numericExtent(values);
  }

  function plotExtents(project, plot) {
    var displayUnit = project.options.displayTimeUnit || "s";
    var visible = resolvePlotSeries(project, plot).filter(function (item) { return item.visible; });
    var xs = [];
    var ys = [];
    visible.forEach(function (item) {
      var dataset = findDataset(project, item.series.datasetId);
      var xIsTime = !dataset || dataset.xIsTime !== false;
      var xValues = convertSeriesX(item.series, dataset ? dataset.timeUnit : "s", displayUnit, xIsTime);
      xValues.forEach(function (value) { xs.push(value); });
      item.series.y.forEach(function (value) { ys.push(value); });
    });
    return {
      x: axisRange(plot.xAxis, xs),
      y: axisRange(plot.yAxis, ys),
      visibleCount: visible.length
    };
  }

  function normalizeAxis(raw) {
    var axis = raw && typeof raw === "object" ? raw : {};
    var decimals = axis.decimals == null || axis.decimals === "" ? null : Number(axis.decimals);
    var majorTick = axis.majorTick == null || axis.majorTick === "" ? null : Number(axis.majorTick);
    var minorTick = axis.minorTick == null || axis.minorTick === "" ? null : Number(axis.minorTick);
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
      decimals: Number.isFinite(decimals) && decimals >= 0 ? Math.min(8, Math.round(decimals)) : null
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
      color: String(raw.color || "#5d646b"),
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
    var position = LEGEND_POSITIONS.indexOf(legend.position) >= 0 ? legend.position : "auto";
    var columns = legend.columns === "auto" || legend.columns == null || legend.columns === ""
      ? "auto"
      : Math.max(1, Math.round(Number(legend.columns) || 1));
    var visible = legend.visible;
    if (visible == null) visible = legendVisible !== false;
    return {
      visible: visible !== false,
      position: position,
      floatingX: Number.isFinite(Number(legend.floatingX)) ? clamp(Number(legend.floatingX), 0, 1) : 0.75,
      floatingY: Number.isFinite(Number(legend.floatingY)) ? clamp(Number(legend.floatingY), 0, 1) : 0.08,
      fontSize: Number.isFinite(Number(legend.fontSize)) ? clamp(Number(legend.fontSize), 8, 24) : 12,
      orientation: legend.orientation === "horizontal" || legend.orientation === "vertical" ? legend.orientation : "auto",
      columns: columns,
      rowGap: Number.isFinite(Number(legend.rowGap)) ? clamp(Number(legend.rowGap), 0, 24) : 4,
      columnGap: Number.isFinite(Number(legend.columnGap)) ? clamp(Number(legend.columnGap), 0, 48) : 12,
      sampleLength: Number.isFinite(Number(legend.sampleLength)) ? clamp(Number(legend.sampleLength), 8, 48) : 16,
      maxWidth: legend.maxWidth == null || legend.maxWidth === "" ? null : Math.max(40, Number(legend.maxWidth)),
      wrap: legend.wrap !== false
    };
  }

  function normalizePlot(raw) {
    if (!raw || typeof raw !== "object") throw new Error("图必须是对象。");
    var layout = raw.layout && typeof raw.layout === "object" ? raw.layout : {};
    var width = Number.isFinite(Number(layout.width)) ? Math.max(240, Number(layout.width)) : DEFAULT_FIGURE_WIDTH;
    var height = Number.isFinite(Number(layout.height)) ? Math.max(180, Number(layout.height)) : DEFAULT_FIGURE_HEIGHT;
    var legend = normalizeLegend(raw.legend, raw.legendVisible);
    var aspectRatio = Number.isFinite(Number(raw.aspectRatio)) ? Number(raw.aspectRatio) : (height ? width / height : 1.6);
    return {
      id: String(raw.id || makeId("plot")),
      title: String(raw.title || "未命名图"),
      subtitle: String(raw.subtitle || ""),
      note: String(raw.note || ""),
      seriesRefs: Array.isArray(raw.seriesRefs) ? raw.seriesRefs.map(function (ref) {
        if (!ref || !ref.seriesId) throw new Error("Plot 的 seriesRefs 缺少 seriesId。");
        return {
          seriesId: String(ref.seriesId),
          visible: ref.visible !== false,
          color: ref.color ? String(ref.color) : null
        };
      }) : [],
      xAxis: normalizeAxis(raw.xAxis),
      yAxis: normalizeAxis(raw.yAxis),
      layout: {
        x: Number.isFinite(Number(layout.x)) ? Number(layout.x) : LAYOUT_PADDING,
        y: Number.isFinite(Number(layout.y)) ? Number(layout.y) : LAYOUT_PADDING,
        width: width,
        height: height
      },
      legendVisible: legend.visible,
      legend: legend,
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
    var project = {
      projectFormatVersion: PROJECT_FORMAT_VERSION,
      softwareVersion: SOFTWARE_VERSION,
      projectName: projectName,
      savedAt: data.savedAt ? String(data.savedAt) : null,
      datasets: Array.isArray(data.datasets) ? data.datasets.map(normalizeDataset) : [],
      plots: Array.isArray(data.plots) ? data.plots.map(normalizePlot) : [],
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

  function serializeProject(project) {
    assertUniqueSeriesIds(project);
    var payload = {
      projectFormatVersion: PROJECT_FORMAT_VERSION,
      softwareVersion: SOFTWARE_VERSION,
      projectName: project.projectName,
      savedAt: new Date().toISOString(),
      datasets: project.datasets,
      plots: project.plots,
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

  function applyLayoutTemplate(plots, templateId, area) {
    var slots = layoutSlots(templateId, area || {});
    (plots || []).forEach(function (plot, index) {
      var slot = slots[index];
      if (!slot) return;
      plot.layout.x = slot.x;
      plot.layout.y = slot.y;
      plot.layout.width = Math.max(240, slot.width);
      plot.layout.height = Math.max(180, slot.height);
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

  function resolveLegendPosition(legend, itemCount) {
    var position = legend && legend.position ? legend.position : "auto";
    if (position !== "auto") return position;
    return "top";
  }

  function resolveLegendColumns(legend, itemCount, orientation) {
    if (legend && legend.columns && legend.columns !== "auto") return Math.max(1, Number(legend.columns) || 1);
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
      : ((items || []).length > 8 ? "horizontal" : "horizontal");
    var columns = resolveLegendColumns(opts, (items || []).length, orientation);
    var rowH = fontSize + 4;
    var widths = (items || []).map(function (item) {
      return sampleLength + 6 + measure(item.label) + 4;
    });
    var colCount = Math.max(1, columns);
    if (orientation === "vertical") colCount = 1;
    var rows = Math.max(1, Math.ceil((items || []).length / colCount));
    while (colCount > 1 && rows * rowH + (rows - 1) * rowGap > maxHeight) {
      colCount += 1;
      rows = Math.ceil((items || []).length / colCount);
      if (colCount > 12) break;
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
      if (y + rowH > maxHeight + 0.5) {
        overflow += 1;
        return;
      }
      placed.push({ x: x, y: y, width: colWidths[column], height: rowH, item: item });
    });
    var width = colWidths.reduce(function (sum, value) { return sum + value; }, 0) + columnGap * Math.max(0, colCount - 1);
    var height = placed.length ? Math.max.apply(null, placed.map(function (entry) { return entry.y + entry.height; })) : 0;
    width = Math.min(maxWidth, Math.max(width, 0));
    return { placed: placed, width: width, height: height, overflow: overflow, columns: colCount };
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

  var api = {
    SOFTWARE_VERSION: SOFTWARE_VERSION,
    PROJECT_FORMAT_VERSION: PROJECT_FORMAT_VERSION,
    SUPPORTED_PROJECT_FORMATS: SUPPORTED_PROJECT_FORMATS,
    TIME_LABELS: TIME_LABELS,
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
    addSeriesToPlot: addSeriesToPlot,
    findDataset: findDataset,
    findSeries: findSeries,
    allSeriesIds: allSeriesIds,
    assertUniqueSeriesIds: assertUniqueSeriesIds,
    seriesId: seriesId,
    resolvePlotSeries: resolvePlotSeries,
    convertSeriesX: convertSeriesX,
    plotExtents: plotExtents,
    numericExtent: numericExtent,
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
    dockLegendPosition: dockLegendPosition,
    normalizeUi: normalizeUi,
    normalizeLegend: normalizeLegend,
    normalizeAxis: normalizeAxis,
    normalizePlot: normalizePlot
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VisualizerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
