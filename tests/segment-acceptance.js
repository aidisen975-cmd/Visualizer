#!/usr/bin/env node
"use strict";

var fs = require("fs");
var core = require("../visualizer-core.js");

var utf8Path = process.env.VISUALIZER_CSV
  || "/Users/elssssa/Downloads/2026-10-24@19-44-13_0.33C_UTF8.CSV";
if (!fs.existsSync(utf8Path)) {
  console.error("missing full CSV:", utf8Path);
  process.exit(2);
}

function ms(start) {
  return Math.round(Date.now() - start);
}

var t0 = Date.now();
var text = fs.readFileSync(utf8Path, "utf8");
var source = core.parseDatasetFromCsv(text, {
  id: "ds-full",
  name: "2026-10-24@19-44-13_0.33C",
  sourceFilename: "2026-10-24@19-44-13_0.33C.CSV",
  sourceEncoding: "utf-8"
});
var parseMs = ms(t0);
if (source.headers.length !== 94) {
  console.error("expected 94 columns, got", source.headers.length);
  process.exit(1);
}
if (!source.series[0] || source.series[0].x.length !== 60319) {
  console.error("expected 60319 series points, got", source.series[0] && source.series[0].x.length);
  process.exit(1);
}

var project = core.createProject({ projectName: "segment-acceptance" });
core.addDataset(project, source);

t0 = Date.now();
var runs = core.detectStepRuns(source);
var detectMs = ms(t0);
if (runs.length !== 10) {
  console.error("expected 10 step runs, got", runs.length, runs.map(function (run) {
    return run.index + ":" + run.name + ":" + run.rowCount;
  }));
  process.exit(1);
}

var step3 = runs.filter(function (run) { return run.index === "3"; });
if (step3.length !== 1 || step3[0].name !== "放电 CC" || step3[0].rowCount !== 10529) {
  console.error("step 3 mismatch", step3);
  process.exit(1);
}

t0 = Date.now();
var discharge = core.createSegment(project, {
  id: "seg-3",
  name: "放电 CC",
  sourceDatasetId: source.id,
  rangeType: "step",
  rangeDefinition: { stepIndex: "3", runIds: [step3[0].id] }
});
var segmentMs = ms(t0);
if (core.rowRangeCount(discharge.selectedRowRanges) !== 10529) {
  console.error("segment row count", core.rowRangeCount(discharge.selectedRowRanges));
  process.exit(1);
}
if (discharge.headers.length !== 94) {
  console.error("segment headers", discharge.headers.length);
  process.exit(1);
}

t0 = Date.now();
var exported = core.exportSegmentCsv(project, discharge.id, { encoding: "utf-8" });
var exportMs = ms(t0);
if (exported.rowCount !== 10529 || exported.headers.length !== 94) {
  console.error("export size", exported.rowCount, exported.headers.length);
  process.exit(1);
}
if (exported.text.indexOf("工步名称") < 0 || exported.text.indexOf("放电 CC") < 0) {
  console.error("export lost Chinese step fields");
  process.exit(1);
}

t0 = Date.now();
var reimported = core.parseDatasetFromCsv(exported.text, { id: "ds-re", name: "re.csv" });
var reimportMs = ms(t0);
if (reimported.headers.length !== 94 || reimported.series[0].x.length !== 10529) {
  console.error("reimport size", reimported.headers.length, reimported.series[0].x.length);
  process.exit(1);
}

var split = core.splitDatasetBySteps(project, source.id);
if (split.length !== 10) {
  console.error("split count", split.length);
  process.exit(1);
}

var zip = core.exportSegmentsZip(project, split.slice(0, 2).map(function (item) { return item.id; }), { encoding: "utf-8" });
if (zip.files.length !== 2 || zip.bytes[0] !== 0x50) {
  console.error("zip failed", zip.files);
  process.exit(1);
}

var json = core.serializeProject(project);
var opened = core.parseProject(json);
if (!core.findDataset(opened, "seg-3") || core.listSegments(opened, source.id).length !== 11) {
  console.error("project roundtrip lost segments", core.listSegments(opened, source.id).length);
  process.exit(1);
}

var extraIds = {};
var extraN;
for (extraN = 1; extraN <= 5; extraN += 1) {
  var extra = core.createSegment(project, {
    name: "重叠 " + extraN,
    sourceDatasetId: source.id,
    rangeType: "row",
    rangeDefinition: { startRow: extraN * 1000, endRow: extraN * 1000 + 2000 }
  });
  if (extraIds[extra.id]) {
    console.error("duplicate extra segmentId", extra.id);
    process.exit(1);
  }
  extraIds[extra.id] = extra;
}
if (Object.keys(extraIds).length !== 5) {
  console.error("expected 5 extra overlapping segments");
  process.exit(1);
}
var extraList = core.listSegments(project, source.id).filter(function (item) {
  return extraIds[item.id];
});
var extraSecond = extraList[1];
var extraThird = extraList[2];
var extraThirdRows = core.rowRangeCount(extraThird.selectedRowRanges);
core.updateSegment(project, extraSecond.id, {
  rangeType: "row",
  rangeDefinition: { startRow: 2000, endRow: 2100 }
});
if (core.rowRangeCount(core.findDataset(project, extraThird.id).selectedRowRanges) !== extraThirdRows) {
  console.error("editing extra 2 mutated extra 3");
  process.exit(1);
}
var extraSaved = core.createSegment(project, {
  name: "重叠 6",
  sourceDatasetId: source.id,
  rangeType: extraThird.rangeType,
  rangeDefinition: extraThird.rangeDefinition
});
if (extraSaved.id === extraThird.id || !core.findDataset(project, extraThird.id)) {
  console.error("save-as overwrote extra 3");
  process.exit(1);
}
if (source.series[0].x.length !== 60319) {
  console.error("overlapping create mutated source length");
  process.exit(1);
}

var gbkBytes = core.exportSegmentCsv(project, discharge.id, { encoding: "gb18030" }).bytes;
var decoded = new TextDecoder("gb18030").decode(gbkBytes);
if (decoded.indexOf("放电 CC") < 0 || decoded.indexOf("\uFFFD") >= 0) {
  console.error("gb18030 export lost Chinese");
  process.exit(1);
}

console.log("parseMs", parseMs);
console.log("detectMs", detectMs);
console.log("segmentMs", segmentMs);
console.log("exportMs", exportMs);
console.log("reimportMs", reimportMs);
console.log("runs", runs.map(function (run) {
  return run.index + " " + run.name + " " + run.rowCount;
}).join(" | "));
console.log("segment acceptance passed");
