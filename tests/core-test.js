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
assert(v021.softwareVersion === "0.4.1", "新工程写入 0.4.1");
assert(v021.schemaVersion === 2, "新工程写入 schemaVersion 2");
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
assert(oldMigrated.softwareVersion === "0.4.1", "打开后 working copy 版本为 0.4.1，源文件未改");
assert(oldMigrated.plots[0].type === "normal" && oldMigrated.plots[0].topEdge.showLine === false, "旧工程补上普通图和默认关闭的上边轴");
assert(oldMigrated.plots[0].xAxis.showLine === true && oldMigrated.plots[0].xAxis.showTickLabels === true && oldMigrated.plots[0].xAxis.tickDirection === "out", "旧工程底轴默认轴线、刻度标签和向外刻度");
assert(oldMigrated.plots[0].showTitle === true && oldMigrated.plots[0].title !== "未命名图", "旧工程有标题时显示标题，不回写成未命名图");
assert(oldMigrated.plots[0].groupStyles && Object.keys(oldMigrated.plots[0].groupStyles).length === 0, "旧工程缺 groupStyles 时补空对象");
assert(oldMigrated.plots[0].insets.length === 0 && oldMigrated.plots[0].annotations.length === 0, "旧工程补齐 insets 与 annotations");
assert(oldMigrated.plots[0].fixedCursors.length === 0 && oldMigrated.plots[0].exportCursors === false, "旧工程不带固定游标");
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

assert(core.APP_INFO.version === "0.4.1", "APP version 为 0.4.1");
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
assert(restored.projectFormatVersion === "1.0", "v0.3.1 不升级工程格式");
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
var frame = core.createPlotFrame([0, 100], [0, 50], { x: 40, y: 20, width: 200, height: 100 });
var px = frame.dataToPixelX(25);
var py = frame.dataToPixelY(10);
assert(Math.abs(frame.pixelToDataX(px) - 25) < 1e-9, "data→pixel→data X 往返");
assert(Math.abs(frame.pixelToDataY(py) - 10) < 1e-9, "data→pixel→data Y 往返");
assert(Math.abs(frame.dataToPixelX(0) - 40) < 1e-9 && Math.abs(frame.dataToPixelY(50) - 20) < 1e-9, "数据原点对应 Plot Area 角点");

var reversed = core.normalizeSelectionRange({ x: 10, y: 1 }, { x: 2, y: 8 }, "plot-a");
assert(reversed.xMin === 2 && reversed.xMax === 10 && reversed.yMin === 1 && reversed.yMax === 8, "右到左、下到上的选区会排序");
assert(core.normalizeSelectionRange({ x: "no", y: 1 }, { x: 2, y: 3 }, "plot-a") === null, "非法选区不生成范围");

var mid = core.sampleSeriesY([0, 10], [0, 10], 5, "interpolate");
assert(mid && mid.y === 5, "中点线性插值");
var exact = core.sampleSeriesY([0, 10, 20], [1, 2, 4], 10, "interpolate");
assert(exact && exact.y === 2, "精确采样点不插值");
assert(core.sampleSeriesY([0, 10], [1, 2], 11, "nearest") === null, "超出 X 范围不外推");
var nanGap = core.sampleSeriesY([0, 1, 2], [1, NaN, 3], 0.5, "interpolate");
assert(nanGap === null, "插值不跨越 NaN 段");
var nanPoint = core.sampleSeriesY([0, 1, 2], [1, NaN, 3], 1, "nearest");
assert(nanPoint && nanPoint.x === 0 && nanPoint.y === 1, "最近值跳过 NaN，取相邻有效点");
var uneven = core.sampleSeriesY([0, 1, 10], [0, 0, 9], 5.5, "interpolate");
assert(uneven && Math.abs(uneven.y - 4.5) < 1e-9, "不等间隔线性插值");
var nearest = core.sampleSeriesY([0, 10, 30], [1, 2, 3], 12, "nearest");
assert(nearest && nearest.x === 10 && nearest.y === 2, "最近采样点");

var inspectProject = core.createProject({ projectName: "inspect" });
var inspectDs = core.parseDatasetFromCsv(expCsv, { id: "ds-i", name: "exp.csv", timeUnit: "s" });
core.addDataset(inspectProject, inspectDs);
var inspectPlot = core.createPlot(inspectProject, { title: "Inspect" });
core.addSeriesToPlot(inspectProject, inspectPlot, ["ds-i::T1", "ds-i::T2"]);
assert(core.writeAxisRange(inspectPlot.xAxis, 30, 0) && inspectPlot.xAxis.min === 0 && inspectPlot.xAxis.max === 30, "From > To 时交换为手动范围");
assert(core.writeAxisRange(inspectPlot.yAxis, 1, 1) === false, "零跨度范围不写入");
core.resetPlotView(inspectPlot);
assert(inspectPlot.xAxis.mode === "auto" && inspectPlot.yAxis.mode === "auto", "Reset View 恢复自动范围");
core.writeAxisRange(inspectPlot.xAxis, 0, 20);
var inset = core.normalizeInset({
  sourcePlotId: inspectPlot.id,
  sourceRange: { xMin: 0, xMax: 20, yMin: 25, yMax: 27 },
  rect: { x: 40, y: 40, width: 180, height: 100 },
  seriesIds: ["ds-i::T1", "missing"],
  title: "局部"
}, inspectPlot.id);
var annotation = core.normalizeAnnotation({
  type: "text",
  coordinateMode: "data",
  anchor: { x: 10, y: 25.5 },
  text: "峰"
}, inspectPlot.id);
inspectPlot.insets = [inset];
inspectPlot.annotations = [annotation];
inspectPlot.fixedCursors = [{ id: "A", x: 10 }, { id: "B", x: 20 }];
inspectPlot.exportCursors = false;
core.prunePlotInspection(inspectProject, inspectPlot);
assert(inspectPlot.insets[0].seriesIds.join(",") === "ds-i::T1", "Inset 丢弃已删除的 Series");
var inspectJson = core.serializeProject(inspectProject);
var inspectBack = core.parseProject(inspectJson);
assert(inspectBack.projectFormatVersion === "1.0", "检查功能不升级工程格式");
assert(inspectBack.plots[0].insets[0].title === "局部" && inspectBack.plots[0].insets[0].sourceRange.xMax === 20, "Inset 往返");
assert(inspectBack.plots[0].annotations[0].text === "峰" && inspectBack.plots[0].annotations[0].coordinateMode === "data", "Annotation 往返");
assert(inspectBack.plots[0].fixedCursors[1].id === "B" && inspectBack.plots[0].fixedCursors[1].x === 20, "固定游标往返");
assert(inspectBack.plots[0].xAxis.mode === "manual" && inspectBack.plots[0].xAxis.max === 20, "手动轴范围往返");
assert(inspectBack.plots[0].exportCursors === false, "游标默认不导出");
var yFit = core.insetYExtent(inspectProject, inspectPlot, inspectPlot.insets[0]);
assert(yFit[0] < yFit[1], "Inset 自动 Y 有有效范围");

var history = core.createHistory(2);
var historyValue = 0;
function executeHistory(next) {
  var prev = historyValue;
  historyValue = next;
  history.push({
    undo: function () { historyValue = prev; },
    redo: function () { historyValue = next; }
  });
}
executeHistory(1);
executeHistory(2);
assert(history.undo() && historyValue === 1, "undo 回到上一个值");
assert(history.redo() && historyValue === 2, "redo 恢复该值");
executeHistory(3);
assert(history.canRedo() === false && historyValue === 3, "新操作清空 redo");
executeHistory(4);
assert(history.size().undo === 2, "历史长度不超过上限");
history.undo();
history.undo();
assert(history.undo() === null, "超出历史后不再 undo");

var stateProject = core.createProject({ projectName: "history-state" });
var statePlot = core.createPlot(stateProject, { title: "Figure 1" });
var beforeState = core.captureEditorState(stateProject);
core.writeAxisRange(statePlot.xAxis, 1, 5);
core.restoreEditorState(stateProject, beforeState);
assert(stateProject.plots[0].xAxis.mode === "auto", "恢复编辑快照会还原轴范围");

var styleProject = core.createProject({ projectName: "style-priority" });
var styleCsv = "Time(s),T8,T9,T10\n0,1,2,3\n10,4,5,6\n";
var styleDs = core.parseDatasetFromCsv(styleCsv, { id: "ds-style", name: "T8-T22", sourceFilename: "t.csv" });
core.addDataset(styleProject, styleDs);
var stylePlot = core.createPlot(styleProject, { title: "Figure 1" });
core.addSeriesToPlot(styleProject, stylePlot, styleDs.series.map(function (series) { return series.id; }));
core.applyGroupStyle(styleProject, stylePlot, "ds-style", { colorMode: "single", color: "#25884d", lineType: "solid", lineWidth: 2 });
var grouped = core.resolvePlotSeries(styleProject, stylePlot);
assert(grouped.every(function (item) { return item.style.color === "#25884d" && item.style.lineWidth === 2 && item.style.lineType === "solid"; }), "数据簇样式作用于当前图全部系列");
core.applySeriesStyle(stylePlot, [styleDs.series[0].id], { color: "#ff0000" });
var mixed = core.resolvePlotSeries(styleProject, stylePlot);
assert(mixed[0].style.color === "#ff0000", "系列覆盖优先于数据簇样式");
assert(mixed[1].style.color === "#25884d" && mixed[2].style.color === "#25884d", "未覆盖的系列保持数据簇颜色");
var styleRound = core.parseProject(core.serializeProject(styleProject));
var mixedBack = core.resolvePlotSeries(styleRound, styleRound.plots[0]);
assert(mixedBack[0].style.color === "#ff0000" && mixedBack[1].style.color === "#25884d", "保存重开后系列覆盖不被数据簇盖掉");
assert(styleRound.projectFormatVersion === "1.0", "样式字段不升级工程格式");
core.applyGroupStyle(styleRound, styleRound.plots[0], "ds-style", { color: "#25884d", lineType: "solid", lineWidth: 2, colorMode: "single" });
assert(core.resolvePlotSeries(styleRound, styleRound.plots[0]).every(function (item) { return item.style.color === "#25884d"; }), "再次应用到全部系列才覆盖单独设置");

var frame = core.createPlotFrame([0, 1000], [0, 100], { x: 80, y: 40, width: 400, height: 200 });
var reversed = core.normalizeSelectionRange(
  { x: frame.pixelToDataX(480), y: frame.pixelToDataY(240) },
  { x: frame.pixelToDataX(80), y: frame.pixelToDataY(40) },
  "plot-1"
);
assert(reversed.xMin === 0 && reversed.xMax === 1000 && reversed.yMin === 0 && reversed.yMax === 100, "反向框选换成数据坐标且不按整图边距外推");
assert(Math.abs(frame.pixelToDataX(80) - 0) < 1e-9 && Math.abs(frame.pixelToDataX(480) - 1000) < 1e-9, "Plot Area 原点对应数据范围");

var snapProject = core.createProject({ projectName: "snap" });
core.setCanvasSize(snapProject, 1600, 900);
var snapA = core.createPlot(snapProject, { title: "Figure 1" });
var snapB = core.createPlot(snapProject, { title: "Figure 2" });
core.placePlotInSlot(snapA, "splitH", 0, snapProject.canvas);
core.placePlotInSlot(snapB, "splitH", 1, snapProject.canvas);
assert(snapA.layout.x < snapB.layout.x, "两列布局左图在右图左边");
assert(snapA.layout.y === snapB.layout.y, "两列布局同一行");
assert(snapA.layout.x + snapA.layout.width <= snapB.layout.x, "两列不重叠");
assert(snapB.layout.x + snapB.layout.width <= 1600, "布局落在画布宽度内");
var beforeResize = snapA.layout.x + "," + snapA.layout.width + "," + snapProject.canvas.width;
core.canvasLayoutArea({ width: 1600, height: 900 });
assert(snapProject.canvas.width === 1600 && beforeResize === snapA.layout.x + "," + snapA.layout.width + "," + snapProject.canvas.width, "读取布局区域不改画布和图坐标");

var local = core.createLocalPlot(snapProject, stylePlot, { xMin: 2, xMax: 8, yMin: 1, yMax: 5 });
assert(local.id !== stylePlot.id && local.xAxis.mode === "manual" && local.xAxis.min === 2 && local.xAxis.max === 8, "局部图使用框选 X 范围");
assert(local.yAxis.min === 1 && local.yAxis.max === 5, "局部图使用框选 Y 范围");
assert(stylePlot.xAxis.mode !== "manual" || stylePlot.xAxis.min !== 2, "局部图不改原图范围");
assert(local.seriesRefs.length === 0, "局部视图不复制系列");
assert(local.showTitle === false && local.legend.visible === false, "局部视图默认关闭标题和图例");
assert(local.xAxis.showTitle === false && local.yAxis.showTitle === false, "局部视图默认关闭轴标题");
assert(local.type === "detail" && local.detailSource && local.detailSource.autoFitY === true, "局部图记录来源并默认自动适配 Y");

var fittedLocal = core.createLocalPlot(styleProject, stylePlot, { xMin: 0, xMax: 10, yMin: 0, yMax: 100 });
assert(fittedLocal.xAxis.min === 0 && fittedLocal.xAxis.max === 10, "局部图 X 使用框选范围");
assert(fittedLocal.yAxis.min < 1 && fittedLocal.yAxis.max > 6 && fittedLocal.yAxis.max < 8, "autoFitY 按区间内数据加 5% 边距，不用框选的整段 Y");
assert(fittedLocal.detailSource.sourceRange.yMin === fittedLocal.yAxis.min, "来源框 Y 跟随局部图显示范围");
assert(fittedLocal.detailSource.showSourceBox === true && fittedLocal.detailSource.showConnectorLines === true, "来源框和连接线默认打开");
core.writeAxisRange(fittedLocal.xAxis, 2, 8);
var emptyFit = core.syncDetailRange(styleProject, fittedLocal);
assert(emptyFit === null && fittedLocal.yAxis.max > fittedLocal.yAxis.min, "X 范围内没有数据时不崩溃并保留 Y 范围");
core.writeAxisRange(fittedLocal.xAxis, 0, 10);
fittedLocal.detailSource.autoFitY = true;
core.syncDetailRange(styleProject, fittedLocal);
var flat = core.calculateVisibleYRange(styleProject, stylePlot, 0, 0, 0.05);
assert(flat === null, "空 X 范围不产生 Y");
var single = core.calculateVisibleYRange({
  datasets: [{ id: "d", series: [{ id: "d::a", datasetId: "d", x: [1], y: [60], unit: "", displayName: "A", label: "A", name: "A", localId: "a", style: { color: "#000", lineType: "solid", lineWidth: 1, opacity: 1 }, color: "#000" }] }],
  plots: []
}, {
  seriesRefs: [{ seriesId: "d::a", visible: true, style: { color: "#000", lineType: "solid", lineWidth: 1, opacity: 1 }, color: "#000", styleOverrides: null }],
  xAxis: { time: { enabled: false } },
  yAxis: {},
  groupStyles: {}
}, 0, 2, 0.05);
assert(single && single[0] < 60 && single[1] > 60, "只有一个 Y 时仍留出边距");

var zoomCsv = "Time(s),A,B,C,D\n0,10,10,10,10\n1550,35,35.3,36,37.5\n1700,35.8,36,37.1,38\n1800,35.4,36.5,36.2,39\n2000,50,50,50,50\n";
var zoomProject = core.createProject({ projectName: "zoom" });
var zoomDs = core.parseDatasetFromCsv(zoomCsv, { id: "ds-zoom", name: "zoom.csv", timeUnit: "s" });
core.addDataset(zoomProject, zoomDs);
var zoomMain = core.createPlot(zoomProject, { title: "Main" });
core.addSeriesToPlot(zoomProject, zoomMain, zoomDs.series.map(function (series) { return series.id; }));
var zoomLocal = core.createLocalPlot(zoomProject, zoomMain, { xMin: 1550, xMax: 1800, yMin: 0, yMax: 100 });
assert(zoomLocal.detailSource.yRangeMode === "auto-window" && zoomLocal.detailSource.yPaddingRatio === 0.05, "新建局部图默认按当前 X 窗口适配 Y，边距 5%");
var zoomDomain = core.calculateLocalViewDomain(zoomProject, zoomLocal);
assert(zoomDomain.mode === "auto-window" && zoomDomain.emptyWindow === false, "窗口内有数据时不是空窗口");
assert(Math.abs(zoomDomain.y[0] - 34.8) < 1e-9 && Math.abs(zoomDomain.y[1] - 39.2) < 1e-9, "1550–1800 的 Y 按窗口内 35–39 加 5% 边距，不用全曲线 10–50");
assert(Math.abs(core.plotExtents(zoomProject, zoomLocal).y[0] - zoomDomain.y[0]) < 1e-9 && Math.abs(core.plotExtents(zoomProject, zoomLocal).y[1] - zoomDomain.y[1]) < 1e-9, "绘图范围与局部图 domain 一致");
var hideCsv = "Time(s),A,B,C\n1550,35,35.5,20\n1800,36,36.5,25\n";
var hideProject = core.createProject({ projectName: "hide" });
var hideDs = core.parseDatasetFromCsv(hideCsv, { id: "ds-hide", name: "hide.csv", timeUnit: "s" });
core.addDataset(hideProject, hideDs);
var hideMain = core.createPlot(hideProject, { title: "Main" });
core.addSeriesToPlot(hideProject, hideMain, hideDs.series.map(function (series) { return series.id; }));
var hideLocal = core.createLocalPlot(hideProject, hideMain, { xMin: 1550, xMax: 1800, yMin: 0, yMax: 100 });
var withHidden = core.calculateLocalViewDomain(hideProject, hideLocal);
hideMain.seriesRefs[2].visible = false;
var hiddenDomain = core.calculateLocalViewDomain(hideProject, hideLocal);
assert(withHidden.y[0] < 21 && hiddenDomain.y[0] > 34 && hiddenDomain.y[1] < 37, "隐藏 Series 不参与 Auto Y");
core.setDetailYRangeMode(zoomLocal.detailSource, "follow-main");
var follow = core.calculateLocalViewDomain(zoomProject, zoomLocal);
var mainY = core.plotExtents(zoomProject, zoomMain).y;
assert(follow.mode === "follow-main" && follow.y[0] === mainY[0] && follow.y[1] === mainY[1], "FOLLOW_MAIN 使用主图 Y");
core.writeAxisRange(zoomLocal.yAxis, 35, 39);
core.setDetailYRangeMode(zoomLocal.detailSource, "manual");
core.syncDetailRange(zoomProject, zoomLocal);
var manualDomain = core.plotExtents(zoomProject, zoomLocal);
assert(manualDomain.y[0] === 35 && manualDomain.y[1] === 39, "MANUAL 严格使用 35–39");
core.setDetailYRangeMode(zoomLocal.detailSource, "auto-window");
zoomLocal.detailSource.yPaddingRatio = 0;
var rawPad = core.calculateLocalViewDomain(zoomProject, zoomLocal);
assert(Math.abs(rawPad.y[0] - 35) < 1e-9 && Math.abs(rawPad.y[1] - 39) < 1e-9, "边距 0% 等于窗口 raw min/max");
zoomLocal.detailSource.yPaddingRatio = 0.05;
var pad5 = core.calculateAutoYRange([35, 39], 0.05);
assert(Math.abs(pad5[0] - 34.8) < 1e-9 && Math.abs(pad5[1] - 39.2) < 1e-9, "边距 5% 按 span 扩展");
var flatDomain = core.calculateAutoYRange([35, 35, 35], 0.05);
assert(flatDomain[0] < 35 && flatDomain[1] > 35, "全部 Y 相同时 domain 不是零跨度");
var dirtyYs = core.calculateAutoYRange([NaN, Infinity, -Infinity, null, undefined, 36, 37], 0);
assert(dirtyYs[0] === 36 && dirtyYs[1] === 37, "NaN、Infinity、null 不进入范围");
core.writeAxisRange(zoomLocal.xAxis, 1, 2);
core.setDetailYRangeMode(zoomLocal.detailSource, "auto-window");
var emptyZoom = core.syncDetailRange(zoomProject, zoomLocal);
assert(emptyZoom === null && core.plotExtents(zoomProject, zoomLocal).y[1] > core.plotExtents(zoomProject, zoomLocal).y[0], "当前 X 窗口无数据时不崩溃");
core.writeAxisRange(zoomLocal.xAxis, 0, 0.5);
var xShift = core.calculateLocalViewDomain(zoomProject, zoomLocal);
assert(xShift.y[0] < 10.5 && xShift.y[1] > 9.5 && xShift.y[1] < 20, "修改 X 后 AUTO_WINDOW 按新窗口重算 Y");
var keptOpen = core.retainInspectorOpen({ chart: true, "chart.title": true, xAxis: true, "xAxis.line": true }, false, "viewport", null);
assert(keptOpen.chart === true && keptOpen.xAxis === true && keptOpen["xAxis.line"] === true, "普通刷新不重置折叠");
var switchedOpen = core.retainInspectorOpen(keptOpen, true, "viewport", null);
assert(switchedOpen.viewport === true && switchedOpen.chart === false && switchedOpen.xAxis === false && switchedOpen["xAxis.line"] === true, "切换对象展开相关分组并保留子组默认");
var oldManual = core.parseProject(JSON.stringify({
  projectFormatVersion: "1.0",
  projectName: "old-range",
  datasets: zoomProject.datasets,
  plots: [{
    id: zoomMain.id,
    title: "Main",
    seriesRefs: zoomMain.seriesRefs
  }, {
    id: "old-manual",
    type: "detail",
    title: "",
    xAxis: { mode: "manual", min: 1550, max: 1800 },
    yAxis: { mode: "manual", min: 35, max: 39 },
    detailSource: { sourceFigureId: zoomMain.id, sourceRange: { xMin: 1550, xMax: 1800, yMin: 35, yMax: 39 }, autoFitY: false }
  }]
}));
var oldManualPlot = oldManual.plots.filter(function (plot) { return plot.id === "old-manual"; })[0];
assert(oldManualPlot.detailSource.yRangeMode === "manual", "旧工程 autoFitY false 视为手动范围");
assert(core.plotExtents(oldManual, oldManualPlot).y[0] === 35 && core.plotExtents(oldManual, oldManualPlot).y[1] === 39, "旧手动范围打开后仍是 35–39");
var oldAuto = core.parseProject(JSON.stringify({
  projectFormatVersion: "1.0",
  projectName: "old-auto",
  datasets: zoomProject.datasets,
  plots: [{
    id: zoomMain.id,
    title: "Main",
    seriesRefs: zoomMain.seriesRefs
  }, {
    id: "old-auto",
    type: "detail",
    xAxis: { mode: "manual", min: 1550, max: 1800 },
    yAxis: { mode: "manual", min: 0, max: 100 },
    detailSource: { sourceFigureId: zoomMain.id, sourceRange: { xMin: 1550, xMax: 1800, yMin: 0, yMax: 100 }, autoFitY: true, yPaddingRatio: 0.05 }
  }]
}));
var oldAutoPlot = oldAuto.plots.filter(function (plot) { return plot.id === "old-auto"; })[0];
assert(oldAutoPlot.detailSource.yRangeMode === "auto-window", "旧工程 autoFitY true 视为当前窗口自动适配");
assert(Math.abs(core.plotExtents(oldAuto, oldAutoPlot).y[0] - 34.8) < 1e-9, "旧自动局部图按窗口重算，不用保存的 0–100");

var inheritedId = stylePlot.seriesRefs[0].seriesId;
core.applySeriesStyle(stylePlot, [inheritedId], { color: "#112233", lineWidth: 3, lineType: "dashed" });
var inherited = core.resolvePlotSeries(styleProject, fittedLocal).filter(function (item) { return item.series.id === inheritedId; })[0];
assert(inherited.style.color === "#112233" && inherited.style.lineWidth === 3 && inherited.style.lineType === "dashed", "局部视图系列样式跟随主图");
stylePlot.seriesRefs[0].visible = false;
assert(core.resolvePlotSeries(styleProject, fittedLocal)[0].visible === false, "局部视图跟随主图隐藏系列");
stylePlot.seriesRefs[0].visible = true;
assert(core.resolvePlotSeries(styleProject, fittedLocal)[0].visible === true, "局部视图跟随主图重新显示系列");
var layerBefore = core.plotsInLayerOrder(styleProject).map(function (plot) { return plot.id + ":" + plot.zOrder; }).join(",");
assert(core.plotsInLayerOrder(styleProject).map(function (plot) { return plot.id + ":" + plot.zOrder; }).join(",") === layerBefore, "读取图层顺序不会改变层级");
core.movePlotLayer(styleProject, fittedLocal.id, "bottom");
assert(core.plotsInLayerOrder(styleProject)[0].id === fittedLocal.id, "置底后局部视图在最下层");
core.movePlotLayer(styleProject, fittedLocal.id, "top");
assert(core.plotsInLayerOrder(styleProject)[core.plotsInLayerOrder(styleProject).length - 1].id === fittedLocal.id, "置顶后局部视图在最上层");
var savedInherit = core.parseProject(core.serializeProject(styleProject));
var savedDetail = savedInherit.plots.filter(function (plot) { return plot.id === fittedLocal.id; })[0];
assert(savedDetail.seriesRefs.length === 0, "保存时不保留局部视图独立系列");
assert(core.resolvePlotSeries(savedInherit, savedDetail).some(function (item) { return item.style.color === "#112233" && item.style.lineWidth === 3; }), "打开后局部视图仍跟随主图样式");
assert(savedInherit.schemaVersion === 2 && savedInherit.projectFormatVersion === "1.0", "schemaVersion 与工程格式分开");
var closedAxis = core.normalizeAxis({ autoTitle: "Time (s)", showTitle: false });
assert(core.resolvedAxisTitle(closedAxis) === "", "关闭轴标题后标题不参与绘制");
assert(core.resolvedAxisTitle(core.normalizeAxis({ autoTitle: "Time (s)" })) === "Time (s)", "旧轴缺省仍显示标题");
var mag = core.effectiveMagnification(
  { plotWidth: 400, plotHeight: 200, xMin: 0, xMax: 2000, yMin: 20, yMax: 46 },
  { plotWidth: 400, plotHeight: 200, xMin: 1400, xMax: 1800, yMin: 36, yMax: 40 }
);
assert(Math.abs(mag.x - 5) < 1e-9 && Math.abs(mag.y - 6.5) < 1e-9, "有效放大使用 Plot Area 与数据范围");
assert(core.effectiveMagnification({ plotWidth: 0, plotHeight: 10, xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, { plotWidth: 10, plotHeight: 10, xMin: 0, xMax: 0, yMin: 0, yMax: 1 }).x === null, "范围或尺寸无效时放大倍率为空");
var legacy = core.parseProject(JSON.stringify({
  projectFormatVersion: "1.0",
  projectName: "old-layer",
  datasets: styleProject.datasets,
  plots: [{
    id: stylePlot.id,
    title: "Figure 1",
    name: "Figure 1",
    seriesRefs: stylePlot.seriesRefs,
    type: "normal"
  }, {
    id: "old-detail",
    type: "detail",
    title: "局部",
    name: "局部图 1",
    seriesRefs: [{ seriesId: inheritedId, visible: true, color: "#abcdef", style: { color: "#abcdef", lineType: "solid", lineWidth: 4, opacity: 1 }, styleOverrides: { color: true } }],
    detailSource: { sourceFigureId: stylePlot.id, sourceRange: { xMin: 0, xMax: 10, yMin: 1, yMax: 5 }, autoFitY: true, yPaddingRatio: 0.05 }
  }]
}));
assert(legacy.plots.every(function (plot) { return Number.isFinite(plot.zOrder); }), "旧工程补上稳定图层顺序");
var legacyDetail = legacy.plots.filter(function (plot) { return plot.id === "old-detail"; })[0];
assert(legacyDetail.seriesRefs.length === 0, "旧局部图加载后不再使用自己的系列样式");
assert(core.resolvePlotSeries(legacy, legacyDetail).some(function (item) { return item.style.color === "#112233"; }), "旧局部图改为跟随来源主图");
var removed = core.removePlot(snapProject, stylePlot.id);
assert(removed.some(function (plot) { return plot.id === local.id; }), "删除主图时一并删除局部视图");
assert(!snapProject.plots.some(function (plot) { return plot.id === local.id; }), "删除后不留下悬空局部视图");

core.applySeriesStyle(stylePlot, [inheritedId], { color: "#ff0000", lineWidth: 1, lineType: "solid" });
core.setGroupStyle(stylePlot, "ds-style", { colorMode: "palette", paletteId: "high-contrast" });
var paletteSeries = core.resolvePlotSeries(styleProject, stylePlot);
assert(paletteSeries[0].style.color === "#ff0000", "Palette 不覆盖已有 Series Override");
assert(paletteSeries[1].style.color !== paletteSeries[2].style.color, "未覆盖的系列按 Palette 分配不同颜色");
assert(core.paletteMinDistance("high-contrast", 15) > 0.08, "自动高对比的前 15 色在 OKLab 中可区分");
var paletteRound = core.parseProject(core.serializeProject(styleProject));
assert(paletteRound.plots[0].groupStyles["ds-style"].paletteId === "high-contrast", "Palette 随工程保存");
assert(paletteRound.projectFormatVersion === "1.0", "Palette 不升级工程格式");

var pointAnn = core.normalizeAnnotation({
  type: "point",
  seriesId: styleDs.series[0].id,
  coordinateMode: "data",
  anchor: { x: 10, y: 4 },
  end: { x: 12, y: 8 },
  text: "T8\nx = 10"
}, stylePlot.id);
var freeAnn = core.normalizeAnnotation({
  type: "free",
  coordinateMode: "plot",
  anchor: { x: 0.2, y: 0.3 },
  end: { x: 0.2, y: 0.3 },
  text: "注"
}, stylePlot.id);
stylePlot.annotations = [pointAnn, freeAnn];
var annBack = core.parseProject(core.serializeProject(styleProject));
var savedPoint = annBack.plots[0].annotations[0];
var savedFree = annBack.plots[0].annotations[1];
assert(savedPoint.type === "point" && savedPoint.seriesId === styleDs.series[0].id && savedPoint.anchor.x === 10 && savedPoint.anchor.y === 4, "数据点标注保存 seriesId 和数据坐标");
assert(savedFree.coordinateMode === "plot" && savedFree.anchor.x === 0.2, "自由文本保存图内归一化坐标");
assert(!JSON.parse(core.serializeProject(styleProject)).plots[0].readoutCursor, "游标不写入工程");

var page = fs.readFileSync(path.join(__dirname, "../temperature_trajectory_visualizer.html"), "utf8");
assert(page.indexOf("check.dataset.seriesId = series.id") >= 0, "Checkbox 绑定稳定 series id");
assert(page.indexOf("input.checked = checkedSeries.has(input.dataset.seriesId)") >= 0, "Checkbox 只读 checkedSeries");
assert(page.indexOf('row.addEventListener("pointerdown"') >= 0, "选择在 pointerdown 写入，避免 click 默认动作回翻");
assert(page.indexOf("添加到当前图") >= 0 && page.indexOf("clearDataSelection()") >= 0, "加入图后清空临时选择");
assert(page.indexOf("已加入 ") >= 0, "右栏显示已加入而不是已选");
assert(page.indexOf("创建局部视图") >= 0 && page.indexOf("createLocalFigure") >= 0, "框选可创建局部图");
assert(page.indexOf("placeReadout") >= 0 && page.indexOf("readoutCursor = null") >= 0, "读数游标可清除");
assert(page.indexOf('id="tvSaveProject"') >= 0 && page.indexOf('id="tvSaveProjectAs"') >= 0 && page.indexOf('id="tvExportPng"') >= 0 && page.indexOf('id="tvExportSvg"') >= 0, "保存和导出仍在工具栏");
assert(page.indexOf('id="tvNewPlot"') >= 0 && page.indexOf('id="tvLayout"') >= 0 && page.indexOf('id="tvPreview"') >= 0 && page.indexOf('id="tvAboutOpen"') >= 0, "新建图、布局、预览、关于仍在工具栏");
assert(page.indexOf("适配当前 X 范围") >= 0 && page.indexOf("auto-window") >= 0 && page.indexOf("follow-main") >= 0, "局部图有三种 Y 范围和适配按钮");
assert(page.indexOf("导出设置") >= 0 && page.indexOf("轴线与刻度") >= 0, "属性栏按对象分组");
assert(page.indexOf("canvasLayoutArea") >= 0, "快速布局使用画布坐标");
assert(page.indexOf('section("画布 ') >= 0, "右侧有画布尺寸");
assert(page.indexOf("tv-snap-pop") >= 0, "Figure 有 Snap Layout");

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
