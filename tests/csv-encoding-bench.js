#!/usr/bin/env node
"use strict";

var fs = require("fs");
var os = require("os");
var path = require("path");
var { spawnSync } = require("child_process");
var core = require("../visualizer-core.js");

var utf8Path = process.env.VISUALIZER_CSV
  || "/Users/elssssa/Downloads/2026-10-24@19-44-13_0.33C_UTF8.CSV";
if (!fs.existsSync(utf8Path)) {
  console.error("missing full CSV:", utf8Path);
  process.exit(2);
}

function ms(start) {
  return Math.round((Date.now() - start));
}

var tmpGbk = path.join(os.tmpdir(), "visualizer-0.33C-gb18030.csv");
var py = spawnSync("python3", ["-c",
  "from pathlib import Path\n"
  + "src = Path(" + JSON.stringify(utf8Path) + ")\n"
  + "dst = Path(" + JSON.stringify(tmpGbk) + ")\n"
  + "dst.write_bytes(src.read_text(encoding='utf-8').encode('gb18030'))\n"
  + "print(dst.stat().st_size)\n"
], { encoding: "utf8" });
if (py.status !== 0) {
  console.error(py.stderr || py.stdout);
  process.exit(1);
}

var utf8Bytes = fs.readFileSync(utf8Path);
var gbkBytes = fs.readFileSync(tmpGbk);
console.log("utf8 bytes", utf8Bytes.length);
console.log("gb18030 bytes", gbkBytes.length);

var t0 = Date.now();
var utf8Det = core.detectCsvEncoding(utf8Bytes);
var utf8DecodeMs = ms(t0);
if (utf8Det.needsManualChoice || utf8Det.encoding !== "utf-8") {
  console.error("UTF-8 full file not auto-detected", utf8Det.encoding, utf8Det.needsManualChoice);
  process.exit(1);
}

t0 = Date.now();
var utf8Ds = core.parseDatasetFromCsv(utf8Det.text, { id: "ds-utf8", name: "utf8.csv" });
var utf8ParseMs = ms(t0);

t0 = Date.now();
var gbkDet = core.detectCsvEncoding(gbkBytes);
var gbkDecodeMs = ms(t0);
if (gbkDet.needsManualChoice || (gbkDet.encoding !== "gb18030" && gbkDet.encoding !== "gbk")) {
  console.error("GB18030 full file not auto-detected", gbkDet.encoding, gbkDet.needsManualChoice);
  process.exit(1);
}
if (gbkDet.text.indexOf("\uFFFD") >= 0) {
  console.error("GB18030 decode contains U+FFFD");
  process.exit(1);
}

t0 = Date.now();
var gbkDs = core.parseDatasetFromCsv(gbkDet.text, {
  id: "ds-gbk",
  name: "gbk.csv",
  sourceEncoding: gbkDet.encoding
});
var gbkParseMs = ms(t0);

var dataRows = gbkDs.series[0] ? gbkDs.series[0].x.length : 0;
var cols = gbkDs.headers.length;
if (dataRows !== 60319) {
  console.error("expected 60319 data rows, got", dataRows);
  process.exit(1);
}
if (cols !== 94) {
  console.error("expected 94 columns, got", cols);
  process.exit(1);
}

var header = gbkDs.headers.join(",");
if (header.indexOf("序号") < 0 || header.indexOf("时间(s)") < 0 || header.indexOf("温度") < 0) {
  console.error("Chinese headers missing:", gbkDs.headers.slice(0, 12).join("|"));
  process.exit(1);
}
if (JSON.stringify(utf8Ds.headers) !== JSON.stringify(gbkDs.headers)) {
  console.error("UTF-8 and GB18030 headers differ");
  process.exit(1);
}

console.log("headers0", gbkDs.headers.slice(0, 8).join(" | "));
console.log("xName", gbkDs.xName, "xUnit", gbkDs.xUnit, "xHeader", gbkDs.xHeader);
console.log("series", gbkDs.series.length, "warnings", (gbkDs.warnings || []).length);
console.log("utf8 decode_ms", utf8DecodeMs, "parse_ms", utf8ParseMs, "total_ms", utf8DecodeMs + utf8ParseMs);
console.log("gb18030 decode_ms", gbkDecodeMs, "parse_ms", gbkParseMs, "total_ms", gbkDecodeMs + gbkParseMs);
console.log("PASS 60319 x 94");
