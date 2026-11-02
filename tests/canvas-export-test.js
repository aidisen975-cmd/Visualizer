var fs = require("fs");
var path = require("path");
var http = require("http");
var child = require("child_process");

var root = path.join(__dirname, "..");
var chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
var failed = 0;

function check(name, ok) {
  if (!ok) {
    failed += 1;
    console.error("FAIL " + name);
    return;
  }
  console.log("PASS " + name);
}

function hasLabel(list, label) {
  return (list || []).indexOf(label) >= 0;
}

var probeSource = fs.readFileSync(path.join(__dirname, "canvas-export-probe.js"), "utf8");

function startServer() {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      var file = path.normalize(path.join(root, urlPath));
      if (file.indexOf(root) !== 0) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(file, function (err, buf) {
        if (err) {
          res.writeHead(404);
          res.end(urlPath);
          return;
        }
        var type = "text/html; charset=utf-8";
        if (file.endsWith(".js")) type = "text/javascript; charset=utf-8";
        res.writeHead(200, { "content-type": type });
        res.end(buf);
      });
    });
    server.listen(0, "127.0.0.1", function () { resolve(server); });
  });
}

function waitForOpen(ws) {
  return new Promise(function (resolve, reject) {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
}

function cdp(ws) {
  var id = 0;
  var pending = new Map();
  ws.addEventListener("message", function (event) {
    var msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    var done = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) done.reject(new Error(JSON.stringify(msg.error)));
    else done.resolve(msg.result);
  });
  return function send(method, params) {
    var seq = ++id;
    return new Promise(function (resolve, reject) {
      pending.set(seq, { resolve: resolve, reject: reject });
      ws.send(JSON.stringify({ id: seq, method: method, params: params || {} }));
    });
  };
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function debugPort(profile) {
  for (var i = 0; i < 50; i += 1) {
    var file = path.join(profile, "DevToolsActivePort");
    if (fs.existsSync(file)) {
      var port = fs.readFileSync(file, "utf8").split("\n")[0].trim();
      if (port) return port;
    }
    await sleep(100);
  }
  throw new Error("DevToolsActivePort missing");
}

async function main() {
  if (!fs.existsSync(chrome)) throw new Error("chrome missing");
  var tmpDir = path.join(root, "tmp", "v072i");
  fs.mkdirSync(tmpDir, { recursive: true });
  var profile = path.join(tmpDir, "chrome-profile");
  fs.rmSync(profile, { recursive: true, force: true });
  var server = await startServer();
  var port = server.address().port;
  var browser = child.spawn(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    "--remote-allow-origins=*",
    "--user-data-dir=" + profile,
    "about:blank"
  ], { stdio: "ignore" });
  var report = null;
  try {
    var debug = await debugPort(profile);
    var version = await fetch("http://127.0.0.1:" + debug + "/json/version").then(function (res) { return res.json(); });
    var browserWs = new WebSocket(version.webSocketDebuggerUrl);
    await waitForOpen(browserWs);
    var browserSend = cdp(browserWs);
    var created = await browserSend("Target.createTarget", {
      url: "http://127.0.0.1:" + port + "/temperature_trajectory_visualizer.html"
    });
    var list = await fetch("http://127.0.0.1:" + debug + "/json/list").then(function (res) { return res.json(); });
    var page = list.find(function (item) { return item.id === created.targetId; });
    if (!page) throw new Error("page target missing");
    var pageWs = new WebSocket(page.webSocketDebuggerUrl);
    await waitForOpen(pageWs);
    var send = cdp(pageWs);
    await send("Runtime.enable");
    var ready = false;
    for (var i = 0; i < 50; i += 1) {
      var ping = await send("Runtime.evaluate", {
        expression: "!!(window.VisualizerApp && window.VisualizerCore)",
        returnByValue: true
      });
      if (ping.result && ping.result.value === true) {
        ready = true;
        break;
      }
      await sleep(200);
    }
    if (!ready) throw new Error("visualizer did not start");
    var evaluated = await send("Runtime.evaluate", {
      expression: "(" + probeSource + ")()",
      awaitPromise: true,
      returnByValue: true,
      timeout: 30000
    });
    if (evaluated.exceptionDetails) {
      throw new Error(JSON.stringify(evaluated.exceptionDetails.exception || evaluated.exceptionDetails));
    }
    report = evaluated.result && evaluated.result.value;
    pageWs.close();
    browserWs.close();
  } finally {
    browser.kill();
    server.close();
  }
  if (!report) throw new Error("probe returned nothing");
  if (report.error) console.error(report.error);
  var outDir = tmpDir;
  if (report.png) {
    fs.writeFileSync(path.join(outDir, "canvas.png"), Buffer.from(report.png, "base64"));
    delete report.png;
  }
  if (report.svg) {
    fs.writeFileSync(path.join(outDir, "canvas.svg"), report.svg);
    delete report.svg;
  }
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  check("probe ran", report.ok === true && !report.error);
  check("one main plot is exported", hasLabel(report.alone, "主图左") && report.alone.length === 1);
  check("two main plots are exported", hasLabel(report.pair, "主图左") && hasLabel(report.pair, "温度右"));
  var facts = report.facts || [];
  function fact(label) {
    return facts.find(function (item) { return item.label === label; }) || null;
  }
  var parent = fact("主图左");
  var detail = fact(report.detailName || "局部视图 1");
  var right = fact("温度右");
  check("parent with a local view stays in the canvas svg", !!parent && parent.paths > 0);
  check("local view stays in the canvas svg", !!detail && detail.paths > 0);
  check("sibling without a local view stays in the canvas svg", !!right && right.paths > 0);
  check("other canvas is not pulled into this export", facts.every(function (item) { return item.label !== "别的画布"; }));
  check("dashed connector is drawn", report.dashed > 0);
  check("parent uses its instance origin", parent && /translate\(\s*48[\s,]+\s*36\s*\)/.test(parent.transform));
  check("parent draw size is the instance size", parent && parent.width > 240 && parent.height > 180);
  check("parent plot id is on the export group", parent && parent.plotId === report.plotA);
  check("parent instance id is on the export group", parent && parent.instanceId === report.instA);
  var regions = report.regions || {};
  check("opened png shows the parent plot", regions["主图左"] && regions["主图左"].ink > 8);
  check("opened png shows the local view", regions[report.detailName || "局部视图 1"] && regions[report.detailName || "局部视图 1"].ink > 8);
  check("opened png shows the sibling plot", regions["温度右"] && regions["温度右"].ink > 8);
  check("hidden instance leaves the export", !hasLabel(report.hidden, "温度右") && hasLabel(report.hidden, "主图左"));
  ["主图左", "温度右", "图3", "图4", "图5", "图6", report.detailName || "局部视图 1"].forEach(function (label) {
    check("six-plot export keeps " + label, hasLabel(report.six, label));
  });
  check("six-plot export does not include the other canvas", !hasLabel(report.six, "别的画布"));
  check("save and reopen keeps the parent", hasLabel(report.reopened, "主图左") && hasLabel(report.reopened, report.detailName || "局部视图 1"));
  if (failed) {
    console.error(failed + " canvas export checks failed");
    process.exit(1);
  }
  console.log("canvas export checks passed");
}

main().catch(function (error) {
  console.error(error && error.stack || error);
  process.exit(1);
});
