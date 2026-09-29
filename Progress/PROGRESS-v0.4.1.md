# Visualizer v0.4.1

## Version Goal

把三件已经影响使用的基础问题做对：右侧属性按对象折叠，局部图按当前 X 窗口展开 Y，顶部工具栏让出画布高度。

软件版本：`0.4.1`（只改 `APP_INFO.version`）  
工程格式：`projectFormatVersion: "1.0"`（未升格式版本）  
文档结构：`schemaVersion: 2`  
正式版：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.4.1

## 如何运行

仓库根目录用 Chrome 或 Edge 打开 `temperature_trajectory_visualizer.html`，同目录需要 `visualizer-core.js`。开发调试可执行 `python3 -m http.server`。核心测试：`node tests/core-test.js`。仓库没有 lint、typecheck 或 build 脚本；语法检查用 `node --check visualizer-core.js`。

## 已完成

- 右侧属性改成可折叠 Accordion。主图分组为图表、X Axis、Y Axis、图例、数据系列、局部视图、标注与引导线、导出设置。局部图分组为局部视图、范围与缩放、标题、X/Y Axis、图例、来源框与引导线等。轴内部再分轴线与刻度、轴标题、范围与缩放。默认只展开当前对象最相关的一组。展开状态记在内存，重绘不重置，不写入工程。
- 「导出时绘制固定游标」在导出设置。「重置视图」在主图 X 轴的范围与缩放。字号和文字样式跟对应文字放在一起。
- 局部图 Y 有三种模式：`follow-main`、`auto-window`、`manual`。新建局部图默认 `auto-window`，边距 5%。自动范围只取当前可见 Series 在当前 X 窗口内的有限点，再按 Y span 的百分比扩边。隐藏曲线、NaN、Infinity、null 不参与。窗口无数据时保留上次有效 Y。手动范围原样交给绘图。属性优先显示当前窗口和跨度，「适配当前 X 范围」切回自动窗口。
- 顶部收成约 52px 的一行：版本、工程名和保存状态，以及导入、新建、打开、保存（含另存为）、新建图、布局、预览、导出（PNG / SVG）、关于。副标题移到关于。

## 修改文件

- `visualizer-core.js`
- `temperature_trajectory_visualizer.html`
- `tests/core-test.js`
- `README.md`
- `DEVLOG.md`
- `.agents/skills/visualizer-dev/SKILL.md`
- `Progress/PROGRESS-v0.4.1.md`（本文件；不覆盖 v0.4.0）

## 新增数据字段与兼容

局部图 `detailSource` 增加：

- `yRangeMode`：`"follow-main"` | `"auto-window"` | `"manual"`
- `yPaddingRatio`：0–0.5，默认 0.05

`autoFitY` 仍写入，值为 `yRangeMode === "auto-window"`。旧工程没有 `yRangeMode` 时：`autoFitY === false` 视为手动，否则视为当前窗口自动适配。Accordion 展开状态不进工程 JSON。`projectFormatVersion` 仍是 `"1.0"`。

## 测试

`node tests/core-test.js` 通过。覆盖窗口 Y、隐藏 Series、三种模式、0% / 5% 边距、零跨度、NaN / Infinity、空窗口、手动范围、改 X 后重算、Accordion 记忆、旧工程 `autoFitY` 回退，以及工具栏按钮仍在页面中。

浏览器（Cursor 内置 Chromium，`http://127.0.0.1:8765/`）核对：顶栏高度 52px；主图默认只展开「图表」；改名称重绘后手动展开的 X Axis 仍展开；局部图 X 1550–1800、自动窗口、5% 边距时 domain 为 34.8–39.2，四条曲线在绘图区内纵向约占 91%；边距 0% / 10%、手动 35–39、跟随主图、适配按钮和隐藏 Series 都改变同一套 domain。没有另开系统 Chrome / Edge。

## 已知限制

- 还没有统一的 `selectedObject` 状态模型。上下文仍由当前图类型，加上已有的标注 / 局部图选中决定。
- 局部图折线会在窗口两侧各保留一个邻点，靠裁剪进入绘图区，避免窗口边缘断线。
- 顶栏是单行。窗口很窄时按钮会挤在一起，不另做第二行。
- 图层列表仍不能拖拽排序。锁定只挡住画布拖动和缩放。

## 下一步

停在 v0.4.1。若继续，优先做选中对象驱动的属性焦点（图例、引导线、文字各自只显示自己的 Section），以及图层列表拖拽排序。不要接着做 Formula、MAE / RMSE、Results、双 Y 轴、Heatmap、3D 或桌面打包。
