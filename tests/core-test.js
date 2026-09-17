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
var expCsv = fs.readFileSync(path.join(fixtures, "TESTDATA_exp_25C.csv"), "utf8");
var simCsv = fs.readFileSync(path.join(fixtures, "TESTDATA_sim_25C.csv"), "utf8");

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
plot.xAxis = { mode: "manual", min: 0, max: 20 };
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
  core.parseDatasetFromCsv("foo,bar\n1,2\n", { name: "坏文件" });
  assert(false, "缺时间列应抛错");
} catch (error) {
  assert(error.message.indexOf("时间列") >= 0, "缺时间列给出明确错误");
}

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}
console.log("\nall core tests passed");
