"use strict";

var fs = require("fs");
var path = require("path");
var child = require("child_process");

var root = path.join(__dirname, "..");
var html = fs.readFileSync(path.join(root, "temperature_trajectory_visualizer.html"), "utf8");
var failed = 0;

function check(name, ok) {
  if (!ok) {
    failed += 1;
    console.error("FAIL " + name);
  }
}

var start = html.indexOf("var ICON_SVG = ");
var end = html.indexOf(";\n    var iconSeq");
check("icon map markers", start > 0 && end > start);
var icons = JSON.parse(html.slice(start + "var ICON_SVG = ".length, end));
var files = {
  dataset: "tmp/handdrawn-icons/svg/dataset.svg",
  trajectory: "tmp/handdrawn-icons/svg/trajectory.svg",
  canvas: "tmp/handdrawn-icons/svg/canvas.svg",
  layers: "tmp/handdrawn-icons/svg/layers.svg",
  inset: "tmp/handdrawn-icons/svg/inset.svg",
  annotation: "tmp/handdrawn-icons/svg/annotation.svg",
  template: "tmp/handdrawn-icons/svg/template.svg",
  "series-style": "design/icon-system/candidates-v1/icons/b/series-style.svg",
  axes: "design/icon-system/candidates-v1/icons/b/axes.svg",
  legend: "design/icon-system/candidates-v1/icons/b/legend.svg",
  layout: "design/icon-system/candidates-v1/icons/b/layout.svg",
  "fit-view": "design/icon-system/candidates-v1/icons/c/fit-view.svg",
  "figure-title": "design/icon-system/candidates-icon005/icons/figure-title.svg",
  frame: "design/icon-system/candidates-icon005/icons/frame.svg",
  "export-settings": "design/icon-system/candidates-icon005/icons/export-settings.svg",
  range: "design/icon-system/candidates-icon005/icons/range.svg",
  "source-link": "design/icon-system/candidates-icon005/icons/source-link.svg"
};
Object.keys(files).forEach(function (id) {
  var raw = fs.readFileSync(path.join(root, files[id]), "utf8").trim();
  check(id + " matches source svg", icons[id] === raw);
  check(id + " has no remote asset", !/(href|src|url)\s*[=(]\s*["']?(https?:|\/\/|file:)/.test(raw));
});
check("no extra approved icon keys", Object.keys(icons).length === Object.keys(files).length);
check("fit-view uses currentColor", icons["fit-view"].indexOf("currentColor") >= 0);
check("approved hand drawn icons are not rewritten as linear", icons.axes.indexOf("currentColor") < 0 && icons.legend.indexOf("currentColor") < 0);

var linearStart = html.indexOf("var LINEAR_SVG = ");
var linearEnd = html.indexOf(";\n\n    function iconMarkup");
check("linear map markers", linearStart > 0 && linearEnd > linearStart);
var linear = JSON.parse(html.slice(linearStart + "var LINEAR_SVG = ".length, linearEnd));
["axis-x", "axis-y", "series-list", "series-style-mini", "legend-show", "legend-pos", "legend-arrange", "tool-new", "tool-open", "tool-save", "tool-import", "tool-add", "tool-layout", "tool-preview", "tool-export"].forEach(function (id) {
  check("linear " + id, linear[id] && linear[id].indexOf("currentColor") >= 0 && linear[id].indexOf("viewBox=\"0 0 16 16\"") >= 0);
  check("linear " + id + " offline", !/(href|src|url)\s*[=(]\s*["']?(https?:|\/\/|file:)/.test(linear[id]));
});
check("fit-view is not reused as a linear icon", !Object.prototype.hasOwnProperty.call(linear, "fit-view"));

[
  'section("数据系列", false, "series", "series-style", "l1")',
  'section("轴线与刻度", false, "axes", "axes", "l1")',
  'section("轴线样式", false, key + ".line", null, "l3")',
  'section(axisName === "X" ? "X Axis" : "Y Axis", false, key, icon, "l2")',
  'var icon = axisName === "X" ? "axis-x" : "axis-y"',
  'section("轴标题", false, key + ".title", null, "l3")',
  'section("范围与缩放", false, key + ".range", null, "l3")',
  'section("时间单位", false, key + ".time", null, "l3")',
  'section("上边", false, "xAxis.top", null, "l3")',
  'section("右边", false, "yAxis.right", null, "l3")',
  'section("图例", false, "legend", "legend", "l1")',
  'section("位置与尺寸", false, "place", "layout", "l1")',
  'section(plot.type === "detail" ? "标注" : "标注与引导线", false, "annotation", "annotation", "l1")',
  'section("局部视图", true, "about", "inset", "l1")',
  'section("局部视图", false, "local", "inset", "l1")',
  'section(plot.type === "detail" ? "标题" : "图标题", false, plot.type === "detail" ? "title" : "chart.title", "figure-title", "l1")',
  'section("背景与尺寸", false, "chart.frame", "frame", "l1")',
  'section("导出设置", false, "export", "export-settings", "l1")',
  'section("范围与缩放", true, "viewport", "range", "l1")',
  'section("来源框与引导线", false, "link", "source-link", "l1")',
  'section("系列", false, "series.list", "series-list", "l2")',
  'section("样式", false, "series.style", "series-style-mini", "l2")',
  'prefixLinear(legendVisible, "legend-show")',
  'prefixLinear(pos.wrap, "legend-pos")',
  'prefixLinear(orient.wrap, "legend-arrange")',
  'iconMark("fit-view", "tool")',
  'iconMark("canvas", "dock")',
  'iconMark("dataset", "title")',
  'iconMark("dataset", "empty")',
  'dressTool(document.getElementById("tvNewProject"), "tool-new")',
  'dressTool(document.getElementById("tvNewPlot"), "tool-add", "accent")',
  '"xAxis.line": true',
  'core.movePlotLayer',
  'core.reorderPlotLayers',
  'name.title = core.plotEditorName(plot)'
].forEach(function (needle) {
  check("wired " + needle, html.indexOf(needle) >= 0);
});

check("chart wrapper is not a first-level card", html.indexOf('section("图表", true, "chart"') < 0);
check("x axis is not a level-1 card", html.indexOf('section(axisName === "X" ? "X Axis" : "Y Axis", false, key, "axes"') < 0);
check("props width stays 300", html.indexOf("--props: 300px;") >= 0);
check("l1 icon uses the 28px token", html.indexOf("--l1-icon-size: 28px;") >= 0 && html.indexOf("width: var(--l1-icon-size);") >= 0);
check("canvas instance card is not titled 图窗实例", html.indexOf(': "图窗实例"') < 0 && html.indexOf("画布对象 · 图窗实例") >= 0);
check("canvas layer cards keep a name and subtitle", html.indexOf('className = "tv-layer-row is-card"') >= 0 && html.indexOf("tv-layer-sub") >= 0);
check("required l1 icons are in the approved map", ["figure-title", "frame", "export-settings"].every(function (id) {
  return Object.prototype.hasOwnProperty.call(icons, id);
}));
check("optional approved l1 icons stay on real menus", Object.prototype.hasOwnProperty.call(icons, "range") && Object.prototype.hasOwnProperty.call(icons, "source-link"));
check("axis range stays a text-only l3", html.indexOf('section("范围与缩放", false, key + ".range", null, "l3")') >= 0);
check("delete stays a danger action", html.indexOf("tv-danger-action") >= 0);
check("global canvas is distinct", html.indexOf("tv-l1--global") >= 0);
check("layer rows stay selectable cards", html.indexOf("tv-layer-row") >= 0 && html.indexOf("is-selected") >= 0);
check("cancelled icons are not registered", ["region-zoom", "grid-ticks", "typography", "formula"].every(function (id) {
  return !Object.prototype.hasOwnProperty.call(icons, id) && !Object.prototype.hasOwnProperty.call(linear, id);
}));

var requiredL1 = [
  { id: "figure-title", label: "图标题" },
  { id: "frame", label: "背景与尺寸" },
  { id: "export-settings", label: "导出设置" }
];
requiredL1.forEach(function (item) {
  check(item.id + " is hand-drawn not linear", icons[item.id] && icons[item.id].indexOf("currentColor") < 0 && icons[item.id].indexOf("<svg") === 0);
});

var chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
check("chrome exists for l1 DOM render", fs.existsSync(chrome));
if (fs.existsSync(chrome)) {
  var tmpDir = path.join(root, "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  var pagePath = path.join(tmpDir, "icon-l1-dom.html");
  var cards = requiredL1.map(function (item) {
    var svg = icons[item.id].replace(/\s(width|height)="[^"]*"/g, "");
    return '<details class="tv-accordion tv-l1">'
      + '<summary class="has-icon">'
      + '<span class="tv-icon tv-icon--l1" data-icon="' + item.id + '">' + svg + "</span>"
      + '<span class="tv-acc-label">' + item.label + "</span>"
      + "</summary></details>";
  }).join("");
  fs.writeFileSync(pagePath, "<!doctype html><html><head><meta charset=\"utf-8\"><style>"
    + ":root{--l1-icon-size:28px}"
    + ".tv-icon{display:inline-flex;flex:none;align-items:center;justify-content:center;background:#faf8f5}"
    + ".tv-icon--l1{width:var(--l1-icon-size);height:var(--l1-icon-size)}"
    + ".tv-icon svg{display:block;width:100%;height:100%}"
    + "</style></head><body>" + cards + "<script>"
    + "var ids=['figure-title','frame','export-settings'];"
    + "var labels={'figure-title':'图标题','frame':'背景与尺寸','export-settings':'导出设置'};"
    + "var out=ids.map(function(id){"
    + "var slot=document.querySelector('[data-icon=\"'+id+'\"]');"
    + "var label=slot&&slot.parentNode.querySelector('.tv-acc-label');"
    + "var svg=slot&&slot.querySelector('svg');"
    + "var cs=slot&&getComputedStyle(slot);"
    + "var svgCs=svg&&getComputedStyle(svg);"
    + "return {id:id,label:label&&label.textContent,expected:labels[id],hasSvg:!!(svg&&svg.querySelector('path')),width:cs&&cs.width,height:cs&&cs.height,svgWidth:svgCs&&svgCs.width,svgHeight:svgCs&&svgCs.height};"
    + "});"
    + "var pre=document.createElement('pre');pre.id='tv-l1-dom-result';pre.textContent=JSON.stringify(out);document.body.appendChild(pre);"
    + "</script></body></html>");
  var dumped = child.spawnSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + path.join(tmpDir, "chrome-icon-l1"),
    "--virtual-time-budget=4000",
    "--dump-dom",
    "file://" + pagePath
  ], { encoding: "utf8", timeout: 25000 });
  var dom = (dumped.stdout || "") + (dumped.stderr || "");
  var match = dom.match(/<pre id="tv-l1-dom-result">([^<]+)<\/pre>/);
  check("chrome dump contains l1 DOM result", dumped.status === 0 && !!match);
  if (match) {
    var measured = JSON.parse(match[1].replace(/&quot;/g, "\""));
    requiredL1.forEach(function (item, index) {
      var row = measured[index];
      check(item.id + " DOM label", row && row.label === item.label && row.expected === item.label);
      check(item.id + " DOM has renderable svg", row && row.hasSvg === true);
      check(item.id + " DOM slot is 28px", row && row.width === "28px" && row.height === "28px");
      check(item.id + " DOM svg is 28px", row && row.svgWidth === "28px" && row.svgHeight === "28px");
    });
  } else if (dumped.status !== 0) {
    console.error(dumped.stderr || dumped.stdout || "chrome dump failed");
  }
}

if (failed) {
  console.error(failed + " icon slot checks failed");
  process.exit(1);
}
console.log("icon slot checks passed");
