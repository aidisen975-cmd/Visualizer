async function canvasExportProbe() {
  var app = window.VisualizerApp;
  var core = window.VisualizerCore;
  function labelsOf(svg) {
    return Array.from(svg.querySelectorAll("svg")).map(function (node) {
      return node.getAttribute("aria-label");
    });
  }
  function groupFacts(svg) {
    return Array.from(svg.querySelectorAll(":scope > g")).map(function (node) {
      var nested = node.querySelector("svg");
      return {
        label: nested ? nested.getAttribute("aria-label") : "",
        plotId: node.getAttribute("data-plot-id") || "",
        instanceId: node.getAttribute("data-instance-id") || "",
        transform: node.getAttribute("transform") || "",
        width: nested ? Number(nested.getAttribute("width")) : 0,
        height: nested ? Number(nested.getAttribute("height")) : 0,
        paths: node.querySelectorAll("path").length
      };
    });
  }
  function parseTranslate(transform) {
    var match = /translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/.exec(transform || "");
    if (!match) return null;
    return { x: Number(match[1]), y: Number(match[2]) };
  }
  function inkIn(ctx, x, y, width, height, bg) {
    var left = Math.max(0, Math.round(x));
    var top = Math.max(0, Math.round(y));
    var w = Math.max(1, Math.round(width));
    var h = Math.max(1, Math.round(height));
    var data = ctx.getImageData(left, top, w, h).data;
    var ink = 0;
    var seen = 0;
    for (var i = 0; i < data.length; i += 16) {
      seen += 1;
      if (Math.abs(data[i] - bg[0]) > 18 || Math.abs(data[i + 1] - bg[1]) > 18 || Math.abs(data[i + 2] - bg[2]) > 18) ink += 1;
    }
    return { ink: ink, seen: seen };
  }
  function raster(svg) {
    var xml = new XMLSerializer().serializeToString(svg);
    return new Promise(function (resolve) {
      var image = new Image();
      var url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
      image.onload = function () {
        var width = Number(svg.getAttribute("width")) || image.naturalWidth;
        var height = Number(svg.getAttribute("height")) || image.naturalHeight;
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(url);
        var bgData = ctx.getImageData(1, 1, 1, 1).data;
        var bg = [bgData[0], bgData[1], bgData[2]];
        var facts = groupFacts(svg);
        var regions = {};
        facts.forEach(function (fact) {
          var at = parseTranslate(fact.transform);
          if (!at) return;
          regions[fact.label] = inkIn(ctx, at.x + 24, at.y + 24, Math.max(40, fact.width - 48), Math.max(40, fact.height - 48), bg);
        });
        resolve({
          svg: xml,
          png: canvas.toDataURL("image/png").split(",")[1],
          facts: facts,
          regions: regions,
          dashed: svg.querySelectorAll("line[stroke-dasharray]").length,
          viewBox: svg.getAttribute("viewBox"),
          width: width,
          height: height
        });
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        resolve({ error: "svg image failed", svg: xml, facts: groupFacts(svg) });
      };
      image.src = url;
    });
  }
  var csv = "t,Tleft,Tright\n0,10,20\n1,14,22\n2,11,19\n3,16,25\n";
  var datasetId = app.importCsvText(csv, { name: "v072i", filename: "v072i.csv" });
  var project = app.getProject();
  var dataset = project.datasets.find(function (item) { return item.id === datasetId; });
  var seriesIds = dataset.series.map(function (item) { return item.id; });
  var canvas = project.canvases[0];
  core.setCanvasSize(project, 2800, 1600);
  var plotA = project.plots.find(function (item) { return item.type !== "detail"; });
  plotA.name = "主图左";
  plotA.title = "主图左";
  core.addSeriesToPlot(project, plotA, seriesIds);
  var instA = core.findInstance(canvas, plotA.id);
  delete instA.display;
  core.ensureInstanceDisplay(instA, plotA);
  instA.x = 48;
  instA.y = 36;
  instA.width = plotA.layout.width;
  instA.height = plotA.layout.height;
  core.syncInstanceDisplaySize(instA);
  if (instA.display) instA.display.name = "主图左";
  if (project.ui) project.ui.workspaceMode = "canvas";
  var alone = labelsOf(app.buildCanvasSvg());
  var plotB = core.createPlot(project, { name: "温度右", title: "温度右" });
  core.addSeriesToPlot(project, plotB, [seriesIds[1]]);
  var instB = core.createInstance(project, canvas.id, plotB.id, { x: 2220, y: 36, width: 420, height: 300 });
  var pair = labelsOf(app.buildCanvasSvg());
  var detail = core.createLocalPlot(project, plotA, { xMin: 1, xMax: 2, yMin: 10, yMax: 16 });
  var other = core.createPlot(project, { name: "别的画布", title: "别的画布" });
  core.addSeriesToPlot(project, other, [seriesIds[0]]);
  var canvas2 = core.createCanvas(project, { name: "画布 2", width: 800, height: 600 });
  core.createInstance(project, canvas2.id, other.id, { x: 40, y: 40, width: 400, height: 280 });
  if (project.ui) {
    project.ui.activeCanvasId = canvas.id;
    project.ui.workspaceMode = "canvas";
  }
  var painted = await raster(app.buildCanvasSvg());
  instB.visible = false;
  var hidden = labelsOf(app.buildCanvasSvg());
  instB.visible = true;
  ["图3", "图4", "图5", "图6"].forEach(function (name, index) {
    var plot = core.createPlot(project, { name: name, title: name });
    core.addSeriesToPlot(project, plot, [seriesIds[index % seriesIds.length]]);
    core.createInstance(project, canvas.id, plot.id, {
      x: 48 + (index % 2) * 560,
      y: 420 + Math.floor(index / 2) * 250,
      width: 360,
      height: 220
    });
  });
  var six = labelsOf(app.buildCanvasSvg());
  var saved = core.serializeProject(project);
  var opened = app.openProjectText(saved, "v072i.tvproj.json", { force: true });
  var reopened = opened ? labelsOf(app.buildCanvasSvg()) : [];
  return {
    ok: !painted.error,
    error: painted.error || "",
    alone: alone,
    pair: pair,
    hidden: hidden,
    six: six,
    reopened: reopened,
    detailName: detail && detail.name,
    plotA: plotA.id,
    plotB: plotB.id,
    detailId: detail && detail.id,
    instA: instA.id,
    instB: instB.id,
    facts: painted.facts || [],
    regions: painted.regions || {},
    dashed: painted.dashed || 0,
    viewBox: painted.viewBox || "",
    width: painted.width || 0,
    height: painted.height || 0,
    svg: painted.svg || "",
    png: painted.png || ""
  };
}
