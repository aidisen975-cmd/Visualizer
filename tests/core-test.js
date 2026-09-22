#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");
var core = require("../visualizer-core.js");

var failed = 0;
function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error("FAIL: " + message);
  } else {
    console.log("ok: " + message);
  }
}

var fixtures = path.join(__dirname, "fixtures");
function readFixture(name) {
  return fs.readFileSync(path.join(fixtures, name), "utf8");
}

var expCsv = readFixture("TESTDATA_exp_25C.csv");
var simCsv = readFixture("TESTDATA_sim_25C.csv");

var project = core.createProject({ projectName: "v0.1.0 测试工程" });
var expDs = core.parseDatasetFromCsv(expCsv, {
  id: "ds-exp",
  name: "TESTDATA_exp_25C.csv",
  sourceFilename: "TESTDATA_exp_25C.csv",
  timeUnit: "s"
});
var simDs = core.parseDatasetFromCsv(simCsv, {
  id: "ds-sim",
  name: "TESTDATA_sim_25C.csv",
  sourceFilename: "TESTDATA_sim_25C.csv",
  timeUnit: "s"
});
core.addDataset(project, expDs);
core.addDataset(project, simDs);

assert(expDs.series[0].id === "ds-exp::T1", "实验 T1 使用 datasetId::localId");
assert(simDs.series[0].id === "ds-sim::T1", "仿真 T1 使用不同 ID");
assert(expDs.series[0].localId === simDs.series[0].localId, "同名列 localId 可以相同");
assert(core.allSeriesIds(project).length === 4, "两条 CSV 共 4 条曲线");
core.assertUniqueSeriesIds(project);
assert(true, "跨源同名列没有 ID 冲突");

assert(expDs.series[0].x.length === 4, "实验 T1 有独立 x");
assert(simDs.series[0].x.length === 5, "仿真采样点数不同");
assert(expDs.series[0].x[1] === 10 && simDs.series[0].x[1] === 5, "两条曲线时间轴独立");
assert(expDs.rawCsv.indexOf("time,T1,T2") === 0, "嵌入原始 CSV");

var plot = core.createPlot(project, { title: "跨源对比" });
core.addSeriesToPlot(project, plot, ["ds-exp::T1", "ds-sim::T1", "ds-exp::T2"]);
assert(plot.seriesRefs.length === 3, "同一 Plot 可引用跨 Dataset 曲线");
assert(core.findSeries(project, "ds-exp::T1").y[0] === 25, "实验 T1 数值正确");

plot.seriesRefs[1].visible = false;
plot.seriesRefs[0].color = "#d14e3d";
plot.xAxis.mode = "manual";
plot.xAxis.min = 0;
plot.xAxis.max = 20;
plot.layout = { x: 40, y: 60, width: 640, height: 400 };
plot.subtitle = "测试副标题";
plot.note = "测试备注";

var snapshot = core.cloneJson(project);
var json = core.serializeProject(project);
assert(json.indexOf("\"projectFormatVersion\": \"1.0\"") >= 0, "保存含 projectFormatVersion");
assert(json.indexOf("TESTDATA_exp_25C") >= 0, "工程嵌入原始数据标识");
assert(json.indexOf("ds-exp::T1") >= 0 && json.indexOf("ds-sim::T1") >= 0, "保存跨源引用");

var restored = core.parseProject(json);
assert(restored.plots[0].seriesRefs.length === 3, "恢复后仍引用 3 条曲线");
assert(restored.plots[0].seriesRefs[1].visible === false, "恢复显隐");
assert(restored.plots[0].seriesRefs[0].color === "#d14e3d", "恢复颜色");
assert(restored.plots[0].xAxis.mode === "manual" && restored.plots[0].xAxis.max === 20, "恢复坐标");
assert(restored.plots[0].layout.x === 40 && restored.plots[0].layout.width === 640, "恢复布局");
assert(restored.datasets[1].series[0].x[1] === 5, "恢复后仍使用独立时间轴");

var keptName = snapshot.projectName;
try {
  core.parseProject("{not json");
  assert(false, "损坏 JSON 应抛错");
} catch (error) {
  assert(error.message.indexOf("JSON") >= 0, "损坏工程给出明确错误");
}
assert(project.projectName === keptName, "解析失败不改写当前工程对象");

try {
  core.parseProject(JSON.stringify({
    projectFormatVersion: "9.9",
    projectName: "未来版本",
    datasets: [],
    plots: []
  }));
  assert(false, "不支持版本应抛错");
} catch (error) {
  assert(error.message.indexOf("不支持的工程版本") >= 0, "不支持版本给出明确错误");
}
assert(project.plots.length === 1, "拒绝不支持版本后当前工程仍在");

try {
  core.parseCsv("only-header\n");
  assert(false, "无效 CSV 应抛错");
} catch (error) {
  assert(error.message.indexOf("至少需要") >= 0, "无效 CSV 给出明确错误");
}

try {
  core.parseDatasetFromCsv("name,city\nalice,bob\ncarol,dave\n", { name: "坏文件" });
  assert(false, "无数值列应抛错");
} catch (error) {
  assert(error.message.indexOf("横坐标") >= 0 || error.message.indexOf("数值数据列") >= 0, "无数值列给出通用错误");
  assert(!/温度|sensor|delta/i.test(error.message), "错误信息不绑定温度业务");
}

var tempDs = core.parseDatasetFromCsv(readFixture("TESTDATA_temperature.csv"), {
  id: "ds-temp",
  name: "TESTDATA_temperature.csv"
});
assert(tempDs.series.length === 3, "普通温度 CSV 正常解析");
assert(tempDs.series.map(function (s) { return s.localId; }).join(",") === "T1,T2,T3", "温度测点成为 Series");

var elecDs = core.parseDatasetFromCsv(readFixture("TESTDATA_electrical.csv"), {
  id: "ds-elec",
  name: "TESTDATA_electrical.csv"
});
assert(elecDs.series.length === 3, "完全没有温度字段的 electrical CSV 正常解析");
assert(elecDs.series.map(function (s) { return s.name; }).join(",") === "Voltage,Current,SOC", "Voltage / Current / SOC 都成为 Series");
assert(elecDs.series[0].originalHeader === "Voltage(V)", "originalHeader 被保留");

var voltageMeta = core.parseColumnHeader("Voltage(V)");
assert(voltageMeta.name === "Voltage" && voltageMeta.unit === "V", "Voltage(V) → name Voltage, unit V");
var voltageBare = core.parseColumnHeader("Voltage");
assert(voltageBare.name === "Voltage" && voltageBare.unit === "", "Voltage 无单位时 unit 为空");
var temperatureBare = core.parseColumnHeader("Temperature");
assert(temperatureBare.unit === "", "Temperature 不得被猜成 °C");
var inletMeta = core.parseColumnHeader("入口温度[°C]");
assert(inletMeta.unit === "°C", "入口温度[°C] → unit °C");
var massMeta = core.parseColumnHeader("Mass Flow(kg/s)");
assert(massMeta.name === "Mass Flow" && massMeta.unit === "kg/s", "Mass Flow(kg/s) → unit kg/s");
var underscoreMeta = core.parseColumnHeader("battery_temp_max");
assert(underscoreMeta.name === "battery_temp_max" && underscoreMeta.unit === "", "Name_unit 不把 max 当单位");

var unknownDs = core.parseDatasetFromCsv(readFixture("TESTDATA_unknown_headers.csv"), {
  id: "ds-unknown",
  name: "TESTDATA_unknown_headers.csv"
});
var unknownNames = unknownDs.series.map(function (s) { return s.name; });
assert(unknownNames.indexOf("foo") >= 0 && unknownNames.indexOf("bar") >= 0 && unknownNames.indexOf("baz") >= 0, "unknown header ABC 类列仍能建立 Series");

var abcDs = core.parseDatasetFromCsv(readFixture("TESTDATA_generic.csv"), {
  id: "ds-generic",
  name: "TESTDATA_generic.csv"
});
var abcSeries = abcDs.series.find(function (s) { return s.name === "ABC"; });
assert(!!abcSeries, "ABC Series 正常建立");
var massSeries = abcDs.series.find(function (s) { return s.name === "Mass Flow"; });
assert(massSeries && massSeries.unit === "kg/s", "generic CSV 保留 Mass Flow 单位");
assert(abcDs.xIsTime === false && abcDs.xName === "Step", "无 Time 列时可用第一数值列作 X");

var chineseDs = core.parseDatasetFromCsv(readFixture("TESTDATA_chinese.csv"), {
  id: "ds-zh",
  name: "TESTDATA_chinese.csv"
});
assert(chineseDs.xName === "时间" && chineseDs.xUnit === "s", "中文时间列表头解析");
assert(chineseDs.series[0].name === "入口温度" && chineseDs.series[0].unit === "°C", "中文温度列解析");

var mixedDs = core.parseDatasetFromCsv(readFixture("TESTDATA_mixed_units.csv"), {
  id: "ds-mixed",
  name: "TESTDATA_mixed_units.csv"
});
var mixedProject = core.createProject({ projectName: "mixed" });
core.addDataset(mixedProject, mixedDs);
var mixedPlot = core.createPlot(mixedProject, { title: "混合单位" });
core.addSeriesToPlot(mixedProject, mixedPlot, ["ds-mixed::Temperature", "ds-mixed::Voltage"]);
assert(core.computeAutoYTitle(mixedProject, mixedPlot) === "Value", "多单位 Plot 自动 Y title = Value");

var elecProject = core.createProject({ projectName: "elec" });
core.addDataset(elecProject, elecDs);
var voltPlot = core.createPlot(elecProject, { title: "电压" });
core.addSeriesToPlot(elecProject, voltPlot, ["ds-elec::Voltage"]);
assert(core.computeAutoYTitle(elecProject, voltPlot) === "Voltage (V)", "单条 Voltage 自动 Y title");
assert(core.computeAutoXTitle(elecProject, voltPlot) === "Time (s)", "Time(s) 自动 X title");
assert(core.resolvedAxisTitle(voltPlot.yAxis) === "Voltage (V)", "auto 模式使用 autoTitle");

voltPlot.yAxis.customTitle = "Battery Voltage / V";
voltPlot.yAxis.titleMode = "custom";
assert(core.resolvedAxisTitle(voltPlot.yAxis) === "Battery Voltage / V", "custom 模式优先 customTitle");
core.addSeriesToPlot(elecProject, voltPlot, ["ds-elec::Current"]);
assert(voltPlot.yAxis.titleMode === "custom", "增加 Series 后 custom titleMode 不变");
assert(core.resolvedAxisTitle(voltPlot.yAxis) === "Battery Voltage / V", "增加 Series 后不覆盖自定义标题");
assert(voltPlot.yAxis.autoTitle === "Value", "autoTitle 仍随 Series 更新");

var roundTrip = core.parseProject(core.serializeProject(elecProject));
assert(roundTrip.plots[0].yAxis.titleMode === "custom", "titleMode round-trip");
assert(roundTrip.plots[0].yAxis.customTitle === "Battery Voltage / V", "custom axis title serialization round-trip");
assert(core.resolvedAxisTitle(roundTrip.plots[0].yAxis) === "Battery Voltage / V", "打开后仍显示自定义标题");
assert(roundTrip.projectName === "elec", "新 project 保存后再打开");

var oldProject = core.parseProject(readFixture("TESTDATA_v010.tvproj.json"));
assert(oldProject.projectName === "v0.1.0 旧工程", "v0.1.0 old project 打开");
assert(oldProject.plots[0].xAxis.mode === "manual" && oldProject.plots[0].xAxis.max === 20, "旧 xRange 仍恢复");
assert(oldProject.plots[0].xAxis.titleMode === "auto", "旧工程缺 titleMode 时默认 auto");
assert(oldProject.plots[0].yAxis.autoTitle !== "", "旧工程自动补齐 autoTitle");
assert(oldProject.plots[0].seriesRefs[0].color === "#d14e3d", "旧工程颜色恢复");

try {
  core.parseProject("{not json");
  assert(false, "再次损坏 JSON 应抛错");
} catch (error) {
  assert(error.message.indexOf("JSON") >= 0, "损坏 JSON 仍然不清空当前工程");
}
assert(project.plots.length === 1 && project.projectName === keptName, "损坏工程不改写当前对象");

try {
  core.parseProject(JSON.stringify({
    projectFormatVersion: "9.9",
    datasets: [],
    plots: []
  }));
  assert(false, "再次不支持版本应抛错");
} catch (error) {
  assert(error.message.indexOf("不支持的工程版本") >= 0, "unsupported projectFormatVersion 仍然报错");
}

var wideDs = core.parseDatasetFromCsv(readFixture("TESTDATA_119_series.csv"), {
  id: "ds-wide",
  name: "TESTDATA_119_series.csv"
});
assert(wideDs.series.length === 119, "119 列 CSV 解析为 119 条 Series");

assert(elecDs.series[0].originalName === "Voltage(V)", "v0.2.1 originalName 从 originalHeader 迁移");
assert(elecDs.series[0].displayName === "Voltage", "v0.2.1 displayName 默认等于 name");

var migrated = core.parseProject(readFixture("TESTDATA_v010.tvproj.json"), { filename: "25C_2C_Test.tvproj.json" });
assert(migrated.projectName === "v0.1.0 旧工程", "已有 projectName 不被文件名覆盖");
assert(migrated.plots[0].legend && migrated.plots[0].legend.position === "auto", "旧工程补齐 legend 默认值");
assert(migrated.plots[0].xAxis.tickMode === "auto", "旧工程缺 tick 时默认 auto");
assert(migrated.ui && migrated.ui.canvasZoom === 1, "旧工程 canvasZoom 默认 1");
assert(migrated.datasets[0].series[0].displayName === "T1", "旧 series 补齐 displayName");
assert(migrated.datasets[0].series[0].originalName === "T1", "旧 series 补齐 originalName");

var unnamed = JSON.parse(readFixture("TESTDATA_v010.tvproj.json"));
unnamed.projectName = "未命名工程";
var namedFromFile = core.parseProject(JSON.stringify(unnamed), { filename: "25C_2C_Test.tvproj.json" });
assert(namedFromFile.projectName === "25C_2C_Test", "未命名工程打开时回退到文件名");
assert(core.projectNameFromFilename("folder/test1.tvproj.json") === "test1", "文件名去掉工程扩展名");

var renamePreview = core.previewBatchRename(
  ["全测点温度 / T1 Monitor: T1 Monitor", "全测点温度 / T2 Monitor: T2 Monitor", "全测点温度 / T3 Monitor: T3 Monitor"],
  { mode: "template", template: "T{n}", start: 1 }
);
assert(renamePreview[0].after === "T1" && renamePreview[2].after === "T3", "模板 T{n} 预览");
var strip = core.previewBatchRename(
  ["全测点温度 / T1", "全测点温度 / T2"],
  { mode: "stripPrefix" }
);
assert(strip[0].after === "T1" && strip[1].after === "T2", "删除公共前缀");
var replaced = core.previewBatchRename(["Cell Voltage Monitor"], { mode: "replace", find: " Monitor", replace: "" });
assert(replaced[0].after === "Cell Voltage", "查找替换");

var coord = core.screenToWorld(500, 400, 0.5);
assert(coord.x === 1000 && coord.y === 800, "screenToWorld 使用 zoom");
assert(core.worldToScreen(1000, 800, 0.5).x === 500, "worldToScreen 反向");
assert(core.clampZoom(0.05) === 0.25 && core.clampZoom(9) === 3, "zoom 限制 25%–300%");

var layoutPlots = [
  { layout: { x: 0, y: 0, width: 1280, height: 800 } },
  { layout: { x: 0, y: 0, width: 1280, height: 800 } },
  { layout: { x: 0, y: 0, width: 1280, height: 800 } },
  { layout: { x: 0, y: 0, width: 1280, height: 800 } }
];
core.applyLayoutTemplate(layoutPlots, "grid2x2", { width: 1280, height: 800, padding: 40, gap: 24 });
assert(layoutPlots[0].layout.width === layoutPlots[1].layout.width, "2×2 等宽");
assert(layoutPlots[0].layout.x < layoutPlots[1].layout.x, "2×2 左右排列");
assert(layoutPlots[0].layout.y < layoutPlots[2].layout.y, "2×2 上下排列");
assert(layoutPlots[0].layout.width !== 1280, "布局模板修改真实图尺寸");

assert(core.validateTickInterval(0, 0, 3600).indexOf("正数") >= 0, "Major Tick=0 被拒绝");
assert(core.validateTickInterval(-2, 0, 40), "负刻度被拒绝");
assert(core.validateTickInterval(0.00001, 0, 1000000).indexOf("过小") >= 0, "过密刻度被拒绝");
var xTicks = core.axisTickSet({ tickMode: "manual", majorTick: 500 }, 0, 3600, 5);
assert(xTicks.major.indexOf(0) >= 0 && xTicks.major.indexOf(3500) >= 0, "0–3600 step 500 含 0 和 3500");
assert(xTicks.major.length <= 8, "不强行塞入不均匀的 3600");
var yTicks = core.axisTickSet({ tickMode: "manual", majorTick: 2 }, 20, 40, 5);
assert(yTicks.major[0] === 20 && yTicks.major[yTicks.major.length - 1] === 40, "20–40 step 2");
assert(core.formatTickValue(22, { formatMode: "fixed", decimals: 1 }) === "22.0", "固定小数位");

var fit = core.fitViewZoom([
  { layout: { x: 0, y: 0, width: 1280, height: 800 } },
  { layout: { x: 1300, y: 0, width: 1280, height: 800 } },
  { layout: { x: 0, y: 820, width: 1280, height: 800 } },
  { layout: { x: 1300, y: 820, width: 1280, height: 800 } }
], 1000, 700, 40);
assert(fit < 1 && fit >= 0.25, "Fit View 缩小以容纳四图");

var moving = { layout: { x: 102, y: 40, width: 200, height: 100 } };
var snapped = core.snapPlotMove(moving, [{ layout: { x: 40, y: 40, width: 200, height: 100 } }], { width: 2000, height: 1000 }, 1);
assert(Math.abs(snapped.plot.layout.y - 40) < 1, "边缘/中心吸附后 Y 对齐");

var legendItems = [];
for (var i = 1; i <= 30; i += 1) legendItems.push({ label: "T" + i, color: "#2477b6", visible: true });
var legend = core.layoutLegendItems(legendItems, { maxWidth: 400, maxHeight: 160, fontSize: 12, columns: "auto" });
assert(legend.columns >= 2, "大量图例自动多列");
assert(legend.placed.length >= 20, "多列后尽量保留图例项");

var v021 = core.parseProject(core.serializeProject(elecProject));
assert(v021.softwareVersion === "0.2.4", "新工程写入 0.2.4");
assert(v021.plots[0].legend.visible === true, "legend 随工程保存");
assert(v021.ui.leftPanelWidth >= 220, "ui layout 随工程保存");

var renameProject = core.createProject({ projectName: "rename-scope" });
var renameDs = core.parseDatasetFromCsv(readFixture("TESTDATA_electrical.csv"), { id: "ds-ren", name: "elec" });
core.addDataset(renameProject, renameDs);
for (var extra = 0; extra < 7; extra += 1) {
  var clone = core.cloneJson(renameDs.series[0]);
  clone.id = "ds-ren::V" + extra;
  clone.localId = "V" + extra;
  clone.displayName = "Cell Voltage Monitor 00" + extra;
  clone.label = clone.displayName;
  renameDs.series.push(clone);
}
var renamePlot = core.createPlot(renameProject, { title: "Figure 1" });
core.addSeriesToPlot(renameProject, renamePlot, renameDs.series.map(function (s) { return s.id; }));
assert(renamePlot.seriesRefs.length === 10, "10 条 Series 加入当前图");
["ds-ren::Voltage", "ds-ren::V1", "ds-ren::V4"].forEach(function (id) {
  renamePlot.seriesRefs.find(function (ref) { return ref.seriesId === id; }).selected = true;
});
var selectedIds = core.resolveRenameTarget(renameProject, renamePlot, "selected");
assert(selectedIds.join(",") === "ds-ren::Voltage,ds-ren::V1,ds-ren::V4", "批量重命名只解析 selectedSeriesIds");
var beforeNames = renamePlot.seriesRefs.map(function (ref) {
  return core.seriesDisplayName(core.findSeries(renameProject, ref.seriesId));
});
var preview = core.previewBatchRename(selectedIds.map(function (id) {
  return core.seriesDisplayName(core.findSeries(renameProject, id));
}), { mode: "replace", find: "Voltage", replace: "Cell Voltage" });
core.applyRenameToSeriesIds(renameProject, selectedIds, preview);
assert(core.findSeries(renameProject, "ds-ren::Voltage").displayName.indexOf("Cell Voltage") >= 0, "选中 Series 被重命名");
assert(core.findSeries(renameProject, "ds-ren::Current").displayName === beforeNames[1], "未选中 Series 名称不变");
assert(core.findSeries(renameProject, "ds-ren::V2").displayName === "Cell Voltage Monitor 002", "未选中的 Monitor 002 不变");

var hidden = renamePlot.seriesRefs.find(function (ref) { return ref.seriesId === "ds-ren::Voltage"; });
hidden.visible = false;
hidden.selected = true;
core.applySeriesStyle(renamePlot, ["ds-ren::Voltage"], { lineWidth: 3, lineType: "dashed" });
assert(hidden.visible === false && hidden.selected === true, "selected 与 visible 解耦");
assert(hidden.style.lineWidth === 3 && hidden.style.lineType === "dashed", "隐藏但选中的 Series 仍被改样式");

var layoutProject = core.createProject({ projectName: "layout" });
var fig1 = core.createPlot(layoutProject, { id: "fig-1", title: "Figure 1" });
var fig2 = core.createPlot(layoutProject, { id: "fig-2", title: "Figure 2" });
var fig3 = core.createPlot(layoutProject, { id: "fig-3", title: "Figure 3" });
core.addDataset(layoutProject, elecDs);
core.addSeriesToPlot(layoutProject, fig2, ["ds-elec::Voltage"]);
fig2.seriesRefs[0].style.lineType = "dash-dot";
core.applyLayoutTemplate(layoutProject.plots, "onePlusTwo", { width: 1280, height: 800, padding: 40, gap: 24 }, { primaryPlotId: "fig-2" });
assert(fig2.layoutSlot === "large", "选中 Figure 2 后一大两小的主图是 Figure 2");
assert(fig2.layout.height > fig1.layout.height, "主图高度大于小图");
assert(fig1.layoutSlot === "smallTop" && fig3.layoutSlot === "smallBottom", "其余两图进入小图槽");
var keptStyle = fig2.seriesRefs[0].style.lineType;
core.applyLayoutTemplate(layoutProject.plots, "onePlusTwo", { width: 1280, height: 800, padding: 40, gap: 24 }, { primaryPlotId: "fig-1" });
assert(fig1.layoutSlot === "large", "切换主图后 Figure 1 成为大图");
assert(fig2.seriesRefs[0].style.lineType === keptStyle, "切换主图不销毁 Series/样式");

var blank = core.createProject();
assert(blank.plots.length === 0, "createProject 本身不建图，便于测试");
assert(core.ensureDefaultPlot(blank).title === "Figure 1", "新建工程补 Figure 1");
assert(blank.plots.length === 1 && blank.plots[0].id === core.ensureDefaultPlot(blank).id, "已有 Figure 时不重复创建");
var emptyOpened = core.parseProject(JSON.stringify({
  projectFormatVersion: "1.0",
  projectName: "empty-old",
  datasets: [],
  plots: []
}));
assert(emptyOpened.plots.length === 1 && emptyOpened.plots[0].title === "Figure 1", "旧空工程打开时补 Figure 1");

var items51 = [];
for (var n = 1; n <= 51; n += 1) items51.push({ label: "S" + n, color: "#2477b6", visible: true });
var legend10 = core.layoutLegendItems(items51, { columns: 10, fontSize: 9, maxWidth: 2000, maxHeight: 80 });
assert(legend10.columns === 10, "51 Series 指定 10 列");
assert(legend10.placed.length === 51, "指定列数后全部图例项都保留并换行");
assert(legend10.rows === 6, "51 / 10 自动 6 行");

var freeLegend = core.normalizeLegend({ position: { mode: "free", x: 0.72, y: 0.18 } });
assert(freeLegend.position === "free" && freeLegend.x === 0.72 && Math.abs(freeLegend.y - 0.18) < 1e-9, "自由位置保存归一化坐标");
fig1.legend = freeLegend;
var savedFree = JSON.parse(core.serializeProject(layoutProject));
assert(savedFree.plots[0].legend.position.mode === "free", "序列化自由图例为 {mode,x,y}");
var restoredFree = core.parseProject(JSON.stringify(savedFree));
assert(restoredFree.plots[0].legend.position === "free" && restoredFree.plots[0].legend.x === 0.72, "打开后恢复自由图例坐标");

var timeProject = core.createProject({ projectName: "time" });
core.addDataset(timeProject, elecDs);
var t1 = core.createPlot(timeProject, { title: "Figure 1" });
var t2 = core.createPlot(timeProject, { title: "Figure 2" });
core.addSeriesToPlot(timeProject, t1, ["ds-elec::Voltage"]);
core.addSeriesToPlot(timeProject, t2, ["ds-elec::Voltage"]);
t1.xAxis.time = { enabled: true, sourceUnit: "s", displayUnit: "s" };
t2.xAxis.time = { enabled: true, sourceUnit: "s", displayUnit: "min" };
var ext1 = core.plotExtents(timeProject, t1);
var ext2 = core.plotExtents(timeProject, t2);
assert(Math.abs(ext1.x[1] / ext2.x[1] - 60) < 0.01, "同一 dataset 下秒/分钟显示可并存");

var rangeDs = core.parseDatasetFromCsv("time,Value\n0,1\n11000,2\n", { id: "ds-range", name: "range" });
var rangeProject = core.createProject({ projectName: "range" });
core.addDataset(rangeProject, rangeDs);
var rangePlot = core.createPlot(rangeProject, { title: "Figure 1" });
core.addSeriesToPlot(rangeProject, rangePlot, [rangeDs.series[0].id]);
var xAuto = core.plotExtents(rangeProject, rangePlot);
assert(xAuto.x[0] === 0 && xAuto.x[1] === 11000, "X Auto Range 无左右 padding，0 贴左边");
assert(xAuto.y[0] < 1 && xAuto.y[1] > 2, "Y Auto Range 保留视觉 padding");
rangePlot.xAxis.mode = "manual";
rangePlot.xAxis.min = 100;
rangePlot.xAxis.max = 500;
assert(core.plotExtents(rangeProject, rangePlot).x[0] === 100, "手动范围严格使用输入值");
rangePlot.xAxis.mode = "auto";
assert(core.plotExtents(rangeProject, rangePlot).x[0] === 0, "切回 Auto 重新计算 data extent");

t1.seriesRefs[0].style = core.normalizeSeriesStyle({ lineType: "solid", lineWidth: 1, opacity: 1, color: "#2477b6" });
t2.seriesRefs[0].style = core.normalizeSeriesStyle({ lineType: "dashed", lineWidth: 2, opacity: 0.8, color: "#d36518" });
var third = core.createPlot(timeProject, { title: "Figure 3" });
core.addSeriesToPlot(timeProject, third, ["ds-elec::Current"]);
third.seriesRefs[0].style = core.normalizeSeriesStyle({ lineType: "dash-dot", lineWidth: 3 });
assert(core.strokeDasharray("dashed") === "6 4" && core.strokeDasharray("dash-dot") === "8 4 1.5 4", "线型映射到 dasharray");
t1.textStyles.xAxisTitle.fontSize = 16;
t1.textStyles.yAxisTitle.fontSize = 14;
t1.textStyles.xTick.fontSize = 10;
t1.textStyles.legend.fontSize = 9;
var round = core.parseProject(core.serializeProject(timeProject));
assert(round.plots[0].seriesRefs[0].style.lineWidth === 1 && round.plots[0].seriesRefs[0].style.lineType === "solid", "Series style round-trip");
assert(round.plots[1].seriesRefs[0].style.lineType === "dashed" && round.plots[1].seriesRefs[0].style.lineWidth === 2, "Figure 2 dashed width 2 恢复");
assert(round.plots[2].seriesRefs[0].style.lineType === "dash-dot" && round.plots[2].seriesRefs[0].style.lineWidth === 3, "Figure 3 dash-dot width 3 恢复");
assert(round.plots[0].textStyles.xAxisTitle.fontSize === 16 && round.plots[0].textStyles.legend.fontSize === 9, "文字样式 round-trip");
assert(round.plots[0].xAxis.time.displayUnit === "s" && round.plots[1].xAxis.time.displayUnit === "min", "每图时间单位 round-trip");
assert(round.plots[0].seriesRefs[0].selected === false && round.plots[0].seriesRefs[0].visible === true, "旧/新工程 selected/visible 默认值");

var oldMigrated = core.parseProject(readFixture("TESTDATA_v010.tvproj.json"));
assert(oldMigrated.plots[0].seriesRefs[0].style && oldMigrated.plots[0].seriesRefs[0].style.lineWidth === 1.5, "旧工程补齐 series.style");
assert(oldMigrated.plots[0].xAxis.time && oldMigrated.plots[0].xAxis.time.displayUnit, "旧工程补齐 per-chart time");
assert(oldMigrated.plots[0].textStyles && oldMigrated.plots[0].textStyles.title.fontSize === 14, "旧工程补齐 textStyles");
assert(oldMigrated.softwareVersion === "0.2.4", "打开后 working copy 版本为 0.2.4，源文件未改");
assert(oldMigrated.plots[0].textStyles.title.align === "left", "旧工程标题对齐回退为左");

var ids = ["s1", "s2", "s3", "s4", "s5"];
var sel = core.applyMultiSelect({ ids: ids, selectedIds: [], anchorId: null }, { type: "toggle", id: "s3" });
assert(sel.selectedIds.join(",") === "s3" && sel.anchorId === "s3", "普通单选");
sel = core.applyMultiSelect({ ids: ids, selectedIds: sel.selectedIds, anchorId: sel.anchorId }, { type: "toggle", id: "s5" });
assert(sel.selectedIds.join(",") === "s3,s5" && sel.anchorId === "s5", "Ctrl/Cmd toggle 离散多选");
sel = core.applyMultiSelect({ ids: ids, selectedIds: ["s3"], anchorId: "s3" }, { type: "range", id: "s5" });
assert(sel.selectedIds.join(",") === "s3,s4,s5" && sel.anchorId === "s3", "Shift range 保留 anchor");
sel = core.applyMultiSelect({ ids: ids, selectedIds: ["s3"], anchorId: "gone" }, { type: "range", id: "s2" });
assert(sel.selectedIds.indexOf("s2") >= 0 && sel.anchorId === "s2", "缺失 anchor 时 range 退化");
sel = core.applyMultiSelect({ ids: ids, selectedIds: ["s2"], anchorId: "s2" }, { type: "selectAll" });
assert(sel.selectedIds.join(",") === "s1,s2,s3,s4,s5", "Select All");
sel = core.applyMultiSelect({ ids: ids, selectedIds: sel.selectedIds, anchorId: sel.anchorId }, { type: "clear" });
assert(sel.selectedIds.join(",") === "" && sel.anchorId == null, "Clear");
var left = core.applyMultiSelect({ ids: ["d1", "d2"], selectedIds: ["d1"], anchorId: "d1" }, { type: "toggle", id: "d2" });
var right = core.applyMultiSelect({ ids: ["p1", "p2"], selectedIds: [], anchorId: null }, { type: "selectAll" });
assert(left.selectedIds.join(",") === "d1,d2" && right.selectedIds.join(",") === "p1,p2", "两个 selection scope 互不污染");

assert(core.normalizeSeriesStyle({ lineWidth: 0.1 }).lineWidth === 0.5, "lineWidth 0.1 → clamp 0.5");
assert(core.normalizeSeriesStyle({ lineWidth: 5.4 }).lineWidth === 5.4, "lineWidth 5.4 保留");
assert(core.normalizeSeriesStyle({ lineWidth: 30 }).lineWidth === 12, "lineWidth 30 → clamp 12");
assert(core.normalizeSeriesStyle({ lineWidth: "abc" }).lineWidth === 1.5, "invalid lineWidth → default");
assert(core.normalizeSeriesStyle({ lineWidth: 8.5 }).lineWidth === 8.5, "lineWidth 8.5 保留");

var fontLabels = core.FONT_FAMILIES.map(function (item) { return item.label; });
assert(fontLabels.indexOf("微软雅黑") >= 0 && fontLabels.indexOf("宋体") >= 0, "字体列表含微软雅黑/宋体");

var styleProj = core.createProject({ projectName: "v023-style" });
core.addDataset(styleProj, elecDs);
var stylePlot = core.createPlot(styleProj, { title: "Figure 1" });
core.addSeriesToPlot(styleProj, stylePlot, ["ds-elec::Voltage"]);
stylePlot.seriesRefs[0].style = core.normalizeSeriesStyle({ lineWidth: 8.5, color: "#2477b6" });
stylePlot.legend = core.normalizeLegend({
  position: "free",
  x: 0.4,
  y: 0.2,
  backgroundOpacity: 0,
  showBackground: true,
  backgroundColor: "#ffffff"
});
stylePlot.textStyles.title.fontFamily = '"Microsoft YaHei", "微软雅黑", Arial, sans-serif';
stylePlot.textStyles.xAxisTitle.fontFamily = 'SimSun, "宋体", serif';
var halfLegend = core.parseProject(core.serializeProject(styleProj));
assert(halfLegend.plots[0].seriesRefs[0].style.lineWidth === 8.5, "Line Width 8.5 round-trip");
assert(halfLegend.plots[0].legend.backgroundOpacity === 0, "Legend opacity 0 round-trip");
assert(halfLegend.plots[0].textStyles.title.fontFamily.indexOf("Microsoft YaHei") >= 0, "微软雅黑 round-trip");
assert(halfLegend.plots[0].textStyles.xAxisTitle.fontFamily.indexOf("SimSun") >= 0, "宋体 round-trip");
stylePlot.legend.backgroundOpacity = 0.5;
var midLegend = core.parseProject(core.serializeProject(styleProj));
assert(midLegend.plots[0].legend.backgroundOpacity === 0.5, "Legend opacity 0.5 round-trip");
assert(midLegend.plots[0].legend.showBackground === true, "showBackground 默认/保存");
var oldLegend = core.normalizeLegend({ position: "top-right" });
assert(oldLegend.showBackground === true && oldLegend.backgroundOpacity === 0.85, "旧工程补齐 legend 背景默认值");

var freeLayout = core.computePlotLayout(400, 300, {
  title: { width: 80, height: 14, ascent: 11 },
  yAxisTitle: { width: 40, height: 12 },
  yTick: { width: 20, height: 10 },
  xAxisTitle: { width: 40, height: 12 },
  xTick: { width: 24, height: 10 },
  legend: { width: 180, height: 70 },
  legendPosition: "free"
});
var topLayout = core.computePlotLayout(400, 300, {
  title: { width: 80, height: 14, ascent: 11 },
  yAxisTitle: { width: 40, height: 12 },
  yTick: { width: 20, height: 10 },
  xAxisTitle: { width: 40, height: 12 },
  xTick: { width: 24, height: 10 },
  legend: { width: 180, height: 70 },
  legendPosition: "top-center"
});
assert(topLayout.margin.top > freeLayout.margin.top + 40, "固定 Top legend 占用上边距，free 不推挤");
var yBig = core.computePlotLayout(400, 300, {
  title: { width: 80, height: 14 },
  yAxisTitle: { width: 160, height: 32 },
  yTick: { width: 28, height: 12 },
  xTick: { width: 20, height: 10 },
  legendPosition: "free"
});
var ySmall = core.computePlotLayout(400, 300, {
  title: { width: 80, height: 14 },
  yAxisTitle: { width: 80, height: 12 },
  yTick: { width: 28, height: 12 },
  xTick: { width: 20, height: 10 },
  legendPosition: "free"
});
assert(yBig.margin.left > ySmall.margin.left, "Y 轴标题变大时 left margin 增加");
assert(yBig.plotArea.x === yBig.margin.left, "Plot Area 随文字测量右移");
assert(yBig.yAxisTitlePos.x >= core.FIGURE_LAYOUT.outerPadding, "Y Title 起点不越出左边界");
var huge = core.computePlotLayout(240, 180, {
  title: { width: 200, height: 48, ascent: 40 },
  yAxisTitle: { width: 180, height: 36 },
  yTick: { width: 48, height: 16 },
  xAxisTitle: { width: 160, height: 28 },
  xTick: { width: 40, height: 16 },
  legendPosition: "free"
});
assert(huge.grown, "文字过大时允许增大 Figure");
assert(huge.plotArea.width >= core.FIGURE_LAYOUT.minPlotWidth, "Plot Area 不低于最小宽度");
assert(huge.plotArea.height >= core.FIGURE_LAYOUT.minPlotHeight, "Plot Area 不低于最小高度");

assert(core.APP_INFO.version === "0.2.4", "APP version 为 0.2.4");
assert(core.SOFTWARE_VERSION === core.APP_INFO.version, "SOFTWARE_VERSION 与 APP_INFO.version 相同");
assert(core.PROJECT_FORMAT_VERSION === "1.0", "工程格式仍为 1.0");
assert(core.APP_INFO.version !== core.PROJECT_FORMAT_VERSION, "软件版本与工程格式分离");
assert(core.normalizeVersionTag("v0.2.3") === "0.2.3", "v0.2.3 去掉前缀");
assert(core.normalizeVersionTag("0.2.3") === "0.2.3", "裸版本保持不变");
assert(core.compareSemVer("0.2.3", "0.2.3") === 0, "0.2.3 == 0.2.3");
assert(core.compareSemVer("0.2.3", "0.2.4") < 0, "0.2.3 < 0.2.4");
assert(core.compareSemVer("0.2.9", "0.2.10") < 0, "0.2.9 < 0.2.10");
assert(core.compareSemVer("0.9.0", "0.10.0") < 0, "0.9.0 < 0.10.0");
assert(core.compareSemVer("0.10.9", "0.10.10") < 0, "0.10.9 < 0.10.10");
assert(core.compareSemVer("1.0.0", "0.99.99") > 0, "1.0.0 > 0.99.99");
assert(core.compareSemVer("v0.3.0", "0.3.0") === 0, "tag 与裸版本相等");
assert(core.parseSemVer("nope") === null, "非法版本解析为 null");
assert(core.compareSemVer("0.2", "0.2.0") === null, "非三段版本不比较");

var assetRelease = {
  tag_name: "v0.3.0",
  assets: [
    { name: "Visualizer-v0.3.0-debug.zip", browser_download_url: "https://example.invalid/debug" },
    { name: "example.zip", browser_download_url: "https://example.invalid/example" },
    { name: "Visualizer-v0.3.0.zip", browser_download_url: "https://example.invalid/release.zip" }
  ]
};
var matchedAsset = core.findReleaseAsset(assetRelease);
assert(matchedAsset && matchedAsset.name === "Visualizer-v0.3.0.zip", "精确匹配正式 zip");
assert(matchedAsset.browser_download_url.indexOf("debug") < 0, "不返回 debug 包");
assert(core.findReleaseAsset({
  tag_name: "v0.3.0",
  assets: [{ name: "Visualizer-v0.3.0-debug.zip" }, { name: "example.zip" }]
}) === null, "没有正式包时不回退到第一个附件");
[null, {}, { name: "x" }, { tag_name: "latest" }, { tag_name: "v0.3" }, { tag_name: "v0.3.0" }, { tag_name: "v0.3.0", assets: [] }].forEach(function (sample) {
  var evaluated;
  try {
    evaluated = core.evaluateLatestRelease("0.2.3", sample);
  } catch (error) {
    evaluated = null;
  }
  assert(evaluated && evaluated.status, "非法 Release 不抛出：" + JSON.stringify(sample));
});
assert(core.evaluateLatestRelease("0.2.3", null).errorCode === "INVALID_RELEASE", "null release");
assert(core.evaluateLatestRelease("0.2.3", {}).errorCode === "INVALID_RELEASE", "空对象 release");
assert(core.evaluateLatestRelease("0.2.3", { assets: [] }).errorCode === "INVALID_RELEASE", "缺少 tag_name");
assert(core.evaluateLatestRelease("0.2.3", { tag_name: "latest", assets: [] }).errorCode === "INVALID_VERSION", "非法 tag");
var missingZip = core.evaluateLatestRelease("0.2.3", {
  tag_name: "v0.3.0",
  name: "Visualizer v0.3.0",
  body: "<script>alert(1)</script>",
  html_url: "https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.3.0",
  assets: []
});
assert(missingZip.status === "available" && missingZip.errorCode === "ASSET_NOT_FOUND", "缺少 zip 仍可展示新版本");
assert(missingZip.downloadUrl === null, "缺少 zip 时没有下载地址");
assert(missingZip.releaseNotes.indexOf("<script>") >= 0, "Release Notes 保持原文，交给界面转义");
assetRelease.name = "Visualizer v0.3.0";
assetRelease.body = "• Local Zoom";
assetRelease.published_at = "2026-10-01T00:00:00Z";
assetRelease.html_url = "https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.3.0";
var newer = core.evaluateLatestRelease("0.2.3", assetRelease);
assert(newer.status === "available" && newer.downloadUrl === "https://example.invalid/release.zip", "新版本带精确下载地址");
assert(newer.latestVersion === "0.3.0" && newer.releaseName === "Visualizer v0.3.0", "读取 release 名称");
assert(core.evaluateLatestRelease("0.2.3", { tag_name: "v0.2.3", assets: [] }).status === "up-to-date", "相同版本");
assert(core.evaluateLatestRelease("0.9.0", { tag_name: "v0.3.0", assets: [] }).status === "up-to-date", "本地更高不算发现更新");
assert(core.evaluateLatestRelease("0.2.4", { tag_name: "v0.3.0", prerelease: true, assets: [] }).errorCode === "NOT_STABLE", "prerelease 不是正式最新版");
assert(core.evaluateLatestRelease("0.2.4", { tag_name: "v0.3.0", draft: true, assets: [] }).errorCode === "NOT_STABLE", "draft 不是正式最新版");
assert(core.normalizeHexColor("  #CFE3EB ") === "#cfe3eb", "HEX 去空白、补大小写");
assert(core.normalizeHexColor("cfe3eb") === "#cfe3eb", "HEX 可省略 #");
assert(core.normalizeHexColor("#GGGGGG") === null, "非法 HEX 不产出颜色");
assert(core.normalizeHexColor("") === null && core.normalizeHexColor("#1234") === null, "空值和短 HEX 无效");
assert(core.isValidHexColor("CFE3EB") === true, "isValidHexColor 接受无 # 大写");
assert(/^#[0-9a-f]{6}$/.test(core.cssColorToHex("hsl(205, 68%, 51%)")), "传感器 HSL 可显示为 HEX");
assert(core.cssColorToHex("#GGGGGG") === null, "非法颜色不能转成 HEX");
core.LINE_STYLES.forEach(function (item) {
  assert(core.strokeDasharray(item.id) === item.dash, "线型 " + item.id + " 与 preview 共用 dash");
});
var groupProject = core.createProject({ projectName: "clusters" });
var csvA = "Time(s),T1,T2\n0,1,2\n1,2,3\n2,3,4\n";
var csvB = "Time(s),T1\n0,4\n1,5\n2,6\n";
var dsA = core.parseDatasetFromCsv(csvA, { id: "ds-a", name: "A", sourceFilename: "A.csv" });
var dsB = core.parseDatasetFromCsv(csvB, { id: "ds-b", name: "B", sourceFilename: "B.csv" });
core.addDataset(groupProject, dsA);
core.addDataset(groupProject, dsB);
var groupPlot = core.createPlot(groupProject, { title: "Clusters" });
core.addSeriesToPlot(groupProject, groupPlot, [dsA.series[0].id, dsA.series[1].id, dsB.series[0].id]);
core.applySeriesStyle(groupPlot, [dsA.series[0].id], { color: "#ff0000", lineType: "dashed", lineWidth: 4 });
core.applyStyleToSeries(groupProject, [dsA.series[0].id], { color: "#ff0000", lineType: "dashed", lineWidth: 4 });
core.applySeriesStyle(groupPlot, [dsA.series[1].id], { color: "#0000ff", lineType: "dotted", lineWidth: 5 });
core.applyStyleToSeries(groupProject, [dsA.series[1].id], { color: "#0000ff", lineType: "dotted", lineWidth: 5 });
core.applyStyleToDataset(groupProject, "ds-a", { color: "#cfe3eb" });
assert(groupPlot.seriesRefs[0].style.color === "#cfe3eb" && groupPlot.seriesRefs[0].style.lineType === "dashed" && groupPlot.seriesRefs[0].style.lineWidth === 4, "簇颜色不重置线型线宽");
assert(groupPlot.seriesRefs[1].style.color === "#cfe3eb" && groupPlot.seriesRefs[1].style.lineType === "dotted" && groupPlot.seriesRefs[1].style.lineWidth === 5, "同簇第二条只改颜色");
assert(groupPlot.seriesRefs[2].style.color !== "#cfe3eb", "其他数据簇不受影响");
core.applySeriesStyle(groupPlot, [dsA.series[1].id], { color: "#ff0000", lineType: "dashed", lineWidth: 5 });
core.applyStyleToSeries(groupProject, [dsA.series[1].id], { color: "#ff0000", lineType: "dashed", lineWidth: 5 });
assert(groupPlot.seriesRefs[1].style.color === "#ff0000" && groupPlot.seriesRefs[0].style.color === "#cfe3eb", "单条样式覆盖簇赋值且不回写其他系列");
core.applyStyleToDataset(groupProject, "ds-a", { color: "#112233" });
assert(groupPlot.seriesRefs[0].style.color === "#112233" && groupPlot.seriesRefs[1].style.color === "#112233", "再次应用覆盖单独修改");
var kept = groupPlot.seriesRefs[0].style.color;
core.applyStyleToDataset(groupProject, "ds-a", { color: "#GGGGGG" });
assert(groupPlot.seriesRefs[0].style.color === kept, "非法 HEX 不覆盖有效颜色");
var restored = core.parseProject(core.serializeProject(groupProject));
assert(restored.datasets[0].series[0].style.color === "#112233", "簇样式写入 Series 后可保存");
assert(restored.projectFormatVersion === "1.0", "v0.2.4 不升级工程格式");
var leftTitle = core.computePlotLayout(400, 300, {
  title: { width: 80, height: 14, ascent: 11 },
  titleAlign: "left"
});
var centerTitle = core.computePlotLayout(400, 300, {
  title: { width: 80, height: 14, ascent: 11 },
  titleAlign: "center"
});
var rightTitle = core.computePlotLayout(400, 300, {
  title: { width: 80, height: 14, ascent: 11 },
  titleAlign: "right"
});
assert(leftTitle.titlePos.x === core.FIGURE_LAYOUT.outerPadding && leftTitle.titleAnchor === "start", "标题左对齐");
assert(centerTitle.titlePos.x === 200 && centerTitle.titleAnchor === "middle", "标题居中");
assert(rightTitle.titlePos.x === 400 - core.FIGURE_LAYOUT.outerPadding && rightTitle.titleAnchor === "end", "标题右对齐");
assert(core.normalizePlotTextStyles({}).title.align === "left", "缺省标题对齐为左");
var page = fs.readFileSync(path.join(__dirname, "../temperature_trajectory_visualizer.html"), "utf8");
assert(page.indexOf("aboutDialog.showModal") >= 0, "About 使用模态 showModal");
assert(page.indexOf("aboutDialog.show()") < 0, "About 不再使用非模态 show");
assert(page.indexOf("标题对齐") >= 0, "界面有标题对齐");
assert(page.indexOf("应用到该数据簇全部系列") >= 0, "界面有簇样式应用");
assert(page.indexOf("z-index: 1000") >= 0 && page.indexOf("z-index: 10") >= 0, "Modal 层级高于分隔条");
var savedProject = core.serializeProject(project);
assert(savedProject.indexOf("updateState") < 0, "工程不含 updateState");
assert(savedProject.indexOf("latestVersion") < 0, "工程不含 latestVersion");
assert(savedProject.indexOf("githubRelease") < 0, "工程不含 githubRelease");
assert(savedProject.indexOf("lastUpdateCheck") < 0, "工程不含 lastUpdateCheck");

function releaseResponse(status, body, jsonFails) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: function () {
      if (jsonFails) return Promise.reject(new Error("bad json"));
      return Promise.resolve(body);
    }
  };
}

var seenUpdateUrl = "";
var updateChecks = [
  core.checkForUpdates({
    fetch: function () { return Promise.reject(new TypeError("Failed to fetch")); }
  }).then(function (state) {
    assert(state.status === "error" && state.errorCode === "NETWORK_ERROR", "断网返回 NETWORK_ERROR 且不抛出");
  }),
  core.checkForUpdates({
    fetch: function () { return Promise.resolve(releaseResponse(404, {})); }
  }).then(function (state) {
    assert(state.status === "error" && state.errorCode === "HTTP_ERROR", "HTTP 失败返回 HTTP_ERROR");
  }),
  core.checkForUpdates({
    fetch: function () { return Promise.resolve(releaseResponse(429, {})); }
  }).then(function (state) {
    assert(state.status === "error" && state.errorCode === "RATE_LIMIT", "API 限流不抛出");
  }),
  core.checkForUpdates({
    fetch: function () { return Promise.resolve(releaseResponse(200, null, true)); }
  }).then(function (state) {
    assert(state.status === "error" && state.errorCode === "INVALID_RELEASE", "损坏 JSON 返回 INVALID_RELEASE");
  }),
  core.fetchLatestRelease(function (url, init) {
    seenUpdateUrl = url + " " + init.method + " " + init.headers.Accept + " " + init.cache;
    assert(init.signal, "更新请求带超时信号");
    return Promise.resolve(releaseResponse(200, { tag_name: "v0.2.3", assets: [] }));
  }).then(function () {
    assert(seenUpdateUrl === core.githubReleasesApiUrl() + " GET application/vnd.github+json no-store", "只请求 GitHub latest release");
  }),
  core.checkForUpdates({
    version: "0.2.3",
    fetch: function () {
      return Promise.resolve(releaseResponse(200, {
        tag_name: "v0.3.0",
        name: "Visualizer v0.3.0",
        body: "notes",
        published_at: "2026-10-01T00:00:00Z",
        html_url: "https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.3.0",
        assets: [{ name: "Visualizer-v0.3.0.zip", browser_download_url: "https://example.invalid/Visualizer-v0.3.0.zip" }]
      }));
    }
  }).then(function (state) {
    assert(state.status === "available" && state.latestVersion === "0.3.0", "checkForUpdates 发现新版本");
    assert(state.downloadUrl === "https://example.invalid/Visualizer-v0.3.0.zip", "checkForUpdates 使用精确 zip");
  })
];

Promise.all(updateChecks).then(function () {
  if (failed) {
    console.error("\n" + failed + " failed");
    process.exit(1);
  }
  console.log("\nall core tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
