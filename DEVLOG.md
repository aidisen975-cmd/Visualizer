# DEVLOG

本文件放在仓库根目录，只追加、不覆盖，用于完整记录开发全过程。当前版本、如何运行和下一步见 [PROGRESS-v0.2.4.md](Progress/PROGRESS-v0.2.4.md)。

---

## 2026-09-17 仓库初始化

- 提交：`23a5483 chore: initialize Visualizer with project-scoped skill`
- 日期：2026-09-17

纳入 SOP、`AGENTS.md`、项目 skill、`.gitignore`，以及当时的单文件原型 `temperature_trajectory_visualizer.html`。尚未建立 P0 数据模型、工程文件和 `visualizer-core.js`。

---

## v0.1.0

- 软件版本：`0.1.0`
- 工程格式：`projectFormatVersion: "1.0"`
- 分支：`feat/v0.1.0`
- 日期：2026-09-17
- 提交：`0d67db0 feat: ship v0.1.0 workbench with P0 data model`

v0.1.0 完成 SOP 第 32 节 **P0 数据模型**，并打通最小可用主链（多源导入、建图、自由布局、工程保存/打开、预览、PNG/SVG）。**不是** SOP 中的完整 V1。

拆出 `visualizer-core.js` 的原因：数据模型与工程解析无 DOM，才能用 Node 做最小可运行检查；页面仍通过本地 `<script>` 引用，无 CDN、无构建链。

### 本轮实际完成

- Project / Dataset / Series / Plot / Canvas 分离。
- Series 使用 `datasetId::localId`，每条曲线独立 `x[]` / `y[]`。
- Plot 只引用 Series ID，可跨 Dataset 组图。
- 工作台：导入、新建工程、打开、保存、新建图、预览、导出 PNG/SVG。
- Data 面板多选曲线加入指定 Plot；Canvas 上创建/选择/移动/缩放/删除 Plot。
- 属性：标题、副标题、备注、曲线显隐与颜色、X/Y 自动或手动范围。
- `.tvproj.json` 嵌入原始 CSV 与本轮已实现的图、样式、坐标、布局。
- 预览/导出共用 `buildCanvasSvg()`，只含画布内容。
- 中文界面；空状态、错误提示、未保存标记。

### 明确未做（完整 V1 / 后续）

Formula、MAE/RMSE、Results、Split、Selection、Inset、Annotation、Cursor / Data Inspector、轴联动、吸附对齐、布局锁定、工程缩略图。界面不展示这些功能的假按钮。

### 验证

#### Node（已执行）

`node tests/core-test.js` 全部通过。覆盖：两个标注为测试数据的 CSV（同名列 T1/T2、不同采样时间轴）、唯一 ID、跨源引用、工程往返、损坏 JSON、不支持版本、无效 CSV。解析失败不改写当前工程对象。

测试数据：

- `tests/fixtures/TESTDATA_exp_25C.csv`
- `tests/fixtures/TESTDATA_sim_25C.csv`

#### 浏览器（已执行，macOS / Cursor 内置浏览器）

通过本地 `http://127.0.0.1:8770/` 交互检查：

- 导入两个测试 CSV；ID 为 `ds-exp::T1` 与 `ds-sim::T1`，无冲突。
- 新建图，勾选实验 T1/T2 与仿真 T1 加入同一 Plot。
- 修改标题/副标题/备注、隐藏仿真 T1、改颜色、X 轴手动 0–20。
- 第二张图、指针移动与缩放布局。
- 无效 CSV、损坏工程、`projectFormatVersion: "9.9"` 均报错且不清空现有工程。
- `serializeProject` 后再 `openProjectText(..., { force: true })` 恢复图、显隐、颜色、坐标、布局、嵌入 CSV。
- 预览与导出来自同一画布 SVG；SVG 含标题/图例/两张图，不含工具栏；PNG 约 59 KB 且可栅格化。

未验证：Windows、`file://` 直接打开、真实下载文件后再用系统文件选择器打开（打开路径与 `openProjectText` 相同）。

### 已知问题

- 窄视口下三栏可能挤压画布；属性面板需较宽窗口。
- 手动坐标若 min/max 未填全，仍回退自动范围。
- Plot 过多时默认级联可能超出画布，需手动拖回。
- 属性面板中同名曲线现已带数据源前缀；图例在曲线很多时可能换行拥挤。
- 未保存提示依赖 `beforeunload`，浏览器实现不一致。

### 下一步（当时建议，按 SOP 38）

1. Split 自动/手动。
2. Cursor 与 Data Inspector。
3. Selection / Local Zoom / Inset。
4. Annotation。
5. Formula 与 MAE/RMSE / Results。
6. Windows 与 `file://` 补测。

---

## v0.2.0

- 软件版本：`0.2.0`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本）
- 日期：2026-09-18
- 入库：与 v0.2.1 同提交 `3cbcc18`（当时未单独打 tag）

v0.2.0 是通用数据适配 + 基础交互补强版。目标不是扩展完整 V1 功能数量，而是修正 v0.1.0 使用中暴露的 CSV 解析、数据选择、工程保存、坐标轴语义和图例布局问题。

### 本轮目标

1. 数据列批量选择（全选 / 全不选 / Shift 范围 / Ctrl 点选 / Cmd+A）。
2. CSV 从温度专用识别改为通用工程数值列识别。
3. Dataset 折叠 / 展开。
4. Legend 参与 Plot layout，不再压住曲线。
5. X/Y 轴标题与单位自动识别。
6. 工程 Save / Save As（优先 File System Access API）。
7. X/Y 轴标题可人工编辑，并可恢复自动识别。

### 本轮实际完成

- CSV 只要存在可绘制数值列即可导入；不再要求 T1…TN 或温度字段。
- `parseColumnHeader()` 解析 `Name(unit)` / `Name [unit]` / `Name / unit`；不猜测未写出的单位；不把 `battery_temp_max` 的 `max` 当单位。
- Series 保留 `originalHeader`、`name`、`unit`；空表头使用 `Column N`。
- Plot 轴增加 `autoTitle` / `customTitle` / `titleMode`；显示标题为 custom 优先，否则 auto。
- Data 面板：Dataset 手风琴、全选/全不选、Shift 连选、Ctrl/Cmd 点选、Data 上下文中的 Cmd/Ctrl+A；文本框中的全选不被劫持。
- Legend 默认 Top / Auto，自动换行并占用 layout 高度；Preview / PNG / SVG 仍共用 `buildCanvasSvg()`。
- 工具栏：新建工程、打开工程、保存、另存为。支持 File System Access API 的浏览器可选择路径并写回；否则下载 `.tvproj.json`。

### 数据模型变化

新增均为向后兼容可选字段，加载时 normalize：

- Project：继续使用已有 `projectName`（旧工程缺省为「未命名工程」）。`projectFormatVersion` 仍为 `"1.0"`。
- Dataset：`xHeader` / `xName` / `xUnit` / `xIsTime` / `warnings`。旧工程缺省视为时间横轴。
- Series：`originalHeader` / `name` / `unit`。旧工程从 `sourceLabel` / `label` 回填。
- Plot axis：`autoTitle` / `customTitle` / `titleMode`。旧工程缺省 `titleMode: "auto"`，打开后按当前 Series 计算 `autoTitle`。

不原地改写源 JSON 文本；`parseProject` 走 validate → normalize → working project。

### CSV parser 变化

- 删除温度专用拒绝条件：「没有识别到 T1…TN 传感器列，也没有识别到温度、温差或 delta 数值列」。
- 有效非空单元格绝大多数可解析为有限数字 → 数值 Series；允许空值 / NA。
- 纯文本列跳过并给出 warning，不导致整表失败。
- X 列优先识别 Time / Timestamp / Seconds / t / 时间 等；否则使用第一数值列。
- 无数值 X：`无法确定有效横坐标列。`
- 无可绘 Series：`未找到可绘制的数值数据列。`

### Save / Save As 实现

- 另存为：有 `showSaveFilePicker` 时总是弹出系统保存窗口。
- 保存：已有可写 `fileHandle` 则直接写回；否则等同首次另存为。
- 打开：优先 `showOpenFilePicker` 以保留 handle；否则回退 `input[type=file]`。
- 文件名保证 `*.tvproj.json`，避免 `.json.json`。
- 保存成功 `dirty = false`；失败不清除 dirty。
- 无 File System Access API 时下载，并轻量提示将使用下载方式。

### Axis title 变化

- 单条 Voltage(V) → `Voltage (V)`。
- T1(°C)+T2(°C)+T3(°C) → `Temperature (°C)`。
- 中文入口/出口温度且单位相同 → `温度 (°C)`。
- 多单位混合 → `Value`。
- 同名不同单位 → 仅名称，不加错误单位。
- 用户编辑后 `titleMode = custom`；加 Series 不覆盖自定义标题；「恢复自动」回到 `autoTitle`。

### 明确未做（完整 V1 / 后续）

Formula、MAE/RMSE、Results、Split、Selection、Local Zoom、Inset、Annotation、Cursor / Data Inspector、Dual Y Axis、轴联动、吸附对齐、布局锁定、工程缩略图、Electron/Tauri。界面不展示这些功能的假按钮。

### 验证

#### Node（已执行）

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

#### 浏览器（已执行，macOS / Cursor 内置浏览器）

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

### 已知限制

- 窄视口下三栏可能挤压画布；长 Dataset 名称在折叠头中可能被截断。
- 手动坐标若 min/max 未填全，仍回退自动范围。
- Plot 过多时默认级联可能超出画布，需手动拖回。
- 119 条 Legend 会换行并压缩 plotArea；极大数量时截断为可见行 + `+N`，曲线仍绘制。
- 未保存提示依赖 `beforeunload`，浏览器实现不一致。
- 本轮不引入 Dual Y Axis；多单位图的自动 Y 标题安全退化为 `Value`。

### 下一步（当时）

停在 v0.2.0，等待实际使用反馈后再决定是否进入 v0.3.0。

建议 v0.3.0 候选（需用户确认）：

- Selection
- Local Zoom
- 手动时间窗
- Cursor
- Data Inspector

---

## v0.2.1

- 软件版本：`0.2.1`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本，缺字段由 `parseProject` normalize）
- 日期：2026-09-18
- 提交：`3cbcc18 feat: ship v0.2.1 workbench with canvas layout and legend editing`

v0.2.1 是画布编辑、图例管理、多图排版与科研出图体验优化，增量叠加在 v0.2.0 上，不重写引擎。

### 本轮目标

1. 数据簇折叠后显示已选数量。
2. 左/中/右栏可拖动改宽、可折叠。
3. Canvas Zoom 与图表真实尺寸分离。
4. Series originalName / displayName 与批量重命名。
5. Legend 成为可配置对象（停靠 / 浮动 / 多列）。
6. 工程名与保存文件名、浏览器标题统一。
7. 图表 Width/Height 与拖拽 resize 双向同步。
8. 多图布局模板 + 磁吸。
9. 坐标轴手动刻度与校验。

### 本轮实际完成

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

### 数据模型变化

均为向后兼容可选字段，加载时 normalize：

- Project：`softwareVersion: "0.2.1"`；`ui`（panel 宽、折叠、canvasZoom）；`canvas.zoom` 与 `ui.canvasZoom` 同步。
- Series：`originalName` / `displayName`。旧工程从 `name` / `label` / `originalHeader` 回填。
- Plot：`legend` 对象、`lockAspect`、`aspectRatio`。保留 `legendVisible`。
- Axis：`tickMode` / `majorTick` / `minorTickMode` / `minorTick` / `formatMode` / `decimals`。
- 默认新图尺寸 1280×800（图表尺寸，不是 CSS zoom）。

### 明确未做 / 简化

- 未做 Undo/Redo（v0.2.0 也没有）。
- 布局模板作用于当前画布全部图，尚未做多选图。
- 等间距吸附有对齐，没有在辅助线上画「24」数值标签。
- PNG/SVG 仍导出整张画布（SOP：Canvas 是导出区）；图按真实 layout 绘制，Canvas Zoom 不进入导出。未另做「只导出选中单图」按钮。
- 图例拖动用顶部 10px 把手，避免挡住图例点击显隐。
- 不引入 Regex 命名编辑器。
- 系统保存对话框仍需真实用户手势，本轮未端到端点选目录。

### 验证

#### Node（已执行）

`node tests/core-test.js`：全部通过。覆盖 migration、batch rename、坐标变换、layout、tick 校验、snap、legend 多列。

#### 浏览器（已执行，macOS / Cursor 内置浏览器，1440×900）

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

### 已知限制

- 极大数量图例仍可能超出 maxHeight；会提示批量重命名，不偷偷删项。
- 窄视口下三栏仍会挤压画布。
- 等间距提示没有数值标签。

### 下一步（当时）

停在 v0.2.1，等实际排图反馈。后续可补：多选图布局、单图导出、等距数值标签、Undo。

---

## 2026-09-21 发布 GitHub Latest Release

- 软件版本：`0.2.1`（未改产品功能）
- 日期：2026-09-21
- tag：`v0.2.1`
- 页面：https://github.com/aidisen975-cmd/Visualizer/releases/latest

将当时工作区推到 `feat/v0.1.0` 与 `main`，打 tag `v0.2.1`，附件 `Visualizer-v0.2.1.zip`（html + `visualizer-core.js` + README）。Mac / Windows 共用这一份浏览器页面，不打包原生客户端。

---

## v0.2.2

- 软件版本：`0.2.2`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本，缺字段由 `parseProject` normalize）
- 日期：2026-09-21

v0.2.2 在 v0.2.1 上继续迭代科研出图工作流：修正 Series 选择语义、批量重命名、X 轴自动范围、每图时间单位，并补齐图例拖动、布局主图槽位、样式系统与统一保存对话框。不重写引擎。

### 本轮实际完成

- 右侧 Series 行：`[选择] [显示/隐藏] [颜色条] [名称] [×]`；`selected` 与 `visible` 分开。
- 批量重命名按 `seriesId` 应用；范围计数；预览前 10 条；0 条时禁用应用。左侧数据源勾选不再进入重命名范围。
- 一大两小：当前选中图进 `slot.large`；布局菜单可改主图后重新排列，不销毁图。
- Legend 九宫格 + 自由位置；自由位置拖动整块图例；序列化为 `{mode:"free",x,y}`。
- 列数显式指定时按列换行，51×10 列全部保留。
- 新建工程 / 打开空工程：自动 Figure 1 并设为 activeChart。
- PNG / SVG / 另存为共用 `pickSaveFile`；无 File System Access 时回退下载并提示。
- 系列样式：颜色、线型、线宽、透明度；批量改线型/线宽/透明度，颜色仅在用户明确设置时覆盖。
- 文字样式：图标题、轴标题、刻度、图例、标注；轴线颜色/宽度。
- 右侧模块：数据 / 系列样式 / 坐标轴 / 图例 / 标注 / 图表。右侧原「布局」改为图表内「画布 X/Y」。
- 顶部「导入时间 / 显示时间」移到当前图 X Axis。转换只发生在渲染层。
- X Auto Range 无左右 padding；Y 保留约 4%。Auto→Manual 预填当前范围。

### 数据模型变化

均为向后兼容可选字段，加载时 normalize：

- Project：`softwareVersion: "0.2.2"`。
- Plot seriesRef：`selected`、`style {color,lineWidth,lineType,opacity}`。
- Plot：`textStyles`、`layoutSlot`、`background`、`annotations`。
- Axis：`time {enabled,sourceUnit,displayUnit}`、`lineColor`、`lineWidth`。
- Legend：`position` 可为字符串或 `{mode,x,y}`；`x`/`y` 归一化；`rows`、字体与背景。
- 时间单位增加 `ms`。旧工程无 `xAxis.time` 时从 dataset.timeUnit 与 `options.displayTimeUnit` 回填。

### 明确未做 / 简化

- 未做 Undo/Redo、3D、Heatmap、双 Y、Python、云同步、桌面包装。
- PNG/SVG 仍导出整张画布；保存对话框文件名默认当前图标题。
- 标注模块有列表/文字样式槽位，本轮不新做标注编辑器。
- 图例自由拖动时整块覆盖图例项点击显隐；显隐改用右侧眼睛按钮。
- 一大两小左右等宽、主图更高。

### 验证

#### Node（已执行）

`node tests/core-test.js`：全部通过。新增覆盖：selected 重命名、selected/visible 解耦、一大两小主图槽、Figure 1 默认、Legend 10 列换行、自由位置 round-trip、每图时间单位、X auto 无 padding、样式/文字/时间 round-trip、旧工程 migration。

#### 浏览器（已执行，Playwright / http://127.0.0.1:8878/）

- 打开页面即有 Figure 1，kicker 为 v0.2.2；无需点「新建图」。
- 顶部无「导入时间 / 显示时间」；右侧模块为 数据 / 系列样式 / 坐标轴 / 图例 / 标注 / 图表；无右侧「布局」accordion。
- 导入 electrical CSV 后，X 刻度为 0…2.00，0 在最左。
- 右侧勾选 Voltage、SOC 后样式面板显示「已选择 2 条 Series」；左侧数据源 checkbox 仍未勾选。
- Figure 2 设为主图后 `layoutSlot=large` 高度 720，Figure 1/3 为小图 348；Figure 2 显示 Time (min)，Figure 1 仍为 Time (s)。
- 自由位置图例出现「拖动图例」命中区。
- 布局菜单含「当前主图」下拉。
- 「新建工程」确认后仍自动得到 Figure 1。

未在浏览器里点选系统保存对话框（需真实用户手势）；Node 与页面逻辑已接到同一套 `pickSaveFile`。

### 已知限制

- 无 File System Access 的浏览器只能用默认下载目录。
- 窄视口下三栏仍会挤压画布。
- 等间距提示没有数值标签。

### 下一步

停在 v0.2.2。后续可补：Undo、单图导出、标注编辑、等距数值标签。

---

## 2026-09-21 重写 GitHub Release 说明

- 软件版本：`0.2.1`（未改产品功能、未换附件）
- 日期：2026-09-21
- tag：`v0.2.1`
- 页面：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.2.1

将 Latest Release 标题改为 `Visualizer 0.2.1`，并重写页面正文：保留下载与使用步骤，改为系统要求、分节更新说明、累计能力与已知限制。不把 SOP 未实现项（Formula、MAE/RMSE、Inset、Annotation 编辑器等）写成已发布能力。压缩包仍为 `Visualizer-v0.2.1.zip`。

---

## 2026-09-21 增加随版本维护的 README

- 软件版本：`0.2.2`（未改产品功能）
- 日期：2026-09-21

新增根目录 `README.md`，按当前已实现能力写特色、功能、使用方法、限制与尚未提供项。约定该文件随版本增删，不另存历史副本；项目 skill 的交付清单改为同步更新 README。

---

## 2026-09-21 发布 v0.2.2 测试版

- 软件版本：`0.2.2`
- 日期：2026-09-21
- tag：`v0.2.2`
- 页面：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.2.2

将当时工作区推到 `feat/v0.1.0` 与 `main`，打 tag `v0.2.2`，GitHub 标记为 Pre-release。附件 `Visualizer-v0.2.2.zip`（html + `visualizer-core.js` + `README.md`）。Mac / Windows 共用这一份浏览器页面，不打包原生客户端。

---

## v0.2.3

- 软件版本：`0.2.3`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本，缺字段由 `parseProject` normalize）
- 日期：2026-09-21

v0.2.3 在 v0.2.2 上做交互与排版修正，不进入 Local Zoom / Inset / Cursor / Annotation / Formula。目标是把 Series 多选、标题自动留白、图例透明度和线宽/中文字体补齐到可日常出图。

### 本轮实际完成

- 抽出 `applyMultiSelect` / `createMultiSelectController`。左侧 Data Selection 与右侧 Figure Series Selection 共用 click / toggle / range / selectAll / clear；两个选择集互不同步。
- 右侧 Series 编辑区补全选 / 全不选、Shift 连选、Ctrl/Cmd 点选、Ctrl/Cmd+A；Shift 锚点按 Figure 分开保存。眼睛按钮仍只改 `visible`。
- Series 行改为两行：显示名称 1 行省略，原始名称最多 2 行；hover 看全文；操作按钮不被挤掉。
- `computePlotLayout` 用实际文字测量（canvas `measureText`）计算四边 margin 与 Plot Area。固定位置 Legend 参与对应边距，自由 Legend 只做 overlay。字号过大时先缩 Plot Area，低于 160×110 才增大 Figure。
- Legend 背景：显示背景、颜色、透明度 0–100%、边框颜色/宽度；`fill-opacity` 只作用在背景 rect。
- 线宽改为 slider + 数字，0.5–12 px、0.1 步进；多选线宽不同时显示混合态。图例线样同步主曲线线宽。
- 字体下拉：系统默认、微软雅黑、宋体、Arial、Times New Roman。不打包字体文件。

### 数据模型变化

均为向后兼容可选字段：

- Project：`softwareVersion: "0.2.3"`。
- Legend：`showBackground`、`backgroundColor`、`showBorder`、`borderColor`、`borderWidth`、`borderRadius`。旧工程缺省时补白底 85% 透明度。
- Series `style.lineWidth` 仍 clamp 到 0.5–12；UI 不再用 4px 档位下拉。

### 明确未做 / 简化

- 未做 Undo、Local Zoom、Inset、Annotation 编辑、Cursor、Formula、MAE/RMSE、双 Y、Heatmap、3D。
- 自动增大 Figure 不重排邻图；自由画布上超大字号仍可能靠近邻图，需用户拖开。
- 本机没有微软雅黑 / 宋体时走 CSS fallback，不报错。

### 验证

#### Node（已执行）

`node tests/core-test.js` 全部通过。新增：多选 toggle/range/selectAll/clear、两个 selection scope 隔离、lineWidth clamp、微软雅黑/宋体与 Legend opacity / lineWidth 8.5 round-trip、Top legend 占上边距而 free 不推挤、Y 标题变大时 left margin 增加、过小 Plot Area 时增大 Figure。

#### 浏览器（已执行，macOS / Cursor 内置浏览器，http://127.0.0.1:8891/）

- kicker 为 v0.2.3；字体下拉含微软雅黑 / 宋体；图例有显示背景、透明度 slider、边框控件。
- 导入 electrical CSV：左侧全选 3 条，加入 Figure 1；右侧出现 Display/Original 分层。
- 右侧单击 1 条、Shift 连选 3 条；左侧勾选仍为 3，选择集不串。全不选 / 全选、隐藏眼睛后编辑选择仍为 3。
- 图标题 40px + 微软雅黑、Y 轴标题 32px + 宋体：文字在 Figure 内，Y title x=26，无 SVG 文本溢出。线宽 8 同步到主曲线和图例线样。
- 图例透明度 0 再 50%、切自由位置后可拖；Preview 与编辑器同用 `buildCanvasSvg()`，线宽 8、透明度 0.5。
- 一大两小三图外框不重叠。

未在浏览器里点选系统保存对话框；工程 round-trip 由 Node serialize/parse 覆盖。

### 已知限制

- 无 File System Access 的浏览器只能用默认下载目录。
- 窄视口下三栏仍会挤压画布。
- 等间距提示没有数值标签。

### 下一步

停在 v0.2.3。后续可补：Undo、单图导出、标注编辑、等距数值标签。

---

## 2026-09-21 发布 v0.2.3 测试版

- 软件版本：`0.2.3`
- 日期：2026-09-21
- tag：`v0.2.3`
- 页面：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.2.3

将当时工作区推到 `feat/v0.1.0`，打 tag `v0.2.3`，GitHub 标记为 Pre-release。附件 `Visualizer-v0.2.3.zip`（html + `visualizer-core.js` + `README.md`）。Mac / Windows 共用这一份浏览器页面，不打包原生客户端。

---

## v0.2.3 手动检查更新

- 软件版本：`0.2.3`（未升版本）
- 工程格式：`projectFormatVersion: "1.0"`（未改 schema）
- 日期：2026-09-22

在已发布的 v0.2.3 上加入 About 与手动检查 GitHub Release。不自动联网，不自动安装，不把更新状态写入工程。

### 本轮实际完成

- `APP_INFO` 成为软件版本、仓库和更新通道的唯一来源。`SOFTWARE_VERSION` 取自 `APP_INFO.version`。`projectFormatVersion` 仍是 `1.0`。
- 核心模块增加 `normalizeVersionTag`、`parseSemVer`、`compareSemVer`、`findReleaseAsset`、`fetchLatestRelease`、`checkForUpdates`。只请求 `releases/latest`，精确匹配 `Visualizer-vX.Y.Z.zip`，找不到时不回退到 `assets[0]`。
- 标题栏「关于」读取上述常量。检查中禁用按钮；结果分已是最新、本地更高、发现新版本、网络/HTTP/非法版本。Release Notes 用文本节点显示。下载和 Release 页面用 `window.open`，不覆盖本地文件。
- 最后检查时间写入 `visualizer.update.lastCheck`。`serializeProject` 不包含更新状态。
- 项目 skill `.agents/skills/visualizer-dev/SKILL.md` 增加版本命名、离线优先、App/Project 状态分离、LocalStorage 命名空间、发布流程等长期规则。没有新建第二份 skill。

### 数据模型变化

无。工程 JSON 字段未增删。

### 明确未做

- 启动自动检查、定时检查、自动解压、自动覆盖 HTML/JS、Beta channel、Electron/Tauri。
- Local Zoom、Inset、Annotation、Cursor、Formula、MAE/RMSE 仍未做。

### 验证

#### Node（已执行）

`node tests/core-test.js` 全部通过。覆盖 SemVer、`v` 前缀、精确 ZIP、非法 Release 不抛出、断网/HTTP/损坏 JSON、以及工程 JSON 不含更新字段。

#### 浏览器（已执行，macOS / Cursor 内置浏览器，http://127.0.0.1:8891/）

- 打开页面时资源只有 `visualizer-core.js`，没有 GitHub 请求。kicker 为 Visualizer v0.2.3，关于面板版本 v0.2.3、工程格式 1.0。
- 真实 `releases/latest` 为 v0.2.1。点击检查更新后显示「当前版本不低于最新正式版本」。检查过程中仍可新建 Figure 2。
- 模拟新版本：显示 v0.2.3 → v0.9.0、发布日期、更新说明；`<img onerror>` 作为文本显示。下载地址是 `Visualizer-v0.9.0.zip`，不是 debug 包。Release 页面与 Releases 列表分开。
- 没有正式 ZIP 时主按钮变为「前往 Release 页面」。相同版本显示「已是最新版本」。断网显示「当前无法连接 GitHub」，关闭后主界面仍可导入 CSV、加入 Series、隐藏一条、预览 SVG，并用同一 SVG 栅格出 PNG。
- 连续点击只发出一次请求。关闭关于面板后再次打开回到检查前的空状态。保存的工程 JSON 不含 `updateState` / `latestVersion`。

### 已知限制

- 用户仍需手动解压新 ZIP 并打开新版本。
- 只比较 GitHub 最新正式版。v0.2.3 目前是 Pre-release，因此不会被 `releases/latest` 当成最新版。

---

## v0.2.4

- 软件版本：`0.2.4`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本）
- 日期：2026-09-22

v0.2.4 收数据簇样式、颜色/线型编辑、标题对齐、About 层级和 GitHub 正式版检查。不进入 v0.3.0。

### 本轮实际完成

- 数据簇继续使用 Dataset id。面板按数据源分组，标题为「已选 n/总数」，可折叠。样式按钮把用户改过的颜色、线型、线宽一次性写入该 Dataset 的 Series，并同步已有 Plot 的 seriesRef。之后单独改 Series 不会被自动改回；再次点击应用才会覆盖。
- 颜色控件增加 HEX 输入，非法值只标错，不写入上一次有效颜色。线型菜单的 SVG 预览读取 `LINE_STYLES`，与 `strokeDasharray` 相同。
- 图标题增加 `textStyles.title.align`：`left` / `center` / `right`。旧工程缺省为左。标题宽度仍参与 Figure 留白。
- About 改为 `showModal`，对话框 `z-index: 1000`，分隔条 `z-index: 10`。根因是原先 `dialog.show()` 不进入顶层，固定在右上角的 About 被 `z-index: 6` 的分隔条盖住。
- 更新检查仍只请求 `releases/latest`。draft / prerelease 不当成正式版。比较使用 SemVer 数字。请求 12 秒超时。403/429 给出限流说明。失败不写入工程，也不阻断导入和绘图。版本号只改 `APP_INFO.version`。

### 数据模型变化

工程格式仍为 1.0。Series 增加可缺省的 `style`。图标题文字样式增加可缺省的 `align`。更新状态仍不进工程 JSON。

### 明确未做

- 自动安装、静默覆盖本地 HTML/JS、Electron、启动时自动检查。
- Local Zoom、Inset、Annotation、Cursor、Formula、MAE/RMSE。

### 验证

#### Node（已执行）

`node tests/core-test.js` 全部通过。覆盖簇样式部分更新、单独覆盖、再次应用、非法 HEX、标题对齐、SemVer `0.2.10 > 0.2.9`、prerelease/draft、限流和旧工程缺 `align`。

#### 浏览器（已执行，macOS / Cursor 内置浏览器，http://127.0.0.1:8891/）

- 两个 CSV 分成 A、B 两个数据簇，Series 不混组。折叠后 Series 隐藏，展开后已选数量仍在。
- 簇样式粘贴 `CFE3EB` 后规范为 `#cfe3eb`，只改颜色时保留原线型和线宽。另一簇不变。非法 `#GGGGGG` 标错且不改上一次有效色。颜色选择器与 HEX 双向同步。
- 再次只应用颜色时，先前单独改过的 Series 颜色被覆盖，线型和线宽保留。
- 线型菜单五项的 SVG `stroke-dasharray` 分别为空、`6 4`、`1.5 3`、`8 4 1.5 4`、`14 6`，与绘图映射相同。
- 标题左 / 中 / 右对应 `start` / `middle` / `end`。48px 右对齐标题仍在图框内。
- About 使用模态层。分隔条坐标上的命中元素是对话框本身，不是分隔条。对话框 z-index 1000，分隔条 10。
- 断网显示无法连接 GitHub。模拟 v0.2.4 显示不低于最新正式版。模拟 v0.3.0 显示发现新版本，按钮为「查看更新」「获取最新版」。关闭后画布仍在。
- 打开 v0.1.0 夹具工程后标题对齐为左，保存再打开 Series 仍在，工程 JSON 不含更新状态。
- 页面 kicker 为 Visualizer v0.2.4。发布前真实 `releases/latest` 为 v0.2.1，本地 0.2.4 的状态是 `up-to-date`，不提示降级。

---

## 2026-09-22 发布 v0.2.4

- 软件版本：`0.2.4`
- 工程格式：`projectFormatVersion: "1.0"`
- tag：`v0.2.4`
- 页面：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.2.4

正式版，不是 Draft，也不是 Pre-release。附件 `Visualizer-v0.2.4.zip`（html + `visualizer-core.js` + `README.md`）。

发布后用上一正式版 `0.2.1` 请求 `releases/latest`：状态为发现新版本，最新版 `0.2.4`，下载地址是 `Visualizer-v0.2.4.zip`。本地 `0.2.4` 的状态是已不低于最新正式版。`0.2.3` 同样能发现 `0.2.4`。


