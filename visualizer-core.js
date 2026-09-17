/* Visualizer v0.1.0 core: Project / Dataset / Series / Plot / Canvas. No DOM. */
(function (root) {
  "use strict";

  var SOFTWARE_VERSION = "0.1.0";
  var PROJECT_FORMAT_VERSION = "1.0";
  var SUPPORTED_PROJECT_FORMATS = ["1.0"];
  var TIME_IN_SECONDS = { s: 1, min: 60, h: 3600 };
  var TIME_LABELS = { s: "s", min: "min", h: "h" };
  var DEFAULT_GROUPS = [
    { id: "group-1", label: "T1–T7", start: 1, end: 7, color: "#2477b6" },
    { id: "group-2", label: "T8–T22", start: 8, end: 22, color: "#25884d" },
    { id: "group-3", label: "T23–T37", start: 23, end: 37, color: "#d36518" },
    { id: "group-4", label: "T38–T52", start: 38, end: 52, color: "#6b52a8" }
  ];
  var AUXILIARY_COLORS = ["#272b2e", "#d14e3d", "#167b91", "#8b5a9d"];
  var METRIC_COLORS = ["#b7473b", "#2477b6", "#25884d", "#6b52a8"];

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

  function isTimeHeader(header) {
    var normalized = normalizeHeader(header);
    return normalized === "time" || normalized === "times" || normalized === "times" || normalized === "time(s)" || normalized === "时间";
  }

  function sensorIdFromHeader(header) {
    var match = String(header || "").match(/(?:^|[^a-z0-9])t\s*(\d+)(?!\d)/i);
    return match ? Number(match[1]) : null;
  }

  function readableAuxiliaryLabel(header) {
    var label = String(header).replace(/^\uFEFF/, "").trim();
    label = label.split(/\s+Monitor\b/i)[0].trim();
    label = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
    return label || "Auxiliary temperature";
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

  function parseDatasetFromCsv(text, options) {
    var rows = parseCsv(text);
    var headers = rows[0].map(function (header) { return String(header).replace(/^\uFEFF/, "").trim(); });
    var timeIndex = headers.findIndex(isTimeHeader);
    var name = options && options.name ? options.name : "导入数据";
    var groups = (options && options.groups) || DEFAULT_GROUPS;
    var datasetId = options && options.id ? String(options.id) : makeId("ds");
    if (timeIndex < 0) throw new Error(name + " 缺少 time、time_s 或 时间列。");
    var sensorColumns = [];
    var auxiliaryColumns = [];
    var seenSensors = new Set();
    headers.forEach(function (header, columnIndex) {
      if (columnIndex === timeIndex) return;
      var sensorId = sensorIdFromHeader(header);
      if (sensorId !== null) {
        if (seenSensors.has(sensorId)) throw new Error(name + " 包含重复传感器列 T" + sensorId + "。");
        seenSensors.add(sensorId);
        sensorColumns.push({ columnIndex: columnIndex, sensorId: sensorId, header: header });
        return;
      }
      var lower = header.toLowerCase();
      if (header.indexOf("温度") >= 0 || header.indexOf("温差") >= 0 || lower.indexOf("temperature") >= 0 || lower.indexOf("delta") >= 0 || lower.indexOf("deltat") >= 0 || lower.indexOf("°c") >= 0 || lower.indexOf("(c)") >= 0) {
        auxiliaryColumns.push({
          columnIndex: columnIndex,
          header: header,
          label: readableAuxiliaryLabel(header)
        });
      }
    });
    if (!sensorColumns.length && !auxiliaryColumns.length) {
      throw new Error(name + " 没有识别到 T1…TN 传感器列，也没有识别到温度、温差或 delta 数值列。");
    }
    auxiliaryColumns.forEach(function (column) {
      column.role = sensorColumns.length ? "auxiliary" : "metric";
    });
    sensorColumns.sort(function (left, right) { return left.sensorId - right.sensorId; });
    var times = [];
    var bySensor = new Map();
    var byAuxiliary = new Map();
    sensorColumns.forEach(function (column) { bySensor.set(column.sensorId, []); });
    auxiliaryColumns.forEach(function (column, index) { byAuxiliary.set(index, []); });
    for (var rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      var row = rows[rowIndex];
      var time = finiteNumber(row[timeIndex], name + " 第 " + (rowIndex + 1) + " 行时间无效。");
      if (times.length && time <= times[times.length - 1]) {
        throw new Error(name + " 第 " + (rowIndex + 1) + " 行时间必须严格递增，且不能重复。");
      }
      times.push(time);
      sensorColumns.forEach(function (column) {
        bySensor.get(column.sensorId).push(finiteNumber(
          row[column.columnIndex],
          name + " 第 " + (rowIndex + 1) + " 行 T" + column.sensorId + " 无效。"
        ));
      });
      auxiliaryColumns.forEach(function (column, auxIndex) {
        byAuxiliary.get(auxIndex).push(finiteNumber(
          row[column.columnIndex],
          name + " 第 " + (rowIndex + 1) + " 行 " + column.label + " 无效。"
        ));
      });
    }
    var series = [];
    sensorColumns.forEach(function (column) {
      var group = groupForSensor(column.sensorId, groups);
      var localId = "T" + column.sensorId;
      series.push({
        id: seriesId(datasetId, localId),
        datasetId: datasetId,
        localId: localId,
        label: localId,
        sourceLabel: column.header,
        kind: "raw",
        role: "sensor",
        sensorId: column.sensorId,
        color: sensorColor(column.sensorId, group),
        x: times.slice(),
        y: bySensor.get(column.sensorId).slice()
      });
    });
    var auxiliaryLabels = new Set();
    auxiliaryColumns.forEach(function (column, auxIndex) {
      var label = column.label;
      var suffix = 2;
      while (auxiliaryLabels.has(label)) {
        label = column.label + " " + suffix;
        suffix += 1;
      }
      auxiliaryLabels.add(label);
      var localId = "aux-" + (auxIndex + 1);
      series.push({
        id: seriesId(datasetId, localId),
        datasetId: datasetId,
        localId: localId,
        label: label,
        sourceLabel: column.header,
        kind: "raw",
        role: column.role,
        color: column.role === "metric" ? METRIC_COLORS[auxIndex % METRIC_COLORS.length] : AUXILIARY_COLORS[auxIndex % AUXILIARY_COLORS.length],
        x: times.slice(),
        y: byAuxiliary.get(auxIndex).slice()
      });
    });
    return {
      id: datasetId,
      name: String(name).replace(/\.[^.]+$/, "") || "未命名数据",
      sourceFilename: (options && options.sourceFilename) || "",
      importedAt: (options && options.importedAt) || new Date().toISOString(),
      headers: headers,
      timeUnit: (options && options.timeUnit) || "s",
      rawCsv: String(text),
      series: series
    };
  }

  function createProject(partial) {
    return {
      projectFormatVersion: PROJECT_FORMAT_VERSION,
      softwareVersion: SOFTWARE_VERSION,
      projectName: (partial && partial.projectName) || "未命名工程",
      savedAt: null,
      datasets: [],
      plots: [],
      canvas: { width: 1280, height: 800 },
      options: {
        displayTimeUnit: (partial && partial.displayTimeUnit) || "s",
        sourceTimeUnit: (partial && partial.sourceTimeUnit) || "s",
        theme: (partial && partial.theme) || "light"
      }
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
    var index = project.plots.length;
    var col = index % 2;
    var row = Math.floor(index / 2);
    return {
      x: 24 + col * 620,
      y: 24 + row * 400,
      width: 600,
      height: 380
    };
  }

  function createPlot(project, partial) {
    var plot = {
      id: (partial && partial.id) || makeId("plot"),
      title: (partial && partial.title) || "未命名图",
      subtitle: (partial && partial.subtitle) || "",
      note: (partial && partial.note) || "",
      seriesRefs: (partial && partial.seriesRefs) || [],
      xAxis: (partial && partial.xAxis) || { mode: "auto", min: null, max: null },
      yAxis: (partial && partial.yAxis) || { mode: "auto", min: null, max: null },
      layout: (partial && partial.layout) || nextPlotLayout(project),
      legendVisible: partial && partial.legendVisible === false ? false : true
    };
    project.plots.push(plot);
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

  function convertSeriesX(series, sourceUnit, displayUnit) {
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
      var xValues = convertSeriesX(item.series, dataset ? dataset.timeUnit : "s", displayUnit);
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
    return {
      mode: axis.mode === "manual" ? "manual" : "auto",
      min: axis.min == null || axis.min === "" ? null : Number(axis.min),
      max: axis.max == null || axis.max === "" ? null : Number(axis.max)
    };
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
    return {
      id: id,
      datasetId: datasetId,
      localId: localId,
      label: String(raw.label || localId),
      sourceLabel: String(raw.sourceLabel || raw.label || localId),
      kind: "raw",
      role: raw.role || "sensor",
      sensorId: raw.sensorId == null ? null : Number(raw.sensorId),
      color: String(raw.color || "#5d646b"),
      x: raw.x.map(function (value, index) { return finiteNumber(value, "曲线 " + localId + " x[" + index + "] 无效。"); }),
      y: raw.y.map(function (value, index) { return finiteNumber(value, "曲线 " + localId + " y[" + index + "] 无效。"); })
    };
  }

  function normalizeDataset(raw) {
    if (!raw || typeof raw !== "object") throw new Error("数据源必须是对象。");
    var datasetId = String(raw.id || makeId("ds"));
    if (!Array.isArray(raw.series) || !raw.series.length) throw new Error("数据源至少需要一条曲线。");
    return {
      id: datasetId,
      name: String(raw.name || "未命名数据"),
      sourceFilename: String(raw.sourceFilename || ""),
      importedAt: String(raw.importedAt || ""),
      headers: Array.isArray(raw.headers) ? raw.headers.map(String) : [],
      timeUnit: TIME_IN_SECONDS[raw.timeUnit] ? raw.timeUnit : "s",
      rawCsv: String(raw.rawCsv || ""),
      series: raw.series.map(function (item) { return normalizeSeries(item, datasetId); })
    };
  }

  function normalizePlot(raw) {
    if (!raw || typeof raw !== "object") throw new Error("图必须是对象。");
    var layout = raw.layout && typeof raw.layout === "object" ? raw.layout : {};
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
        x: Number.isFinite(Number(layout.x)) ? Number(layout.x) : 24,
        y: Number.isFinite(Number(layout.y)) ? Number(layout.y) : 24,
        width: Number.isFinite(Number(layout.width)) ? Math.max(240, Number(layout.width)) : 600,
        height: Number.isFinite(Number(layout.height)) ? Math.max(180, Number(layout.height)) : 380
      },
      legendVisible: raw.legendVisible !== false
    };
  }

  function parseProject(text) {
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
    var options = data.options && typeof data.options === "object" ? data.options : {};
    var project = {
      projectFormatVersion: PROJECT_FORMAT_VERSION,
      softwareVersion: SOFTWARE_VERSION,
      projectName: String(data.projectName || "未命名工程"),
      savedAt: data.savedAt ? String(data.savedAt) : null,
      datasets: Array.isArray(data.datasets) ? data.datasets.map(normalizeDataset) : [],
      plots: Array.isArray(data.plots) ? data.plots.map(normalizePlot) : [],
      canvas: {
        width: Number.isFinite(Number(canvas.width)) ? Math.max(400, Number(canvas.width)) : 1280,
        height: Number.isFinite(Number(canvas.height)) ? Math.max(300, Number(canvas.height)) : 800
      },
      options: {
        displayTimeUnit: TIME_IN_SECONDS[options.displayTimeUnit] ? options.displayTimeUnit : "s",
        sourceTimeUnit: TIME_IN_SECONDS[options.sourceTimeUnit] ? options.sourceTimeUnit : "s",
        theme: options.theme === "dark" ? "dark" : "light"
      }
    };
    assertUniqueSeriesIds(project);
    project.plots.forEach(function (plot) {
      plot.seriesRefs.forEach(function (ref) {
        if (!findSeries(project, ref.seriesId)) {
          throw new Error("图「" + plot.title + "」引用了不存在的曲线：" + ref.seriesId);
        }
      });
    });
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
      options: project.options
    };
    return JSON.stringify(payload, null, 2);
  }

  var api = {
    SOFTWARE_VERSION: SOFTWARE_VERSION,
    PROJECT_FORMAT_VERSION: PROJECT_FORMAT_VERSION,
    SUPPORTED_PROJECT_FORMATS: SUPPORTED_PROJECT_FORMATS,
    TIME_LABELS: TIME_LABELS,
    DEFAULT_GROUPS: DEFAULT_GROUPS,
    makeId: makeId,
    cloneJson: cloneJson,
    parseCsv: parseCsv,
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
    numericExtent: numericExtent
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VisualizerCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
