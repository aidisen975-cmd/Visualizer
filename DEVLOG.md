# DEVLOG

## 本轮版本

- 软件版本：`0.2.1`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本，缺字段由 `parseProject` normalize）
- 日期：2026-09-18

v0.2.1 是画布编辑、图例管理、多图排版与科研出图体验优化，增量叠加在 v0.2.0 上，不重写引擎。

## 如何运行

1. 用浏览器直接打开 `temperature_trajectory_visualizer.html`（需同目录的 `visualizer-core.js`）。
2. 或在仓库根目录执行 `python3 -m http.server` 后访问该页面。
3. 核心数据测试：`node tests/core-test.js`

## 本轮目标

1. 数据簇折叠后显示已选数量。
2. 左/中/右栏可拖动改宽、可折叠。
3. Canvas Zoom 与图表真实尺寸分离。
4. Series originalName / displayName 与批量重命名。
5. Legend 成为可配置对象（停靠 / 浮动 / 多列）。
6. 工程名与保存文件名、浏览器标题统一。
7. 图表 Width/Height 与拖拽 resize 双向同步。
8. 多图布局模板 + 磁吸。
9. 坐标轴手动刻度与校验。

## 本轮实际完成

- 数据簇 header：`55条 · 已选17`；折叠不丢 selection。
- 左右 splitter、双击恢复默认宽、面板折叠按钮；宽度写入 `project.ui`。
- Canvas Zoom 25%–300%，`[-] [%] [+] [适应窗口] [100%]`；Ctrl/Cmd+滚轮 / +/- / 0；Fit View；坐标用 `screenToWorld` / `worldToScreen`。
- Series 增加 `originalName` / `displayName`；单条改名与批量预览（查找替换、去前后缀、加前后缀、`T{n}` / `{original}`）。
- Legend：显示、位置、字体、行列、列数、线样、maxWidth；拖顶部细条可停靠或浮动。
- 保存/另存为后 `projectName` 取文件 basename；打开「未命名工程」且带文件名时回退 basename；去掉属性栏工程名称输入框。
- 属性栏 Width/Height 绑定 `plot.layout`；拖角 resize 实时同步；可锁宽高比。
- 布局模板：单图、1:1、左大右小、左小右大、三等分、一大两小、2×2、3×2。
- Snap：画布边、他图边、中心、resize 边、等间距候选。
- 轴：自动/手动刻度、主间隔、次刻度、小数位；非法间隔拒绝；超过 500 主刻度拒绝。
- 属性栏改为 accordion：图表 / 数据系列 / 图例 / X轴 / Y轴 / 布局。

## 数据模型变化

均为向后兼容可选字段，加载时 normalize：

- Project：`softwareVersion: "0.2.1"`；`ui`（panel 宽、折叠、canvasZoom）；`canvas.zoom` 与 `ui.canvasZoom` 同步。
- Series：`originalName` / `displayName`。旧工程从 `name` / `label` / `originalHeader` 回填。
- Plot：`legend` 对象、`lockAspect`、`aspectRatio`。保留 `legendVisible`。
- Axis：`tickMode` / `majorTick` / `minorTickMode` / `minorTick` / `formatMode` / `decimals`。
- 默认新图尺寸 1280×800（图表尺寸，不是 CSS zoom）。

## 明确未做 / 简化

- 未做 Undo/Redo（v0.2.0 也没有）。
- 布局模板作用于当前画布全部图，尚未做多选图。
- 等间距吸附有对齐，没有在辅助线上画「24」数值标签。
- PNG/SVG 仍导出整张画布（SOP：Canvas 是导出区）；图按真实 layout 绘制，Canvas Zoom 不进入导出。未另做「只导出选中单图」按钮。
- 图例拖动用顶部 10px 把手，避免挡住图例点击显隐。
- 不引入 Regex 命名编辑器。
- 系统保存对话框仍需真实用户手势，本轮未端到端点选目录。

## 验证

### Node（已执行）

`node tests/core-test.js`：全部通过。覆盖 migration、batch rename、坐标变换、layout、tick 校验、snap、legend 多列。

### 浏览器（已执行，macOS / Cursor 内置浏览器，1440×900）

- 折叠 `119条 · 已选17`，再展开仍选 17。
- Zoom = 50%/61% 时属性栏仍 1280×800。
- Fit View 缩到约 61% 以容纳 1280×800 图。
- 手输宽度 1600 后 layout.width 变为 1600；锁比例时高度跟随。
- 2×2 模板把四图改为 588×348，属性栏同步。
- 手动刻度 500 的 SVG 含 500、1000。
- 打开 v0.1.0 工程：标题为工程名，legend/tick 有默认值。
- 布局弹出 8 个模板。
- 折叠左栏后画布变宽。
- 无工程名称输入框。

## 已知限制

- 极大数量图例仍可能超出 maxHeight；会提示批量重命名，不偷偷删项。
- 窄视口下三栏仍会挤压画布。
- 等间距提示没有数值标签。

## 下一步

停在 v0.2.1，等实际排图反馈。后续可补：多选图布局、单图导出、等距数值标签、Undo。

---

## 上一轮 v0.2.0

- 软件版本：`0.2.0`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本）
- 日期：2026-09-18

v0.2.0 是通用数据适配 + 基础交互补强版。目标不是扩展完整 V1 功能数量，而是修正 v0.1.0 使用中暴露的 CSV 解析、数据选择、工程保存、坐标轴语义和图例布局问题。

## 如何运行

1. 用浏览器直接打开 `temperature_trajectory_visualizer.html`（需同目录的 `visualizer-core.js`）。
2. 或在仓库根目录执行 `python3 -m http.server` 后访问该页面。
3. 核心数据测试：`node tests/core-test.js`

拆出 `visualizer-core.js` 的原因：数据模型与工程解析无 DOM，才能用 Node 做最小可运行检查；页面仍通过本地 `<script>` 引用，无 CDN、无构建链。

## 本轮目标

1. 数据列批量选择（全选 / 全不选 / Shift 范围 / Ctrl 点选 / Cmd+A）。
2. CSV 从温度专用识别改为通用工程数值列识别。
3. Dataset 折叠 / 展开。
4. Legend 参与 Plot layout，不再压住曲线。
5. X/Y 轴标题与单位自动识别。
6. 工程 Save / Save As（优先 File System Access API）。
7. X/Y 轴标题可人工编辑，并可恢复自动识别。

## 本轮实际完成

- CSV 只要存在可绘制数值列即可导入；不再要求 T1…TN 或温度字段。
- `parseColumnHeader()` 解析 `Name(unit)` / `Name [unit]` / `Name / unit`；不猜测未写出的单位；不把 `battery_temp_max` 的 `max` 当单位。
- Series 保留 `originalHeader`、`name`、`unit`；空表头使用 `Column N`。
- Plot 轴增加 `autoTitle` / `customTitle` / `titleMode`；显示标题为 custom 优先，否则 auto。
- Data 面板：Dataset 手风琴、全选/全不选、Shift 连选、Ctrl/Cmd 点选、Data 上下文中的 Cmd/Ctrl+A；文本框中的全选不被劫持。
- Legend 默认 Top / Auto，自动换行并占用 layout 高度；Preview / PNG / SVG 仍共用 `buildCanvasSvg()`。
- 工具栏：新建工程、打开工程、保存、另存为。支持 File System Access API 的浏览器可选择路径并写回；否则下载 `.tvproj.json`。

## 数据模型变化

新增均为向后兼容可选字段，加载时 normalize：

- Project：继续使用已有 `projectName`（旧工程缺省为「未命名工程」）。`projectFormatVersion` 仍为 `"1.0"`。
- Dataset：`xHeader` / `xName` / `xUnit` / `xIsTime` / `warnings`。旧工程缺省视为时间横轴。
- Series：`originalHeader` / `name` / `unit`。旧工程从 `sourceLabel` / `label` 回填。
- Plot axis：`autoTitle` / `customTitle` / `titleMode`。旧工程缺省 `titleMode: "auto"`，打开后按当前 Series 计算 `autoTitle`。

不原地改写源 JSON 文本；`parseProject` 走 validate → normalize → working project。

## CSV parser 变化

- 删除温度专用拒绝条件：「没有识别到 T1…TN 传感器列，也没有识别到温度、温差或 delta 数值列」。
- 有效非空单元格绝大多数可解析为有限数字 → 数值 Series；允许空值 / NA。
- 纯文本列跳过并给出 warning，不导致整表失败。
- X 列优先识别 Time / Timestamp / Seconds / t / 时间 等；否则使用第一数值列。
- 无数值 X：`无法确定有效横坐标列。`
- 无可绘 Series：`未找到可绘制的数值数据列。`

## Save / Save As 实现

- 另存为：有 `showSaveFilePicker` 时总是弹出系统保存窗口。
- 保存：已有可写 `fileHandle` 则直接写回；否则等同首次另存为。
- 打开：优先 `showOpenFilePicker` 以保留 handle；否则回退 `input[type=file]`。
- 文件名保证 `*.tvproj.json`，避免 `.json.json`。
- 保存成功 `dirty = false`；失败不清除 dirty。
- 无 File System Access API 时下载，并轻量提示将使用下载方式。

## Axis title 变化

- 单条 Voltage(V) → `Voltage (V)`。
- T1(°C)+T2(°C)+T3(°C) → `Temperature (°C)`。
- 中文入口/出口温度且单位相同 → `温度 (°C)`。
- 多单位混合 → `Value`。
- 同名不同单位 → 仅名称，不加错误单位。
- 用户编辑后 `titleMode = custom`；加 Series 不覆盖自定义标题；「恢复自动」回到 `autoTitle`。

## 明确未做（完整 V1 / 后续）

Formula、MAE/RMSE、Results、Split、Selection、Local Zoom、Inset、Annotation、Cursor / Data Inspector、Dual Y Axis、轴联动、吸附对齐、布局锁定、工程缩略图、Electron/Tauri。界面不展示这些功能的假按钮。

## 验证

### Node（已执行）

`node tests/core-test.js`：65 passed，0 failed。

保留 v0.1.0 核心测试，并新增 generic CSV、header metadata、多单位 Y title、custom/titleMode round-trip、v0.1.0 旧工程打开、损坏 JSON、不支持版本等。

测试数据：

- `tests/fixtures/TESTDATA_exp_25C.csv`
- `tests/fixtures/TESTDATA_sim_25C.csv`
- `tests/fixtures/TESTDATA_temperature.csv`
- `tests/fixtures/TESTDATA_electrical.csv`
- `tests/fixtures/TESTDATA_chinese.csv`
- `tests/fixtures/TESTDATA_generic.csv`
- `tests/fixtures/TESTDATA_119_series.csv`
- `tests/fixtures/TESTDATA_mixed_units.csv`
- `tests/fixtures/TESTDATA_unknown_headers.csv`
- `tests/fixtures/TESTDATA_v010.tvproj.json`

### 浏览器（已执行，macOS / Cursor 内置浏览器）

通过本地 `http://127.0.0.1:8771/` 交互检查：

- 导入 temperature / electrical / chinese / generic / 119-series / mixed-units；非温度 CSV 正常。
- Dataset 展开 / 折叠 / 再展开；删除 chinese 后 electrical 仍保持折叠。
- 119 Series：全选、全不选、Shift T5–T20、Ctrl 取消/加入、Cmd+A。
- 标题输入框中 Cmd+A 不劫持为 Series 全选。
- 1 / 3 / 10 / 20 条曲线的 Legend 在绘图区上方自动换行，几何上低于 plotArea 顶边，不覆盖曲线。
- 温度图 Y = Temperature (°C)；电压图 Y = Voltage (V)；温度+电压 Y = Value。
- 自定义 X `Elapsed Time / s` 后 Preview / 画布 SVG 同步；恢复自动后 Y 回到 Temperature (°C)，自定义 X 保持。
- 打开 v0.1.0 工程：缺 `autoTitle` / `customTitle` / `titleMode` 仍成功；手动 X 范围恢复。
- 损坏 JSON 与 `projectFormatVersion: "9.9"` 报错且不清空当前工程。
- Preview 与 canvas SVG 路径数一致（37），含标题、图例、轴标题、曲线。本浏览器存在 `showSaveFilePicker` / `showOpenFilePicker`。

未在自动化会话中走完操作系统保存对话框的选目录/覆盖确认（需要真实用户手势）。写回已有 handle 的 Save 因此未做端到端文件对照。无 File System Access API 的浏览器回退下载路径已实现，本 Chromium 走真实 picker，未在该浏览器里触发下载回退。

## 已知限制

- 窄视口下三栏可能挤压画布；长 Dataset 名称在折叠头中可能被截断。
- 手动坐标若 min/max 未填全，仍回退自动范围。
- Plot 过多时默认级联可能超出画布，需手动拖回。
- 119 条 Legend 会换行并压缩 plotArea；极大数量时截断为可见行 + `+N`，曲线仍绘制。
- 未保存提示依赖 `beforeunload`，浏览器实现不一致。
- 本轮不引入 Dual Y Axis；多单位图的自动 Y 标题安全退化为 `Value`。

## 下一步

停在 v0.2.0，等待实际使用反馈后再决定是否进入 v0.3.0。

建议 v0.3.0 候选（需用户确认）：

- Selection
- Local Zoom
- 手动时间窗
- Cursor
- Data Inspector
