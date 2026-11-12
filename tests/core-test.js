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
function readFixtureBytes(name) {
  return fs.readFileSync(path.join(fixtures, name));
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
assert(json.indexOf("\"projectFormatVersion\": \"1.1\"") >= 0, "保存含 projectFormatVersion");
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

(function testCsvEncodingDetection() {
  var gbkBytes = readFixtureBytes("TESTDATA_gbk_headers.csv");
  var gb18030Bytes = readFixtureBytes("TESTDATA_gb18030_headers.csv");
  var bomBytes = readFixtureBytes("TESTDATA_utf8_bom.csv");
  var utf8Bytes = Buffer.from(readFixture("TESTDATA_chinese.csv"), "utf8");
  var englishBytes = readFixtureBytes("TESTDATA_english.csv");
  var complexBytes = readFixtureBytes("TESTDATA_complex_headers.csv");

  var looseUtf8 = new TextDecoder("utf-8", { fatal: false }).decode(gbkBytes);
  assert((looseUtf8.match(/\uFFFD/g) || []).length > 0, "GBK 直接当 UTF-8 会产生 U+FFFD");
  assert(looseUtf8.indexOf("入口温度") < 0, "file.text() 等价路径无法恢复中文表头");

  var gbk = core.detectCsvEncoding(gbkBytes);
  assert(gbk.needsManualChoice === false, "典型 GBK 中文表头自动识别");
  assert(gbk.encoding === "gb18030" || gbk.encoding === "gbk", "GBK 识别为 gb18030 或 gbk");
  assert(gbk.text.indexOf("入口温度") >= 0 && gbk.text.indexOf("\uFFFD") < 0, "GBK 解码恢复中文且不含替换符");

  var gb = core.detectCsvEncoding(gb18030Bytes);
  assert(gb.needsManualChoice === false && gb.text.indexOf("出口温度") >= 0, "GB18030 中文表头自动识别");

  var bom = core.detectCsvEncoding(bomBytes);
  assert(bom.bom === "utf-8" && bom.encoding === "utf-8" && bom.needsManualChoice === false, "UTF-8 BOM 优先识别");
  assert(bom.text.charCodeAt(0) !== 0xFEFF && bom.text.indexOf("时间") === 0, "UTF-8 BOM 被去掉且表头完整");

  var utf8 = core.detectCsvEncoding(utf8Bytes);
  assert(utf8.encoding === "utf-8" && utf8.needsManualChoice === false, "无 BOM 的合法 UTF-8 保持 UTF-8");
  assert(utf8.text.indexOf("入口温度") >= 0, "UTF-8 中文表头不改走 GB18030");

  var english = core.detectCsvEncoding(englishBytes);
  assert(english.encoding === "utf-8" && english.needsManualChoice === false, "英文 CSV 按 UTF-8 导入");
  var englishDs = core.parseDatasetFromCsv(english.text, { id: "ds-en", name: "en.csv" });
  assert(englishDs.series[0].name === "Voltage" && englishDs.series[0].unit === "V", "英文表头与单位保留");

  var complex = core.detectCsvEncoding(complexBytes);
  assert(complex.encoding === "utf-8" && complex.needsManualChoice === false, "复杂中文标点表头按 UTF-8");
  var complexDs = core.parseDatasetFromCsv(complex.text, { id: "ds-cx", name: "cx.csv" });
  assert(complexDs.xName === "时间" && complexDs.xUnit === "s", "复杂表头时间列");
  assert(complexDs.series[0].name === "电压（峰值）" && complexDs.series[0].unit === "V", "中文括号单位");
  assert(complexDs.series[1].name === "电流、功率" && complexDs.series[1].unit === "W", "顿号与斜杠单位");

  var gbkDs = core.parseDatasetFromCsvBytes(gbkBytes, { id: "ds-gbk", name: "gbk.csv" });
  assert(gbkDs.sourceEncoding === "gb18030" || gbkDs.sourceEncoding === "gbk", "Dataset 记录来源编码");
  assert(gbkDs.headers[0] === "时间[s]" && gbkDs.series[0].originalHeader.indexOf("入口温度") >= 0, "GBK 原始列名完整");
  assert(gbkDs.series[0].unit === "°C", "GBK 单位保留");
  assert(gbkDs.series[1].y[1] === 21.5, "数值精度不被编码转换改写");

  var forced = core.decodeCsvBytes(gbkBytes, "gb18030");
  assert(forced.encoding === "gb18030" && forced.text.indexOf("入口温度") >= 0, "允许手动指定 GB18030");

  var fffdRejected = false;
  try {
    core.decodeCsvBytes(Buffer.from("time,value\n0,\uFFFD\n", "utf8"), "utf-8");
  } catch (error) {
    fffdRejected = /替换/.test(error.message);
  }
  assert(fffdRejected, "含 U+FFFD 的解码结果不得作为 CSV 文本提交");
  var decodedUtf8 = core.decodeCsvBytes(utf8Bytes, "utf-8");
  assert(decodedUtf8.text.indexOf("\uFFFD") < 0, "接受的解码不含 U+FFFD");

  var junk = core.detectCsvEncoding(Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x80, 0x81, 0x82]));
  assert(junk.needsManualChoice === true && !junk.text, "低置信度不提交文本");
  assert(Array.isArray(junk.candidates) && junk.candidates.length >= 2, "低置信度提供候选预览");

  var textSubmitBlocked = junk.needsManualChoice && !junk.text;
  assert(textSubmitBlocked, "未经正确解码不得得到可提交文本");
}());

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
assert(core.clampZoom(0.05) === 0.25 && core.clampZoom(12) === 8, "zoom 限制 25%–800%");

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
var fitted = core.fitContentScale(336, 227, 1200, 800, 24);
assert(fitted > 1, "小图窗适应窗口时允许放大");
assert(Math.abs(fitted - Math.min((1200 - 48) / 336, (800 - 48) / 227)) < 1e-9, "适应窗口取宽高中较小的比例");
assert(Math.abs(core.fitContentScale(1000, 200, 500, 800, 0) - 0.5) < 1e-9, "宽图适应窗口受宽度限制");
assert(Math.abs(core.fitWidthScale(1000, 500, 0) - 0.5) < 1e-9, "适应宽度不看高度");
assert(core.fitWidthScale(200, 800, 0) > 1, "窄图适应宽度可以放大");
assert(core.mmToPx(89) === 336 && core.mmToPx(183) === 692, "单栏 89 mm、双栏 183 mm 对应既有像素");
var columnPlot = { layout: { width: 400, height: 260 }, lockAspect: true, aspectRatio: 400 / 260 };
core.applyFigureColumn(columnPlot, 183);
assert(columnPlot.layout.width === 692 && columnPlot.layout.height === 260, "单双栏只改宽度");
var cell = core.summarizeSeries({
  id: "series-a",
  datasetId: "ds-a",
  displayName: "T1",
  unit: "°C",
  x: [0, 20, 40, 60],
  y: [24.8, 39.2, null, 48.6]
}, { id: "ds-a", name: "电芯表面", xName: "Time", xUnit: "min", xIsTime: true, timeUnit: "min" });
assert(cell.count === 3 && cell.missing === 1, "概览计入有效点与缺失值");
assert(cell.xMin === 0 && cell.xMax === 60 && cell.xUnit === "min", "概览沿用数据自己的 X 单位");
assert(cell.yUnit === "°C" && cell.yMin === 24.8 && cell.yMax === 48.6, "概览 Y 范围来自该系列");
assert(cell.sampled === false && cell.sample.length === 3, "点数很少时不把抽样说成更多");
var sameName = core.summarizeSeries({ id: "series-b", datasetId: "ds-b", displayName: "T1", unit: "V", x: [0, 1], y: [9, 8] }, { id: "ds-b", xName: "t", xUnit: "s" });
assert(cell.seriesId !== sameName.seriesId && sameName.yMax === 9 && sameName.yUnit === "V", "同名系列按 ID 分开摘要");
var longSeries = { id: "long", displayName: "I", unit: "A", x: [], y: [] };
for (var sampleI = 0; sampleI < 20; sampleI += 1) {
  longSeries.x.push(sampleI);
  longSeries.y.push(sampleI);
}
var sampled = core.summarizeSeries(longSeries, { id: "ds-c", xName: "t", xUnit: "s" });
assert(sampled.sampled && sampled.sample.length === 5 && sampled.sample[0].x === 0 && sampled.sample[4].x === 19, "长序列等间隔抽样");

var moving = { layout: { x: 102, y: 40, width: 200, height: 100 } };
var snapped = core.snapPlotMove(moving, [{ layout: { x: 40, y: 40, width: 200, height: 100 } }], { width: 2000, height: 1000 }, 1);
assert(Math.abs(snapped.plot.layout.y - 40) < 1, "边缘/中心吸附后 Y 对齐");

var legendItems = [];
for (var i = 1; i <= 30; i += 1) legendItems.push({ label: "T" + i, color: "#2477b6", visible: true });
var legend = core.layoutLegendItems(legendItems, { maxWidth: 400, maxHeight: 160, fontSize: 12, columns: "auto" });
assert(legend.columns >= 2, "大量图例自动多列");
assert(legend.placed.length >= 20, "多列后尽量保留图例项");

var v021 = core.parseProject(core.serializeProject(elecProject));
assert(v021.softwareVersion === "0.7.4", "新工程写入 0.7.4");
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
core.applyRenameToSeriesIds(renameProject, selectedIds, preview, renamePlot);
var renamedRef = renamePlot.seriesRefs.find(function (ref) { return ref.seriesId === "ds-ren::Voltage"; });
assert(core.plotSeriesLegendName(renamedRef, core.findSeries(renameProject, "ds-ren::Voltage")).indexOf("Cell Voltage") >= 0, "选中 Series 被重命名");
assert(core.findSeries(renameProject, "ds-ren::Voltage").displayName.indexOf("Cell Voltage") < 0, "图例重命名不改数据源列名");
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
assert(oldMigrated.softwareVersion === "0.7.4", "打开后 working copy 版本为 0.7.4，源文件未改");
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

assert(core.APP_INFO.version === "0.7.4", "APP version 为 0.7.4");
assert(core.SOFTWARE_VERSION === core.APP_INFO.version, "SOFTWARE_VERSION 与 APP_INFO.version 相同");
assert(core.PROJECT_FORMAT_VERSION === "1.1", "工程格式为 1.1");
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
assert(restored.projectFormatVersion === "1.1", "v0.3.1 不升级工程格式");
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
assert(page.indexOf("全部重新应用") >= 0, "界面有簇样式重新应用");
assert(page.indexOf("patchSeriesStyle(plot, { datasetId: dataset.id }") >= 0 && page.indexOf("patchSeriesStyle(plot, { seriesIds: selectedIds }") >= 0, "簇样式和选中系列样式走同一个入口");
assert(page.indexOf("core.applyStyleToSeries(") < 0 && page.indexOf("core.setGroupStyle(") < 0, "界面不再绕过统一样式入口");
assert(page.indexOf('seriesInfo.textContent = "概览"') < 0, "系列行不再有单独的概览按钮");
assert(page.indexOf("placeFloating(menu, { left: x, top: y, right: x, bottom: y }, \"point\")") >= 0, "右键菜单走统一浮层定位");
assert(page.indexOf("z-index: 1000") >= 0 && page.indexOf("z-index: 10") >= 0, "Modal 层级高于分隔条");
assert(page.indexOf("tvFormulaDialog") >= 0, "公式编辑器使用独立对话框");
assert(page.indexOf("计算信息") >= 0, "Inspector 有计算信息分组");
assert(page.indexOf("新建公式") >= 0, "左侧可新建公式");
assert(page.indexOf("第一阶段只接受同一横坐标") < 0, "编辑器不再拒绝跨来源采样");
assert(page.indexOf("不按行号对齐") >= 0, "编辑器说明对齐不按行号");
assert(page.indexOf("formula.alignment") >= 0, "编辑公式保留已保存的对齐配置");
assert(page.indexOf("对齐模式") >= 0 && page.indexOf("时间偏移 Δt") >= 0, "公式编辑器有对齐模式和 Δt");
assert(page.indexOf("最近邻容差") >= 0 && page.indexOf("最大插值缺口") >= 0, "公式编辑器有容差和缺口");
assert(page.indexOf("paintAlignmentConfig") >= 0, "公式与分析共用 AlignmentConfig UI");
assert(page.indexOf("tvAnalysisDialog") >= 0 && page.indexOf("tvResultsDock") >= 0, "误差向导与 Results 工具窗口存在");
assert(page.indexOf("visualizer.workspace.results") >= 0, "Results 位置是 UI 偏好");
assert(page.indexOf("生成误差曲线") >= 0 && page.indexOf("ensureAnalysisErrorCurve") >= 0, "误差曲线需用户点击生成");
assert(page.indexOf("renderResultsDock();") >= 0, "Results 随界面刷新");
assert(page.indexOf("tvResultsDock") >= 0 && page.indexOf("id=\"tvDock\"") >= 0, "Results 与图窗 Dock 是两个节点");
assert(page.indexOf("tvDeleteImpactDialog") >= 0, "删除来源前有影响确认");
assert(page.indexOf("openFormulaEditor") >= 0 && page.indexOf("closeFormulaEditor") >= 0, "公式编辑器有草稿应用和取消");
assert(page.indexOf("pickInspectorSeries") >= 0, "系列名称进入 Inspector，不与勾选混用");
assert(page.indexOf("core.COMPUTED_DATASET_NAME") >= 0, "虚拟数据簇使用计算结果名称");
assert(!/\beval\s*\(/.test(page), "界面不用 eval");
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
assert(inspectBack.projectFormatVersion === "1.1", "检查往返后工作副本为 1.1");
assert(inspectBack.plots[0].insets[0].title === "局部" && inspectBack.plots[0].insets[0].sourceRange.xMax === 20, "Inset 往返");
assert(inspectBack.plots[0].annotations[0].text === "峰" && inspectBack.plots[0].annotations[0].coordinateMode === "data", "Annotation 往返");
assert(inspectBack.plots[0].fixedCursors[1].id === "B" && inspectBack.plots[0].fixedCursors[1].x === 20, "固定游标往返");
assert(inspectBack.plots[0].xAxis.mode === "manual" && inspectBack.plots[0].xAxis.max === 20, "手动轴范围往返");
assert(inspectBack.plots[0].exportCursors === false, "游标默认不导出");
var yFit = core.insetYExtent(inspectProject, inspectPlot, inspectPlot.insets[0]);
assert(yFit[0] < yFit[1], "Inset 自动 Y 有有效范围");
var t1 = inspectDs.series[0];
var readoutFrame = core.createPlotFrame(
  [t1.x[0], t1.x[t1.x.length - 1]],
  [Math.min.apply(null, t1.y) - 1, Math.max.apply(null, t1.y) + 1],
  { x: 40, y: 20, width: 400, height: 200 }
);
var nearHit = core.pickReadoutCandidate(
  inspectProject,
  inspectPlot,
  readoutFrame,
  readoutFrame.dataToPixelX(t1.x[0]),
  readoutFrame.dataToPixelY(t1.y[0]),
  18
);
assert(nearHit && nearHit.nearestSeriesId && nearHit.y != null, "G-FIX03 靠近曲线给出读数候选");
assert(!core.pickReadoutCandidate(inspectProject, inspectPlot, readoutFrame, 8, 8, 18), "G-FIX03 远离曲线不给出候选");

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
assert(styleRound.projectFormatVersion === "1.1", "样式字段不升级工程格式");
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
assert(savedInherit.schemaVersion === 2 && savedInherit.projectFormatVersion === "1.1", "schemaVersion 与工程格式分开");
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
assert(paletteRound.projectFormatVersion === "1.1", "Palette 不升级工程格式");

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
var offsetAnn = core.normalizeAnnotation({
  type: "point",
  coordinateMode: "data",
  seriesId: styleDs.series[0].id,
  anchor: { x: 10, y: 4 },
  end: { x: 12, y: 8 },
  labelOffset: { x: 0.08, y: -0.12 },
  text: "T45"
}, stylePlot.id);
assert(offsetAnn.labelOffset.x === 0.08 && offsetAnn.labelOffset.y === -0.12, "标注保存独立标签偏移");
core.setAnnotationLabelOffset(offsetAnn, 40, -24, { width: 400, height: 300 });
assert(Math.abs(offsetAnn.labelOffset.x - 0.1) < 1e-9 && Math.abs(offsetAnn.labelOffset.y + 0.08) < 1e-9, "拖动标签只改偏移不改锚点");
assert(offsetAnn.anchor.x === 10 && offsetAnn.anchor.y === 4, "拖动标签不改数据锚点");
var labelPx = core.annotationLabelPoint(offsetAnn, { x: 100, y: 200 }, { width: 400, height: 300 });
assert(Math.abs(labelPx.x - 140) < 1e-6 && Math.abs(labelPx.y - 176) < 1e-6, "标签位置由锚点加偏移得到");
var oldPoint = core.normalizeAnnotation({
  type: "point",
  coordinateMode: "data",
  anchor: { x: 1, y: 2 },
  end: { x: 3, y: 4 },
  text: "旧"
}, stylePlot.id);
assert(oldPoint.labelOffset == null && oldPoint.end.x === 3, "旧工程无 labelOffset 仍可读 end");
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
assert(page.indexOf("visualizer.templates.figure.v1") >= 0 || page.indexOf("TEMPLATE_STORAGE_KEY") >= 0, "模板库使用约定的存储键");
assert(page.indexOf("reorderPlotLayers") >= 0 && page.indexOf("applyFigureTemplate") >= 0, "图层排序和模板应用走核心函数");
assert(page.indexOf("pickReadoutCandidate") >= 0 && page.indexOf("tv-ann-hit") >= 0 && page.indexOf("tv-ann-preview") >= 0 && page.indexOf("dragAnnotationLabel") >= 0, "G-FIX03 标注悬停预览与标签命中层");
assert(page.indexOf("同宽") >= 0 && page.indexOf("disableSnap") >= 0 && page.indexOf("sizeMatches") >= 0, "C-FIX03 等宽等高吸附与 Alt 绕过");

var objectProject = core.createProject({ projectName: "v0.5 objects" });
var objectMain = core.createPlot(objectProject, {
  id: "main-1",
  title: "Figure 1",
  annotations: [{ id: "ann-1", type: "text", text: "标注", anchor: { x: 1, y: 2 } }]
});
core.addSeriesToPlot(objectProject, objectMain, []);
var objectDetail = core.createLocalPlot(objectProject, objectMain, { xMin: 0, xMax: 2, yMin: 0, yMax: 4 });
var zSnapshot = objectProject.plots.map(function (plot) { return plot.id + ":" + plot.zOrder; }).join("|");
["plot", "detail", "legend", "annotation", "source-box", "connector"].forEach(function (type) {
  var selected = core.normalizeSelectedObject({
    type: type,
    figureId: type === "detail" || type === "source-box" || type === "connector" ? objectDetail.id : objectMain.id,
    objectId: type === "annotation" ? "ann-1" : (type === "legend" ? "legend" : (type === "source-box" || type === "connector" ? objectDetail.id : objectMain.id))
  });
  assert(selected && selected.type === type && selected.figureId && selected.objectId, "selectedObject 能表示 " + type);
  assert(core.getPropertyFocus(selected) === (type === "plot" ? "plot" : type), type + " 的属性焦点是它自己");
});
assert(objectProject.plots.map(function (plot) { return plot.id + ":" + plot.zOrder; }).join("|") === zSnapshot, "构造 selectedObject 不改变 zOrder");
assert(core.selectedObjectAction(objectProject, { type: "plot", figureId: objectMain.id, objectId: objectMain.id }).action === "delete", "删除主图是删除");
assert(core.selectedObjectAction(objectProject, { type: "detail", figureId: objectDetail.id, objectId: objectDetail.id }).action === "delete", "删除局部图是删除");
assert(core.selectedObjectAction(objectProject, { type: "annotation", figureId: objectMain.id, objectId: "ann-1" }).action === "delete", "删除标注是删除");
assert(core.selectedObjectAction(objectProject, { type: "legend", figureId: objectMain.id, objectId: "legend" }).action === "hide", "删除图例是隐藏");
assert(core.selectedObjectAction(objectProject, { type: "source-box", figureId: objectDetail.id, objectId: objectDetail.id }).action === "hide", "删除来源框是隐藏");
assert(core.selectedObjectAction(objectProject, { type: "connector", figureId: objectDetail.id, objectId: objectDetail.id }).action === "hide", "删除引导线是隐藏");
core.applySelectedObjectDelete(objectProject, { type: "legend", figureId: objectMain.id, objectId: "legend" });
assert(objectMain.legend.visible === false, "图例删除只是 visible = false");
core.applySelectedObjectDelete(objectProject, { type: "source-box", figureId: objectMain.id, objectId: objectDetail.id });
core.applySelectedObjectDelete(objectProject, { type: "connector", figureId: objectDetail.id, objectId: objectDetail.id });
assert(objectDetail.detailSource.showSourceBox === false && objectDetail.detailSource.showConnectorLines === false, "来源框和引导线删除只是 show = false");
assert(objectMain.annotations.length === 1, "隐藏子对象不删除标注");
core.applySelectedObjectDelete(objectProject, { type: "annotation", figureId: objectMain.id, objectId: "ann-1" });
assert(objectMain.annotations.length === 0, "标注删除会移除对象");

var layerProject = core.createProject({ projectName: "v0.5 layers" });
var layerA = core.createPlot(layerProject, { id: "layer-a", title: "Figure 1" });
var layerDetail = core.createLocalPlot(layerProject, layerA, { xMin: 1, xMax: 2, yMin: 3, yMax: 4 });
var layerB = core.createPlot(layerProject, { id: "layer-b", title: "Figure 2" });
layerB.visible = false;
layerA.locked = true;
var beforeOrder = layerProject.plots.map(function (plot) { return plot.zOrder; }).join(",");
core.normalizeSelectedObject({ type: "plot", figureId: layerA.id, objectId: layerA.id });
assert(layerProject.plots.map(function (plot) { return plot.zOrder; }).join(",") === beforeOrder, "选中不改 zOrder");
core.reorderPlotLayers(layerProject, [layerB.id, layerA.id, layerDetail.id]);
var zValues = core.plotsInLayerOrder(layerProject).map(function (plot) { return plot.zOrder; });
assert(zValues.join(",") === "1,2,3", "拖拽后 zOrder 连续");
assert(core.plotsInLayerOrder(layerProject).map(function (plot) { return plot.id; }).join(",") === [layerDetail.id, layerA.id, layerB.id].join(","), "列表顶部是最大 zOrder");
assert(layerB.visible === false && layerA.locked === true, "排序保留隐藏和锁定");
var layerBefore = core.captureEditorState(layerProject);
core.reorderPlotLayers(layerProject, [layerA.id, layerDetail.id, layerB.id]);
var layerAfter = core.captureEditorState(layerProject);
var layerHistory = core.createHistory();
layerHistory.push({
  undo: function () { core.restoreEditorState(layerProject, layerBefore); },
  redo: function () { core.restoreEditorState(layerProject, layerAfter); }
});
layerHistory.undo();
assert(core.plotsInLayerOrder(layerProject).slice().reverse()[0].id === layerB.id, "撤销图层排序");
layerHistory.redo();
assert(core.plotsInLayerOrder(layerProject).slice().reverse()[0].id === layerA.id, "重做图层排序");

var templateProject = core.createProject({ projectName: "v0.5 template" });
var templatePlot = core.createPlot(templateProject, { id: "tpl-plot", title: "论文图" });
templatePlot.layout.x = 80;
templatePlot.layout.y = 90;
templatePlot.layout.width = 900;
templatePlot.layout.height = 520;
templatePlot.background = "#ffffff";
templatePlot.showTitle = true;
templatePlot.textStyles.title = core.normalizeTextStyle({ fontFamily: "Times New Roman, Times, serif", fontSize: 18, fontWeight: "700" }, templatePlot.textStyles.title);
templatePlot.textStyles.title.align = "center";
templatePlot.textStyles.xAxisTitle.fontSize = 16;
templatePlot.textStyles.yAxisTitle.fontSize = 16;
templatePlot.textStyles.xTick.fontSize = 13;
templatePlot.textStyles.yTick.fontSize = 13;
templatePlot.xAxis.lineWidth = 1.5;
templatePlot.xAxis.min = 10;
templatePlot.xAxis.max = 40;
templatePlot.xAxis.mode = "manual";
templatePlot.yAxis.min = 1;
templatePlot.yAxis.max = 9;
templatePlot.yAxis.mode = "manual";
templatePlot.legend.position = "top-right";
templatePlot.topEdge.showLine = true;
templatePlot.rightEdge.showLine = true;
templatePlot.annotations = [{ id: "keep-ann", type: "text", text: "留在图上", anchor: { x: 2, y: 3 } }];
templatePlot.annotations = core.normalizeAnnotations(templatePlot.annotations, templatePlot.id);
templatePlot.zOrder = 4;
core.addDataset(templateProject, expDs);
core.addSeriesToPlot(templateProject, templatePlot, ["ds-exp::T1"]);
core.applySeriesStyle(templatePlot, ["ds-exp::T1"], { lineWidth: 2.5, color: "#112233" });
var extracted = core.extractFigureTemplate(templatePlot, { id: "tpl-paper", name: "论文单图", now: "2026-09-29T00:00:00.000Z" });
assert(extracted.templateFormatVersion === 1 && extracted.name === "论文单图", "模板有独立格式版本和名称");
assert(!extracted.xAxis.min && !extracted.yAxis.max, "模板不保存轴当前范围");
assert(!extracted.annotations && !extracted.seriesRefs && !extracted.datasets, "模板不保存标注和数据");
assert(extracted.figure.width === 900 && extracted.defaultSeriesStyle.lineWidth === 2.5, "模板保存尺寸和系列默认线宽");
assert(extracted.textStyles.title.fontSize === 18 && extracted.xAxis.lineWidth === 1.5, "模板保存标题和轴线");
assert(extracted.legend.position === "top-right" && extracted.topEdge.showLine === true, "模板保存图例和上边框");
var roundTemplate = core.parseFigureTemplate(core.serializeFigureTemplate(extracted));
assert(roundTemplate.ok && roundTemplate.template.name === "论文单图" && roundTemplate.template.defaultSeriesStyle.lineWidth === 2.5, "模板往返");
assert(!core.parseFigureTemplate("{").ok && !core.parseFigureTemplate(JSON.stringify({ projectFormatVersion: "1.0" })).ok, "非法模板被拒绝");
assert(core.validateFigureTemplate({ templateFormatVersion: 2 }).ok === false, "错误的模板版本被拒绝");
var badLibrary = core.normalizeTemplateLibrary({ defaultTemplateId: "missing", templates: [extracted, { templateFormatVersion: 9 }] });
assert(badLibrary.templates.length === 1 && badLibrary.defaultTemplateId === "", "坏模板不会进入模板库");
var styled = core.createPlot(templateProject, { id: "styled", title: "待套用" });
styled.layout.x = 30;
styled.layout.y = 40;
styled.xAxis.min = 3;
styled.xAxis.max = 8;
styled.xAxis.mode = "manual";
styled.yAxis.min = 5;
styled.yAxis.max = 6;
styled.yAxis.mode = "manual";
styled.zOrder = 2;
core.addSeriesToPlot(templateProject, styled, ["ds-exp::T1", "ds-exp::T2"]);
core.applySeriesStyle(templateProject.plots.find(function (plot) { return plot.id === "styled"; }), ["ds-exp::T1"], { lineWidth: 5 });
styled.annotations = core.normalizeAnnotations([{ id: "stay", type: "text", text: "不动", anchor: { x: 1, y: 1 } }], styled.id);
var detailOnStyled = core.createLocalPlot(templateProject, styled, { xMin: 3, xMax: 4, yMin: 5, yMax: 6 });
detailOnStyled.detailSource.yRangeMode = "auto-window";
var keptX = styled.layout.x;
var keptY = styled.layout.y;
var keptZ = styled.zOrder;
var styleBefore = core.captureEditorState(templateProject);
core.applyFigureTemplate(styled, extracted);
assert(styled.seriesRefs.map(function (ref) { return ref.seriesId; }).join(",") === "ds-exp::T1,ds-exp::T2", "应用模板不改 seriesRefs");
assert(styled.xAxis.min === 3 && styled.xAxis.max === 8 && styled.yAxis.min === 5 && styled.yAxis.max === 6, "应用模板不改当前 X/Y 范围");
assert(styled.layout.x === keptX && styled.layout.y === keptY && styled.zOrder === keptZ, "应用模板不改位置和图层");
assert(styled.annotations.length === 1 && styled.annotations[0].text === "不动", "应用模板不改标注");
assert(detailOnStyled.detailSource.yRangeMode === "auto-window" && detailOnStyled.detailSource.sourceFigureId === styled.id, "应用模板不改局部图关系");
assert(styled.layout.width === 900 && styled.textStyles.title.fontSize === 18 && styled.xAxis.lineWidth === 1.5, "应用模板写入样式");
assert(styled.templateMeta.templateName === "论文单图", "图上只记录模板名称，不依赖模板文件存在");
var paintedT1 = core.resolvePlotSeries(templateProject, styled).find(function (item) { return item.series.id === "ds-exp::T1"; });
var paintedT2 = core.resolvePlotSeries(templateProject, styled).find(function (item) { return item.series.id === "ds-exp::T2"; });
assert(paintedT1.style.lineWidth === 5, "Series Override 高于模板默认");
assert(paintedT2.style.lineWidth === 2.5, "没有覆盖的系列使用模板默认线宽");
core.setGroupStyle(styled, "ds-exp", { lineWidth: 4, colorMode: "single", color: "#00aa00" });
core.applySeriesStyle(styled, ["ds-exp::T1"], { lineWidth: 5 });
var grouped = core.resolvePlotSeries(templateProject, styled);
var groupedT2 = grouped.find(function (item) { return item.series.id === "ds-exp::T2"; });
var groupedT1 = grouped.find(function (item) { return item.series.id === "ds-exp::T1"; });
assert(groupedT2.style.lineWidth === 4, "数据簇样式高于模板默认");
assert(groupedT1.style.lineWidth === 5, "Series Override 高于数据簇样式");
styled.defaultSeriesStyle = null;
styled.groupStyles = {};
var systemPaint = core.resolveSeriesStyle(styled, core.findSeries(templateProject, "ds-exp::T2"), styled.seriesRefs[1], 1);
assert(systemPaint.lineWidth === styled.seriesRefs[1].style.lineWidth, "没有模板和数据簇时使用系列自身样式");
var applyAfter = core.captureEditorState(templateProject);
var applyHistory = core.createHistory();
applyHistory.push({
  undo: function () { core.restoreEditorState(templateProject, styleBefore); },
  redo: function () { core.restoreEditorState(templateProject, applyAfter); }
});
applyHistory.undo();
var undone = templateProject.plots.find(function (plot) { return plot.id === "styled"; });
assert(undone.layout.width !== 900 && undone.textStyles.title.fontSize !== 18, "撤销模板应用恢复原样式");
applyHistory.redo();
assert(templateProject.plots.find(function (plot) { return plot.id === "styled"; }).layout.width === 900, "重做模板应用");
assert(core.extractFigureTemplate(objectDetail, { name: "局部" }) === null, "局部视图不能存成图表模板");
templateProject.templates = [{ id: "library" }];
templateProject.selectedObject = { type: "plot", figureId: "styled" };
templateProject.layerDragState = { id: "layer-a" };
var savedTemplateProject = JSON.parse(core.serializeProject(templateProject));
assert(!savedTemplateProject.templates && !savedTemplateProject.selectedObject && !savedTemplateProject.layerDragState, "模板库、选中和图层拖拽不进工程");
assert(savedTemplateProject.projectFormatVersion === "1.1" && savedTemplateProject.schemaVersion === 2, "模板不升级工程格式");
var oldBare = core.parseProject(JSON.stringify({
  projectFormatVersion: "1.0",
  projectName: "v0.4.1 shape",
  datasets: [],
  plots: [{ id: "old-plot", title: "Old", layout: { x: 1, y: 2, width: 400, height: 300 }, seriesRefs: [] }]
}));
assert(oldBare.plots[0].defaultSeriesStyle == null && oldBare.plots[0].templateMeta == null, "旧图缺模板字段时补空");
assert(oldBare.plots[0].layout.x === 1, "旧图布局仍在");

var workspaceProject = core.createProject({ projectName: "workspace" });
assert(workspaceProject.plots.length === 0 && workspaceProject.canvases.length === 0, "createProject 不预建图窗或画布");
core.ensureWorkspace(workspaceProject);
assert(core.plotWindows(workspaceProject).length === 1, "新工作区有一个图窗");
assert(workspaceProject.canvases.length === 1 && workspaceProject.canvases[0].name === "画布 1", "新工作区有画布 1");
assert(workspaceProject.canvases[0].instances.length === 1, "图窗 1 初始放在画布 1");
assert(workspaceProject.canvases[0].instances[0].plotId === workspaceProject.plots[0].id, "初始实例引用图窗 1");
var secondWindow = core.createPlot(workspaceProject, { name: "图窗 2", title: "Figure 2" });
assert(!workspaceProject.canvases[0].instances.some(function (item) { return item.plotId === secondWindow.id; }), "新建图窗不自动进入画布");
var placed = core.createInstance(workspaceProject, workspaceProject.canvases[0].id, secondWindow.id, { x: 80, y: 90, width: 400, height: 280 });
assert(placed.x === 80 && placed.width === 400, "实例保存自己的位置和尺寸");
var placedAgainSame = core.createInstance(workspaceProject, workspaceProject.canvases[0].id, secondWindow.id, { x: 90, y: 100 });
assert(placedAgainSame.id !== placed.id && placedAgainSame.plotId === secondWindow.id, "同一源图可在同一画布放多个独立副本");
var secondCanvas = core.createCanvas(workspaceProject, { name: "画布 2" });
var placedAgain = core.createInstance(workspaceProject, secondCanvas.id, secondWindow.id, { x: 20, y: 30, width: 500, height: 300 });
assert(placedAgain.id !== placed.id && placedAgain.plotId === secondWindow.id, "同一图窗可被另一张画布引用");
var blocked = core.deletePlotWindow(workspaceProject, secondWindow.id, false);
assert(blocked.ok === false && blocked.canvases.length === 2, "删除被引用图窗时返回画布名称且不删除");
assert(core.findPlot(workspaceProject, secondWindow.id), "未确认时图窗仍在");
core.removeInstance(workspaceProject, workspaceProject.canvases[0].id, placed.id);
core.removeInstance(workspaceProject, workspaceProject.canvases[0].id, placedAgainSame.id);
assert(core.plotWindowUsage(workspaceProject, secondWindow.id).length === 1, "移除实例不删除图窗资产");
var copied = core.duplicatePlotWindow(workspaceProject, workspaceProject.plots[0].id);
assert(copied.id !== workspaceProject.plots[0].id, "复制图窗生成新 ID");
assert(!workspaceProject.canvases[0].instances.some(function (item) { return item.plotId === copied.id; }), "副本不继承画布实例");
var removedWindow = core.deletePlotWindow(workspaceProject, secondWindow.id, true);
assert(removedWindow.ok === true && !core.findPlot(workspaceProject, secondWindow.id), "确认后删除图窗");
assert(!secondCanvas.instances.some(function (item) { return item.plotId === secondWindow.id; }), "删除图窗时清掉全部实例");
var legacy = core.parseProject(JSON.stringify({
  projectFormatVersion: "1.0",
  projectName: "legacy-layout",
  datasets: [],
  plots: [{
    id: "old-fig",
    name: "主图 1",
    title: "Figure 1",
    type: "normal",
    layout: { x: 48, y: 64, width: 640, height: 400 },
    zOrder: 2,
    seriesRefs: []
  }, {
    id: "old-detail",
    name: "局部视图 1",
    title: "",
    type: "detail",
    layout: { x: 720, y: 64, width: 360, height: 240 },
    zOrder: 3,
    seriesRefs: [],
    detailSource: {
      sourceFigureId: "old-fig",
      sourceRange: { xMin: 0, xMax: 10, yMin: 0, yMax: 1 },
      yRangeMode: "manual"
    }
  }]
}));
assert(legacy.projectFormatVersion === "1.1", "1.0 工程打开后工作副本为 1.1");
assert(legacy.canvases.length === 1 && legacy.canvases[0].instances.length === 1, "旧布局迁成一个画布实例");
assert(legacy.canvases[0].instances[0].plotId === "old-fig", "实例指向旧主图");
assert(legacy.canvases[0].instances[0].x === 48 && legacy.canvases[0].instances[0].width === 640, "实例保留旧位置和尺寸");
assert(legacy.plots.some(function (plot) { return plot.id === "old-detail" && plot.detailSource.sourceFigureId === "old-fig"; }), "局部视图仍挂在父图窗上");
assert(!legacy.canvases[0].instances.some(function (item) { return item.plotId === "old-detail"; }), "局部视图不进画布实例");
var roundTrip = core.parseProject(core.serializeProject(legacy));
assert(roundTrip.canvases.length === 1 && roundTrip.canvases[0].instances[0].plotId === "old-fig", "图窗与画布可序列化再打开");
assert(roundTrip.plots.length === legacy.plots.length, "保存不复制图窗");
core.moveInstanceLayer(roundTrip.canvases[0], roundTrip.canvases[0].instances[0].id, "top");
assert(roundTrip.canvases[0].instances[0].zOrder === 1, "单实例排序后 zOrder 连续");
var layerCanvas = core.createCanvas(roundTrip, { name: "排序画布" });
var layerPlotA = core.createPlot(roundTrip, { name: "A", title: "A" });
var layerPlotB = core.createPlot(roundTrip, { name: "B", title: "B" });
var instA = core.createInstance(roundTrip, layerCanvas.id, layerPlotA.id);
var instB = core.createInstance(roundTrip, layerCanvas.id, layerPlotB.id);
core.moveInstanceLayer(layerCanvas, instA.id, "top");
assert(instA.zOrder > instB.zOrder, "上移只改变被操作的实例");
var beforeOrder = instA.zOrder;
core.renameWorkspaceItem(roundTrip, "plot", layerPlotA.id, "甲");
assert(layerPlotA.name === "甲" && instA.plotId === layerPlotA.id && instA.zOrder === beforeOrder, "重命名不改变引用和层级");
assert(core.addSeriesTargetId(roundTrip, { type: "canvas" }) === null, "选中画布时没有默认加入目标");
assert(core.addSeriesTargetId(roundTrip, { type: "plot", plotId: layerPlotB.id }) === layerPlotB.id, "选中图窗时加入目标就是该图窗");
var snap = core.captureEditorState(roundTrip);
var snapInstances = layerCanvas.instances.length;
core.removeInstance(roundTrip, layerCanvas.id, instB.id);
core.restoreEditorState(roundTrip, snap);
assert(core.findCanvas(roundTrip, layerCanvas.id).instances.length === snapInstances, "撤销恢复画布实例");
core.assertUniqueWorkspaceIds(roundTrip);
var exported = core.serializeProject(roundTrip);
assert(exported.indexOf(layerPlotA.id) > 0 && exported.indexOf("局部视图") > 0, "工程保存图窗与局部视图");
assert(core.parseProject(exported).canvases.length === roundTrip.canvases.length, "打开后画布数量一致");

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

// v0.6.2: one style entry; data group edits only touch the field that changed.
(function () {
  var p = core.createProject({ projectName: "v062-style" });
  var dsA = core.parseDatasetFromCsv("t,A,B,C\n0,1,2,3\n1,2,3,4\n", { id: "ds-a", name: "A", sourceFilename: "a.csv" });
  var dsB = core.parseDatasetFromCsv("t,D\n0,1\n1,2\n", { id: "ds-b", name: "B", sourceFilename: "b.csv" });
  core.addDataset(p, dsA);
  core.addDataset(p, dsB);
  var plot = core.createPlot(p, { title: "F" });
  var other = core.createPlot(p, { title: "G" });
  var idsA = dsA.series.map(function (s) { return s.id; });
  core.addSeriesToPlot(p, plot, idsA.concat([dsB.series[0].id]));
  core.addSeriesToPlot(p, other, idsA);
  core.updateSeriesStyle(p, plot, { seriesIds: [idsA[0]] }, { color: "#ff0000", lineWidth: 2, lineType: "solid" });
  core.updateSeriesStyle(p, plot, { seriesIds: [idsA[1]] }, { color: "#0000ff", lineWidth: 3, lineType: "dashed" });
  core.updateSeriesStyle(p, plot, { seriesIds: [idsA[2]] }, { color: "#00ff00", lineWidth: 1, lineType: "dotted" });
  var bBefore = core.resolvePlotSeries(p, plot).find(function (i) { return i.series.id === dsB.series[0].id; }).style;
  var otherBefore = JSON.stringify(core.resolvePlotSeries(p, other).map(function (i) { return i.style; }));
  var touched = core.updateSeriesStyle(p, plot, { datasetId: "ds-a" }, { lineWidth: 5 });
  var byId = {};
  core.resolvePlotSeries(p, plot).forEach(function (i) { byId[i.series.id] = i.style; });
  assert(touched.length === 3, "数据簇样式作用于该簇在当前图里的全部系列");
  assert(byId[idsA[0]].lineWidth === 5 && byId[idsA[1]].lineWidth === 5 && byId[idsA[2]].lineWidth === 5, "数据簇线宽立即写入全部系列");
  assert(byId[idsA[0]].color === "#ff0000" && byId[idsA[1]].color === "#0000ff" && byId[idsA[2]].color === "#00ff00", "改线宽不覆盖颜色");
  assert(byId[idsA[0]].lineType === "solid" && byId[idsA[1]].lineType === "dashed" && byId[idsA[2]].lineType === "dotted", "改线宽不覆盖线型");
  var bAfter = byId[dsB.series[0].id];
  assert(bAfter.lineWidth === bBefore.lineWidth && bAfter.color === bBefore.color, "其他数据簇不被串改");
  assert(JSON.stringify(core.resolvePlotSeries(p, other).map(function (i) { return i.style; })) === otherBefore, "引用同一数据的其他图窗不受影响");
  core.updateSeriesStyle(p, plot, { datasetId: "ds-a" }, { color: "#123456" });
  core.resolvePlotSeries(p, plot).forEach(function (i) { byId[i.series.id] = i.style; });
  assert(idsA.every(function (id) { return byId[id].color === "#123456" && byId[id].lineWidth === 5; }), "改颜色不覆盖线宽");
  assert(byId[idsA[1]].lineType === "dashed", "改颜色不覆盖线型");
  core.updateSeriesStyle(p, plot, { datasetId: "ds-a" }, { lineType: "dash-dot" });
  core.resolvePlotSeries(p, plot).forEach(function (i) { byId[i.series.id] = i.style; });
  assert(idsA.every(function (id) { return byId[id].lineType === "dash-dot" && byId[id].color === "#123456"; }), "数据簇线型立即生效");
  core.updateSeriesStyle(p, plot, { seriesIds: [idsA[0], idsA[1]] }, { lineWidth: 2.5 });
  core.resolvePlotSeries(p, plot).forEach(function (i) { byId[i.series.id] = i.style; });
  assert(byId[idsA[0]].lineWidth === 2.5 && byId[idsA[1]].lineWidth === 2.5 && byId[idsA[2]].lineWidth === 5, "选中系列修改不影响未选中系列");
  core.updateSeriesStyle(p, plot, { datasetId: "ds-a" }, { colorMode: "palette", paletteId: "high-contrast" });
  var palette = core.resolvePlotSeries(p, plot).filter(function (i) { return i.series.datasetId === "ds-a"; });
  assert(palette[0].style.color !== palette[1].style.color && palette[0].style.lineWidth === 2.5, "Palette 分配只改颜色");
  var round = core.parseProject(core.serializeProject(p));
  var roundStyles = core.resolvePlotSeries(round, round.plots.find(function (x) { return x.id === plot.id; })).map(function (i) { return i.style; });
  var nowStyles = core.resolvePlotSeries(p, plot).map(function (i) { return i.style; });
  assert(JSON.stringify(roundStyles) === JSON.stringify(nowStyles), "统一入口写入的样式保存重开后不变");
  assert(round.projectFormatVersion === "1.1", "v0.6.2 不升工程格式");
}());

// v0.6.2: viewport geometry, wheel zoom and overlay placement.
(function () {
  var fitZoom = core.fitContentScale(1280, 800, 1000, 700, core.VIEWPORT_GUTTER);
  var fit = core.viewportLayout(1000, 700, 1280, 800, fitZoom);
  assert(fit.maxScrollLeft === 0 && fit.maxScrollTop === 0, "适应窗口后没有多余滚动");
  assert(Math.abs(fit.offsetX * 2 + fit.contentWidth - 1000) < 1e-6 && Math.abs(fit.offsetY * 2 + fit.contentHeight - 700) < 1e-6, "适应窗口在可见工作区水平和垂直居中");
  assert(fit.offsetX >= core.VIEWPORT_GUTTER - 1e-6 || fit.offsetY >= core.VIEWPORT_GUTTER - 1e-6, "适应窗口保留边距");
  var big = core.viewportLayout(1000, 700, 1280, 800, 1.5);
  assert(big.offsetX === core.VIEWPORT_GUTTER && big.maxScrollLeft === big.surfaceWidth - 1000, "放大后左右都留出可滚动边距");
  var leftEdge = core.viewportWorldAt(big, 0, 0, core.VIEWPORT_GUTTER, 0);
  var rightEdge = core.viewportWorldAt(big, big.maxScrollLeft, 0, 1000 - core.VIEWPORT_GUTTER, 0);
  assert(Math.abs(leftEdge.x) < 1e-6 && Math.abs(rightEdge.x - 1280) < 1, "平移可以到达图窗左右两边");
  var anchorWorld = core.viewportWorldAt(big, 300, 120, 420, 260);
  var zoomed = core.viewportLayout(1000, 700, 1280, 800, 2.2);
  var keep = core.viewportScrollFor(zoomed, anchorWorld.x, anchorWorld.y, 420, 260);
  var after = core.viewportWorldAt(zoomed, keep.left, keep.top, 420, 260);
  assert(Math.abs(after.x - anchorWorld.x) < 1e-6 && Math.abs(after.y - anchorWorld.y) < 1e-6, "以光标为中心缩放时光标下的世界坐标不变");
  var center = core.viewportCenterScroll(big);
  var mid = core.viewportWorldAt(big, center.left, center.top, 500, 350);
  assert(Math.abs(mid.x - 640) < 1e-6 && Math.abs(mid.y - 400) < 1e-6, "居中滚动对准图窗中心");
  var pinch = core.wheelZoomFactor(-2, 0, true);
  assert(pinch > 1 && pinch < 1.02, "触控板单次小幅捏合只改变约 1%");
  var notch = core.wheelZoomFactor(100, 0, false);
  assert(notch < 1 && notch > 0.8, "鼠标滚轮一格缩小幅度可控");
  assert(core.wheelZoomFactor(-100000, 0, false) <= Math.exp(0.2) + 1e-9, "异常大的滚轮值被限幅");
  assert(Math.abs(core.wheelZoomFactor(3, 1, false) - core.wheelZoomFactor(48, 0, false)) < 1e-9, "按行滚动的 deltaMode 被归一化");
  var z = 1;
  for (var i = 0; i < 20; i += 1) z *= core.wheelZoomFactor(-1, 0, true);
  for (var j = 0; j < 20; j += 1) z *= core.wheelZoomFactor(1, 0, true);
  assert(Math.abs(z - 1) < 1e-9, "等量来回捏合回到原比例，没有累积误差");
  assert(core.steppedZoom(1.23, 1) === 1.3 && core.steppedZoom(1.23, -1) === 1.2 && core.steppedZoom(1.2, 1) === 1.3, "工具栏缩放按 10% 刻度步进");
  var rightClick = core.computeOverlayPosition({ viewportWidth: 1000, viewportHeight: 700, anchor: { left: 990, top: 690, right: 990, bottom: 690 }, width: 180, height: 260, placement: "point" });
  assert(rightClick.left + 180 <= 992 && rightClick.top + 260 <= 692 && rightClick.left >= 8 && rightClick.top >= 8, "右下角右键菜单完整留在视口内");
  assert(rightClick.left === 810 && rightClick.side === "top", "右下角右键菜单向左上展开");
  var topLeft = core.computeOverlayPosition({ viewportWidth: 1000, viewportHeight: 700, anchor: { left: 4, top: 4, right: 4, bottom: 4 }, width: 180, height: 260, placement: "point" });
  assert(topLeft.left === 8 && topLeft.top === 8 && topLeft.side === "bottom", "左上角右键菜单不出界");
  var dockTipLeft = core.computeOverlayPosition({ viewportWidth: 1000, viewportHeight: 700, anchor: { left: 12, top: 640, right: 58, bottom: 686 }, width: 300, height: 220, placement: "top" });
  assert(dockTipLeft.left === 8 && dockTipLeft.top + 220 <= 640 && dockTipLeft.side === "top", "Dock 最左图标的提示向上并贴回左侧");
  var dockTipRight = core.computeOverlayPosition({ viewportWidth: 1000, viewportHeight: 700, anchor: { left: 950, top: 640, right: 996, bottom: 686 }, width: 300, height: 220, placement: "top" });
  assert(dockTipRight.left + 300 <= 992, "Dock 最右图标的提示不出右边界");
  var tall = core.computeOverlayPosition({ viewportWidth: 1000, viewportHeight: 300, anchor: { left: 100, top: 150, right: 100, bottom: 150 }, width: 180, height: 600, placement: "point" });
  assert(tall.maxHeight === 284 && tall.top === 8, "超高浮层限制高度并内部滚动");
  var below = core.computeOverlayPosition({ viewportWidth: 1000, viewportHeight: 700, anchor: { left: 100, top: 40, right: 140, bottom: 64 }, width: 200, height: 120, placement: "top" });
  assert(below.side === "bottom" && below.top === 70, "上方空间不足时翻到下方");
}());

// v0.6.2: data group overview is computed live and keeps selected / in-plot / owned apart.
(function () {
  var p = core.createProject({ projectName: "v062-overview" });
  var header = ["Time(s)"];
  var rows = [];
  for (var c = 1; c <= 55; c += 1) header.push("T" + c + "(°C)");
  for (var r = 0; r < 2000; r += 1) {
    var row = [r];
    for (var k = 1; k <= 55; k += 1) row.push(20 + k + r / 1000);
    rows.push(row.join(","));
  }
  var ds = core.parseDatasetFromCsv(header.join(",") + "\n" + rows.join("\n") + "\n", { id: "ds-55", name: "全测点温度", sourceFilename: "all.csv" });
  core.addDataset(p, ds);
  var summary = core.summarizeDataset(ds);
  assert(summary.seriesCount === 55 && summary.count === 110000, "数据簇概览统计 55 条系列和 110000 个点");
  assert(summary.uniformPoints && summary.maxPoints === 2000, "数据簇概览判断各系列点数一致");
  assert(summary.sourceFilename === "all.csv", "数据簇概览带来源文件名");
  var plot = core.plotWindows(p)[0] || core.createPlot(p, { title: "F" });
  core.addSeriesToPlot(p, plot, ds.series.slice(0, 3).map(function (s) { return s.id; }));
  var usage = core.datasetUsage(p, ds, [ds.series[10].id, ds.series[11].id, "other::x"], plot.id);
  assert(usage.total === 55 && usage.selected === 2 && usage.inAnyPlot === 3 && usage.inCurrentPlot === 3, "已选、已加入图窗、全部系列分别统计");
  core.addSeriesToPlot(p, plot, [ds.series[20].id]);
  assert(core.datasetUsage(p, ds, [], plot.id).inAnyPlot === 4, "概览统计读当前状态而不是导入时缓存");
}());

// V070-A: formula parser, derived series, DAG, virtual cluster. Alignment engine is V070-B.
(function () {
  function almost(actual, expected, message) {
    assert(Math.abs(actual - expected) < 1e-12, message);
  }
  var ast = core.parseFormulaExpression("B - A");
  assert(core.formulaAliases(ast).join(",") === "B,A", "F-01 提取 B、A 变量");
  almost(core.evaluateFormulaAst(core.parseFormulaExpression("A + B * k"), { A: 10, B: 2, k: 3 }), 16, "F-01 先乘后加");
  almost(core.evaluateFormulaAst(core.parseFormulaExpression("(A + B) * 2"), { A: 1, B: 3 }), 8, "F-01 括号");
  almost(core.evaluateFormulaAst(core.parseFormulaExpression("A ^ 2"), { A: 3 }), 9, "F-01 乘方");
  almost(core.evaluateFormulaAst(core.parseFormulaExpression("abs(-2) + sqrt(16) + ln(e) + log10(100) + exp(0) + min(3, 1, 4) + max(pi, 1)"), {}), 2 + 4 + 1 + 2 + 1 + 1 + Math.PI, "F-02 函数与常数");
  var   threw = false;
  try { core.parseFormulaExpression("process.exit()"); } catch (error) { threw = /不支持的函数|语法|字符/.test(error.message); }
  assert(threw, "F-04 拒绝任意调用，不用 eval");
  threw = false;
  try { core.parseFormulaExpression("A.foo"); } catch (error) { threw = true; }
  assert(threw, "F-04 拒绝成员访问");

  var p = core.createProject({ projectName: "v070a" });
  var csv = "Time(s),A,B,C\n0,10,11,1\n1,12,13,2\n2,14,15,3\n3,16,17,4\n";
  var ds = core.parseDatasetFromCsv(csv, { id: "ds-raw", name: "实验", sourceFilename: "exp.csv" });
  core.addDataset(p, ds);
  var rawA = ds.series[0].y.slice();
  var derived = core.applyFormula(p, {
    name: "BminusA",
    expression: "B - A",
    bindings: { A: "ds-raw::A", B: "ds-raw::B" }
  });
  assert(derived.kind === "computed" && derived.datasetId === core.COMPUTED_DATASET_ID, "派生系列进入计算结果簇");
  assert(core.computedDatasetOf(p) && core.computedDatasetOf(p).name === "计算结果", "虚拟数据簇唯一且名为计算结果");
  assert(derived.y.join(",") === "1,1,1,1" && derived.validCount === 4 && derived.excludedCount === 0, "F-03 同 X 逐点相减");
  assert(ds.series[0].y.join(",") === rawA.join(","), "F-01 计算不改写 Raw y");
  assert(p.formulas.length === 1 && p.formulas[0].bindings.A === "ds-raw::A", "公式绑定稳定 Series ID");

  var scaled = core.applyFormula(p, {
    expression: "A * 0.5",
    bindings: { A: "ds-raw::A" }
  });
  assert(scaled.y[0] === 5 && scaled.displayName.indexOf("Formula_") === 0, "F-01 标量乘法并默认 Formula_00N 名称");

  threw = false;
  try {
    core.applyFormula(p, { expression: "B - A", bindings: { A: "ds-raw::A" } });
  } catch (error) {
    threw = /未绑定/.test(error.message);
  }
  assert(threw, "F-04 缺绑定拒绝提交");

  var other = core.parseDatasetFromCsv("Time(s),T1\n0,11\n2,15\n4,19\n", { id: "ds-other", name: "异频", sourceFilename: "other.csv" });
  core.addDataset(p, other);
  var otherY = other.series[0].y.slice();
  var otherX = other.series[0].x.slice();
  var cross = core.applyFormula(p, {
    expression: "B - A",
    bindings: { A: "ds-raw::A", B: "ds-other::T1" }
  });
  assert(cross.x.join(",") === "0,1,2,3" && cross.y.join(",") === "1,1,1,1", "A-01 公式列按参考 X 插值，不按行号");
  assert(cross.alignmentSummary && cross.alignmentSummary.mode === "linear" && cross.alignmentSummary.referenceSeriesId === "ds-raw::A", "公式列调用统一对齐引擎，默认参考 A");
  assert(other.series[0].x.join(",") === otherX.join(",") && other.series[0].y.join(",") === otherY.join(","), "插值不改写来源数组");
  assert(ds.series[0].y.join(",") === rawA.join(","), "跨来源计算后 Raw 仍未改");

  var level1 = core.applyFormula(p, {
    name: "HalfA",
    expression: "A / 2",
    bindings: { A: "ds-raw::A" }
  });
  var level2 = core.applyFormula(p, {
    name: "HalfTwice",
    expression: "H * 3",
    bindings: { H: level1.id }
  });
  assert(level2.y[0] === 15, "F-06 多级公式可用上游派生系列");
  core.applyFormula(p, {
    id: p.formulas.filter(function (item) { return item.name === "HalfA"; })[0].id,
    name: "HalfA",
    expression: "A / 4",
    bindings: { A: "ds-raw::A" }
  });
  assert(Math.abs(core.findSeries(p, level2.id).y[0] - 7.5) < 1e-12, "F-06 上游提交后拓扑刷新下游");

  threw = false;
  try {
    core.applyFormula(p, {
      id: p.formulas.filter(function (item) { return item.name === "HalfA"; })[0].id,
      name: "HalfA",
      expression: "H + 1",
      bindings: { H: level2.id }
    });
  } catch (error) {
    threw = /循环/.test(error.message);
  }
  assert(threw, "F-05 循环依赖在提交时拒绝");
  assert(core.findSeries(p, level1.id).y[0] === 2.5, "循环拒绝后不改已有结果");

  var json = core.serializeProject(p);
  assert(json.indexOf("\"formulas\"") >= 0 && json.indexOf("ds-computed") >= 0, "工程保存公式与虚拟簇");
  var restored = core.parseProject(json);
  assert(core.findSeries(restored, derived.id).y.join(",") === "1,1,1,1", "工程往返恢复派生 y");
  assert(restored.formulas[0].bindings.B === "ds-raw::B", "工程往返恢复稳定绑定");
  var oldJson = core.serializeProject(core.parseProject(JSON.stringify({
    projectFormatVersion: "1.1",
    projectName: "old",
    datasets: [ds],
    plots: []
  })));
  var oldOpened = core.parseProject(oldJson);
  assert((oldOpened.formulas || []).length === 0 && !core.computedDatasetOf(oldOpened), "旧工程缺 formulas 可打开");

  ds.name = "实验改名";
  assert(core.seriesPath(p, "ds-raw::A").indexOf("实验改名") === 0, "重命名数据簇不改变 seriesId");
  assert(p.formulas[0].bindings.A === "ds-raw::A", "重命名后公式仍引用稳定 ID");

  var before = core.captureEditorState(p);
  var created = core.applyFormula(p, {
    name: "UndoMe",
    expression: "A + 1",
    bindings: { A: "ds-raw::A" }
  });
  assert(core.findSeries(p, created.id), "提交后存在新系列");
  core.restoreEditorState(p, before);
  assert(!core.findSeries(p, created.id), "Undo 撤销公式提交");
  assert(core.findSeries(p, derived.id).y.join(",") === "1,1,1,1", "Undo 不影响未改的派生系列");

  var impactPlot = core.plotWindows(p)[0] || core.createPlot(p, { title: "F" });
  core.addSeriesToPlot(p, impactPlot, [derived.id]);
  var impact = core.formulaImpact(p, ["ds-raw::A"]);
  assert(impact.derived.some(function (item) { return item.id === derived.id; }), "删源影响列出直接派生");
  assert(impact.plots.length >= 1, "删源影响列出引用图窗");
  core.removeDataset(p, "ds-raw");
  var afterDelete = core.findSeries(p, derived.id);
  assert(afterDelete && afterDelete.status === "invalid", "删源后保留派生定义并标 Invalid");
  assert(!Number.isFinite(afterDelete.y[0]), "Invalid 不把旧值当新值");
  assert(afterDelete.formulaId, "Invalid 后仍保留公式 ID，不改绑同名列");
}());

// V070-B: Alignment Engine. Fixed SPEC-070 fixture. atol = 1e-9, rtol = 1e-9. APP 0.7.0, project format 1.1.
(function () {
  assert(core.APP_INFO.version === "0.7.4", "对齐测试时软件版本为 0.7.4");
  assert(core.PROJECT_FORMAT_VERSION === "1.1", "对齐测试不升工程格式");
  var ATOL = 1e-9;
  var RTOL = 1e-9;
  function nearList(actual, expected, message) {
    var problem = "";
    if (!actual || actual.length !== expected.length) problem = "长度";
    else {
      for (var i = 0; i < expected.length; i += 1) {
        if (!Number.isFinite(expected[i])) {
          if (Number.isFinite(actual[i])) problem = "[" + i + "] 应为无效";
        } else {
          var scale = Math.max(1, Math.abs(expected[i]));
          if (!(Math.abs(actual[i] - expected[i]) <= ATOL + RTOL * scale)) {
            problem = "[" + i + "] " + actual[i] + " vs " + expected[i];
          }
        }
        if (problem) break;
      }
    }
    assert(!problem, message + (problem ? " " + problem : ""));
  }
  function throws(fn, pattern, message) {
    var matched = false;
    try { fn(); } catch (error) { matched = pattern.test(error.message); }
    assert(matched, message);
  }
  var fixA = { id: "A", x: [0, 1, 2, 3], y: [10, 12, 14, 16], xIsTime: true, xUnit: "s", yUnit: "°C" };
  var fixB = { id: "B", x: [0, 2, 4], y: [11, 15, 19], xIsTime: true, xUnit: "s", yUnit: "°C" };
  var rawBX = fixB.x.slice();
  var rawBY = fixB.y.slice();
  var linear = core.alignSeries(fixA, [fixB], { mode: "linear" });
  nearList(linear.x, [0, 1, 2, 3], "A-01 参考 X");
  nearList(linear.columns.B, [11, 13, 15, 17], "A-01 B 对齐到 A");
  nearList(linear.columns.B.map(function (value, index) { return value - linear.referenceY[index]; }), [1, 1, 1, 1], "A-01 误差");
  assert(linear.mask.join(",") === "true,true,true,true" && linear.validCount === 4 && linear.excludedCount === 0, "A-01 掩码与排除数");
  assert(fixB.x.join(",") === rawBX.join(",") && fixB.y.join(",") === rawBY.join(","), "A-01 不改原始数组");
  assert(linear.columns.B.join(",") !== "11,15,19", "A-01 不是按行号截取 B");
  var again = core.alignSeries(fixA, [fixB], { mode: "linear" });
  assert(JSON.stringify(again.columns.B) === JSON.stringify(linear.columns.B) && again.mask.join(",") === linear.mask.join(","), "同一输入与配置得到同一对齐结果");
  throws(function () { core.alignSeries(fixA, [fixB], { delta: 9.081 }); }, /无重叠/, "Δt=+9.081 s 向后平移后无重叠");
  throws(function () { core.alignSeries(fixA, [fixB], { delta: -9.081 }); }, /无重叠/, "Δt=-9.081 s 向前平移后无重叠");
  var plus = core.alignSeries(fixA, [fixB], { delta: 1 });
  nearList(plus.columns.B, [NaN, 11, 13, 15], "Δt=+1 使 B 的 (0,11) 落到参考 t=1");
  assert(plus.mask.join(",") === "false,true,true,true" && plus.excludedByReason.outside === 1, "Δt=+1 起点在重叠外，不外推");
  var minus = core.alignSeries(fixA, [fixB], { delta: -1 });
  nearList(minus.columns.B, [13, 15, 17, 19], "Δt=-1 使 B 提前，参考终点取到原 B 的 19");
  var exact = core.alignSeries(fixA, [fixB], { mode: "exact" });
  nearList(exact.columns.B, [11, NaN, 15, NaN], "A-10 Exact 只保留 0 与 2");
  assert(exact.validCount === 2 && exact.excludedCount === 2 && exact.excludedByReason.exact === 2, "A-10 Exact 排除数量");
  throws(function () { core.alignSeries(fixA, [fixB], { mode: "nearest" }); }, /容差/, "Nearest 缺少容差时拒绝");
  var nearestTight = core.alignSeries(fixA, [fixB], { mode: "nearest", tolerance: 0.4 });
  nearList(nearestTight.columns.B, [11, NaN, 15, NaN], "A-10 Nearest 容差 0.4 不吃到相邻 1 s");
  var nearest = core.alignSeries(fixA, [fixB], { mode: "nearest", tolerance: 1 });
  nearList(nearest.columns.B, [11, 11, 15, 15], "A-10 Nearest 容差 1，等距取较早时间戳");
  var windowed = core.alignSeries(fixA, [fixB], { rangeMin: 1, rangeMax: 2 });
  nearList(windowed.x, [1, 2], "A-09 指定窗口 X");
  nearList(windowed.columns.B, [13, 15], "A-09 指定窗口内插值");
  assert(windowed.validCount === 2 && windowed.excludedCount === 2 && windowed.excludedByReason.range === 2, "A-09 窗口外计入排除");
  throws(function () { core.alignSeries(fixA, [{ id: "B", x: [0, 0, 2], y: [11, 12, 15], xIsTime: true, xUnit: "s", yUnit: "°C" }], {}); }, /重复时间戳/, "重复时间戳报错");
  throws(function () { core.alignSeries(fixA, [{ id: "B", x: [0, 2, 1], y: [11, 15, 19], xIsTime: true, xUnit: "s", yUnit: "°C" }], {}); }, /严格递增/, "非递增时间轴报错");
  throws(function () { core.alignSeries({ id: "A", x: [0, NaN, 2], y: [10, 12, 14], xIsTime: true, xUnit: "s", yUnit: "°C" }, [fixB], {}); }, /NaN 或 Inf/, "参考时间轴 NaN 报错");
  var nanY = core.alignSeries(fixA, [{ id: "B", x: [0, 2, 4], y: [11, NaN, 19], xIsTime: true, xUnit: "s", yUnit: "°C" }], {});
  nearList(nanY.columns.B, [11, NaN, NaN, NaN], "NaN Y 不参与插值");
  assert(nanY.validCount === 1 && nanY.excludedByReason.nan === 3, "NaN Y 计入排除");
  var infY = core.alignSeries(fixA, [{ id: "B", x: [0, 2, 4], y: [11, Infinity, 19], xIsTime: true, xUnit: "s", yUnit: "°C" }], {});
  assert(infY.validCount === 1 && infY.excludedByReason.nan === 3, "Inf Y 与 NaN 一样排除");
  var gappy = core.alignSeries(
    { id: "A", x: [0, 1, 2, 3, 6, 10], y: [0, 1, 2, 3, 6, 10], xIsTime: true, xUnit: "s", yUnit: "" },
    [{ id: "B", x: [0, 1, 2, 10], y: [0, 10, 20, 100], xIsTime: true, xUnit: "s", yUnit: "" }],
    {}
  );
  assert(gappy.provenance.maxGap === 5 && gappy.provenance.maxGapSource === "median-x5", "缺口阈值固定为正常间隔中位数×5");
  nearList(gappy.columns.B, [0, 10, 20, NaN, NaN, 100], "A-04 默认不跨 8 s 缺口");
  assert(gappy.excludedByReason.gap === 2, "A-04 缺口计入排除");
  var bridged = core.alignSeries(
    { id: "A", x: [0, 1, 2, 3, 6, 10], y: [0, 1, 2, 3, 6, 10], xIsTime: true, xUnit: "s", yUnit: "" },
    [{ id: "B", x: [0, 1, 2, 10], y: [0, 10, 20, 100], xIsTime: true, xUnit: "s", yUnit: "" }],
    { maxGap: 8 }
  );
  nearList(bridged.columns.B, [0, 10, 20, 30, 60, 100], "显式 maxGap 允许跨过同一缺口");
  throws(function () {
    core.alignSeries(
      { id: "A", x: [3, 4, 5, 6], y: [3, 4, 5, 6], xIsTime: true, xUnit: "s", yUnit: "" },
      [{ id: "B", x: [0, 1, 2, 10], y: [0, 10, 20, 100], xIsTime: true, xUnit: "s", yUnit: "" }],
      {}
    );
  }, /数据缺口/, "全部落在缺口内时报错");
  var millis = core.alignSeries(fixA, [{ id: "B", x: [0, 2000, 4000], y: [11, 15, 19], xIsTime: true, xUnit: "ms", yUnit: "°C" }], {});
  nearList(millis.columns.B, [11, 13, 15, 17], "A-07 ms 换到参考秒");
  var minutes = core.alignSeries(fixA, [{ id: "B", x: [0, 2 / 60, 4 / 60], y: [11, 15, 19], xIsTime: true, xUnit: "min", yUnit: "°C" }], {});
  nearList(minutes.columns.B, [11, 13, 15, 17], "A-07 min 换到参考秒");
  var hours = core.alignSeries(fixA, [{ id: "B", x: [0, 2 / 3600, 4 / 3600], y: [11, 15, 19], xIsTime: true, xUnit: "h", yUnit: "°C" }], {});
  nearList(hours.columns.B, [11, 13, 15, 17], "A-07 h 换到参考秒");
  var kelvin = core.alignSeries(fixA, [{ id: "B", x: [0, 2, 4], y: [11 + 273.15, 15 + 273.15, 19 + 273.15], xIsTime: true, xUnit: "s", yUnit: "K" }], {});
  nearList(kelvin.columns.B, [11, 13, 15, 17], "A-08 K 换到参考 °C");
  throws(function () {
    core.alignSeries(fixA, [{ id: "B", x: [0, 2, 4], y: [11, 15, 19], xIsTime: true, xUnit: "s", yUnit: "V" }], {});
  }, /单位不匹配/, "°C 与 V 不暗中计算");
  throws(function () { core.normalizeAlignmentConfig({ mode: "spline" }); }, /未知对齐模式/, "未知对齐模式报错");
  throws(function () { core.normalizeAlignmentConfig({ rangeMin: 3, rangeMax: 1 }); }, /X 范围无效/, "颠倒的 X 范围报错");

  var project = core.createProject({ projectName: "v070b-align" });
  var left = core.parseDatasetFromCsv("Time(s),A(°C)\n0,10\n1,12\n2,14\n3,16\n", { id: "ds-a", name: "参考", sourceFilename: "a.csv" });
  var right = core.parseDatasetFromCsv("Time(ms),B(K)\n0,284.15\n2000,288.15\n4000,292.15\n", { id: "ds-b", name: "预测", sourceFilename: "b.csv" });
  core.addDataset(project, left);
  core.addDataset(project, right);
  var derived = core.applyFormula(project, {
    name: "BminusA",
    expression: "B - A",
    bindings: { A: "ds-a::A", B: "ds-b::B" },
    alignment: { mode: "linear", referenceSeriesId: "ds-a::A", delta: 0, maxGap: 5 }
  });
  nearList(derived.y, [1, 1, 1, 1], "公式列同时换算 ms 与 K");
  assert(derived.validCount === 4 && derived.excludedCount === 0, "公式列带回有效与排除数量");
  assert(project.projectFormatVersion === "1.1", "工程格式保持 1.1");
  var saved = core.serializeProject(project);
  var restored = core.parseProject(saved);
  var stored = restored.formulas[0].alignment;
  assert(stored.mode === "linear" && stored.referenceSeriesId === "ds-a::A" && stored.delta === 0 && stored.maxGap === 5 && stored.tolerance == null, "工程往返保存对齐参数");
  nearList(core.findSeries(restored, derived.id).y, [1, 1, 1, 1], "工程往返恢复对齐后的 y");
  var shifted = core.createProject({ projectName: "v070b-delta" });
  core.addDataset(shifted, core.parseDatasetFromCsv("Time(s),A\n0,0\n10,10\n20,20\n30,30\n", { id: "ds-shift-a", name: "A", sourceFilename: "sa.csv" }));
  core.addDataset(shifted, core.parseDatasetFromCsv("Time(s),B\n0,1\n10,11\n20,21\n", { id: "ds-shift-b", name: "B", sourceFilename: "sb.csv" }));
  core.applyFormula(shifted, {
    name: "Shifted",
    expression: "B - A",
    bindings: { A: "ds-shift-a::A", B: "ds-shift-b::B" },
    alignment: { mode: "nearest", referenceSeriesId: "ds-shift-a::A", delta: 9.081, tolerance: 1, rangeMin: 10, rangeMax: 20 }
  });
  var shiftedBack = core.parseProject(core.serializeProject(shifted));
  var shiftAlign = shiftedBack.formulas[0].alignment;
  assert(shiftAlign.mode === "nearest" && shiftAlign.delta === 9.081 && shiftAlign.tolerance === 1 && shiftAlign.rangeMin === 10 && shiftAlign.rangeMax === 20, "Δt=9.081、容差和窗口可持久化");
  var legacy = core.parseProject(JSON.stringify({
    projectFormatVersion: "1.1",
    projectName: "legacy-align",
    datasets: [left],
    formulas: [{ id: "f-old", name: "Old", expression: "A", bindings: { A: "ds-a::A" }, alignment: { mode: "exact", delta: 0 } }],
    plots: []
  }));
  assert(legacy.formulas[0].alignment.mode === "exact" && legacy.formulas[0].alignment.tolerance == null, "旧公式缺省容差仍可打开，并保留 exact");
  var plot = core.plotWindows(project)[0] || core.createPlot(project, { title: "范围" });
  core.addSeriesToPlot(project, plot, ["ds-a::A"]);
  var once = core.alignmentRangeFromPlot(project, plot);
  plot.xAxis.mode = "manual";
  plot.xAxis.min = 5;
  plot.xAxis.max = 6;
  assert(once.rangeMin !== 5, "已填入的范围不跟随随后的缩放");
  var filled = core.alignmentRangeFromPlot(project, plot);
  assert(filled.rangeMin === 5 && filled.rangeMax === 6, "再次读取才拿到当前可视 X");
}());

// V070-C: MAE/RMSE/MaxAE/Bias + AnalysisRecord. Shares alignSeries. APP 0.7.0, project format 1.1.
(function () {
  assert(core.APP_INFO.version === "0.7.4", "误差测试时软件版本为 0.7.4");
  assert(core.PROJECT_FORMAT_VERSION === "1.1", "误差测试不升工程格式");
  var ATOL = 1e-9;
  var RTOL = 1e-9;
  function near(actual, expected, message) {
    var scale = Math.max(1, Math.abs(expected));
    assert(Math.abs(actual - expected) <= ATOL + RTOL * scale, message + " " + actual + " vs " + expected);
  }
  var p = core.createProject({ projectName: "v070c" });
  core.addDataset(p, core.parseDatasetFromCsv("Time(s),A(°C)\n0,10\n1,12\n2,14\n3,16\n", { id: "ds-a", name: "参考", sourceFilename: "a.csv" }));
  core.addDataset(p, core.parseDatasetFromCsv("Time(s),B(°C)\n0,11\n2,15\n4,19\n", { id: "ds-b", name: "预测", sourceFilename: "b.csv" }));
  var aligned = core.alignSeries(
    { id: "ds-a::A", x: [0, 1, 2, 3], y: [10, 12, 14, 16], xIsTime: true, xUnit: "s", yUnit: "°C" },
    [{ id: "ds-b::B", x: [0, 2, 4], y: [11, 15, 19], xIsTime: true, xUnit: "s", yUnit: "°C" }],
    { mode: "linear" }
  );
  var record = core.applyAnalysis(p, {
    name: "A01",
    referenceSeriesId: "ds-a::A",
    predictionSeriesId: "ds-b::B",
    alignment: { mode: "linear" }
  });
  near(record.metrics.mae, 1, "SPEC-070 MAE");
  near(record.metrics.rmse, 1, "SPEC-070 RMSE");
  near(record.metrics.maxAe, 1, "SPEC-070 MaxAE");
  near(record.metrics.bias, 1, "SPEC-070 Bias");
  assert(record.metrics.n === 4 && record.validCount === 4, "SPEC-070 N=4");
  near(record.metrics.mae, aligned.columns["ds-b::B"].reduce(function (s, y, i) { return s + Math.abs(y - aligned.referenceY[i]); }, 0) / 4, "指标与 alignSeries 掩码一致");
  var evaluated = core.evaluateAnalysis(p, record);
  assert(evaluated.points.map(function (item) { return item.prediction; }).join(",") === aligned.columns["ds-b::B"].join(","), "分析引擎不另写对齐");

  var q = core.createProject({ projectName: "v070c-e" });
  core.addDataset(q, core.parseDatasetFromCsv("Time(s),R\n0,0\n1,0\n2,0\n", { id: "ds-r", name: "R", sourceFilename: "r.csv" }));
  core.addDataset(q, core.parseDatasetFromCsv("Time(s),P\n0,1\n1,-2\n2,3\n", { id: "ds-p", name: "P", sourceFilename: "p.csv" }));
  var varying = core.applyAnalysis(q, {
    name: "Vary",
    referenceSeriesId: "ds-r::R",
    predictionSeriesId: "ds-p::P",
    alignment: { mode: "linear" }
  });
  near(varying.metrics.mae, 2, "e=[1,-2,3] MAE");
  near(varying.metrics.rmse, Math.sqrt(14 / 3), "e=[1,-2,3] RMSE");
  near(varying.metrics.maxAe, 3, "e=[1,-2,3] MaxAE");
  near(varying.metrics.bias, 2 / 3, "e=[1,-2,3] Bias");
  assert(varying.metrics.n === 3, "非恒定误差 N=3");

  var emptyThrew = false;
  try {
    core.applyAnalysis(p, {
      referenceSeriesId: "ds-a::A",
      predictionSeriesId: "ds-b::B",
      alignment: { mode: "linear", rangeMin: 10, rangeMax: 12 }
    });
  } catch (error) {
    emptyThrew = /没有有效样本|指定范围内没有参考时间点|无重叠/.test(error.message);
  }
  assert(emptyThrew, "空区间不能输出伪零指标");

  core.ensureWorkspace(p);
  var instanceCount = (p.canvases[0].instances || []).length;
  var firstCurve = core.ensureAnalysisErrorCurve(p, record);
  assert(firstCurve.series.role === "analysis-error", "误差曲线是派生 Series");
  assert(firstCurve.plot && firstCurve.plot.type !== "detail", "误差曲线有独立图窗");
  assert((p.canvases[0].instances || []).length === instanceCount, "误差图窗不自动进入画布");
  var secondCurve = core.ensureAnalysisErrorCurve(p, record);
  assert(secondCurve.reused && secondCurve.series.id === firstCurve.series.id && secondCurve.plot.id === firstCurve.plot.id, "重复生成复用同一 Series 与图窗");
  assert((p.datasets.filter(function (d) { return d.kind === "computed"; })[0].series.filter(function (s) { return s.role === "analysis-error"; }).length) === 1, "不会产生重复误差 Series");

  var summary = core.analysisSummaryCsv(p, record);
  assert(summary.indexOf("MAE") >= 0 && summary.indexOf(JSON.stringify(record.metrics.mae)) >= 0, "摘要 CSV 用计算精度");
  var pointwise = core.analysisPointwiseCsv(p, record);
  assert(pointwise.indexOf("X,Reference,Aligned Prediction,Signed Error,Absolute Error") === 0, "逐点 CSV 表头");
  assert(pointwise.indexOf("11") >= 0 && pointwise.indexOf("1") >= 0, "逐点 CSV 含对齐预测和误差");
  var copied = core.analysisCopyText(p, record);
  assert(copied.indexOf("MAE") >= 0 && copied.indexOf("\t") >= 0, "复制文本保留指标语义");

  record.status = "dirty";
  var dirtyThrew = false;
  try { core.analysisSummaryCsv(p, record); } catch (error) { dirtyThrew = /过期/.test(error.message); }
  assert(dirtyThrew, "Dirty 不能当有效结果导出");
  record = core.recomputeAnalysis(p, record);
  assert(record.status === "ready" && record.metrics.n === 4, "重算恢复 Ready");

  core.removeDataset(p, "ds-b");
  var afterDelete = core.findAnalysis(p, record.id);
  assert(afterDelete.status === "invalid", "删预测源后分析失效");

  var saved = core.serializeProject(q);
  assert(saved.indexOf("\"analyses\"") >= 0, "工程保存分析记录");
  var restored = core.parseProject(saved);
  assert(restored.analyses.length === 1, "工程往返恢复分析记录");
  near(restored.analyses[0].metrics.rmse, Math.sqrt(14 / 3), "工程往返恢复 RMSE");
  var oldOpened = core.parseProject(JSON.stringify({
    projectFormatVersion: "1.1",
    projectName: "old-c",
    datasets: [],
    plots: []
  }));
  assert((oldOpened.analyses || []).length === 0, "旧工程缺 analyses 可打开");
}());

(function testQuickFormula() {
  var p = core.createProject({ projectName: "quick" });
  core.addDataset(p, core.parseDatasetFromCsv("Time(s),A(°C),B(°C)\n0,1,4\n1,2,5\n2,3,6\n", { id: "ds-q", name: "q", sourceFilename: "q.csv" }));
  assert(core.quickFormulaExpression("sum", 2) === "sum(A, B)", "SUM 走现有 sum 函数");
  assert(core.quickFormulaExpression("average", 2) === "average(A, B)", "AVERAGE 走现有 average 函数");
  assert(core.quickFormulaExpression("max", 3) === "max(A, B, C)", "MAX 复用现有 max");
  assert(core.quickFormulaExpression("min", 2) === "min(A, B)", "MIN 复用现有 min");

  var sums = core.applyQuickFormula(p, { mode: "stat", op: "sum", seriesIds: ["ds-q::A", "ds-q::B"] });
  assert(sums.length === 2 && sums[0].kind === "stat" && sums[0].metrics.value === 6 && sums[0].metrics.n === 3, "SUM 序列统计写 Results 标量");
  assert(sums[1].metrics.value === 15, "第二条独立 SUM");
  assert(!(p.datasets.filter(function (d) { return d.kind === "computed"; })[0]), "序列统计不创建常数曲线");

  var avg = core.applySeriesStat(p, { seriesId: "ds-q::A", op: "average" });
  assert(avg.metrics.value === 2, "AVERAGE 序列统计");
  var mx = core.applySeriesStat(p, { seriesId: "ds-q::A", op: "max" });
  assert(mx.metrics.value === 3, "MAX 序列统计");
  var mn = core.applySeriesStat(p, { seriesId: "ds-q::A", op: "min" });
  assert(mn.metrics.value === 1, "MIN 序列统计");

  var windowed = core.applySeriesStat(p, { seriesId: "ds-q::A", op: "sum", alignment: { rangeMin: 1, rangeMax: 2 } });
  assert(windowed.metrics.value === 5 && windowed.metrics.n === 2, "时间窗序列统计");

  var emptyThrew = false;
  try {
    core.applySeriesStat(p, { seriesId: "ds-q::A", op: "sum", alignment: { rangeMin: 10, rangeMax: 12 } });
  } catch (error) {
    emptyThrew = /没有有效样本/.test(error.message);
  }
  assert(emptyThrew, "空窗口序列统计不输出伪零");

  var one = core.createProject({ projectName: "one" });
  core.addDataset(one, core.parseDatasetFromCsv("Time(s),A\n0,1\n5,9\n", { id: "ds-one", name: "one.csv" }));
  one.datasets[0].series[0].x = [5];
  one.datasets[0].series[0].y = [9];
  var single = core.applySeriesStat(one, { seriesId: "ds-one::A", op: "sum" });
  assert(single.metrics.value === 9 && single.metrics.n === 1, "单点序列统计");

  var derived = core.applyQuickFormula(p, { mode: "pointwise", op: "sum", seriesIds: ["ds-q::A", "ds-q::B"] });
  assert(derived.kind === "computed" && derived.y[0] === 5 && derived.y[1] === 7 && derived.y[2] === 9, "逐点 SUM 写入计算结果簇");
  assert(p.datasets.some(function (d) { return d.kind === "computed" && d.series.some(function (s) { return s.id === derived.id; }); }), "派生 Series 在计算结果簇");
  assert(p.datasets.filter(function (d) { return d.id === "ds-q"; })[0].series.length === 2, "原始 Series 不被覆盖");

  var avgSeries = core.applyQuickFormula(p, { mode: "pointwise", op: "average", seriesIds: ["ds-q::A", "ds-q::B"] });
  assert(avgSeries.y[0] === 2.5, "逐点 AVERAGE");
  var maxSeries = core.applyQuickFormula(p, { mode: "pointwise", op: "max", seriesIds: ["ds-q::A", "ds-q::B"] });
  assert(maxSeries.y[2] === 6, "逐点 MAX");

  var pointwiseOneThrew = false;
  try { core.applyQuickFormula(p, { mode: "pointwise", op: "sum", seriesIds: ["ds-q::A"] }); }
  catch (error) { pointwiseOneThrew = /至少需要两条/.test(error.message); }
  assert(pointwiseOneThrew, "逐点计算拒绝单系列");

  var other = core.createProject({ projectName: "cross" });
  core.addDataset(other, core.parseDatasetFromCsv("Time(s),A(°C)\n0,1\n1,2\n2,3\n", { id: "ds-a", name: "A", sourceFilename: "a.csv" }));
  core.addDataset(other, core.parseDatasetFromCsv("Time(s),B(°C)\n0,10\n2,30\n", { id: "ds-b", name: "B", sourceFilename: "b.csv" }));
  var cross = core.applyQuickFormula(other, { mode: "pointwise", op: "sum", seriesIds: ["ds-a::A", "ds-b::B"] });
  assert(cross.y.length === 3 && cross.y[1] === 22, "跨 Dataset 逐点 SUM 走现有对齐");

  var unitP = core.createProject({ projectName: "unit" });
  core.addDataset(unitP, core.parseDatasetFromCsv("Time(s),A(°C)\n0,1\n1,2\n", { id: "ds-u1", name: "u1" }));
  core.addDataset(unitP, core.parseDatasetFromCsv("Time(s),B(V)\n0,1\n1,2\n", { id: "ds-u2", name: "u2" }));
  var unitThrew = false;
  try { core.applyQuickFormula(unitP, { mode: "pointwise", op: "sum", seriesIds: ["ds-u1::A", "ds-u2::B"] }); }
  catch (error) { unitThrew = /单位不匹配/.test(error.message); }
  assert(unitThrew, "逐点计算检查物理单位");

  var none = core.createProject({ projectName: "none" });
  core.addDataset(none, core.parseDatasetFromCsv("Time(s),A\n0,1\n1,2\n", { id: "ds-n1", name: "n1" }));
  core.addDataset(none, core.parseDatasetFromCsv("Time(s),B\n10,1\n11,2\n", { id: "ds-n2", name: "n2" }));
  var overlapThrew = false;
  try { core.applyQuickFormula(none, { mode: "pointwise", op: "sum", seriesIds: ["ds-n1::A", "ds-n2::B"] }); }
  catch (error) { overlapThrew = /重叠|区间/.test(error.message); }
  assert(overlapThrew, "无共同时间区间不能静默外插");

  var dirty = core.applySeriesStat(p, { seriesId: "ds-q::A", op: "sum" });
  p.datasets[0].series[0].y = [10, 20, 30];
  core.auditAnalyses(p);
  var after = core.findAnalysis(p, dirty.id);
  assert(after.status === "dirty", "源数据变化后统计记录变 dirty");
  var recomputed = core.recomputeAnalysis(p, after);
  assert(recomputed.metrics.value === 60 && recomputed.status === "ready", "统计记录重算");

  var saved = core.serializeProject(p);
  var restored = core.parseProject(saved);
  assert(restored.analyses.some(function (item) { return item.kind === "stat" && item.op === "sum"; }), "工程往返恢复序列统计");
  assert((restored.formulas || []).length >= 1, "工程往返恢复快捷公式定义");
}());

(function testQuickFormulaManySeries() {
  function almost(actual, expected, message) {
    assert(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-9, message);
  }
  function makeCounted(project, id, count, points, yAt) {
    var headers = ["Time(s)"];
    var i;
    var p;
    for (i = 0; i < count; i += 1) headers.push("T" + i + "(°C)");
    var lines = [headers.join(",")];
    var seedPoints = Math.min(points, 2);
    for (p = 0; p < seedPoints; p += 1) {
      var row = [String(p)];
      for (i = 0; i < count; i += 1) row.push(String(yAt(i, p)));
      lines.push(row.join(","));
    }
    var ds = core.parseDatasetFromCsv(lines.join("\n") + "\n", {
      id: id,
      name: id,
      sourceFilename: id + ".csv"
    });
    if (points > seedPoints) {
      for (i = 0; i < count; i += 1) {
        var xs = new Array(points);
        var ys = new Array(points);
        for (p = 0; p < points; p += 1) {
          xs[p] = p;
          ys[p] = yAt(i, p);
        }
        ds.series[i].x = xs;
        ds.series[i].y = ys;
      }
    }
    core.addDataset(project, ds);
    return ds;
  }
  function seriesIds(ds) {
    return ds.series.map(function (item) { return item.id; });
  }

  assert(core.excelColumnAlias(0) === "A", "第 1 个别名 A");
  assert(core.excelColumnAlias(25) === "Z", "第 26 个别名 Z");
  assert(core.excelColumnAlias(26) === "AA", "26→27 跨界 AA");
  assert(core.excelColumnAlias(27) === "AB", "第 28 个别名 AB");
  assert(core.excelColumnAlias(51) === "AZ", "第 52 个别名 AZ");
  assert(core.excelColumnAlias(52) === "BA", "52→53 跨界 BA");
  assert(core.excelColumnAlias(56) === "BE", "第 57 个别名 BE");

  var counts = [1, 2, 26, 27, 52, 53, 57, 100, 200];
  counts.forEach(function (count) {
    var aliases = core.quickFormulaAliases(count);
    assert(aliases.length === count, count + " 条别名数量完整，不截断");
    assert(new Set(aliases).size === count, count + " 条别名唯一");
    assert(aliases.indexOf("[") < 0 && aliases.every(function (alias) { return /^[A-Z]+$/.test(alias); }), count + " 条别名只含 A-Z");
    var expr = core.quickFormulaExpression(count === 1 ? "sum" : "average", count);
    var ast = core.parseFormulaExpression(expr);
    assert(core.formulaAliases(ast).length === count, count + " 条公式解析出全部变量");
    ["sum", "average", "max", "min"].forEach(function (op) {
      core.parseFormulaExpression(core.quickFormulaExpression(op, count));
    });
  });
  assert(core.quickFormulaAliases(27)[25] === "Z" && core.quickFormulaAliases(27)[26] === "AA", "26→27 跨界变量名");
  assert(core.quickFormulaAliases(53)[51] === "AZ" && core.quickFormulaAliases(53)[52] === "BA", "52→53 跨界变量名");
  assert(core.parseFormulaExpression("A + B").type === "binary", "旧单字母加法仍可解析");
  assert(core.parseFormulaExpression("AA + AB").type === "binary", "多字符变量可解析");
  almost(core.evaluateFormulaAst(core.parseFormulaExpression("average(A, B, C)"), { A: 1, B: 3, C: 5 }), 3, "average 函数数值");
  almost(core.evaluateFormulaAst(core.parseFormulaExpression("sum(A, B, C)"), { A: 1, B: 3, C: 5 }), 9, "sum 函数数值");
  almost(core.evaluateFormulaAst(core.parseFormulaExpression("average(A, B, C)"), { A: 1, B: NaN, C: 5 }, "ignore"), 3, "忽略缺失按有效条数平均，不把缺失当 0");
  assert(!Number.isFinite(core.evaluateFormulaAst(core.parseFormulaExpression("average(A, B, C)"), { A: 1, B: NaN, C: 5 }, "strict")), "严格模式缺一即 NaN");

  var reserved = core.quickFormulaAliases(200);
  assert(reserved.indexOf("max") < 0 && reserved.indexOf("sum") < 0 && reserved.indexOf("average") < 0 && reserved.indexOf("min") < 0, "变量名不与函数名冲突");

  var missP = core.createProject({ projectName: "miss" });
  var missDs = makeCounted(missP, "ds-miss", 3, 2, function (s, t) {
    return (s + 1) * 10 + t;
  });
  missDs.series[2].y[0] = NaN;
  var missIds = seriesIds(missDs);
  var strictAvg = core.applyQuickFormula(missP, { mode: "pointwise", op: "average", seriesIds: missIds, missingValueMode: "strict" });
  assert(!Number.isFinite(strictAvg.y[0]), "严格 AVERAGE 缺一时刻为 NaN");
  almost(strictAvg.y[1], 21, "严格 AVERAGE 完整时刻仍除以 N");
  var ignoreAvg = core.applyQuickFormula(missP, { mode: "pointwise", op: "average", seriesIds: missIds, missingValueMode: "ignore", name: "T_mean" });
  almost(ignoreAvg.y[0], 15, "忽略缺失 AVERAGE=(10+20)/2，不是 /3");
  almost(ignoreAvg.y[1], 21, "忽略缺失完整时刻仍除以 N");
  assert(ignoreAvg.displayName === "T_mean", "自定义输出名称");
  var ignoreSum = core.applyQuickFormula(missP, { mode: "pointwise", op: "sum", seriesIds: missIds, missingValueMode: "ignore" });
  almost(ignoreSum.y[0], 30, "忽略缺失 SUM 不加 0");
  var ignoreMax = core.applyQuickFormula(missP, { mode: "pointwise", op: "max", seriesIds: missIds, missingValueMode: "ignore" });
  almost(ignoreMax.y[0], 20, "忽略缺失 MAX 跳过 NaN");
  var ignoreMin = core.applyQuickFormula(missP, { mode: "pointwise", op: "min", seriesIds: missIds, missingValueMode: "ignore" });
  almost(ignoreMin.y[0], 10, "忽略缺失 MIN 跳过 NaN");
  assert((missP.analyses || []).length === 0, "逐点计算不写 Results");

  counts.filter(function (count) { return count >= 2; }).forEach(function (count) {
    var p = core.createProject({ projectName: "n" + count });
    var ds = makeCounted(p, "ds-" + count, count, 3, function (s, t) { return s + t; });
    var ids = seriesIds(ds);
    var draft = core.quickFormulaDraft(p, { op: "average", seriesIds: ids });
    assert(Object.keys(draft.bindings).length === count, count + " 条绑定完整");
    ids.forEach(function (id) {
      var used = Object.keys(draft.bindings).some(function (alias) { return draft.bindings[alias] === id; });
      assert(used, count + " 条绑定使用稳定 Series ID " + id);
    });
    ["sum", "average", "max", "min"].forEach(function (op) {
      var series = core.applyQuickFormula(p, { mode: "pointwise", op: op, seriesIds: ids });
      var t;
      for (t = 0; t < 3; t += 1) {
        var values = [];
        var s;
        for (s = 0; s < count; s += 1) values.push(s + t);
        var expected;
        if (op === "sum") expected = values.reduce(function (acc, value) { return acc + value; }, 0);
        else if (op === "average") expected = expectedSum(values) / count;
        else if (op === "max") expected = count - 1 + t;
        else expected = t;
        almost(series.y[t], expected, count + " 条逐点 " + op + " t=" + t);
      }
      assert(series.kind === "computed", count + " 条 " + op + " 写入计算结果簇");
    });
  });

  function expectedSum(values) {
    return values.reduce(function (acc, value) { return acc + value; }, 0);
  }

  var big = core.createProject({ projectName: "scale57" });
  var nPoints = 60319;
  var nSeries = 57;
  var bigDs = makeCounted(big, "ds-57", nSeries, nPoints, function (s, t) { return t * 0.001 + s; });
  var bigIds = seriesIds(bigDs);
  assert(bigIds.length === 57 && bigDs.series[0].x.length === nPoints, "57×60319 输入规模");
  var mean = core.applyQuickFormula(big, {
    mode: "pointwise",
    op: "average",
    seriesIds: bigIds,
    name: "T_mean"
  });
  assert(mean.y.length === nPoints && mean.validCount === nPoints, "57 路平均输出 60319 点");
  almost(mean.y[0], 28, "独立基准 t=0 平均为 28");
  almost(mean.y[100], 100 * 0.001 + 28, "独立基准 t=100");
  almost(mean.y[nPoints - 1], (nPoints - 1) * 0.001 + 28, "独立基准末点");
  var mismatch = 0;
  var i;
  for (i = 0; i < nPoints; i += 1) {
    if (Math.abs(mean.y[i] - (i * 0.001 + 28)) > 1e-9) mismatch += 1;
  }
  assert(mismatch === 0, "60319 点均与独立基准一致");
  assert(big.formulas[0].bindings.BE === "ds-57::T56", "BE 绑定第 57 条稳定 ID");

  var histP = core.createProject({ projectName: "hist" });
  var histDs = makeCounted(histP, "ds-h", 27, 3, function (s, t) { return s + t; });
  var histIds = seriesIds(histDs);
  var before = core.captureEditorState(histP);
  var named = core.applyQuickFormula(histP, {
    mode: "pointwise",
    op: "average",
    seriesIds: histIds,
    name: "T_mean_27"
  });
  assert(named.displayName === "T_mean_27" && named.y.length === 3, "27 路平均写入");
  almost(named.y[0], 13, "27 路 t=0 平均 13");
  core.applyQuickFormula(histP, { mode: "pointwise", op: "sum", seriesIds: histIds.slice(0, 2) });
  assert(core.computedDatasetOf(histP).series.length === 2, "再算一条 SUM");
  core.restoreEditorState(histP, before);
  assert(!core.computedDatasetOf(histP) || core.computedDatasetOf(histP).series.length === 0, "Undo 恢复快捷公式前状态");

  core.applyQuickFormula(histP, {
    mode: "pointwise",
    op: "average",
    seriesIds: histIds,
    name: "T_mean_27",
    missingValueMode: "ignore"
  });
  var saved = core.serializeProject(histP);
  var opened = core.parseProject(saved);
  var openedMean = opened.datasets.reduce(function (found, dataset) {
    return found || (dataset.series || []).filter(function (item) { return item.displayName === "T_mean_27"; })[0] || null;
  }, null);
  assert(openedMean && openedMean.y.length === 3, "工程重开恢复派生 Series");
  almost(openedMean.y[1], 14, "工程重开数值一致");
  assert(opened.formulas[0].missingValueMode === "ignore", "工程往返保留缺失值策略");
  assert(opened.formulas[0].bindings.AA === "ds-h::T26", "AA 绑定第 27 条稳定 ID");

  var manual = core.applyFormula(opened, {
    name: "BminusA",
    expression: "B - A",
    bindings: { A: "ds-h::T0", B: "ds-h::T1" }
  });
  almost(manual.y[0], 1, "手动单字母公式不退化");
}());

(function testSegmentsAndCsvExport() {
  var p = core.createProject({ projectName: "segments" });
  var source = core.parseDatasetFromCsv(readFixture("TESTDATA_steps.csv"), {
    id: "ds-steps",
    name: "steps.csv",
    sourceFilename: "steps.csv",
    sourceEncoding: "utf-8"
  });
  core.addDataset(p, source);
  var originalSeriesCount = source.series.length;
  var originalX = source.series[0].x.slice();
  assert(source.headers.length === 8, "切段夹具保留全部表头");
  assert(source.warnings.some(function (item) { return /工步名称|日历|状态|备注/.test(item); }), "非数值列被跳过但仍留在 headers/rawCsv");

  var runs = core.detectStepRuns(source);
  assert(runs.length === 3, "同名不连续工步分成独立区间");
  assert(runs[0].name === "静置" && runs[0].rowCount === 2, "第一段静置 2 行");
  assert(runs[1].name === "放电 CC" && runs[1].index === "2" && runs[1].rowCount === 3, "放电 CC 3 行");
  assert(runs[2].name === "静置" && runs[2].index === "3", "第二段静置单独识别");

  var discharge = core.createSegment(p, {
    id: "seg-cc",
    name: "放电 CC",
    sourceDatasetId: "ds-steps",
    rangeType: "step",
    rangeDefinition: { stepIndex: "2" }
  });
  assert(discharge.kind === "segment" && discharge.sourceDatasetId === "ds-steps", "Segment 不是计算结果簇");
  assert(p.datasets.some(function (item) { return item.kind === "computed"; }) === false, "切段不创建计算结果簇");
  assert(core.rowRangeCount(discharge.selectedRowRanges) === 3, "工步 2 命中 3 行");
  assert(discharge.series[0].x.join(",") === "2,3,4", "片段系列只含切段区间");
  assert(source.series[0].x.join(",") === originalX.join(","), "原始 Dataset 不被修改");
  assert(source.series.length === originalSeriesCount, "原始系列数量不变");

  var byTime = core.createSegment(p, {
    id: "seg-time",
    name: "时间 2-4",
    sourceDatasetId: "ds-steps",
    rangeType: "time",
    rangeDefinition: { column: "时间(s)", start: 2, end: 4 }
  });
  assert(core.rowRangeCount(byTime.selectedRowRanges) === 3, "时间区间含端点且不插值");

  var byRow = core.createSegment(p, {
    id: "seg-row",
    name: "行 3-5",
    sourceDatasetId: "ds-steps",
    rangeType: "row",
    rangeDefinition: { startRow: 3, endRow: 5 }
  });
  assert(core.rowRangeCount(byRow.selectedRowRanges) === 3, "1 基行号含端点");

  var split = core.splitDatasetBySteps(p, "ds-steps");
  assert(split.length === 3, "一键按工步拆出全部连续区间");

  var plot = core.createPlot(p, { name: "片段图" });
  core.addSeriesToPlot(p, plot, [discharge.series[0].id]);
  assert(plot.seriesRefs[0].seriesId.indexOf("seg-cc::") === 0, "片段可作为独立数据源绘图");

  var voltage = discharge.series.find(function (item) { return item.name === "电压"; });
  assert(voltage && voltage.y.join(",") === "3.6,3.5,3.4", "放电片段保留电压列");
  var derived = core.applyFormula(p, {
    name: "SegDiff",
    expression: "A * 2",
    bindings: { A: voltage.id }
  });
  assert(derived.y.join(",") === "7.2,7,6.8", "片段可作为公式输入");

  core.updateSegment(p, "seg-cc", {
    rangeType: "row",
    rangeDefinition: { startRow: 3, endRow: 4 }
  });
  var afterUpdate = core.findSeries(p, voltage.id);
  assert(afterUpdate.x.join(",") === "2,3", "修改切段边界刷新片段数据");
  var recomputed = core.findSeries(p, derived.id);
  assert(recomputed.y.join(",") === "7.2,7", "片段边界变化后刷新派生结果");

  var exported = core.exportSegmentCsv(p, "seg-time", { encoding: "utf-8", relativeTime: true });
  assert(exported.headers[0] === "序号" && exported.headers.indexOf("工步名称") >= 0, "导出保留原始非数值列");
  assert(exported.headers.indexOf("相对时间(s)") >= 0, "可选相对时间列");
  assert(exported.rowCount === 3, "导出行数等于片段行数");
  assert(exported.text.indexOf("放电 CC") >= 0, "导出保留工步名称原文");
  assert(/3\.60/.test(exported.text), "导出不改写原始数值文本");
  var quoted = core.serializeCsvRows(["备注"], [["含,逗号"], ["line\nbreak"], ['say "hi"']]);
  assert(quoted.indexOf('"含,逗号"') >= 0, "CSV 正确转义逗号");
  assert(quoted.indexOf('"line\nbreak"') >= 0 || quoted.indexOf('"line\r\nbreak"') >= 0, "CSV 正确转义换行");
  assert(quoted.indexOf('"say ""hi"""') >= 0, "CSV 正确转义引号");
  var reimported = core.parseDatasetFromCsv(exported.text, { id: "ds-re", name: "re.csv" });
  assert(reimported.headers.indexOf("工步名称") >= 0, "再导入仍能看到中文表头");
  var reVoltage = reimported.series.find(function (item) { return item.name === "电压"; });
  assert(reVoltage && reVoltage.y[0] === 3.6, "再导入数值一致");

  var gbkBytes = core.encodeCsvText("工步名称,电压(V)\n放电 CC,3.6\n", "gb18030");
  var decoded = new TextDecoder("gb18030").decode(gbkBytes);
  assert(decoded.indexOf("放电 CC") >= 0 && decoded.indexOf("\uFFFD") < 0, "GB18030 导出可逆");
  var bom = core.encodeCsvText("a,b\n1,2\n", "utf-8-bom");
  assert(bom[0] === 0xEF && bom[1] === 0xBB && bom[2] === 0xBF, "UTF-8 BOM 导出");

  var zip = core.exportSegmentsZip(p, ["seg-time", "seg-row"], { encoding: "utf-8" });
  assert(zip.bytes[0] === 0x50 && zip.bytes[1] === 0x4B, "ZIP 本地实现不以 CDN 为依赖");
  assert(zip.files.length === 2, "多片段各自输出 CSV");

  var json = core.serializeProject(p);
  var opened = core.parseProject(json);
  var restoredSeg = core.findDataset(opened, "seg-cc");
  assert(restoredSeg && restoredSeg.kind === "segment" && restoredSeg.sourceDatasetId === "ds-steps", "工程打开恢复片段");
  assert(core.findSeries(opened, derived.id).y.join(",") === "7.2,7", "工程打开恢复片段公式依赖");

  var impact = core.datasetDeleteImpact(p, "ds-steps");
  assert(impact.segments.length >= 3, "删除源数据前检查片段依赖");
  var computedStill = core.findSeries(p, derived.id);
  assert(computedStill.status !== "invalid", "未删除前不得把派生标失效");
  core.removeDataset(p, "ds-steps");
  assert(!core.findDataset(p, "seg-cc"), "删除源数据时移除其片段");
  var afterDelete = core.findSeries(p, derived.id);
  assert(!afterDelete || afterDelete.status === "invalid", "删除后派生不得静默保持有效");
}());

(function testSameSourceMultipleSegmentsCreateAndSaveAs() {
  var p = core.createProject({ projectName: "multi-seg" });
  var source = core.parseDatasetFromCsv(readFixture("TESTDATA_steps.csv"), {
    id: "ds-multi",
    name: "steps.csv",
    sourceFilename: "steps.csv"
  });
  core.addDataset(p, source);
  var originalX = source.series[0].x.slice();
  var originalY = source.series[0].y.slice();
  var ids = {};
  var i;
  for (i = 1; i <= 5; i += 1) {
    var seg = core.createSegment(p, {
      name: "段 " + i,
      sourceDatasetId: "ds-multi",
      rangeType: "row",
      rangeDefinition: { startRow: i, endRow: i + 3 }
    });
    assert(seg.kind === "segment", "第 " + i + " 段是 segment");
    assert(seg.id.indexOf("seg") === 0, "自动分配 segmentId");
    assert(!ids[seg.id], "segmentId 唯一");
    ids[seg.id] = true;
  }
  var listed = core.listSegments(p, "ds-multi");
  assert(listed.length === 5, "同源五个独立片段");
  assert(listed[0].selectedRowRanges[0].start === 0 && listed[4].selectedRowRanges[0].start === 4, "区间允许重叠且各自独立");
  assert(source.series[0].x.join(",") === originalX.join(","), "连续创建不改原始 X");
  assert(source.series[0].y.join(",") === originalY.join(","), "连续创建不改原始 Y");

  var second = listed[1];
  var third = listed[2];
  var secondRows = core.rowRangeCount(second.selectedRowRanges);
  var thirdRows = core.rowRangeCount(third.selectedRowRanges);
  var thirdX = third.series[0].x.slice();
  core.updateSegment(p, second.id, {
    rangeType: "row",
    rangeDefinition: { startRow: 1, endRow: 2 }
  });
  var secondAfter = core.findDataset(p, second.id);
  var thirdAfter = core.findDataset(p, third.id);
  assert(core.rowRangeCount(secondAfter.selectedRowRanges) === 2, "编辑第 2 段只改自己的行范围");
  assert(core.rowRangeCount(thirdAfter.selectedRowRanges) === thirdRows, "编辑第 2 段不改第 3 段行数");
  assert(thirdAfter.series[0].x.join(",") === thirdX.join(","), "编辑第 2 段不改第 3 段数据");
  assert(secondRows !== 2, "第 2 段编辑前后范围确实变化");

  var savedAs = core.createSegment(p, {
    name: "段 6",
    sourceDatasetId: "ds-multi",
    rangeType: thirdAfter.rangeType,
    rangeDefinition: thirdAfter.rangeDefinition,
    columnSelection: thirdAfter.columnSelection
  });
  assert(savedAs.id !== thirdAfter.id, "另存为分配新的 segmentId");
  assert(core.findDataset(p, thirdAfter.id), "另存为后旧段仍在");
  assert(core.listSegments(p, "ds-multi").length === 6, "另存为后共 6 段");
  assert(core.rowRangeCount(savedAs.selectedRowRanges) === core.rowRangeCount(thirdAfter.selectedRowRanges), "另存为复制当前区间");
  assert(savedAs.series[0].x.join(",") === thirdAfter.series[0].x.join(","), "另存为数据与旧段一致");

  var exported = core.exportSegmentCsv(p, savedAs.id, { encoding: "utf-8" });
  assert(exported.headers[0] === "序号", "另存片段导出保留原始列");
  assert(exported.rowCount === core.rowRangeCount(savedAs.selectedRowRanges), "导出行数等于片段行数");

  var json = core.serializeProject(p);
  var opened = core.parseProject(json);
  assert(core.listSegments(opened, "ds-multi").length === 6, "工程重开保留全部片段");
  var snap = core.captureEditorState(p);
  core.removeDataset(p, savedAs.id);
  assert(core.listSegments(p, "ds-multi").length === 5, "删除另存段后剩 5");
  core.restoreEditorState(p, snap);
  assert(core.listSegments(p, "ds-multi").length === 6, "Undo 恢复另存段");
}());

(function testSegmentExportTargetStaysOnSavedSegment() {
  var p = core.createProject({ projectName: "export-target" });
  var source = core.parseDatasetFromCsv(readFixture("TESTDATA_steps.csv"), {
    id: "ds-src",
    name: "25_2C放电",
    sourceFilename: "25_2C放电.csv"
  });
  core.addDataset(p, source);
  var other = core.parseDatasetFromCsv(readFixture("TESTDATA_steps.csv"), {
    id: "ds-other",
    name: "25_2C放电",
    sourceFilename: "other.csv"
  });
  core.addDataset(p, other);
  var none = core.segmentPanelExportState(p, "");
  assert(none.enabled === false && none.reason === "none" && none.segmentId === "", "没有已保存目标时不导出草稿");
  var raw = core.segmentPanelExportState(p, "ds-src");
  assert(raw.enabled === false && raw.segmentId === "", "同名原始 Dataset 不能当作导出目标");
  var created = core.createSegment(p, {
    name: "25_2C放电",
    sourceDatasetId: "ds-src",
    rangeType: "row",
    rangeDefinition: { startRow: 1, endRow: 2 }
  });
  var sameName = core.createSegment(p, {
    name: "25_2C放电",
    sourceDatasetId: "ds-other",
    rangeType: "row",
    rangeDefinition: { startRow: 3, endRow: 4 }
  });
  var state = core.segmentPanelExportState(p, created.id);
  assert(state.enabled === true && state.segmentId === created.id && state.name === "25_2C放电", "创建后导出目标是刚保存的片段");
  assert(state.segmentId !== sameName.id, "同名片段按 id 区分来源");
  assert(core.rowRangeCount(core.findDataset(p, state.segmentId).selectedRowRanges) === 2, "导出目标保持 A 的已保存区间");
  var exported = core.exportSegmentCsv(p, state.segmentId, {
    encoding: "utf-8-bom",
    filename: "25_2C放电",
    keepOriginalTime: true,
    relativeTime: true,
    timeColumn: "时间(s)",
    columnSelection: { mode: "all", columns: [] }
  });
  assert(exported.filename === "25_2C放电.csv", "导出名补 .csv，不改片段名");
  assert(exported.bytes[0] === 0xEF && exported.bytes[1] === 0xBB && exported.bytes[2] === 0xBF, "底部选项 UTF-8 BOM");
  assert(exported.headers[0] === "序号" && exported.headers.indexOf("工步名称") >= 0, "全部列保留中文表头和列序");
  var timeAt = exported.headers.indexOf("时间(s)");
  var relAt = exported.headers.indexOf("相对时间(s)");
  assert(timeAt >= 0 && relAt === timeAt + 1, "原始时间保留，相对时间紧随其后");
  var first = exported.text.split("\r\n")[1].split(",");
  assert(first[timeAt] === "0" && first[relAt] === "0", "绝对时间未改，相对时间从 0 开始");
  var picked = core.exportSegmentCsv(p, state.segmentId, {
    encoding: "gb18030",
    columnSelection: { mode: "selected", columns: ["时间(s)", "电压(V)"] },
    keepOriginalTime: true,
    relativeTime: false
  });
  assert(picked.headers.join(",") === "时间(s),电压(V)", "指定列只导出选中列");
  assert(new TextDecoder("gb18030").decode(picked.bytes).indexOf("电压") >= 0, "GB18030 中文表头可逆");
  var zip = core.exportSegmentsZip(p, [created.id, sameName.id], {
    encoding: "utf-8-bom",
    keepOriginalTime: true,
    relativeTime: true,
    timeColumn: "时间(s)"
  });
  assert(zip.files.length === 2 && zip.bytes[0] === 0x50 && zip.bytes[1] === 0x4B, "ZIP 只含两个已保存片段");
  var orphan = core.createSegment(p, {
    name: "孤儿",
    sourceDatasetId: "ds-src",
    rangeType: "row",
    rangeDefinition: { startRow: 1, endRow: 1 }
  });
  orphan.sourceDatasetId = "missing-source";
  var stale = core.segmentPanelExportState(p, orphan.id);
  assert(stale.enabled === false && stale.reason === "missing", "来源失效的片段不能导出");
  core.removeDataset(p, created.id);
  var gone = core.segmentPanelExportState(p, created.id);
  assert(gone.enabled === false && gone.reason === "missing", "删除后的目标不能导出");
  var page = fs.readFileSync(path.join(__dirname, "..", "temperature_trajectory_visualizer.html"), "utf8");
  assert(page.indexOf("exportBtn.disabled = !editing") < 0, "底部 CSV 不再因创建模式禁用");
  assert(page.indexOf("segmentPanelExportState") >= 0, "底部导出复用已保存目标判定");
  assert(page.indexOf("exportOneSegment") >= 0, "底部与左侧共用 exportOneSegment");
  assert(page.indexOf("tv-column-list") >= 0, "指定列使用独立列选择器列表");
  assert(page.indexOf("tv-series-list") >= 0 && page.indexOf("buildSegmentColumnPicker") >= 0, "列选择器不再复用 series-row 四列网格");
  assert(page.indexOf("applyColumnPickerSelection") >= 0, "列选择器接入快捷多选");
  assert(page.indexOf("已选择 ") >= 0 && page.indexOf("全选") >= 0 && page.indexOf("清空") >= 0, "列选择器提供全选/清空与计数");
}());

(function testColumnPickerSelectionAndExportOrder() {
  var headers = [];
  var i;
  for (i = 0; i < 177; i += 1) {
    if (i === 0) headers.push("时间(s)");
    else if (i === 1) headers.push("日期时间");
    else if (i === 2) headers.push("工步名称");
    else if (i === 36) headers.push("充电电流(A)");
    else if (i === 50) headers.push("温度");
    else if (i === 120) headers.push("温度");
    else headers.push("列" + i);
  }
  assert(headers.length === 177, "夹具表头 177 列");
  var selected = core.applyColumnPickerSelection([], 177, { type: "toggle", index: 0 });
  selected = core.applyColumnPickerSelection(selected, 177, { type: "toggle", index: 2 });
  selected = core.applyColumnPickerSelection(selected, 177, { type: "toggle", index: 6 });
  assert(selected.join(",") === "0,2,6", "离散点选互不串改");
  selected = core.applyColumnPickerSelection(selected, 177, {
    type: "range",
    from: 6,
    to: 14,
    checked: true
  });
  assert(selected.join(",") === "0,2,6,7,8,9,10,11,12,13,14", "Shift 连选 7–15 对应 index 6–14");
  selected = core.applyColumnPickerSelection(selected, 177, { type: "selectAll" });
  assert(selected.length === 177 && selected[0] === 0 && selected[176] === 176, "Cmd/Ctrl+A 等价全选");
  selected = core.applyColumnPickerSelection(selected, 177, { type: "clear" });
  assert(selected.length === 0, "清空后无勾选");

  var selection = core.columnSelectionFromIndexes(headers, [36, 2, 120, 50], "selected");
  assert(selection.indexes.join(",") === "2,36,50,120", "索引按源列序排序");
  assert(selection.columns.join(",") === "工步名称,充电电流(A),温度,温度", "重名列分别保留");
  assert(core.resolveSelectedColumnIndexes(headers, {
    mode: "selected",
    columns: ["充电电流(A)", "工步名称"]
  }).join(",") === "2,36", "旧版仅列名选择也按源序");

  var lines = [headers.join(",")];
  function buildRow(timeValue) {
    return headers.map(function (_name, index) {
      if (index === 0) return String(timeValue);
      if (index === 1) return "2026-11-03";
      if (index === 2) return "放电 CC";
      return String(index);
    }).join(",");
  }
  lines.push(buildRow(1000), buildRow(1001));
  var source = core.parseDatasetFromCsv(lines.join("\n"), {
    id: "ds-177",
    name: "177cols",
    sourceFilename: "177cols.csv"
  });
  var project = core.createProject({ projectName: "column-picker" });
  core.addDataset(project, source);
  var segment = core.createSegment(project, {
    name: "段A",
    sourceDatasetId: source.id,
    rangeType: "row",
    rangeDefinition: { startRow: 1, endRow: 1 }
  });
  var exported = core.exportSegmentCsv(project, segment.id, {
    encoding: "utf-8",
    columnSelection: selection,
    keepOriginalTime: true,
    relativeTime: false
  });
  assert(exported.headers.join(",") === "工步名称,充电电流(A),温度,温度", "指定列导出保持源序与重名");
  assert(exported.text.split("\r\n")[1] === "放电 CC,36,50,120", "按索引取值，重名列不串列");
  var legacy = core.exportSegmentCsv(project, segment.id, {
    encoding: "utf-8",
    columnSelection: { mode: "selected", columns: ["温度", "工步名称"] },
    keepOriginalTime: true,
    relativeTime: false
  });
  assert(legacy.headers.join(",") === "工步名称,温度,温度", "旧版列名导出按源序展开全部同名列");
  var emptyFailed = false;
  try {
    core.exportSegmentCsv(project, segment.id, {
      columnSelection: { mode: "selected", columns: [], indexes: [] }
    });
  } catch (error) {
    emptyFailed = /至少选择一列/.test(String(error && error.message || error));
  }
  assert(emptyFailed, "0 列指定导出必须失败");

  var otherHeaders = ["时间(s)", "温度", "电压(V)", "充电电流(A)"];
  var cross = core.resolveSelectedColumnIndexes(otherHeaders, {
    mode: "selected",
    indexes: [2, 36, 50, 120],
    columns: ["工步名称", "充电电流(A)", "温度", "温度"]
  });
  assert(cross.join(",") === "1,3", "跨源索引失效时按列名回退到导出源");
  var sameLayout = core.resolveSelectedColumnIndexes(headers, selection);
  assert(sameLayout.join(",") === "2,36,50,120", "同源布局仍优先使用索引保住重名列");

  var page = fs.readFileSync(path.join(__dirname, "..", "temperature_trajectory_visualizer.html"), "utf8");
  assert(page.indexOf("grid-template-columns: auto minmax(0, 1fr)") >= 0, "列名行使用全宽文本轨道");
  assert(page.indexOf("tv-series-row") >= 0 && page.indexOf("buildSegmentColumnPicker") >= 0, "series-row 仍留给系列列表");
  assert(page.indexOf("segmentColumnAnchor = null") >= 0, "切换片段/数据源时重置 Shift 锚点");
  assert(page.indexOf("导出表头名称") >= 0 && page.indexOf("使用数据系列重命名后的列名") >= 0, "导出面板可选表头名称");
  assert(page.indexOf("tv-column-alias") >= 0, "指定列在别名模式下给出原始列名到导出列名");
  var specFn = page.slice(page.indexOf("function segmentSpecFromDraft"), page.indexOf("function commitSegmentFromDraft"));
  assert(specFn.indexOf("headerMode") < 0, "表头模式留在导出面板，不写入片段规格");
}());

(function testCsvExportHeaderAlias() {
  function body(text) {
    return String(text || "").split("\r\n").slice(1).join("\r\n");
  }
  function bytesEqual(left, right) {
    if (!left || !right || left.length !== right.length) return false;
    var i;
    for (i = 0; i < left.length; i += 1) if (left[i] !== right[i]) return false;
    return true;
  }
  function zipEntries(bytes) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var out = [];
    var offset = 0;
    while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
      var nameLen = view.getUint16(offset + 26, true);
      var extraLen = view.getUint16(offset + 28, true);
      var size = view.getUint32(offset + 18, true);
      var nameStart = offset + 30;
      var dataStart = nameStart + nameLen + extraLen;
      out.push({
        name: new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLen)),
        text: new TextDecoder().decode(bytes.slice(dataStart, dataStart + size))
      });
      offset = dataStart + size;
    }
    return out;
  }
  var csv = [
    "时间(s),T45(℃),进水口温度(℃),温度,工步名称,温度",
    "10,1,2,3,放电 CC,4",
    "12,1.5,2.5,3.5,静置,4.5",
    ""
  ].join("\n");
  var source = core.parseDatasetFromCsv(csv, { id: "ds-alias", name: "别名源", sourceFilename: "alias.csv" });
  var project = core.createProject({ projectName: "header-alias" });
  core.addDataset(project, source);
  var originalHeaders = source.headers.slice();
  var t45 = source.series.filter(function (series) { return series.originalHeader === "T45(℃)"; })[0];
  var inlet = source.series.filter(function (series) { return series.originalHeader === "进水口温度(℃)"; })[0];
  var temps = source.series.filter(function (series) { return series.originalHeader === "温度"; });
  assert(t45 && t45.displayName === "T45" && t45.name === "T45", "T45 导入显示名");
  assert(inlet && inlet.displayName === "进水口温度", "进水口温度导入显示名");
  assert(temps.length === 2 && temps[0].displayName === "温度" && temps[1].displayName === "温度", "同名温度列按序各成一条系列");
  var yBefore = t45.y.slice();
  inlet.displayName = "冷却液入口温度";
  inlet.label = inlet.displayName;
  temps[0].displayName = "温度甲";
  temps[0].label = temps[0].displayName;
  temps[1].displayName = "温度甲";
  temps[1].label = temps[1].displayName;
  var segmentA = core.createSegment(project, {
    name: "段A",
    sourceDatasetId: source.id,
    rangeType: "row",
    rangeDefinition: { startRow: 1, endRow: 2 }
  });
  var segmentB = core.createSegment(project, {
    name: "段B",
    sourceDatasetId: source.id,
    rangeType: "row",
    rangeDefinition: { startRow: 1, endRow: 1 }
  });
  function options(mode, extra) {
    var next = {
      encoding: extra && extra.encoding || "utf-8",
      headerMode: mode,
      keepOriginalTime: !extra || extra.keepOriginalTime !== false,
      relativeTime: !!(extra && extra.relativeTime),
      timeColumn: "时间(s)",
      columnSelection: (extra && extra.columnSelection) || { mode: "all" }
    };
    return next;
  }
  var originalExport = core.exportSegmentCsv(project, segmentA.id, options("original"));
  var aliasExport = core.exportSegmentCsv(project, segmentA.id, options("alias"));
  assert(originalExport.headers.join("|") === originalHeaders.join("|"), "默认原始列名逐字保持");
  assert(aliasExport.headers.join("|") === "时间(s)|T45(℃)|冷却液入口温度|温度甲|工步名称|温度甲", "只替换已重命名的列");
  assert(aliasExport.renamedCount === 3, "已使用重命名 3 列");
  assert(aliasExport.duplicateHeaders.join("|") === "温度甲", "同名别名保留并提示");
  assert(body(originalExport.text) === body(aliasExport.text), "两种表头的数据行相同");
  assert(source.headers.join("|") === originalHeaders.join("|"), "导出不改源表头");
  assert(t45.originalHeader === "T45(℃)" && t45.y.join(",") === yBefore.join(","), "导出不改系列身份和数值");
  t45.displayName = "模组中央温度";
  t45.label = t45.displayName;
  var inherited = core.exportSegmentCsv(project, segmentA.id, options("alias"));
  assert(inherited.headers[1] === "模组中央温度", "片段未单独改名时回退到源系列别名");
  var segmentInlet = segmentA.series.filter(function (series) { return series.originalHeader === "进水口温度(℃)"; })[0];
  segmentInlet.displayName = "片段入口";
  segmentInlet.label = segmentInlet.displayName;
  var segmentWins = core.exportSegmentCsv(project, segmentA.id, options("alias"));
  assert(segmentWins.headers[2] === "片段入口", "片段自己的别名优先于源系列");
  segmentInlet.displayName = " ";
  segmentInlet.label = " ";
  var blank = core.exportSegmentCsv(project, segmentA.id, options("alias"));
  assert(blank.headers[2] === "进水口温度(℃)", "空白别名回退原始列名");
  var selected = core.exportSegmentCsv(project, segmentA.id, options("alias", {
    columnSelection: core.columnSelectionFromIndexes(source.headers, [5, 1, 4], "selected")
  }));
  assert(selected.headers.join("|") === "模组中央温度|工步名称|温度甲", "指定列按源序使用别名");
  assert(body(selected.text).split("\r\n")[0] === "1,放电 CC,4", "指定列仍按列索引取值");
  var segmentTemp = segmentA.series.filter(function (series) { return series.originalHeader === "温度"; })[0];
  segmentTemp.displayName = "相对时间(s)";
  segmentTemp.label = segmentTemp.displayName;
  var relative = core.exportSegmentCsv(project, segmentA.id, options("alias", { relativeTime: true }));
  assert(relative.headers.join("|") === "时间(s)|相对时间(s)|模组中央温度|进水口温度(℃)|相对时间(s)|工步名称|温度甲", "生成的相对时间列不被别名覆盖");
  assert(relative.duplicateHeaders.indexOf("相对时间(s)") >= 0, "别名撞上相对时间列时提示重复");
  assert(body(relative.text).split("\r\n")[0] === "10,0,1,2,3,放电 CC,4", "相对时间从 0 起，原温度单元格不变");
  segmentTemp.displayName = '模组,"中央"\n温度';
  segmentTemp.label = segmentTemp.displayName;
  var quoted = core.exportSegmentCsv(project, segmentA.id, options("alias", { encoding: "utf-8-bom" }));
  assert(quoted.bytes[0] === 0xEF && quoted.bytes[1] === 0xBB && quoted.bytes[2] === 0xBF, "别名导出保留 UTF-8 BOM");
  var quotedText = new TextDecoder("utf-8").decode(quoted.bytes);
  var quotedBack = core.parseDatasetFromCsv(quotedText, { id: "re-utf", name: "回导" });
  assert(quotedBack.headers[3] === '模组,"中央"\n温度', "含逗号引号换行的中文别名可回导");
  assert(quotedBack.series.some(function (series) { return series.originalHeader === '模组,"中央"\n温度' && series.y[0] === 3; }), "回导数值仍在原列");
  var gb = core.exportSegmentCsv(project, segmentA.id, options("alias", { encoding: "gb18030" }));
  var gbText = new TextDecoder("gb18030").decode(gb.bytes);
  var gbBack = core.parseDatasetFromCsv(gbText, { id: "re-gb", name: "回导gb" });
  assert(gbBack.headers[1] === "模组中央温度" && gbBack.headers[3].indexOf("中央") >= 0, "GB18030 中文别名无乱码");
  var plot = core.createPlot(project, { title: "图" });
  core.addSeriesToPlot(project, plot, [t45.id]);
  plot.seriesRefs[0].legendName = "画布图例";
  var legendIgnored = core.exportSegmentCsv(project, segmentA.id, options("alias"));
  assert(legendIgnored.headers.indexOf("画布图例") < 0, "图窗图例名不改变 CSV 表头");
  var again = core.exportSegmentCsv(project, segmentA.id, options("alias", { encoding: "utf-8-bom" }));
  assert(bytesEqual(quoted.bytes, again.bytes), "同一片段重复导出字节一致");
  var saved = core.serializeProject(project);
  assert(saved.indexOf("headerMode") < 0, "表头模式不进入工程");
  assert(saved.indexOf('"projectFormatVersion": "1.1"') >= 0, "工程格式仍是 1.1");
  var reopened = core.parseProject(saved);
  assert(reopened.projectFormatVersion === "1.1", "重开后仍是 1.1");
  var reopenedSource = core.findDataset(reopened, source.id);
  assert(reopenedSource.headers.join("|") === originalHeaders.join("|"), "重开后源列名仍在");
  assert(core.findSeries(reopened, t45.id).displayName === "模组中央温度", "重开后系列别名仍在");
  var reopenedExport = core.exportSegmentCsv(reopened, segmentA.id, options("alias"));
  assert(reopenedExport.headers[1] === "模组中央温度", "重开后仍可导出别名表头");
  var originalAfter = core.exportSegmentCsv(reopened, segmentA.id, options("original"));
  assert(originalAfter.headers.join("|") === originalHeaders.join("|"), "重开后仍可切回原始列名");
  var zip = core.exportSegmentsZip(project, [segmentA.id, segmentB.id], options("alias"));
  var entries = zipEntries(zip.bytes);
  assert(entries.length === 2, "ZIP 含两段");
  entries.forEach(function (entry) {
    var id = entry.name.indexOf("段B") >= 0 ? segmentB.id : segmentA.id;
    var single = core.exportSegmentCsv(project, id, options("alias"));
    assert(entry.text === single.text, "ZIP 内 CSV 与单段导出字节对应的文本一致");
  });
  assert(core.APP_INFO.version === "0.7.4" && core.PROJECT_FORMAT_VERSION === "1.1", "不升软件版本和工程格式");
}());

(function testCustomXColumnMapping() {
  function dsFrom(text, id, name) {
    return core.parseDatasetFromCsv(text, { id: id, name: name, sourceFilename: name + ".csv" });
  }
  var csvA = [
    "时间(s),相对时间(s),电压(V)",
    "5000,0,3.7",
    "6000,1000,3.6",
    "7000,2000,3.5",
    "8000,3000,3.4",
    ""
  ].join("\n");
  var csvB = [
    "时间(s),相对时间(s),电压(V)",
    "20000,0,3.1",
    "21000,1000,3.0",
    "22000,2000,2.9",
    "23000,3000,2.8",
    ""
  ].join("\n");
  var p = core.createProject({ projectName: "xmap" });
  var dsA = dsFrom(csvA, "ds-a", "segA");
  var dsB = dsFrom(csvB, "ds-b", "segB");
  core.addDataset(p, dsA);
  core.addDataset(p, dsB);
  assert(dsA.xHeader === "时间(s)", "双时间列自动识别绝对时间");
  assert(dsB.xHeader === "时间(s)", "B 文件同样自动识别绝对时间");
  assert(core.suggestRelativeXColumn(p, dsA) === "相对时间(s)", "建议相对时间列");
  var voltA = dsA.series.find(function (item) { return item.name === "电压"; });
  var voltB = dsB.series.find(function (item) { return item.name === "电压"; });
  assert(voltA.x.join(",") === "5000,6000,7000,8000", "导入后 series.x 仍是绝对时间");
  assert(voltA.y.join(",") === "3.7,3.6,3.5,3.4", "Y 原值");

  var plot = core.createPlot(p, { name: "叠加" });
  core.addSeriesToPlot(p, plot, [voltA.id, voltB.id]);
  var autoXs = core.seriesXForPlot(p, plot, voltA, dsA);
  assert(autoXs.join(",") === "5000,6000,7000,8000", "未改映射时绘图 X 仍是绝对时间");

  core.setDatasetDefaultXColumn(p, "ds-a", "相对时间(s)");
  core.setDatasetDefaultXColumn(p, "ds-b", "相对时间(s)");
  var relA = core.seriesXForPlot(p, plot, voltA, dsA);
  var relB = core.seriesXForPlot(p, plot, voltB, dsB);
  assert(relA.join(",") === "0,1000,2000,3000", "A 改用相对时间后从 0 开始");
  assert(relB.join(",") === "0,1000,2000,3000", "B 改用相对时间后从 0 开始");
  assert(voltA.y.join(",") === "3.7,3.6,3.5,3.4", "改 X 不改 Y");
  assert(voltA.x.join(",") === "5000,6000,7000,8000", "改绘图 X 不改 series.x");
  var extents = core.plotExtents(p, plot);
  assert(extents.x[0] <= 0 && extents.x[1] >= 3000, "相对时间后轴范围覆盖 0–3000");
  assert(/相对时间/.test(plot.xAxis.autoTitle), "自动轴标题跟随映射列");

  core.setDatasetDefaultXColumn(p, "ds-a", "时间(s)");
  core.setDatasetDefaultXColumn(p, "ds-b", "时间(s)");
  assert(core.seriesXForPlot(p, plot, voltA, dsA).join(",") === "5000,6000,7000,8000", "切回绝对时间");
  assert(core.seriesXForPlot(p, plot, voltB, dsB)[0] === 20000, "B 切回绝对时间");

  var plot2 = core.createPlot(p, { name: "相对图" });
  core.addSeriesToPlot(p, plot2, [voltA.id, voltB.id]);
  core.setPlotXColumnOverride(p, plot2, "ds-a", "相对时间(s)");
  core.setPlotXColumnOverride(p, plot2, "ds-b", "相对时间(s)");
  assert(core.seriesXForPlot(p, plot, voltA, dsA).join(",") === "5000,6000,7000,8000", "图窗覆盖不影响另一图窗");
  assert(core.seriesXForPlot(p, plot2, voltA, dsA).join(",") === "0,1000,2000,3000", "第二图窗使用相对时间");
  plot.xAxis.mode = "manual";
  plot.xAxis.min = 100;
  plot.xAxis.max = 200;
  plot.xAxis.titleMode = "custom";
  plot.xAxis.customTitle = "固定标题";
  core.setPlotXColumnOverride(p, plot, "ds-a", "相对时间(s)");
  assert(plot.xAxis.min === 100 && plot.xAxis.max === 200, "手动轴范围不被映射覆盖");
  assert(core.resolvedAxisTitle(plot.xAxis) === "固定标题", "自定义轴标题保留");

  var derived = core.applyFormula(p, {
    name: "AlignCheck",
    expression: "A + 1",
    bindings: { A: voltA.id }
  });
  var beforeY = derived.y.slice();
  core.setPlotXColumnOverride(p, plot, "ds-a", "相对时间(s)");
  var afterDerived = core.findSeries(p, derived.id);
  assert(afterDerived.y.join(",") === beforeY.join(","), "改图窗 X 不改公式结果");
  assert(afterDerived.x.join(",") === voltA.x.join(","), "公式对齐轴仍用原 series.x");

  var json = core.serializeProject(p);
  assert(JSON.parse(json).projectFormatVersion === "1.1", "不升 projectFormatVersion");
  var opened = core.parseProject(json);
  var openedA = core.findDataset(opened, "ds-a");
  var openedPlot2 = opened.plots.find(function (item) { return item.name === "相对图"; });
  assert(openedA.defaultXColumnRef === "时间(s)", "工程恢复数据源默认 X");
  assert(openedPlot2.xColumnByDataset["ds-a"] === "相对时间(s)", "工程恢复图窗覆盖");
  var openedVolt = core.findSeries(opened, voltA.id);
  assert(core.seriesXForPlot(opened, openedPlot2, openedVolt, openedA).join(",") === "0,1000,2000,3000", "重开后映射仍生效");

  var beforeMap = core.captureEditorState(p);
  core.setDatasetDefaultXColumn(p, "ds-a", "相对时间(s)");
  core.restoreEditorState(p, beforeMap);
  assert(core.findDataset(p, "ds-a").defaultXColumnRef === "时间(s)", "Undo 恢复数据源默认 X");

  var csvSoc = "SOC,电压(V)\n0.2,3.5\n0.5,3.7\n0.8,4.0\n";
  var dsSoc = dsFrom(csvSoc, "ds-soc", "soc");
  core.addDataset(p, dsSoc);
  assert(dsSoc.xHeader === "SOC" || dsSoc.xName === "SOC", "无时间列时用第一数值列");
  var voltSoc = dsSoc.series.find(function (item) { return item.name === "电压"; });
  var plotSoc = core.createPlot(p, { name: "XY" });
  core.addSeriesToPlot(p, plotSoc, [voltSoc.id]);
  assert(core.seriesXForPlot(p, plotSoc, voltSoc, dsSoc).join(",") === "0.2,0.5,0.8", "电压–SOC 图用 SOC 作 X");

  var invalidX = false;
  try {
    core.setDatasetDefaultXColumn(p, "ds-a", "不存在");
  } catch (error) {
    invalidX = /不能作为 X|找不到/.test(error.message);
  }
  assert(invalidX, "无效 X 列报错");

  var csvPlain = "Step,Value\n1,10\n2,20\n3,30\n";
  var dsPlain = dsFrom(csvPlain, "ds-plain", "plain");
  assert(dsPlain.xHeader === "Step", "普通单数值 X 不退化");
  assert(!core.suggestRelativeXColumn(p, dsPlain), "无相对时间则不建议");
}());

(function () {
  var p = core.createProject({ projectName: "v072" });
  core.ensureWorkspace(p);
  var src = core.plotWindows(p)[0];
  src.legend.fontSize = 18;
  src.xAxis.tickMode = "manual";
  src.xAxis.majorTick = 100;
  src.layout.width = 900;
  src.layout.height = 500;
  var canvas = p.canvases[0];
  var inst = canvas.instances[0];
  assert(inst.display && inst.display.legend && inst.plotId === src.id && inst.sourcePlotId === src.id, "实例带显示快照和 sourcePlotId");
  inst.display.legend.fontSize = 11;
  inst.display.xAxis.tickMode = "auto";
  src.legend.fontSize = 22;
  assert(inst.display.legend.fontSize === 11 && src.legend.fontSize === 22, "改副本图例不改源图");
  var view = core.bindPlotView(src, inst);
  assert(view.legend.fontSize === 11 && view.__instanceId === inst.id, "bindPlotView 读副本图例");
  var copy = core.createInstance(p, canvas.id, src.id, { x: 40, y: 40, width: 320, height: 240 });
  copy.display.legend.fontSize = 9;
  assert(copy.id !== inst.id && inst.display.legend.fontSize === 11, "双副本图例互不影响");
  var titled = core.bindPlotView(src, inst);
  titled.title = "副本标题";
  assert(inst.display.title === "副本标题" && src.title !== "副本标题", "改副本标题不改源图");
  titled.annotations.push(core.normalizeAnnotation({
    type: "free",
    coordinateMode: "plot",
    anchor: { x: 0.2, y: 0.2 },
    text: "副本标注"
  }, src.id));
  assert(inst.display.annotations.length === 1 && (src.annotations || []).length === 0, "副本标注不写回源图");
  core.removeInstance(p, canvas.id, copy.id);
  assert(core.findPlot(p, src.id) && canvas.instances.some(function (item) { return item.id === inst.id; }), "删副本保留源图和另一副本");

  var laid = [
    { id: "a", x: 10, y: 10, width: 100, height: 100 },
    { id: "b", x: 20, y: 20, width: 100, height: 100 }
  ];
  var layoutResult = core.applyLayoutToInstances(laid, "splitH", { width: 1280, height: 800, padding: 40, gap: 24 });
  assert(layoutResult.placed === 2 && layoutResult.overflow === 0 && layoutResult.emptySlots === 0, "1:1 左右排两张");
  assert(laid[0].x < laid[1].x && laid[0].width === laid[1].width, "左右布局改实例几何");
  var four = [];
  for (var i = 0; i < 4; i += 1) four.push({ id: "n" + i, x: 1, y: 1, width: 80, height: 80 });
  var grid = core.applyLayoutToInstances(four, "grid2x2", { width: 1280, height: 800, padding: 40, gap: 24 });
  assert(grid.placed === 4 && grid.overflow === 0, "2×2 排四张");
  var six = four.concat([{ id: "e1", x: 9, y: 9, width: 80, height: 80 }, { id: "e2", x: 11, y: 11, width: 90, height: 90 }]);
  var overflowed = core.applyLayoutToInstances(six, "grid2x2", { width: 1280, height: 800, padding: 40, gap: 24 });
  assert(overflowed.placed === 4 && overflowed.overflow === 2, "6 张用 2×2 溢出 2 张");
  assert(six[4].width === 80 && six[5].width === 90, "未排入实例保持原几何");
  var empty = core.applyLayoutToInstances([{ id: "one", x: 1, y: 1, width: 120, height: 80 }], "grid2x2", { width: 1280, height: 800, padding: 40, gap: 24 });
  assert(empty.placed === 1 && empty.emptySlots === 3, "少于槽位留下空槽");
  var sixGrid = [];
  for (var j = 0; j < 6; j += 1) sixGrid.push({ id: "g" + j, x: 1, y: 1, width: 80, height: 80 });
  var grid32 = core.applyLayoutToInstances(sixGrid, "grid3x2", { width: 1280, height: 800, padding: 40, gap: 24 });
  assert(grid32.placed === 6 && grid32.overflow === 0, "3×2 排六张");
  src.layout.width = 900;
  core.applyLayoutToInstances(canvas.instances, "splitH", { width: 1280, height: 800, padding: 40, gap: 24 });
  assert(src.layout.width === 900, "快捷布局不改源图尺寸");
  var countBefore = canvas.instances.length;
  for (var repeat = 0; repeat < 10; repeat += 1) {
    core.applyLayoutToInstances(canvas.instances, "grid2x2", { width: 1280, height: 800, padding: 40, gap: 24 });
  }
  assert(canvas.instances.length === countBefore, "同一布局连点 10 次不增加实例");

  var slotP = core.createProject({ projectName: "v072-slots" });
  core.ensureWorkspace(slotP);
  var plotA = core.plotWindows(slotP)[0];
  plotA.name = "A";
  plotA.layout.width = 640;
  plotA.layout.height = 400;
  var plotB = core.createPlot(slotP, { name: "B", title: "B" });
  var plotC = core.createPlot(slotP, { name: "C", title: "C" });
  var plotD = core.createPlot(slotP, { name: "D", title: "D" });
  var plotE = core.createPlot(slotP, { name: "E", title: "E" });
  var srcAWidth = plotA.layout.width;
  var srcBWidth = plotB.layout.width;
  var srcEWidth = plotE.layout.width;
  var slotCanvas = slotP.canvases[0];
  var instA = slotCanvas.instances[0];
  var instB = core.createInstance(slotP, slotCanvas.id, plotB.id, { x: 80, y: 500, width: 180, height: 120 });
  var instC = core.createInstance(slotP, slotCanvas.id, plotC.id, { x: 280, y: 500, width: 190, height: 120 });
  var instD = core.createInstance(slotP, slotCanvas.id, plotD.id, { x: 480, y: 500, width: 200, height: 120 });
  var gridSlots = core.layoutSlots("grid2x2", core.canvasLayoutArea(slotCanvas));
  var top = core.applyLayoutToInstances(slotCanvas.instances.slice(), "grid2x2", core.canvasLayoutArea(slotCanvas));
  assert(top.placed === 4 && slotCanvas.instances.length === 4, "上方 2×2 仍是 4 张");
  assert(instA.x === gridSlots[0].x && instD.x === gridSlots[3].x, "上方 2×2 按槽位排布全部图窗");
  assert(plotA.layout.width === srcAWidth && plotB.layout.width === srcBWidth, "上方布局不改源图尺寸");

  instA.x = 40; instA.y = 40; instA.width = 200; instA.height = 160;
  instB.x = 80; instB.y = 500; instB.width = 180; instB.height = 120;
  instC.x = 280; instC.y = 500; instC.width = 190; instC.height = 120;
  instD.x = 480; instD.y = 500; instD.width = 200; instD.height = 120;
  var keepB = { x: instB.x, y: instB.y, width: instB.width, height: instB.height };
  var keepC = { x: instC.x, y: instC.y, width: instC.width, height: instC.height };
  var keepD = { x: instD.x, y: instD.y, width: instD.width, height: instD.height };
  var rightBox = core.layoutSlots("splitH", core.canvasLayoutArea(slotCanvas))[1];
  var placedA = core.placePrimaryInSlot(slotP, slotCanvas, plotA.id, "splitH", 1, { action: "place" });
  assert(placedA.ok && placedA.instance.id === instA.id && !placedA.created, "下方把已有 A 放入右槽");
  assert(instA.x === rightBox.x && instA.width === rightBox.width, "A 几何等于右槽");
  assert(instB.x === keepB.x && instC.x === keepC.x && instD.x === keepD.x, "下方放置不重排其他图");
  assert(plotA.layout.width === srcAWidth, "下方放置不改源图 A 尺寸");
  var againA = core.placePrimaryInSlot(slotP, slotCanvas, plotA.id, "splitH", 1, { action: "place" });
  assert(againA.ok && againA.unchanged && slotCanvas.instances.length === 4, "重复点同一槽不复制 A");
  var emptyE = core.placePrimaryInSlot(slotP, slotCanvas, plotE.id, "grid2x2", 0, { action: "place" });
  assert(emptyE.ok && emptyE.created && slotCanvas.instances.length === 5, "未入画布的 E 只新增这一张");
  assert(plotE.layout.width === srcEWidth, "新增 E 副本不改源图尺寸");
  var againE = core.placePrimaryInSlot(slotP, slotCanvas, plotE.id, "grid2x2", 0, { action: "place" });
  assert(againE.unchanged && slotCanvas.instances.length === 5, "重复放入 E 不复制");
  var occupy = core.placePrimaryInSlot(slotP, slotCanvas, plotB.id, "splitH", 1, { action: "place" });
  assert(occupy.needsChoice && occupy.occupant.id === instA.id, "右槽已有 A 时要求确认");
  assert(instB.x === keepB.x && instA.x === rightBox.x, "未确认时不覆盖占用槽");
  var swapped = core.placePrimaryInSlot(slotP, slotCanvas, plotB.id, "splitH", 1, { action: "swap" });
  assert(swapped.ok && swapped.swapped && slotCanvas.instances.length === 5, "确认后交换且不丢实例");
  assert(instB.x === rightBox.x && instA.x === keepB.x, "交换后 A/B 几何对调");
  assert(plotA.layout.width === srcAWidth && plotB.layout.width === srcBWidth, "交换不改源图配置");

  var overlapP = core.createProject({ projectName: "v072-b-fix03" });
  core.ensureWorkspace(overlapP);
  var oA = core.plotWindows(overlapP)[0];
  oA.name = "A";
  var oB = core.createPlot(overlapP, { name: "B", title: "B" });
  var oC = core.createPlot(overlapP, { name: "C", title: "C" });
  var oD = core.createPlot(overlapP, { name: "D", title: "D" });
  var oCanvas = overlapP.canvases[0];
  var oInstA = oCanvas.instances[0];
  oInstA.x = 80; oInstA.y = 40; oInstA.width = 320; oInstA.height = 220;
  var oInstB = core.createInstance(overlapP, oCanvas.id, oB.id, { x: 200, y: 60, width: 300, height: 200 });
  var oInstC = core.createInstance(overlapP, oCanvas.id, oC.id, { x: 320, y: 50, width: 280, height: 210 });
  var oInstD = core.createInstance(overlapP, oCanvas.id, oD.id, { x: 720, y: 480, width: 280, height: 220 });
  var largeSlot = core.layoutSlots("onePlusTwo", core.canvasLayoutArea(oCanvas))[0];
  var aCenter = { x: oInstA.x + oInstA.width / 2, y: oInstA.y + oInstA.height / 2 };
  assert(aCenter.x >= largeSlot.x && aCenter.x <= largeSlot.x + largeSlot.width && aCenter.y >= largeSlot.y && aCenter.y <= largeSlot.y + largeSlot.height, "B-FIX03 夹具：A 中心落在左大槽内");
  var inspectOverlap = core.inspectSlotPlacement(oCanvas, oA.id, "onePlusTwo", 0);
  assert(inspectOverlap.ok && !inspectOverlap.alreadyThere, "中心落在槽内但尺寸不匹配时不得报已在该分区");
  assert(!inspectOverlap.occupant, "部分相交的小图不是完整占用者");
  assert(inspectOverlap.overlaps && inspectOverlap.overlaps.length >= 2, "左大槽标出部分相交的其他图");
  var fillA = core.placePrimaryInSlot(overlapP, oCanvas, oA.id, "onePlusTwo", 0, { action: "place" });
  assert(fillA.ok && !fillA.unchanged, "放入左大槽会改 A 的几何");
  assert(core.geometryMatches(oInstA, largeSlot, 2), "A 铺满左大槽 x/y/w/h");
  assert(oInstB.width === 300 && oInstC.width === 280 && oInstD.width === 280, "未确认交换时其他图保持原尺寸");
  var inspectFilled = core.inspectSlotPlacement(oCanvas, oA.id, "onePlusTwo", 0);
  assert(inspectFilled.alreadyThere, "铺满后才算已在该分区");
  var againFill = core.placePrimaryInSlot(overlapP, oCanvas, oA.id, "onePlusTwo", 0, { action: "place" });
  assert(againFill.unchanged && oCanvas.instances.length === 4, "已完整匹配时重复放入不复制");
  var nearSlot = { x: largeSlot.x + 4, y: largeSlot.y + 3, width: largeSlot.width - 6, height: largeSlot.height - 5 };
  var fillPreview = core.matchFillSlot(nearSlot, oCanvas, 1);
  assert(fillPreview && core.geometryMatches(fillPreview, largeSlot, 2), "接近槽位四边时给出填充预览");
  var farSlot = { x: largeSlot.x + 80, y: largeSlot.y + 90, width: 200, height: 140 };
  assert(!core.matchFillSlot(farSlot, oCanvas, 1), "尺寸差很大时不强制填充");

  var sizeA = { id: "plot-a", name: "图A", layout: { x: 40, y: 40, width: 680, height: 410 } };
  var sizeB = { layout: { x: 800, y: 500, width: 672, height: 300 } };
  var sized = core.snapPlotResize(sizeB, [sizeA], { width: 2000, height: 1200 }, 1);
  assert(sized.plot.layout.width === 680, "C-FIX03 拖宽接近邻图时吸附为等宽");
  assert(sized.plot.layout.height === 300, "只接近宽度时不改高度");
  assert(sized.sizeMatches.some(function (item) { return item.kind === "width" && item.value === 680; }), "等宽吸附返回同宽匹配");
  var sizeH = { layout: { x: 800, y: 500, width: 520, height: 403 } };
  var tall = core.snapPlotResize(sizeH, [sizeA], { width: 2000, height: 1200 }, 1);
  assert(tall.plot.layout.height === 410 && tall.plot.layout.width === 520, "C-FIX03 拖高接近邻图时吸附为等高且不改宽度");
  var corner = { layout: { x: 800, y: 500, width: 674, height: 404 } };
  var both = core.snapPlotResize(corner, [sizeA], { width: 2000, height: 1200 }, 1);
  assert(both.plot.layout.width === 680 && both.plot.layout.height === 410, "四角接近时可双轴等宽等高");
  var skipped = core.snapPlotResize({ layout: { x: 800, y: 500, width: 672, height: 300 } }, [sizeA], { width: 2000, height: 1200 }, 1, { disableSnap: true });
  assert(skipped.plot.layout.width === 672 && skipped.plot.layout.height === 300, "Option/Alt 关闭尺寸吸附");
  var farSize = core.snapPlotResize({ layout: { x: 800, y: 500, width: 520, height: 300 } }, [sizeA], { width: 2000, height: 1200 }, 1);
  assert(farSize.plot.layout.width === 520 && farSize.plot.layout.height === 300, "离等宽等高较远时不吸附");
  assert(core.snapThresholdWorld(1) === 8, "尺寸吸附视觉阈值 8 CSS px");

  var ticksOld = core.autoTicks(0, 100, 5);
  var ticksNew = core.autoTicks(0, 100, core.DEFAULT_TICK_COUNT);
  assert(ticksNew.length >= ticksOld.length, "默认自动刻度不少于旧的 5 档");
  var sized = core.autoTickCountForSize(800, 12);
  assert(sized >= 6 && sized <= 10, "宽图自动目标约 6–8 个刻度");
  src.xAxis.tickTargetCount = 8;
  var extracted = core.extractFigureTemplate(src, { name: "tick-tpl" });
  assert(extracted.xAxis.tickMode === "manual" && extracted.xAxis.majorTick === 100 && extracted.xAxis.tickTargetCount === 8, "模板保存刻度模式和目标数");
  var fresh = core.createPlot(p, { name: "new", title: "new" });
  core.applyFigureTemplate(fresh, extracted);
  assert(fresh.xAxis.tickMode === "manual" && fresh.xAxis.majorTick === 100, "套用模板恢复手动步长");

  var items = [];
  for (var n = 0; n < 8; n += 1) items.push({ label: n < 5 ? ("T" + (n + 1)) : ("长名称" + n) });
  var autoLegend = core.layoutLegendItems(items, { fontSize: 12, columns: 4, layoutMode: "auto", measure: function (text) { return String(text).length * 8; } });
  var manualLegend = core.layoutLegendItems(items, { fontSize: 12, columns: 8, layoutMode: "manual-rows", rowBreaks: [5], measure: function (text) { return String(text).length * 8; } });
  assert(manualLegend.rows === 2 && manualLegend.placed[5].y > manualLegend.placed[0].y, "手动分行把长名称放到第二行");
  assert(manualLegend.columns === 8, "手动分行仍使用列数");
  assert(autoLegend.layoutMode === "auto", "自动模式不吃手动分行");
  var longItems = [];
  var n;
  for (n = 1; n <= 52; n += 1) longItems.push({ label: "T" + n });
  ["冷板温度", "进水口温度", "出水口温度", "冷板测点1", "冷板测点2"].forEach(function (name) { longItems.push({ label: name }); });
  var grid8 = core.layoutLegendItems(longItems, { fontSize: 12, columns: 8, layoutMode: "manual-rows", rowBreaks: [52], measure: function (text) { return String(text).length * 8; } });
  assert(grid8.columns === 8 && grid8.placed[7].row === 0 && grid8.placed[8].row === 1, "列数=8 时前 52 项按 8 列网格");
  assert(grid8.placed[52].row > grid8.placed[51].row, "长名称从断点起换到后续行");
  var grid6 = core.layoutLegendItems(longItems, { fontSize: 12, columns: 6, layoutMode: "manual-rows", rowBreaks: [52], measure: function (text) { return String(text).length * 8; } });
  assert(grid6.placed[6].row === 1 && grid6.columns === 6, "列数 8→6 时首行只排 6 项");
  var autoIgnore = core.layoutLegendItems(longItems, { fontSize: 12, columns: 8, layoutMode: "auto", rowBreaks: [52], measure: function (text) { return String(text).length * 8; } });
  assert(autoIgnore.layoutMode === "auto" && autoIgnore.placed[52].row === Math.floor(52 / 8), "自动模式忽略手动断点");
  var measureLen = function (text) { return String(text).length * 8; };
  var gridX = [];
  for (n = 0; n < 52; n += 1) gridX.push(grid8.placed[n].x);
  var stretched = longItems.slice();
  stretched[52] = { label: "非常非常非常非常长的冷板温度名称" };
  var afterStretch = core.layoutLegendItems(stretched, { fontSize: 12, columns: 8, layoutMode: "manual-rows", rowBreaks: [52], measure: measureLen });
  for (n = 0; n < 52; n += 1) {
    assert(afterStretch.placed[n].x === gridX[n], "D-FIX03 长名称变长不改上方 T 项 x");
  }
  assert(afterStretch.placed[52].rowKind === "independent", "手动断点后的长名称行独立测宽");
  assert(afterStretch.placed[1].x === grid8.placed[1].x, "独立行不得进入共享列宽");
  var splitLong = core.layoutLegendItems(stretched, { fontSize: 12, columns: 8, layoutMode: "manual-rows", rowBreaks: [52, 53], measure: measureLen });
  for (n = 0; n < 52; n += 1) {
    assert(splitLong.placed[n].x === gridX[n], "长名称从一行变两行仍不改 T 项 x");
  }

  var lib = { templates: [] };
  var first = core.saveFigureTemplate(lib, extracted, { action: "create", now: "2026-10-29T00:00:00.000Z" });
  lib = first.library;
  assert(first.ok && lib.templates.length === 1, "新建模板");
  var clash = core.saveFigureTemplate(lib, extracted, { action: "create" });
  assert(clash.needsChoice && lib.templates.length === 1, "同名不静默新增");
  extracted.xAxis.majorTick = 50;
  var over = core.saveFigureTemplate(lib, extracted, { action: "overwrite", templateId: first.template.id, now: "2026-10-29T01:00:00.000Z" });
  lib = over.library;
  assert(over.ok && over.overwritten && lib.templates.length === 1 && lib.templates[0].xAxis.majorTick === 50, "覆盖同名保留 ID");
  var renamed = core.saveFigureTemplate(lib, extracted, { action: "rename", name: "tick-tpl-2" });
  assert(renamed.ok && renamed.library.templates.length === 2, "另存新名称增加一条");
  var oldDup = core.normalizeTemplateLibrary({
    templates: [
      { templateFormatVersion: 1, id: "old-a", name: "重复", updatedAt: "2026-01-01T00:00:00.000Z" },
      { templateFormatVersion: 1, id: "old-b", name: "重复", updatedAt: "2026-02-01T00:00:00.000Z" }
    ]
  });
  assert(oldDup.templates.length === 2 && core.templateListLabel(oldDup.templates[0]) !== core.templateListLabel(oldDup.templates[1]), "历史同名模板可辨认");

  var round = core.parseProject(core.serializeProject(p));
  assert(round.canvases[0].instances[0].display && round.canvases[0].instances[0].display.legend.fontSize === 11, "工程往返保留副本图例");
  assert(round.projectFormatVersion === "1.1", "v0.7.4 不升工程格式");
}());

(function testSegmentRelativeTimeColumn() {
  var csv = [
    "时间(s),电压(V),温度(℃)",
    "100,3.7,25",
    "250,3.6,26",
    "500,3.5,27",
    ""
  ].join("\n");
  var p = core.createProject({ projectName: "seg-rel" });
  var source = core.parseDatasetFromCsv(csv, { id: "src", name: "源", sourceFilename: "源.csv" });
  core.addDataset(p, source);
  var segA = core.createSegment(p, {
    name: "A",
    sourceDatasetId: source.id,
    rangeType: "time",
    rangeDefinition: { column: "时间(s)", start: "100", end: "500" },
    includeRelativeTimeColumn: true,
    timeColumn: "时间(s)"
  });
  assert(segA.includeRelativeTimeColumn && segA.derivedRelativeTime, "勾选后在片段内派生相对时间列");
  assert(segA.headers.indexOf("相对时间(s)") > segA.headers.indexOf("时间(s)"), "相对时间列紧跟时间列");
  var relSeries = segA.series.filter(function (item) { return item.role === "relative-time"; })[0];
  assert(relSeries && relSeries.y.join(",") === "0,150,400", "相对时间按真实采样间隔从 0 起");
  assert(core.suggestRelativeXColumn(p, segA) === "相对时间(s)", "片段内可选相对时间作 X");
  var volt = segA.series.filter(function (item) { return item.originalHeader === "电压(V)"; })[0];
  var plot = core.createPlot(p, { name: "图" });
  core.addSeriesToPlot(p, plot, [volt.id]);
  core.setDatasetDefaultXColumn(p, segA.id, "相对时间(s)");
  assert(core.seriesXForPlot(p, plot, volt, segA).join(",") === "0,150,400", "绘图 X 使用片段相对时间");
  var exported = core.exportSegmentCsv(p, segA.id, { encoding: "utf-8", relativeTime: true, keepOriginalTime: true });
  assert(exported.headers.filter(function (h) { return h === "相对时间(s)"; }).length === 1, "已有相对时间列时导出不再重复");
  assert(exported.headers.indexOf("相对时间(s)") === exported.headers.indexOf("时间(s)") + 1, "导出列顺序稳定");
  var body = exported.text.split("\r\n").filter(Boolean);
  assert(body[1].split(",")[1] === "0", "导出相对时间与片段一致");
  var segB = core.createSegment(p, {
    name: "B",
    sourceDatasetId: source.id,
    rangeType: "time",
    rangeDefinition: { column: "时间(s)", start: "100", end: "250" },
    includeRelativeTimeColumn: false
  });
  assert(!segB.includeRelativeTimeColumn, "未勾选时不派生");
  var exportB = core.exportSegmentCsv(p, segB.id, { encoding: "utf-8", relativeTime: true, keepOriginalTime: true });
  assert(exportB.headers.indexOf("相对时间(s)") >= 0, "未含列时导出可补充");
  core.updateSegment(p, segA.id, {
    rangeType: "time",
    rangeDefinition: { column: "时间(s)", start: "250", end: "500" }
  });
  relSeries = core.findDataset(p, segA.id).series.filter(function (item) { return item.role === "relative-time"; })[0];
  assert(relSeries.y.join(",") === "0,250", "编辑范围后相对时间重算");
  var saved = core.parseProject(core.serializeProject(p));
  var reopenedA = core.findDataset(saved, segA.id);
  assert(reopenedA.includeRelativeTimeColumn && reopenedA.derivedRelativeTime, "工程保存相对时间元数据");
  var reopenedRel = reopenedA.series.filter(function (item) { return item.role === "relative-time"; })[0];
  assert(reopenedRel.y.join(",") === "0,250", "重开后相对时间仍在");
  assert(saved.projectFormatVersion === "1.1", "不升工程格式");
}());

(function testSourceColumnWritebackAndWorkbench() {
  var csv = [
    "时间(s),C1(℃),C2(℃),工步名称",
    "10,21.0,22.0,放电",
    "12,21.5,22.5,放电",
    "15,22.0,23.0,静置",
    ""
  ].join("\n");
  var source = core.parseDatasetFromCsv(csv, { id: "ds-col", name: "列名源", sourceFilename: "cols.csv", sourceEncoding: "utf-8" });
  var project = core.createProject({ projectName: "v073-01" });
  core.addDataset(project, source);
  var c1 = source.series.filter(function (item) { return item.originalHeader === "C1(℃)"; })[0];
  var c2 = source.series.filter(function (item) { return item.originalHeader === "C2(℃)"; })[0];
  assert(c1 && c1.sourceColumnIndex === 1 && c2.sourceColumnIndex === 2, "导入时绑定稳定列索引");
  assert(core.columnSaveState(source) === "saved", "导入后已保存");
  assert(!core.hasUnsavedColumnNames(source), "导入后没有未保存列名");
  assert(core.datasetDiskHeaders(source).join("|") === source.headers.join("|"), "磁盘表头与导入表头一致");

  var preview = core.previewSourceColumnRename(source, [1, 2], { mode: "template", template: "T{n}", start: 1 });
  assert(preview[0].before === "C1(℃)" && preview[0].after === "T1", "C1 预览为 T1");
  assert(preview[1].before === "C2(℃)" && preview[1].after === "T2", "C2 预览为 T2");
  core.renameSourceColumns(source, { 1: "T1", 2: "T2" });
  assert(source.headers[1] === "T1" && source.headers[2] === "T2", "左侧改名立即更新工程内表头");
  assert(core.datasetDiskHeaders(source)[1] === "C1(℃)", "未保存前磁盘表头不变");
  assert(core.hasUnsavedColumnNames(source) && core.columnSaveState(source) === "unsaved", "显示未保存");
  assert(c1.id === "ds-col::T1" || c1.localId, "系列 ID 仍稳定");
  assert(c1.originalHeader === "C1(℃)", "未写回前 originalHeader 不变");
  assert(c1.displayName === "T1", "默认继承当前数据源列名");

  var emptyFailed = false;
  try { core.renameSourceColumns(source, { 1: "  " }); } catch (error) {
    emptyFailed = /空/.test(String(error && error.message || error));
  }
  assert(emptyFailed, "禁止空列名");
  var dupFailed = false;
  try { core.renameSourceColumns(source, { 1: "T2" }); } catch (error) {
    dupFailed = /重名/.test(String(error && error.message || error));
  }
  assert(dupFailed, "禁止新产生的重名");

  var plotA = core.createPlot(project, { title: "图A" });
  var plotB = core.createPlot(project, { title: "图B" });
  core.addSeriesToPlot(project, plotA, [c1.id]);
  core.addSeriesToPlot(project, plotB, [c1.id]);
  plotA.seriesRefs[0].legendName = "模组中央";
  assert(core.plotSeriesLegendName(plotA.seriesRefs[0], c1) === "模组中央", "右侧图例覆盖只作用于当前图");
  assert(core.plotSeriesLegendName(plotB.seriesRefs[0], c1) === "T1", "其他图窗仍继承数据源列名");
  core.normalizeSeriesRef(plotA.seriesRefs[0]);
  var originalExport = core.exportProjectedCsv(project, {
    sourceDatasetId: source.id,
    rangeType: "row",
    rangeDefinition: { startRow: 1, endRow: 3 },
    headerMode: "original",
    encoding: "utf-8"
  });
  assert(originalExport.headers.join("|") === "时间(s)|C1(℃)|C2(℃)|工步名称", "原始表头模式仍用磁盘列名");
  var currentExport = core.exportProjectedCsv(project, {
    sourceDatasetId: source.id,
    rangeType: "row",
    rangeDefinition: { startRow: 1, endRow: 3 },
    headerMode: "current",
    encoding: "utf-8"
  });
  assert(currentExport.headers.join("|") === "时间(s)|T1|T2|工步名称", "当前列名导出不受图例影响");
  assert(currentExport.headers.indexOf("模组中央") < 0, "图例名不进入 CSV");
  assert(currentExport.rowCount === 3, "未创建片段也可按范围导出");

  var quotedCsv = "Time,\"Name,with comma\",Value\n1,\"a\",2\n";
  var rewritten = core.rewriteCsvHeadersLossless(quotedCsv, ["Time", "Renamed", "Value"]);
  assert(rewritten.ok, "可引用表头可无损改写");
  var verified = core.verifyRewrittenCsvHeaders(quotedCsv, rewritten.text, ["Time", "Renamed", "Value"]);
  assert(verified.ok, "写后校验表头");
  assert(rewritten.text.split("\n")[1] === "1,\"a\",2", "数据行原样保留");
  var crlf = "A,B\r\n1,2\r\n";
  var crlfOut = core.rewriteCsvHeadersLossless(crlf, ["X", "Y"]);
  assert(crlfOut.ok && crlfOut.text.indexOf("\r\n") >= 0 && crlfOut.text.split("\r\n")[1] === "1,2", "保留 CRLF 与数据");
  var mismatch = core.rewriteCsvHeadersLossless(quotedCsv, ["only-one"]);
  assert(!mismatch.ok, "列数变化禁止覆写");

  var prepared = core.prepareSourceCsvRewrite(source);
  assert(prepared.ok, "未保存列名可准备写回文本");
  assert(prepared.text.indexOf("T1") === 0 || prepared.text.split(/[\r\n]/)[0].indexOf("T1") >= 0, "写回文本含新表头");
  var bodyUnchanged = prepared.text.replace(/^[^\r\n]+/, "").replace(/^\r?\n/, "");
  var originalBody = csv.replace(/^[^\r\n]+/, "").replace(/^\r?\n/, "");
  assert(bodyUnchanged === originalBody, "写回只改表头行");
  core.commitSourceColumnWrite(source, prepared.text, { encoding: "utf-8" });
  assert(!core.hasUnsavedColumnNames(source), "写回成功后已保存");
  assert(c1.originalHeader === "T1", "写回后 originalHeader 更新");
  assert(source.rawCsv.split(/[\r\n]/)[0].indexOf("T1") >= 0, "rawCsv 表头已更新");
  assert(c1.id.indexOf("::") > 0 && c1.y[0] === 21, "写回不改数值与稳定 ID");

  core.renameSourceColumns(source, { 1: "Alpha" });
  core.revertUnsavedColumnNames(source);
  assert(source.headers[1] === "T1" && !core.hasUnsavedColumnNames(source), "撤销未保存修改");

  core.renameSourceColumns(source, { 1: "入口温度" });
  var saved = core.parseProject(core.serializeProject(project));
  var reopened = core.findDataset(saved, source.id);
  assert(reopened.headers[1] === "入口温度", "工程记录未保存草稿");
  assert(core.hasUnsavedColumnNames(reopened), "重开后不得谎称已写回磁盘");
  assert(core.datasetDiskHeaders(reopened)[1] === "T1", "磁盘列名仍是上次写回结果");
  assert(saved.projectFormatVersion === "1.1", "列名草稿不升工程格式");
  var reopenedPlot = saved.plots.filter(function (item) { return item.title === "图A"; })[0];
  assert(reopenedPlot.seriesRefs[0].legendName === "模组中央", "图例覆盖随工程保存");

  var identity = core.sourceFileIdentity({ name: "cols.csv", size: 120, lastModified: 10, headerFingerprint: "时间(s)|T1|T2|工步名称" });
  var same = core.sourceFileIdentitiesMatch(identity, { name: "cols.csv", size: 120, lastModified: 10, headerFingerprint: "时间(s)|T1|T2|工步名称" });
  var changed = core.sourceFileIdentitiesMatch(identity, { name: "cols.csv", size: 999, lastModified: 11, headerFingerprint: "时间(s)|T1|T2|工步名称" });
  assert(same && !changed, "文件身份按名称/大小/时间核对，不只看文件名");

  var workbench = core.workbenchExportPreview(project, {
    sourceDatasetId: source.id,
    rangeType: "time",
    rangeDefinition: { column: "时间(s)", start: "10", end: "12" },
    includeRelativeTimeColumn: true,
    timeColumn: "时间(s)",
    columnSelection: { mode: "selected", indexes: [0, 1], columns: ["时间(s)", "入口温度"] },
    headerMode: "current",
    keepOriginalTime: true
  });
  assert(workbench.rowCount === 2, "工作台预览行数");
  assert(workbench.headers.join("|") === "时间(s)|相对时间(s)|入口温度", "预览列名/相对时间与导出一致");
  assert(workbench.sample[0][1] === "0", "相对时间以首条有效时间为 0");
  var direct = core.exportProjectedCsv(project, {
    sourceDatasetId: source.id,
    rangeType: "time",
    rangeDefinition: { column: "时间(s)", start: "10", end: "12" },
    includeRelativeTimeColumn: true,
    timeColumn: "时间(s)",
    columnSelection: { mode: "selected", indexes: [0, 1], columns: ["时间(s)", "入口温度"] },
    headerMode: "current",
    keepOriginalTime: true,
    relativeTime: true,
    encoding: "utf-8",
    filename: "direct.csv"
  });
  assert(direct.headers.join("|") === workbench.headers.join("|"), "直接导出与预览表头一致");
  assert(direct.rowCount === 2 && !core.findDataset(project, "missing"), "直接导出不创建片段");

  var segment = core.createSegment(project, {
    name: "放电段",
    sourceDatasetId: source.id,
    rangeType: "time",
    rangeDefinition: { column: "时间(s)", start: "10", end: "12" },
    includeRelativeTimeColumn: true,
    timeColumn: "时间(s)",
    columnSelection: { mode: "selected", indexes: [0, 1], columns: ["时间(s)", "入口温度"] }
  });
  var savedCfg = core.exportSegmentCsv(project, segment.id, {
    encoding: "utf-8",
    headerMode: "current",
    keepOriginalTime: true,
    relativeTime: true,
    columnSelection: segment.columnSelection,
    timeColumn: "时间(s)"
  });
  assert(savedCfg.headers.join("|") === direct.headers.join("|"), "保存片段后导出与直接导出同一投影");
  var tempExport = core.exportProjectedCsv(project, {
    sourceDatasetId: source.id,
    segmentId: segment.id,
    rangeType: "time",
    rangeDefinition: { column: "时间(s)", start: "10", end: "15" },
    includeRelativeTimeColumn: true,
    timeColumn: "时间(s)",
    headerMode: "current",
    keepOriginalTime: true,
    relativeTime: true,
    encoding: "utf-8",
    persist: false
  });
  assert(tempExport.rowCount === 3, "仅本次导出可用临时范围");
  assert(core.rowRangeCount(core.findDataset(project, segment.id).selectedRowRanges) === 2, "临时导出不改已保存片段");

  var page = fs.readFileSync(path.join(__dirname, "..", "temperature_trajectory_visualizer.html"), "utf8");
  assert(page.indexOf("保存到原文件") >= 0, "左侧提供保存到原文件");
  assert(page.indexOf("直接导出 CSV") >= 0 && page.indexOf("保存并导出") >= 0, "工作台含直接导出与保存并导出");
  assert(page.indexOf("tv-workbench-zone") >= 0, "统一工作台分区");
  assert(page.indexOf("继续创建新片段") < 0, "不恢复多余继续创建按钮");
}());

(function testSourceCsvBackupAndUnsavedLeave() {
  assert(core.sourceCsvBackupFilename("cols.csv") === "cols.csv.bak", "CSV 备份名为 .csv.bak");
  assert(core.sourceCsvBackupFilename("data") === "data.bak", "无扩展名时加 .bak");
  assert(core.sourceCsvBackupFilename("keep.csv.bak") === "keep.csv.bak", "已是 bak 不再叠加");

  var csv = "时间(s),C1(℃),C2(℃)\n10,21.0,22.0\n12,21.5,22.5\n";
  var source = core.parseDatasetFromCsv(csv, {
    id: "ds-bak",
    name: "备份源",
    sourceFilename: "cols.csv",
    sourceEncoding: "utf-8"
  });
  var other = core.parseDatasetFromCsv("时间(s),X\n1,2\n2,3\n", {
    id: "ds-other",
    name: "另一源",
    sourceFilename: "other.csv",
    sourceEncoding: "utf-8"
  });
  var project = core.createProject({ projectName: "v073-01-backup" });
  core.addDataset(project, source);
  core.addDataset(project, other);
  core.renameSourceColumns(source, { 1: "T1" });

  var backup = core.createSourceCsvBackup(source);
  assert(backup.ok, "可从磁盘原文生成备份");
  assert(backup.filename === "cols.csv.bak", "备份建议文件名");
  assert(backup.text.indexOf("C1(℃)") >= 0 && backup.text.indexOf("T1") < 0, "备份是覆盖前原文，不是新表头");
  assert(core.verifySourceCsvBackup(source.rawCsv, backup.text).ok, "备份文本与原文一致则通过");
  assert(!core.verifySourceCsvBackup(source.rawCsv, "tampered").ok, "备份被篡改则失败");
  var originalBytes = core.encodeCsvText(backup.text, backup.encoding);
  var sameBytes = core.encodeCsvText(backup.text, backup.encoding);
  var badBytes = core.encodeCsvText("tampered", "utf-8");
  assert(core.verifySourceCsvBackupBytes(originalBytes, sameBytes).ok, "备份字节一致则通过");
  assert(!core.verifySourceCsvBackupBytes(originalBytes, badBytes).ok, "备份字节不一致则失败");
  var bakDir = path.join(__dirname, "..", "tmp", "v07301");
  fs.mkdirSync(bakDir, { recursive: true });
  var bakPath = path.join(bakDir, backup.filename);
  fs.writeFileSync(bakPath, Buffer.from(originalBytes));
  var bakRead = fs.readFileSync(bakPath);
  assert(core.verifySourceCsvBackupBytes(originalBytes, bakRead).ok, "写入 .bak 后再读回字节一致");
  fs.writeFileSync(bakPath, "tampered-backup");
  assert(!core.verifySourceCsvBackupBytes(originalBytes, fs.readFileSync(bakPath)).ok, "损坏的 .bak 不能当作备份成功");
  assert(!core.canOverwriteSourceCsv({
    backupRequested: true,
    backupVerified: core.verifySourceCsvBackupBytes(originalBytes, fs.readFileSync(bakPath)).ok
  }).ok, "损坏备份阻止覆写");
  fs.writeFileSync(bakPath, Buffer.from(originalBytes));

  var blocked = core.canOverwriteSourceCsv({
    backupRequested: true,
    backupVerified: false,
    backupError: "磁盘已满"
  });
  assert(!blocked.ok && /阻止覆写/.test(blocked.error) && /磁盘已满/.test(blocked.error), "备份失败阻止覆写");
  var unverified = core.canOverwriteSourceCsv({ backupRequested: true, backupVerified: false });
  assert(!unverified.ok, "无法校验的备份也阻止覆写");
  assert(core.canOverwriteSourceCsv({ backupRequested: true, backupVerified: true }).ok, "备份校验通过才允许覆写");
  assert(core.canOverwriteSourceCsv({ backupRequested: false }).ok, "用户明确不备份时允许覆写");

  var stay = core.unsavedColumnLeaveGuard(project, source.id, source.id);
  assert(!stay.warn, "停留在同一数据源不提示");
  var switchAway = core.unsavedColumnLeaveGuard(project, source.id, other.id);
  assert(switchAway.warn && /尚未写回原文件/.test(switchAway.message), "切换到其他数据源要提示未保存列名");
  var switchFromEmpty = core.unsavedColumnLeaveGuard(project, null, other.id);
  assert(switchFromEmpty.warn, "当前未点选时离开唯一未保存数据源也要提示");
  core.renameSourceColumns(other, { 1: "Y" });
  var twoUnsaved = core.unsavedColumnLeaveGuard(project, null, other.id);
  assert(twoUnsaved.warn, "两个未保存数据源时切到其中一个仍要提示另一个");
  var third = core.parseDatasetFromCsv("时间(s),Z\n1,2\n2,3\n", {
    id: "ds-third",
    name: "第三源",
    sourceFilename: "third.csv",
    sourceEncoding: "utf-8"
  });
  core.addDataset(project, third);
  var twoToThird = core.unsavedColumnLeaveGuard(project, null, third.id);
  assert(twoToThird.warn && /有尚未写回原文件/.test(twoToThird.message), "多个未保存数据源离开时用总提示");
  core.revertUnsavedColumnNames(other);
  var segment = core.createSegment(project, {
    name: "同源片段",
    sourceDatasetId: source.id,
    rangeType: "row",
    rangeDefinition: { startRow: 1, endRow: 1 }
  });
  assert(!core.unsavedColumnLeaveGuard(project, source.id, segment.id).warn, "切到同源片段不提示");
  assert(core.projectHasUnsavedColumnNames(project), "工程内存在未保存列名");
  assert(core.pageLeaveNeedsWarning(project, false), "工程已保存但列名未写回时关闭页面仍要警告");
  assert(core.pageLeaveNeedsWarning(project, true), "工程脏时关闭页面要警告");
  var discardBoth = core.confirmDiscardMessage(project, true);
  assert(/尚未写回原文件/.test(discardBoth) && /工程/.test(discardBoth), "放弃工程时同时提示列名与工程未保存");

  var prepared = core.prepareSourceCsvRewrite(source);
  core.commitSourceColumnWrite(source, prepared.text, { encoding: "utf-8" });
  assert(!core.unsavedColumnLeaveGuard(project, source.id, other.id).warn, "写回成功后切换不再提示列名");
  assert(!core.pageLeaveNeedsWarning(project, false), "列名已写回且工程干净时关闭无需警告");
  assert(core.confirmDiscardMessage(project, true) === "有未保存的修改，确定放弃当前工程？", "仅工程脏时沿用原确认文案");

  var page = fs.readFileSync(path.join(__dirname, "..", "temperature_trajectory_visualizer.html"), "utf8");
  assert(page.indexOf("备份后覆写") >= 0, "保存原文件提供备份后覆写");
  assert(page.indexOf("不备份，直接覆写") >= 0, "保存原文件允许跳过备份");
  assert(page.indexOf("尚未写回原文件") >= 0, "切换/关闭提示未保存列名");
  assert(page.indexOf("pageLeaveNeedsWarning") >= 0, "关闭页面走未保存列名检查");
}());

(function testColumnRenameImeKey() {
  function replay(events) {
    var state = core.createColumnRenameKeyState();
    var actions = [];
    events.forEach(function (event) {
      var result = core.columnRenameKeyAction(state, event);
      state = result.state;
      actions.push(result.action);
    });
    return actions;
  }
  function naiveImeEnter(event) {
    if (event.isComposing || event.keyCode === 229) return "passthrough";
    if (event.key === "Enter") return "commit";
    return "passthrough";
  }
  var chromeOrder = replay([
    { type: "compositionstart" },
    { type: "keydown", key: "Enter", isComposing: true, keyCode: 229 },
    { type: "compositionend" },
    { type: "keyup", key: "Enter" },
    { type: "keydown", key: "Enter", isComposing: false, keyCode: 13 }
  ]);
  assert(chromeOrder.join(",") === "passthrough,passthrough,passthrough,passthrough,commit", "拼音确认键不提交，随后的 Enter 才提交");
  var endBeforeKey = [
    { type: "compositionstart" },
    { type: "compositionend" },
    { type: "keydown", key: "Enter", isComposing: false, keyCode: 13 },
    { type: "keyup", key: "Enter" },
    { type: "keydown", key: "Enter", isComposing: false, keyCode: 13 }
  ];
  var reversed = replay(endBeforeKey);
  assert(naiveImeEnter(endBeforeKey[2]) === "commit", "只看 isComposing 会把组合结束后的确认 Enter 当成提交");
  assert(reversed.join(",") === "passthrough,passthrough,ignore,passthrough,commit", "compositionend 先到时确认 Enter 不提交");
  var escapeOrder = replay([
    { type: "compositionstart" },
    { type: "keydown", key: "Escape", isComposing: true, keyCode: 229 },
    { type: "compositionend" },
    { type: "keyup", key: "Escape" },
    { type: "keydown", key: "Escape", isComposing: false, keyCode: 27 }
  ]);
  assert(escapeOrder[1] === "passthrough" && escapeOrder[4] === "cancel", "组合中的 Esc 留给输入法，之后的 Esc 取消编辑");
  assert(replay([{ type: "keydown", key: "Enter", isComposing: false, keyCode: 13 }])[0] === "commit", "英文 Enter 直接提交");
  assert(replay([
    { type: "compositionstart" },
    { type: "keydown", key: " ", isComposing: true, keyCode: 229 },
    { type: "compositionend" },
    { type: "keyup", key: " " }
  ]).indexOf("commit") < 0, "空格确认候选不提交列名");
  var page = fs.readFileSync(path.join(__dirname, "..", "temperature_trajectory_visualizer.html"), "utf8");
  assert(page.indexOf("tv-column-editor") >= 0, "左侧列名编辑使用独立编辑器");
  assert(page.indexOf("columnRenameKeyAction") >= 0, "左侧列名编辑走输入法按键判定");
  assert(page.indexOf("tv-series-name-input") < 0, "左侧不再用常驻默认输入框");
}());

(function testSourceColumnBatchRenameDialogAndWorkbenchFit() {
  var csv = "时间(s),C1(℃),C2(℃),C3(℃)\n10,21,22,23\n12,21.5,22.5,23.5\n15,22,23,24\n";
  var source = core.parseDatasetFromCsv(csv, { id: "ds-batch", name: "批量源", sourceFilename: "batch.csv", sourceEncoding: "utf-8" });
  var specT = core.parseSourceColumnRenameSpec("T{n}");
  assert(specT && specT.mode === "template" && specT.template === "T{n}" && specT.start === 1, "T{n} 解析为序号模板");
  var specR = core.parseSourceColumnRenameSpec("C=入口");
  assert(specR && specR.mode === "replace" && specR.find === "C" && specR.replace === "入口", "查找=替换");
  var specEq = core.parseSourceColumnRenameSpec("a=b=c");
  assert(specEq && specEq.replace === "b=c", "替换文本可含等号");
  assert(!core.parseSourceColumnRenameSpec("   "), "空模板无效");
  var preview = core.previewSourceColumnRename(source, [1, 2], specT);
  assert(preview[0].before === "C1(℃)" && preview[0].after === "T1", "选中列预览 T1");
  assert(preview[1].before === "C2(℃)" && preview[1].after === "T2", "选中列预览 T2");
  core.renameSourceColumns(source, { 1: preview[0].after, 2: preview[1].after });
  assert(source.headers[1] === "T1" && source.headers[2] === "T2" && source.headers[3] === "C3(℃)", "未选中列保持原样");
  assert(core.hasUnsavedColumnNames(source), "批量改名后仍是未保存草稿");
  assert(core.datasetDiskHeaders(source)[1] === "C1(℃)", "批量改名不写回原 CSV");

  var page = fs.readFileSync(path.join(__dirname, "..", "temperature_trajectory_visualizer.html"), "utf8");
  assert(page.indexOf("window.prompt(\"批量列名模板") < 0, "批量改列名不再调用浏览器 prompt");
  assert(page.indexOf("window.confirm(\"预览：") < 0, "批量改列名不再用原生 confirm 预览");
  assert(page.indexOf("openSourceColumnRenameDialog") >= 0, "批量改列名打开应用内弹层");
  assert(page.indexOf("data-batch-template") >= 0, "弹层含模板输入");
  assert(page.indexOf("data-batch-apply") >= 0, "弹层含确认应用");
  assert(page.indexOf("tv-column-editor") >= 0, "单列行内编辑保留");
  assert(core.validateSourceColumnNames(source, ["时间(s)", "", "C2(℃)", "C3(℃)"]) === "列名不能为空。", "批量预览拒绝空列名");
  assert(/重名/.test(core.validateSourceColumnNames(source, ["时间(s)", "C2(℃)", "C2(℃)", "C3(℃)"])), "批量预览拒绝新重名");
  var css = page.replace(/\s+/g, " ");
  assert(/\.tv-select, \.tv-field, textarea\.tv-field \{[^}]*min-width: 0/.test(css), "字段允许在窄栏收缩");
  assert(/\.tv-workbench-zone \{[^}]*grid-template-columns: minmax\(0, 1fr\)/.test(css), "工作台分区轨道从 0 收缩");
  assert(/\.tv-control \{[^}]*grid-template-columns: minmax\(0, 1fr\)/.test(css), "字段轨道从 0 收缩");
  assert(/\.tv-workbench-zone[\s\S]{0,180}?min-width: 0/.test(page) || /\.tv-workbench-zone \{[^}]*min-width: 0/.test(css), "工作台分区可收缩");
  assert(/\.tv-accordion-body[\s\S]{0,220}?min-width: 0/.test(page) || /tv-accordion-body,[^\{]*\{[^}]*min-width: 0/.test(css), "属性卡片内容可收缩");
  assert(!/\.tv-workbench-zone \{[^}]*overflow:\s*hidden/.test(css), "不以 overflow hidden 掩盖越界");
  assert(page.indexOf(".tv-control[hidden]") >= 0, "弹层隐藏字段不被 display:grid 盖掉");
}());

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
