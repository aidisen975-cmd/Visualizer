# DEVLOG

本文件放在仓库根目录，只追加、不覆盖，用于完整记录开发全过程。当前版本、如何运行和下一步见 [PROGRESS-v0.5.0.md](Progress/PROGRESS-v0.5.0.md)。

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

---

## v0.3.0

- 软件版本：`0.3.0`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本）
- 日期：2026-09-22

v0.3.0 在 v0.2.4 的导入、排图、样式和导出之上，加入查看与标注。不重写绘图引擎，不引入构建链或 CDN。

### 本轮实际完成

- 坐标换算集中在 `createPlotFrame`。框选、读数、Inset 来源范围和数据标注共用它。
- 框选只在 Plot Area 内开始。结束后可放大或创建局部图。放大写入现有轴的手动范围。只沿 X 拖出的细条不改 Y。
- View Range 仍是 `axis.mode` / `min` / `max`。自动勾选、From / To、重置视图和框选放大是同一状态。非法数字或零跨度不写入；From > To 时交换。
- Inset 按 Series 重绘，不是截图。可拖动、缩放，限制在所属 Figure 内。源范围和直线连接进入 SVG。删除 Series 后从 `seriesIds` 移除；没有可画曲线时显示空状态。
- 读数使用垂直十字线和局部检查器，不整页重绘。单调 X 用二分查找。插值只发生在相邻且都有效的采样之间。固定 A/B 显示 ΔX 与每条可见曲线的 ΔY。
- 标注四种：文字、箭头、标记、区域。`coordinateMode` 为 `data` 或 `canvas`。右侧列出当前图的标注，可选择、隐藏、删除。
- 历史最多 100 条。新操作清空 redo。拖拽在按下时记快照，松开时提交一条。输入框聚焦时不触发 Delete 或撤销。
- 预览与 PNG/SVG 仍走 `buildCanvasSvg()`。Inset、源范围和标注进入 SVG。选框、手柄、悬停读数不进入。固定游标仅在勾选导出时进入。

### 数据模型变化

工程格式仍为 1.0。Plot 增加可缺省字段：

- `insets`
- `annotations`（现在会规范化；旧文件里的空数组保持为空）
- `fixedCursors`
- `exportCursors`（默认 false）

轴范围没有第二套 `plot.view`。

### 明确未做

- Formula、派生列、MAE/RMSE、Results
- 双 Y 轴、轴联动、图拆分、Heatmap、3D
- Electron / Tauri
- Inset 复制
- 连接线避障

### 验证

#### Node（已执行）

`node tests/core-test.js` 全部通过。新增覆盖：坐标往返、反向选区、插值中点 / 精确点 / 越界 / NaN 间隙 / 不等间隔、最近点、轴范围交换、Inset 与标注及游标往返、历史 undo / redo / 清空 redo / 上限，以及 v0.1.0 工程补齐空数组。

#### 浏览器（已执行，macOS / Cursor 内置浏览器，http://127.0.0.1:8891/）

- 导入实验与仿真两份 CSV，同一图加入三条跨源曲线。
- 框选后出现放大、创建局部图、取消。放大把 X/Y 切到手动范围；撤销后恢复，重做再写回。
- 创建的 Inset 含三条 Series。导出 SVG 含局部图裁剪和源范围虚线，不含选框、手柄、悬停十字线。
- 文字、箭头、标记、区域都能创建。删除文字后再撤销，四条都回到工程。
- 读数检查器在同一 X 上列出多条曲线。点击两次得到 A/B。未勾选导出时，SVG 不含游标。
- 重置视图回到自动范围，撤销后回到手动范围。拖动 Figure 后撤销，位置回到原处。
- 直接解析 v0.1.0 夹具：格式仍是 1.0，曲线还在，insets / annotations / fixedCursors 为空。

未在本轮逐项点选线宽、字体和布局模板；这些路径没有改数据模型，核心测试仍覆盖样式与布局往返。PNG 与预览共用 `buildCanvasSvg()`，本轮核对了这条 SVG，没有另存一张 PNG 文件。

---

## v0.3.1

- 软件版本：`0.3.1`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本）
- 日期：2026-09-22

本版修复 v0.3.0 的选择、框选和读数，并调整左右栏职责、右栏数据簇、画布尺寸和单图 Snap。不更换绘图库或框架，不删除快速布局和系列样式。

### 根因

- Checkbox 晚一拍：系列行是 `<label>`，捕获阶段的点击先写入 `checkedSeries` 并刷新勾选，随后复选框的默认动作把 `checked` 翻回去。计数已经按 Set 画出来，所以第一次点击只增加「已选」，勾选要等下一次刷新才出现。
- 框选按钮无效：选框出现后，`pointerup` 仍走 `finishPlotGesture`。对已经进入 `range-ready` 的手势，这次抬起把拖拽清掉并重画，动作按钮在 click 之前消失。
- 读数竖线删不掉：点击调用 `placeCursor`，依次写入 `plot.fixedCursors` 的 A、B。这些游标每个覆盖层都画，并且会进工程。

### 状态

- `checkedSeries`：左栏临时选择。
- `plot.seriesRefs`：已经加入 Figure 的系列。
- `plot.groupStyles`、`seriesRef.styleOverrides`：数据簇样式和系列覆盖。
- `readoutCursor`、框选 `drag`：临时 UI，不进工程。
- `project.canvas.width/height`：布局坐标。`project.ui.canvasZoom`：视口缩放。

### 验证

#### Node（已执行）

`node tests/core-test.js` 全部通过。覆盖数据簇样式与系列覆盖的保存重开、反向框选的数据坐标、1600×900 上的左右分区、局部图独立范围，以及页面里 Checkbox、已加入、局部图、读数、画布和 Snap 的接线。

#### 浏览器（已执行，macOS / Cursor 内置浏览器，http://127.0.0.1:8765/）

- 15 列第一次点击即勾选，计数「已选 1/15」；第二次两条同时勾选。全选、全不选、Shift、Ctrl/Cmd、Ctrl+A 与勾选一致。
- 加入当前图后勾选归零，曲线仍在。导入第二份数据后勾选归零，已加入的曲线还在。新建图也会清空临时选择。
- 右栏收起显示「已加入 2/3」和「已加入 1/55」，默认不铺开系列行。左栏没有样式按钮。
- 数据簇设为绿色后，单条改为红色；保存再解析，红色覆盖仍在，另一条保持绿色。
- 读数点击得到一根线；再点击只移动 X。Esc 和退出读数后线消失。导出 SVG 不含这根线，也不新增固定游标。
- 反向框选后「放大到此范围」把轴切到手动范围；「重置视图」恢复自动。「取消」不改范围。「创建局部视图」生成独立 Figure，原图保持自动范围。
- 画布设为 1600×700 后，适应窗口只改缩放。再设 16:9 得到 1600×900。两张图分别放入左右分区，坐标与该画布的槽位一致，适应窗口后坐标不变。

### 明确未做

- Formula、派生列、MAE/RMSE、Results
- 双 Y 轴、轴联动、图拆分、Heatmap、3D
- Electron / Tauri
- 没有另存一张 PNG 文件。PNG 与 SVG 共用 `buildCanvasSvg()`，本轮核对了这条 SVG 不含读数游标。
- 没有拖动操作系统窗口。用「适应窗口」改变视口缩放，确认画布逻辑尺寸和图坐标不变。

---

## v0.3.2

- 软件版本：`0.3.2`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本）
- 日期：2026-09-28

本版不增加分析模块。把 v0.3.1 里已经有、但还不能当科研图用的局部图、坐标轴、标题、图例、布局入口、左栏、配色、读数和标注补完整。

### 数据模型

仍是格式 `1.0`。新字段都可选，打开旧工程时补默认值。

- `plot.type`：`"normal"` 或 `"detail"`。`plot.name` 是编辑器名称。`plot.showTitle` 控制是否画出 `plot.title`。
- `plot.detailSource`：来源图、数据范围、`autoFitY`、`yPaddingRatio`、来源框和连接线开关及线样式。
- `plot.xAxis` / `plot.yAxis` 增加 `showLine`、`showMajorTicks`、`showMinorTicks`、`showTickLabels`、`tickDirection`。`plot.topEdge` / `plot.rightEdge` 只有这组显示开关，范围仍用下边和左边。
- `plot.groupStyles[datasetId].colorMode` / `paletteId`。
- 标注新增 `point`（数据坐标锚点 + `seriesId`）和 `free`（Plot Area 归一化坐标）。旧类型仍能读。
- 不保存读数游标、悬停系列、菜单和选中框。

### 行为

- 局部图 Y 由 `calculateVisibleYRange` 计算：只取可见曲线、X 落在范围内、且为有限数的 Y。跨度大于 0 时按 `yPaddingRatio`（默认 0.05）向两端扩展；只有一个 Y 时用 `max(|y| * 0.01, 1e-6)`。没有有效点则保留原 Y，不崩溃。
- 来源框用同一套 `dataToPixel`。连接线由 `detailConnectorLines` 生成，编辑层和 `buildCanvasSvg()` 共用。
- 颜色由 `resolveSeriesStyle` 统一解析：系列覆盖 > 数据簇（统一色或 Palette）> 默认。Auto High Contrast 在 OKLab 里贪心选取与已选颜色最远的候选，共 32 色。
- 读数 X 由 `snapReadout` 决定：先找各可见曲线上离鼠标数据 X 最近的采样点，再取屏幕距离最近的那条曲线的 X。标记画在各曲线该 X 的最近点上。
- 数据点标注用 `findNearestDataPoint` 吸到真实采样点。文本框单独可拖，锚点不动。

### 验证

#### Node（已执行）

`node tests/core-test.js` 全部通过。新增覆盖：局部图 X 与 autoFitY、空 X 窗口保留 Y、单点 Y 留边距、Palette 不覆盖系列颜色、高对比前 15 色 OKLab 距离、Palette 往返且格式仍为 1.0、数据点标注与自由文本往返、旧工程补上普通图类型和默认关闭的上边轴、有标题时不回写成「未命名图」。

#### 浏览器（已执行，Cursor 内置 Chromium，http://127.0.0.1:8765/）

- 版本号为 Visualizer v0.3.2。打开后有 Figure 1，工具栏含保存、另存为、新建图、布局、预览、导出 PNG、导出 SVG。图块上没有「布局」按钮。
- 导入 15 条曲线后，左栏为勾选、颜色圆点、单行省略名称和点数。
- Auto High Contrast 下 15 条颜色不同；T10 设为 `#FF0000` 后再换 Okabe-Ito，T10 仍是红色。
- 框选范围 X 900–1100 的局部图 Y 约为 54.4–60.3，不再使用整段 45–66。来源框画在父图对应数据范围。右侧放不下时局部图改放到画布内。
- 关闭标题后，导出 SVG 的文字节点里没有「未命名图」和「Figure 1」。
- 顶部「布局」打开后，分区项写明作用于当前选中的图。
- 没有另开系统 Chrome / Edge。读数圆点和标注拖拽没有逐项用手点完。

### 明确未做

- Formula、MAE/RMSE、Results、双 Y 轴、Heatmap、3D、图拆分、桌面打包
- 没有另存 PNG 文件。PNG 与预览仍走 `buildCanvasSvg()`。

---

## v0.4.0

- 软件版本：`0.4.0`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本）
- 文档结构：`schemaVersion: 2`
- 日期：2026-09-29

本版把图层、选中和局部视图拆开。局部视图不再是复制出来的第二张主图，而是来源主图的另一个 Viewport。

### 根因

选中一张图时，页面做了两件会改变叠放的事：给 `.tv-plot.is-selected` 写 `z-index: 4`，再把该节点 `appendChild` 到画布末尾。局部视图和引导线因此被后点的主图盖住；完全盖住后也无法再点到。

### 数据模型

仍是格式 `1.0`。新增 `schemaVersion: 2`，缺省旧工程仍可打开。

- `plot.zOrder`、`plot.visible`、`plot.locked`。缺 `zOrder` 时按原数组顺序补 1..n，不随机重排。
- `plot.xAxis.showTitle` / `plot.yAxis.showTitle`。缺省为显示，避免旧图突然丢掉轴标题。
- 局部视图继续用 `detailSource.sourceFigureId`。有来源主图时，加载和保存都清空局部视图自己的 `seriesRefs`，绘制走来源主图的系列、显隐和样式。
- 新建局部视图默认：不显示图标题、轴标题、副刻度和图例；轴线、主刻度、刻度标签打开；Y 按 X 窗口自动适配，边距 5%。

### 行为

- 图层顺序只由 `movePlotLayer` 改变。选中框在 `.tv-selection-overlay`，画布纸张使用 `isolation: isolate`，避免对象 `z-index` 盖住侧栏。
- 引导线与对应局部视图使用同一个 `zOrder`，并排在该图前面，所以线在来源图之上、局部图之下。导出 SVG 按同一顺序写入，不包含选中框和缩放手柄。
- 有效放大：`(insetPlotSize * mainRange) / (mainPlotSize * insetRange)`。尺寸或范围无效时为 `null`。
- 删除主图时，若存在局部视图，确认后与来源框、引导线一起删除。
- 右侧分为「属性」和「图层」。主图与局部视图使用不同的折叠分组，展开状态按对象类型记住。局部视图属性里没有系列样式编辑。

### 验证

#### Node（已执行）

`node tests/core-test.js` 全部通过。覆盖：局部视图不复制系列、样式和显隐跟随主图、保存后仍跟随、旧局部图丢弃独立样式、图层上移语义（置顶/置底）且重复读取不改顺序、轴标题开关、有效放大、删除主图连带局部视图、`schemaVersion` 与 `projectFormatVersion` 分离。

#### 浏览器（已执行，Cursor 内置 Chromium，http://127.0.0.1:8765/）

- 页头为 Visualizer v0.4.0。主图属性默认只展开「图表」，图标题、数据、系列样式、坐标轴、图例、局部视图、标注均为折叠。
- 导入温度 CSV 后创建第二张主图和局部视图。连续 `pointerdown` 点三张图，`zOrder` 保持 `主图 1:1 | 局部视图 1:2 | 主图 2:3`。
- 局部视图属性分组为：局部视图、范围与缩放、标题与坐标轴、图例、来源框与引导线、位置与尺寸、标注。只读文案为「数据：跟随主图」「系列样式：跟随主图」，没有系列样式编辑分组。
- 主图 T1 设为 `#00aa88`、线宽 2.5、虚线后，局部视图路径的 stroke、stroke-width、dash 与主图相同。X 取 0–1 时自动 Y 收到约 24.98–25.42，不再停在框选时的 20–80。
- 关闭主图标题后，导出 SVG 不再含 “Figure 1”，Plot Area 的 top 从 113 收到 91。
- 导出 SVG 不含选中 overlay。引导线写在局部视图节点之前。图层页点击对象名称不改变 `zOrder`。
- 没有另开系统 Chrome / Edge。

### 明确未做

- 图层列表拖拽排序。上移、下移、置顶、置底已可用。
- Formula、MAE/RMSE、Results、双 Y 轴、Heatmap、3D、图拆分、桌面打包。

## v0.4.1

- 软件版本：`0.4.1`
- 工程格式：`projectFormatVersion: "1.0"`（未升）
- 文档结构：`schemaVersion: 2`

本版修三件已经影响使用的事：右侧属性真正按对象折叠，局部图按当前 X 窗口展开 Y，顶部工具栏让出画布高度。不重写绘图引擎，不改 CSV，不升工程格式。

### 根因

局部图把拟合后的 Y 写成 `axis.mode = "manual"`，属性栏里的「自动」又把未勾选理解成用户关闭了 `autoFitY`。之后改 X 不再重算 Y。若 Y 轴模式变成 `"auto"`，范围又改用全部 Series 的整体 Y，而不是当前 X 窗口。界面上的倍率因此可以显示放大，曲线仍然挤在一起。

右侧虽然已有分组标题，控件仍按长表单铺开，导出、字体和坐标轴混在同一条滚动里。顶栏是产品标题加一整行按钮，画布被压矮。

### 数据模型

格式仍是 `1.0`。局部图 `detailSource` 增加 `yRangeMode`（`follow-main` | `auto-window` | `manual`）和 `yPaddingRatio`（默认 0.05）。`autoFitY` 继续保存，且等于 `yRangeMode === "auto-window"`。旧工程缺 `yRangeMode` 时：`autoFitY === false` 视为手动，否则视为当前窗口自动适配。Accordion 展开状态只留在内存，不进工程。

### 行为

- 自动 Y 只取当前可见 Series、当前 X 窗口内的有限点，再按该 Y span 的百分比扩边。隐藏曲线、NaN、Infinity、null 不参与。span 为 0 时给最小宽度。窗口没有有效点时保留上次 Y，不写出 NaN。
- 手动范围严格使用输入值。跟随主图使用主图当前 Y domain。新建局部图默认自动窗口和 5% 边距。「适配当前 X 范围」切回自动窗口。
- `plotExtents` 对局部图返回 `calculateLocalViewDomain`。绘制前 `syncDetailRange` 把同一范围写回坐标轴，避免输入框和 renderer 各算各的。
- 主图属性一级分组：图表、X Axis、Y Axis、图例、数据系列、局部视图、标注与引导线、导出设置。局部图选中后焦点改到局部图的范围与缩放。同一对象重绘不重置折叠；切换对象后只展开相关组。
- 顶栏收成一行，约 52px。保存和导出使用原生菜单。副标题「实验数据可视化工作台」只出现在关于。

### 验证

#### Node（已执行）

`node --check visualizer-core.js` 通过。`node tests/core-test.js` 全部通过。覆盖窗口 Y 34.8–39.2、隐藏 Series、三种模式、0% / 5% 边距、零跨度、NaN / Infinity、空窗口、手动 35–39、改 X 后重算、Accordion 记忆、旧工程 `autoFitY` 回退。

#### 浏览器（已执行，Cursor 内置 Chromium，http://127.0.0.1:8765/）

- 顶栏高度 52px，文案为 VISUALIZER v0.4.1。保存菜单含保存 / 另存为，导出菜单含 PNG / SVG。
- 主图默认只展开「图表」。手动展开 X Axis 后修改名称触发重绘，X Axis 仍展开，其余一级分组仍收起。
- 导入 0–2000 s、窗口内约 35–39 的四条曲线，局部图 X = 1550–1800、自动窗口、5% 边距。domain 与坐标轴均为 34.8–39.2。四条曲线在绘图区纵向约占 91% 高度。主图 Y 仍约为 8.4–51.6。
- 边距 0% 得到 35–39，10% 得到 34.6–39.4。手动输入 35–39 后 domain 为 35–39。跟随主图与主图 Y 一致。适配按钮回到 34.8–39.2。隐藏最高那条曲线后 Y 收到约 34.90–37.21。
- 没有另开系统 Chrome / Edge。

### 明确未做

- 统一的 `selectedObject` 模型。图例、引导线、文字还不能各自独占一整套属性焦点；标注和局部图沿用原有选中分支。
- 图层列表拖拽排序。
- Formula、MAE/RMSE、Results、双 Y 轴、Heatmap、3D、图拆分、桌面打包。

---

## 2026-09-29 发布 v0.4.1

- 软件版本：`0.4.1`
- 工程格式：`projectFormatVersion: "1.0"`
- tag：`v0.4.1`
- 页面：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.4.1

正式版，不是 Draft，也不是 Pre-release。附件 `Visualizer-v0.4.1.zip`（html + `visualizer-core.js` + `README.md`，三个文件在压缩包根目录）。

发布后用上一正式版 `0.2.4` 请求 `releases/latest`：状态为发现新版本，最新版 `0.4.1`，下载地址是 `Visualizer-v0.4.1.zip`。本地 `0.4.1` 的状态是已不低于最新正式版。

---

## v0.5.0

- 软件版本：`0.5.0`
- 工程格式：`projectFormatVersion: "1.0"`（未升）
- 文档结构：`schemaVersion: 2`（未升）
- 模板格式：`templateFormatVersion: 1`
- 日期：2026-09-29

v0.5.0 把 Visualizer 往科研绘图编辑器的基础架构上推进一步：点中什么就编辑什么，图层可以拖着排序，调好的出图格式可以存成模板再用。不做 Formula、误差指标、双 Y 轴、Heatmap、3D 或桌面打包。

### 为什么引入 selectedObject

标注、图例、来源框和引导线原来都靠「当前是主图还是局部图」决定右栏。对象一多，点图例会打开整张图的属性，点引导线会开始拖图。`selectedObject` 收成唯一焦点：`type`、`figureId`、`objectId`。主图和局部图仍是 `plot` / `detail`；图例、标注、来源框、引导线各自一种。它只活在页面内存里，不进 `.tvproj.json`，改变选中也不写撤销。

命中顺序按 DOM 目标走：标注、图例、来源框、引导线先于图本身。选中不改 `zOrder`，选中框仍在独立 overlay，不进入 `buildCanvasSvg()`。

### 为什么 Template 与 Project 分离

工程回答「这张图画了什么数据、摆在哪里」。模板回答「这种图应该长什么样」。模板放在 App State，`localStorage` 键 `visualizer.templates.figure.v1`，单份导出为 `.tvtemplate.json`。`serializeProject` 不写模板库，也不写选中和图层拖拽状态。应用到图上时把样式抄进 Figure，所以模板后来被删掉，已保存的工程仍然能画。

### Layer drag

图层列表上方是最上层。拖握把只记插入位置，松手后 `reorderPlotLayers` 把 `zOrder` 收成 `1..n`，记一条撤销，并把工程标脏。点图层名字只选中，不改顺序。眼睛是 `plot.visible`，锁是 `plot.locked`。锁定后画布不能拖、不能缩放，点选和右栏编辑仍然可用。引导线继续跟局部图的 `zOrder`，插在局部图前面；用户把来源图放到局部图之上时，引导线仍可能被来源图盖住，这和上移/下移的既有规则一致。

### 样式优先级

```text
Series Override
  > Group Style
  > Figure Template Default（plot.defaultSeriesStyle）
  > System Default
```

模板默认只在加入新曲线、或该字段还没有单独设置时起作用。把 T1 从模板线宽改成 5 之后，再加入的 T2 用模板线宽，T1 保持 5。应用模板不清除已有 `styleOverrides`。

### Template apply whitelist

`applyFigureTemplate` 只复制尺寸、背景、标题显示、文字样式、轴外观、上/右边、图例和 `defaultSeriesStyle`。不碰 `seriesRefs`、坐标范围、标注、`detailSource`、`layout.x/y`、`zOrder`、`locked`、`visible`。一次应用记一条历史。局部图不能存成模板。保存模板本身不把当前工程标脏。

### 验证

#### Node（已执行）

`node --check visualizer-core.js` 通过。`node tests/core-test.js` 全部通过。覆盖选中与删除/隐藏语义、图层归一化与拖拽结果、选中不改 `zOrder`、模板提取与往返、非法模板、应用白名单、样式优先级、工程 JSON 不包含模板库和选中状态，以及 v0.1 旧工程 normalize。

#### 浏览器（已执行，Cursor 内置 Chromium，http://127.0.0.1:8765/）

- 顶栏高度 52px，版本 v0.5.0。
- 点图例、来源框、引导线、局部图、主图和自由文本，右栏只留下对应设置，`zOrder` 不变。导出 SVG 不含选中框和命中目标。
- 图层拖到底层对象到列表顶部后 `zOrder` 连续，撤销和重做恢复，再点图层名字不改顺序。
- 锁定主图后拖动和缩放不改变位置与尺寸，仍能点选和解锁。Delete 隐藏图例，撤销后恢复。
- 把主图调成 Times、标题 18、轴标题 16、刻度 13、轴线 1.5、图例右上、曲线线宽 2.5，存成「论文单图」。用它新建的图样式一致。另一份 CSV 的 T1 得到 2.5，改成 5 后再加入 T2，T2 为 2.5，T1 仍为 5。
- 主图手动 X 设为 100–900 后应用模板：标题回到 18，范围、标注、位置、图层和系列 ID 不变。局部图仍是 X 1550–1800、`auto-window`、5% 边距，Y 为 34.8–39.2。撤销恢复标题 20，重做回到 18。
- 导出 `.tvtemplate.json`，删除本地模板后导入恢复。工程文件被拒绝，原模板库还在。v0.1 夹具能打开。
- 局部图移到主图下方后，引导线可以点中，右栏为「引导线」，图层不变。双击图标题会切到属性页并聚焦标题输入。
- 没有另开系统 Chrome / Edge。

### 已知限制

- 图层只到主图和局部图，不拆图例、标注、来源框、引导线。
- 没有多选、对齐、分布或复制图。
- 局部图不能保存为图表模板。
- 来源框与局部图重叠时不画引导线。用户把来源图放到局部图之上时，引导线可能被来源图盖住。
- 模板存在当前浏览器的 localStorage。配额或存储不可用时提示错误，绘图和工程继续可用。
- Formula、MAE/RMSE、Results、双 Y 轴、Heatmap、3D、桌面打包仍未做。

## 工作台外壳（仍为 v0.5.0）

- 日期：2026-10-10
- 软件版本未升，工程格式未升。

把已接受的实验记录外壳接到现有工作台，不从外壳原型搬入叠纸拖放、抽样表或毫米纸缩放。

- 顶栏分成文件、工程名、图与输出。Visualizer 打开关于。新建、打开、保存（含另存为）、导入、添加图（含模板菜单）、布局、预览、导出 PNG / SVG 的 id 和动作未改。
- 选择、框选、读数、标注和缩放留在画布上方的分段条。状态在纸下方。
- 界面字体统一为 `"Iowan Old Style", "Palatino Linotype", Palatino, "Songti SC", STSong, serif`。
- 图内和导出仍用 `FONT_FAMILIES` / `DEFAULT_FONT`。`theme()` 读取的 `--surface`、`--ink`、`--muted`、`--line`、`--grid` 未改成外壳色。

### 验证

`node tests/core-test.js` 全部通过。Playwright Chromium 打开 `http://127.0.0.1:8766/temperature_trajectory_visualizer.html`。

- 顶栏字体是 Iowan Old Style / Palatino / Songti SC。工程名「未命名工程」，已保存。导出按钮为 `#3a3228`。
- 保存菜单含保存和另存为。添加图的模板菜单含系统默认、保存、管理和导入。点添加图后出现第二张图，标题变为未保存。
- 框选按下，缩放从 100% 到 110%。Visualizer 打开关于，版本 v0.5.0。导出菜单为导出 PNG / 导出 SVG。导入温度 CSV 后可加入当前图。图层页可切换。预览可打开并关闭。控制台无错误。
- 图标题改成 Times New Roman 后，画布和预览 SVG 的标题是 `Times New Roman, Times, serif`，刻度仍是 `Aptos, Helvetica Neue, Noto Sans SC, sans-serif`。预览 SVG 不含 `Iowan Old Style` 或 `Songti SC`。`--surface` 仍是 `#ffffff`，`--ink` 仍是 `#1d2024`。
- 此浏览器有 `showSaveFilePicker`，导出点击会走系统保存框，没有落成下载文件。预览与导出共用 `buildCanvasSvg()`。

### 复查修正

- `showLayoutMenu` 在菜单插入文档后夹取 `left`：`Math.max(8, Math.min(按钮左缘, innerWidth - 菜单宽 - 8))`。布局动作未改。
- 深色主题下 `.tv-button--primary:hover`、`.tv-button--export:hover` 和导出 summary 的 hover 背景改为 `#2e3c46`，略浅于深色 `--export` `#243038`。浅色 hover 仍是 `#2c261e`，浅色 `--export` 仍是 `#3a3228`。
- `[data-theme="dark"] .tv-canvas-paper` 的 outline 改为 `1px solid var(--line)`。浅色纸边仍是 `rgba(48, 38, 26, .16)`。

`node tests/core-test.js` 全部通过。夹取公式下，332px 菜单在 1280px 窗口、按钮左缘 1200 或 1240 时 left 为 940，右缘距窗口 8px；按钮已在左侧时 left 保持原值。Chrome 打开页面：1280px 时布局按钮左缘 1096、菜单宽 334，left 夹到 938，右缘 1272；980px 时右缘距窗口 8px。工作台内主按钮和导出按钮的深色 hover 为 `#2e3c46`，规则不含 `#2c261e`。浅色 hover 仍为 `#2c261e`，浅色导出底为 `#3a3228`。深色纸边为 `#354045`。

---

## v0.6.0

- 软件版本：`0.6.0`
- 工程格式：`projectFormatVersion: "1.1"`（仍读取 `1.0`）
- 文档结构：`schemaVersion: 2`（未升）
- 模板格式：`templateFormatVersion: 1`
- 日期：2026-10-10

这一版把图窗和画布拆开。图窗是可复用的图资产，画布是排版页，实例只记录某张图在某张画布上的位置、大小和层级。没有重写 SVG 绘图。

### 数据

`project.canvases[]` 保存画布。每个实例有自己的 `id`、`plotId`、`x`、`y`、`width`、`height`、`zOrder`、`locked`、`visible`。图窗固有尺寸仍是 `plot.layout` 的宽高。局部视图继续用 `detailSource.sourceFigureId` 挂在父图窗上，不进 Dock，也不变成实例。

没有 `canvases` 的旧工程在打开时合成画布 1，并为每张非局部图按原来的 `layout` 放一个实例。空的 `canvases: []` 同样按旧工程处理。工作副本的 `projectFormatVersion` 写成 `1.1`，`softwareVersion` 写成 `0.6.0`。旧字段保留。

新建工程先有图窗 1、画布 1，以及图窗 1 的一个实例。之后新建的图窗不自动放入当前画布。同一图窗可以被多张画布引用。同一画布不重复放置同一图窗。删除被引用的图窗时返回画布名称，未确认则不删。确认后清掉全部实例。移除实例不删资产。

`project.ui` 增加 `workspaceMode`、`activeCanvasId`、`activePlotId`、`dockExpanded`。`selectedObject` 仍不进工程。

### 界面

底部 Dock：米白底、细边、大圆角。画布 `#DBE5EF`，图窗 `#F3D9C5` / `#D5E6D9` / `#E3D9F1` 循环。选中边 `#638DBB`。最右「新建」可选新建图窗或新建画布。缩略图：有曲线时在识别色上画一条降采样折线；空图仍用缩小后的图窗 SVG，背景透明。

模式条显示当前画布，绘图模式再显示图窗名。双击画布中的图进入绘图模式。绘图模式的纸面只包住当前图窗及其局部视图。点选不记零距离拖动，因此单击不会把工程标脏。

排版模式的框选拖出矩形，选中相交的实例。多选时不一致的 X/Y/宽/高显示「混合值」，只有改过的字段写回这些实例。对齐和等间距只改实例位置，不改图窗绘制。从 Dock 拖进画布走指针按下、移动、松开。

画布模式下，未放进画布的图不再画出选中框。快速布局只排列图窗，并把结果写到当前画布的实例上。

### 验证

`node --check visualizer-core.js` 通过。`node tests/core-test.js` 全部通过。覆盖默认工作区、第二张图窗不自动放置、实例几何、同一画布不重复放置、跨画布引用、删除前提示画布名、移除实例保留资产、复制出新 ID、旧 `1.0` 布局迁成实例、局部视图不进实例、序列化、图层上移、重命名不改引用、选中画布时没有默认加入目标、撤销恢复实例。

浏览器使用 Playwright Chromium，页面来自 `http://127.0.0.1:8876/temperature_trajectory_visualizer.html`。Microsoft Edge 本机未安装，未测。系统保存对话框没有点穿。Playwright 调用 `showSaveFilePicker` 时被 `Page.setInterceptFileChooserDialog` 拦截，返回 AbortError，系统框没有出现。SVG 导出在拿掉保存对话框后走了已有的下载回退。

真实鼠标从 Dock 拖动图窗 2 和图窗 3 放进画布 1。绘图模式纸面为 1280×800，只有当前图窗。框选一次选中 3 个实例。只改宽度时另外三个字段保持原值。顶对齐和水平等距只改位置，z 顺序不变。有数据的 Dock 缩略图能看出折线。这一轮控制台没有错误。

### 未完成

同一画布放同一图窗的第二个实例、系统保存框里保存后再打开、十余个图窗的压力，以及 Edge。这些没有标成通过。

---

## 2026-10-10 发布 v0.6.0

- 软件版本：`0.6.0`
- 工程格式：`projectFormatVersion: "1.1"`
- tag：`v0.6.0`
- 页面：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.6.0

正式版，不是 Draft，也不是 Pre-release。附件 `Visualizer-v0.6.0.zip`（html + `visualizer-core.js` + `README.md`，三个文件在压缩包根目录）。

发布后用上一正式版 `0.4.1` 请求 `releases/latest`：状态为发现新版本，最新版 `0.6.0`，下载地址是 `Visualizer-v0.6.0.zip`。本地 `0.6.0` 的状态是当前版本不低于最新正式版本。

## v0.6.1

日期：2026-10-12。目标是把工作区还给图：Dock 不再常驻占高，绘图模式按当前视口适应图窗，读数框可以直接选曲线。

软件版本改为 `0.6.1`。`projectFormatVersion` 仍是 `1.1`。显示缩放上限从 300% 改为 800%，只影响视口。

### 完成

- Dock 改为底部悬浮。默认自动隐藏，不进入主工作区的高度分配。靠近底边呼出，离开后延迟隐藏。固定后才占布局高度，并重新测量绘图视口。
- 紧凑模式改为约 46 px 图标，名称不常驻。悬停显示缓存过的图窗 SVG 预览。展开模式保留大缩略图。两种状态写入 `visualizer.workspace.dock`，不进工程 JSON。
- 顶部导航收成一行。说明改为按钮按需打开。
- 绘图模式使用单独的视口缩放。进入时适应窗口；100%、适应窗口、适应宽度分开。手动缩放或滚动后，普通重绘不再强制适应。返回画布后仍用画布自己的缩放。
- 读数框可悬停、点击和方向键选择系列，锁定当前 X，不改可见性。超过 8 条系列时提供筛选。
- 左侧数据簇和系列增加概览与抽样表。摘要按系列 ID 计算，沿用数据自带单位。
- 图窗宽高改为毫米输入。单栏 / 双栏只改宽度。显示类复选框改为 Toggle。数据勾选仍是 Checkbox。

### 数据模型

没有新的工程字段，没有升 `projectFormatVersion`。Dock 偏好是应用状态。绘图模式缩放不写回图窗布局。

### 验证

`node tests/core-test.js` 通过。Chrome / Playwright 1440×900 核对了 Dock 隐藏与固定的高度差、小图窗自动放大、100%、双栏不改高度、画布实例位置、数据概览和读数点击。没有测 Edge，没有做 20 张图窗压力测试，没有重新走保存框和导出保存。

### 未完成

Edge、多图窗压力、系统保存框往返、网格线开关。本机没有 weasyprint，`Updates/更新介绍.pdf` 没有重新生成。没有创建 GitHub Release。





## v0.6.2

日期：2026-10-12。目标是数据面板精简、样式联动修复与画布交互优化。不加新的功能面。

软件版本改为 `0.6.2`。`projectFormatVersion` 仍是 `1.1`，没有新的工程字段。

### 改动模块

- `visualizer-core.js`：`applyGroupStyle` 改为按字段写入；新增 `updateSeriesStyle`、`viewportLayout`、`viewportWorldAt`、`viewportScrollFor`、`viewportCenterScroll`、`wheelZoomFactor`、`steppedZoom`、`computeOverlayPosition`、`datasetUsage`；`summarizeDataset` 增加来源文件、导入时间、每条点数是否一致、Y 单位。
- `temperature_trajectory_visualizer.html`：样式入口 `patchSeriesStyle`；绘图视口 `applyCanvasZoom` / `setCanvasZoom` / 滚轮处理；浮层 `placeFloating`、`closeFloatingLayers`、Dock 提示；数据面板系列行与数据簇概览。
- `tests/core-test.js`：新增样式、视口、滚轮、浮层、55 × 2000 概览测试。

### 五个问题的原因与修复

1. 簇样式线宽不实时。颜色控件直接写 `groupStyles`，线型和线宽只改面板草稿，要按「应用到该数据簇全部系列」才写。按钮把草稿全部字段写回，草稿里没改过的颜色是默认 `#25884d`，同时清掉所有单独覆盖，所以改线宽会把颜色和线型一起重置。修复：所有控件实时调用同一个 `patchSeriesStyle(plot, target, patch)`，内部走 `core.updateSeriesStyle`。`target.datasetId` 时只改该簇在当前图里的系列，`target.seriesIds` 时只改选中系列。patch 里有哪个字段就只写哪个字段、只清哪个覆盖标记。选中系列的编辑不再调用 `applyStyleToSeries` 改源系列，避免影响其他图窗。按钮改名「全部重新应用」，保留整套覆盖的语义。
2. 适应窗口偏移、贴右、平移不到边。旧实现用 flex 居中加 overflow 滚动，内容大于视口时 flex 居中会把左侧推到负区，靠 `is-overflow-*` 类补救，类名会过期；最大滚动时纸面贴右边，没有尾部留白；`setCanvasZoom` 换算世界坐标时没算居中偏移；程序滚动的保护标记用 `setTimeout(0)` 清除，早于异步滚动事件，适应模式被误判成手动平移。修复：滚动区是普通块，内部一个尺寸明确的 surface，纸面和参考线用 `translate(offsetX, offsetY) scale(zoom)` 定位。surface 和偏移由 `viewportLayout` 算：内容小于视口时居中，大于视口时两侧各留 `VIEWPORT_GUTTER = 24` px。程序滚动记录期望位置，滚动事件只有位置不同才算用户平移。可见区尺寸变化（侧栏、窗口、Dock 固定）时重新适应。
3. 浮层出界。右键菜单只夹左上；Dock「新建」弹层在 `overflow-x: auto` 的 Dock 行里被裁；紧凑 Dock 图标没有名字提示；吸附和布局菜单各写一套夹取。修复：纯函数 `computeOverlayPosition` 负责翻转、平移和限高，`placeFloating` 只做测量和写样式。所有跨容器浮层挂在 `body`。层级：Dock 36 < 提示 / 预览 52 < 弹层 58 < 右键菜单 60，对话框用 `showModal` 进浏览器顶层。提示离开即隐藏；可交互的弹层沿用 Dock 的延迟隐藏，指针进入弹层时取消隐藏。Esc 统一关闭。
4. 系列行拥挤。每行有「概览」按钮和可展开表。修复：概览移到数据簇，系列行只保留复选框、颜色点、名称和点数，详细信息放在悬停时才生成的 `title`。数据簇概览是可关闭弹层，打开时随勾选和加入图窗实时重算，区分「已选」「已加入任一图窗」「当前图」。系列颜色先整图算一次，避免 55 条系列时每行重算全图。
5. 触控板捏合太灵敏。每个滚轮事件固定 ±10%。修复：`wheelZoomFactor` 把 deltaMode 行 / 页换成像素，按 `exp(-deltaY × gain)` 连续缩放，单次步长上限 0.2；捏合（`ctrlKey`、无 `metaKey`、像素模式、小 delta）用 `PINCH_ZOOM_GAIN`，否则用 `WHEEL_ZOOM_GAIN`，不把所有 Ctrl + 滚轮都当触控板。同一帧内的事件合并，锚点取最后一个指针位置；250 ms 内连续手势锁住同一个世界坐标，避免取整漂移。只有带 Ctrl / ⌘ 的滚轮才 `preventDefault`。工具栏和快捷键按 10% 档位，缩放百分比可直接输入。

### 状态与坐标

- 视口：`viewportLayoutState` 保存最近一次布局。世界坐标 = (滚动位置 + 视口内坐标 − 偏移) / 缩放。适应模式不改 `plot.layout` 和画布实例尺寸，只改显示缩放。
- 样式：优先级仍是系列覆盖 > 簇样式 > 图窗默认 > 系统默认。没有新增并行状态。

### 兼容

旧工程直接打开。`groupStyles` 和 `styleOverrides` 的结构不变，只是写入粒度变细。没有改导出、模板、局部图、图层和 Dock 偏好的格式。

### 验证

`node tests/core-test.js` 通过。Chrome（Cursor 内置浏览器）1920×1080 与 760×480 核对了 55 × 2000 导入、数据簇概览实时计数、簇样式逐项实时生效与撤销、右键菜单四角、Dock 提示和「新建」弹层、输入缩放、两端平移与适应后重新居中。没有真实触控板手测，没有测 Edge，没有走系统保存框。

### 未完成

真机触控板手感、Edge、保存框往返。注释菜单、模式说明和顶部下拉仍是 CSS 定位。

`Updates/更新介绍.pdf` 本机没有 weasyprint，改用 Chrome headless 从同目录 HTML 打印，单页。

---

## 2026-10-12 发布 v0.6.2

- 软件版本：`0.6.2`
- 工程格式：`projectFormatVersion: "1.1"`
- tag：`v0.6.2`（提交 `d0c9a66`）
- 页面：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.6.2

正式版，不是 Draft，也不是 Pre-release。附件 `Visualizer-v0.6.2.zip`（html + `visualizer-core.js` + `README.md`，三个文件在压缩包根目录）。v0.6.1 没有单独发布，改动随 v0.6.2 一起进入正式版。

发布后取 `releases/latest`（匿名请求返回 403，改用 `gh api` 取同一份 JSON），交给 `0.6.0` 的更新判断：状态为发现新版本，最新版 `0.6.2`。本地 `0.6.2` 的状态是当前已是最新。

---

## 2026-10-17 ICON-002 已审批图标接入

软件版本保持 `0.6.2`。工程格式保持 `1.1`。没有提交、没有 tag、没有 GitHub Release。

用户已人工批准 ICON-001 实际生成的 5 个 SVG：`series-style`、`axes`、`legend`、`layout`、`fit-view`。本轮只把这些文件和既有 A 级 SVG 嵌进 `temperature_trajectory_visualizer.html`，没有重画，没有改 `visualizer-core.js`。

接入位置：左栏「数据」标题和未导入空状态用 `dataset`；Dock 画布卡用 `canvas`，图窗卡仍是曲线缩略图；属性栏「X Axis」「Y Axis」共用 `axes`，「图例」用 `legend`，「数据系列」用 `series-style`，「局部视图」用 `inset`，「标注」用 `annotation`，局部图「位置与尺寸」用 `layout`，画布节用 `canvas`，图窗实例用 `trajectory`；图层列表标题用 `layers`；图表模板对话框和空列表用 `template`；「适应窗口」用 `fit-view` 并保留文字。框选和读数沿用原 16px 线性图标。参数行、系列行、菜单项、导出设置、图表和标题节不加图标。

深色底上的 `#222` 墨线靠图标容器的 `#FAF8F5` 纸色底板，不用 CSS 滤镜。B 级在属性栏里显示为 20px，源文件仍是 24px 设计。

验证：`node --check visualizer-core.js`、`node tests/core-test.js`、`node tests/icon-slot-test.js` 通过。Chrome 里导入样例 CSV、加入曲线、把线宽改到 4 并立即反映到图上、适应窗口、缩放、创建局部视图、拖动图窗实例、Dock 右键菜单、760×480 与约 1440/1920 视口。没有跑 Edge、真机触控板和系统保存框。

---

## 2026-10-17 ICON-003 Inspector 样板

软件版本仍是 `0.6.2`，工程格式仍是 `1.1`。没有提交、没有 tag、没有 Release。只改了属性栏里的 X Axis 和图例，Y Axis、数据系列、Dock 和已批准 SVG 都没动。

X Axis 和图例的一级标题改成卡片：展开 62px、折叠 54px，B 级图标显示 24px，模块间距 10px。X Axis 里原有的二级行（轴线与刻度、轴标题、范围与缩放、时间单位、上边）行高 42px。图例把「显示图例 / 位置 / 排列方式」做成同样高度的选项行，列数、字体、间距和背景仍是缩进后的参数，没有再加一层折叠。仓库里没有和这些二级语义对得上的现成线性图标，所以二级保持文字。属性栏宽度仍是 300px。

验证：`node --check visualizer-core.js`、`node tests/core-test.js`、`node tests/icon-slot-test.js` 通过。Chrome 导入 `tests/fixtures/TESTDATA_temperature.csv`，把 T1、T2 加入图窗 1。轴线宽度改到 3.2 后图上立即变化，折叠再展开仍是 3.2；新建图窗 2 仍是 1.1，从 Dock 回到图窗 1 后 3.2 还在。图例位置改到左下。系列线宽改到 4 后曲线立即变粗。Enter 能折叠一级模块。1920×1080 与 760×480 没有横向溢出，绘图区宽度与改前相同。深色用现有 `data-theme="dark"` 看过，当前顶栏没有单独的主题开关。没有跑 Edge、真机触控板和系统保存框。截图在 `design/icon-system/inspector-prototype-v1/screenshots/`。

---

## 2026-10-19 ICON-004 Inspector 三级菜单与工作台收尾

软件版本仍是 `0.6.2`，工程格式仍是 `1.1`。没有提交、没有 tag、没有 Release。没有改 `visualizer-core.js`，没有重画已审批 SVG。

主图属性栏不再把 X Axis 当作一级卡片。一级是「图标题、背景与尺寸、轴线与刻度、图例、数据系列、局部视图、标注与引导线、导出设置」，外加虚线边框的全局画布。X Axis 和 Y Axis 收到「轴线与刻度」下面，原来的轴线、轴标题、范围、时间单位、上边、右边仍是三级文字分组。局部图的范围与缩放、来源框与引导线、位置与尺寸也用同一套一级卡片。「删除此图」保持独立危险按钮。

二级补了 16px 单色线性图标：X/Y Axis、系列、样式、图例的显示/位置/排列，以及顶栏新建、打开、保存、导入、添加图、布局、预览、导出。这些不是已审批手绘资产。`fit-view` 仍只在「适应窗口」。上边和右边不加图标。属性栏宽度仍是 300px。

顶栏按钮是图标加文字、浅底和细边框。添加图略强调，导出保持深色。窄于 1180px 时收成图标，文字仍在按钮里供读屏。属性 / 图层改成可辨认的 Tab。图层行是独立圆角卡片，选中、拖动、显隐和排序函数没改。

验证：`node --check visualizer-core.js`、`node tests/core-test.js`、`node tests/icon-slot-test.js` 通过。Chrome 1920×1080 导入温度样例，三条曲线加入图窗 1。X 轴线宽改到 3.2 并画进 SVG，折叠后输入仍是 3.2。图例改到左下。选中一条系列后线宽改到 4，SVG 出现 stroke-width 4。760×480 顶栏不横向溢出，导出菜单右缘在 752px。图层卡片可选中。Dock 仍在 DOM 中，类名随本机偏好为展开。没有跑 Edge、真机触控板和系统保存框。截图在 `design/icon-system/icon-004/screenshots/`。

---

## 2026-10-19 ICON-005 28px 一级图标、画布对象识别与字体核查

软件版本仍是 `0.6.2`，工程格式仍是 `1.1`。没有提交、没有 tag、没有 Release。没有改 `visualizer-core.js`，没有重画已审批 SVG。

一级 Inspector 图标显示尺寸改为 CSS 变量 `--l1-icon-size: 28px`。已批准的 B/A 级 SVG 等比例缩放，viewBox 和路径未改。二级线性图标实测仍是 18px。Dock 入口尺寸没有改。

缺图标的一级卡片没有塞进未审批素材。`图标题`、`背景与尺寸`、`导出设置` 在已批准清单里没有可复用且不撞语义的 SVG：`layout` 已用于局部图「位置与尺寸」，`canvas` 是画布页，`axes` 是轴线。隔离候选在 `design/icon-system/candidates-icon005/`，状态 `PENDING_REVIEW`，没有写入 `ICON_SVG`。局部图才出现的「范围与缩放」「来源框与引导线」同样只有待审候选。

画布里点中图窗后，属性标题用图的自定义标题；没有自定义标题时用稳定图窗名。副标题才写「画布对象 · 图窗实例」或「局部图 · 来源 …」。图层卡片主名称是图标题、局部图名、引导线序号或标注文字，副标题写类型和来源。点选图层不改 `zOrder`，只有上移、下移、置顶、置底会改。一级「轴线与刻度」和三级「轴线样式」不再同名。

Claude 字体没有替换。2026-10-19 在 `https://claude.ai/login` 读到界面西文是 Anthropic Sans / Anthropic Serif，文件在 `assets-proxy.anthropic.com`，没有可再分发许可。同一页的汉字实际由 PingFang SC 绘制。记录在 `design/icon-system/icon-005/claude-font-2026-10-19.md`。`--ui-font` 和图内字体都没动。

验证：`node --check visualizer-core.js`、`node tests/core-test.js`、`node tests/icon-slot-test.js` 通过。Chrome 1920×1080 导入 `tests/fixtures/TESTDATA_temperature.csv`，三条曲线加入图窗 1，标题改为 T1-T3，加了自由文本和局部视图，并从 Dock 放下标题为 T1-T7 的图窗 2。图层五条名称是 T1-T7、T1-T3、局部视图 1、引导线 1、文本。点「局部视图 1」后两个实例的 zOrder 仍是 1 和 2；再对 T1-T3 点置顶后变为 2 和 1。已有图标的一级卡片 computed width/height 为 28px。760×480 时 `documentElement.scrollWidth` 为 760，没有横向溢出。没有跑 Edge、真机触控板和系统保存框。截图在 `design/icon-system/icon-005/screenshots/`。

---

## 2026-10-19 ICON-005-FOLLOWUP-02 获批一级图标接入

软件版本仍是 `0.6.2`，工程格式仍是 `1.1`。没有提交、没有 tag、没有 Release。没有改 `visualizer-core.js`，没有重画 SVG，没有改配色和比例。Claude 字体仍 BLOCKED，`--ui-font` 没动。

用户审批标识 `USER_APPROVAL_ICON005_20261019`。`design/icon-system/candidates-icon005/` 的原始 SVG 字节未改。`manifest.json` 与 `ICON_REVIEW.md` 写成 APPROVED，原 PENDING_REVIEW 历史保留在 `manifest.pending-review.json` 和 `ICON_REVIEW.pending.md`。五个 SHA-256 与源文件一致。

`ICON_SVG` 写入 `figure-title`、`frame`、`export-settings`、`range`、`source-link`。主图一级：图标题、背景与尺寸、导出设置。局部图一级才用 range →「范围与缩放」、source-link →「来源框与引导线」。三级 Axis「范围与缩放」仍无图标。没有新建虚假菜单。显示仍走 `--l1-icon-size: 28px`。

主图实际一级全部有 28px SVG：图标题、背景与尺寸、轴线与刻度、图例、数据系列、局部视图、标注与引导线、导出设置、画布。局部图另有范围与缩放、来源框与引导线、标题、位置与尺寸、标注。

验证：`node --check visualizer-core.js` PASS；`node tests/core-test.js` PASS；`node tests/icon-slot-test.js` PASS，含 Chrome headless 对三个必装 Icon 的真实 DOM 断言（label、可渲染 SVG、slot 与 SVG computed 28×28）。Chrome 1920×1080 与 760×480 导入温度样例后绘图，Inspector 展开/收起正常。1920 与 760 的 `documentElement.scrollWidth` 分别是 1920 和 760，无横向溢出。页面无远程资源请求。Cursor 浏览器拦截 `file://`，离线依据是内联 SVG 加本地 http。Edge、真机触控板、系统保存框 NOT RUN。截图在 `design/icon-system/icon-005/screenshots/followup-02-*`。

---

## v0.6.3

软件版本改为 `0.6.3`。`projectFormatVersion` 仍是 `1.1`，没有新的工程字段。

把 ICON-002 到 ICON-005 已经完成、用户已批准的界面发出去：

- 属性栏一级 28px 图标全覆盖，补上图标题、背景与尺寸、导出设置。
- Inspector 三级菜单：轴线与刻度作为一级，X Axis / Y Axis 在二级。
- 顶栏按钮带图标；窄窗口收成图标。
- 属性 / 图层 Tab，图层独立卡片。
- 画布对象标题与图层识别：点中的图显示真实图名，图层能区分主图、局部图、引导线和标注。
- 五枚已审批 SVG：`figure-title`、`frame`、`export-settings`、`range`、`source-link`。

明确不包含 FONT-001（Claude 字体，仍无离线许可）和 DOCK-001（独立 Dock 优化）。

验证：`node --check visualizer-core.js` PASS；`node tests/core-test.js` PASS（`APP_INFO.version` 为 `0.6.3`）；`node tests/icon-slot-test.js` PASS。Chrome 1920×1080 一级图标 28px、五条图层可识别、工程文本保存再打开、SVG/PNG 导出、关于面板 v0.6.3。Chrome 760×480 无横向溢出。离线产品脚本无远程依赖。Edge、真机触控板、系统保存框 NOT RUN。

---

## 2026-10-19 发布 v0.6.3

- 软件版本：`0.6.3`
- 工程格式：`projectFormatVersion: "1.1"`
- 分支：`feat/v0.1.0`
- 提交：`dc9b643198c0e70af3bdf3e3554448afb16cbfcb`
- tag：`v0.6.3` 指向该提交
- 页面：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.6.3

正式版，不是 Draft，也不是 Pre-release。附件 `Visualizer-v0.6.3.zip`（html + `visualizer-core.js` + `README.md`，三个文件在压缩包根目录）。SHA256 `c48340ba144f04da35bae9fba9cffb06aab93c11f0615755a5dd0cc976be98d3`。远端下载后校验一致。

FONT-001 与 DOCK-001 不在这一版。发布后取 `releases/latest`：`0.6.2` 判断为发现新版本 `0.6.3` 且带 zip 下载地址；本地 `0.6.3` 判断为当前已是最新。

---

## 2026-10-23 V070-A 公式计算（未升版本）

在 `0.6.3` / 工程格式 `1.1` 上实现 V0.7.0 第一阶段 V070-A，不改 `APP_INFO.version`，不打 tag，不发 Release。

核心：

- Project 增加 `formulas[]`。派生结果是 Series，进入唯一虚拟数据簇「计算结果」，不覆盖 Raw y。
- 受限公式解析（加减乘除、乘方、括号、abs/sqrt/ln/log10/exp/min/max、pi/e），不用 `eval`。
- 同 X 逐点计算；不同 X 拒绝，不按行号对齐。循环依赖提交时拒绝。删源后下游标 Invalid，保留 formulaId，不改绑同名列。
- Undo 快照含 formulas 与 computed dataset。旧工程缺 formulas 仍可打开。

界面：

- 左侧勾选仍是加入当前图；点名称进入 Inspector。
- 「新建公式」草稿 / 预览 / 应用 / 取消。应用后不自动勾选、不自动加入当前图。
- Inspector「计算信息」：表达式、状态、绑定、编辑、查看依赖、删除计算系列。删源前弹出下游影响。

验证：`node --check visualizer-core.js` PASS；`node tests/core-test.js` PASS（含 F-01..06 与界面字符串）；`node tests/icon-slot-test.js` PASS。Chrome headless 导入 `TESTDATA_exp_25C.csv`，提交 `T2 - T1`，簇名为计算结果，y 为 `0.1/0.1/0.2/0.1`，Raw 未改，取消不写入，勾选与 Inspector 分离。1920×1080 与 760×480 下 `scrollWidth` 未超出视口，计算信息与计算结果簇仍在。Cursor 内嵌浏览器访问 localhost 失败（chrome-error）。Edge、真机触控板、系统保存框 NOT RUN。

未做：对齐引擎（V070-B）、MAE/RMSE/Results（V070-C）。

---

## 2026-10-23 V070-B 对齐引擎（未升版本）

在 `0.6.3` / 工程格式 `1.1` 上实现 V070-B。不改 `APP_INFO.version`，不打 tag，不发 Release。基线是 V070-A 的 `06a33e0`。

核心 `alignSeries`：

- 默认参考时间轴是变量 A 的 X；没有 A 时用第一个输入。输出 X 用参考序列，不改原始数组。
- 线性插值是默认。Exact 只保留相同时间戳。Nearest 必须给出非负容差，等距取较早的点。
- Δt 加在待对齐序列上。正号使该序列向后移。只保留重叠区间，线性模式不外推。
- 时间单位支持 s、ms、min、h，先换到参考单位再平移。温度只在 °C 与 K 之间换算。两边都标了单位且对不上时拒绝，不暗中换算。
- 重复时间戳、非严格递增、时间轴 NaN/Inf 直接报错。Y 的 NaN/Inf 排除并计数。默认缺口阈值是正间隔中位数的 5 倍；跨过更大的间隔就排除，全部落在缺口里则报错。
- 返回对齐后的向量、有效掩码、排除数量和原因。公式列走这个接口。按行号相减不会发生。
- 对齐参数写在公式的 `alignment` 里，随工程保存。旧工程仍是 `1.1`。缺省容差可以打开。已经存成 exact 的旧公式保持 exact。

界面只改了两处说明：公式编辑器不再写「不同采样会拒绝」；计算信息里显示对齐方式和 Δt。没有做 Results，也没有重做工作台。

验证：`node --check visualizer-core.js` PASS；`node tests/core-test.js` PASS。固定夹具 A=(0,10),(1,12),(2,14),(3,16)，B=(0,11),(2,15),(4,19)。线性对齐后 B 为 11,13,15,17，误差为 1,1,1,1。比较用 atol = 1e-9、rtol = 1e-9。另有 Δt=±9.081 无重叠、Δt=±1 的方向、Exact、Nearest 容差 0.4 和 1、窗口、缺口、单位、工程往返。Edge、真机触控板、系统保存框 NOT RUN。MAE/RMSE/Results 仍是 V070-C，本轮未做。

---

## 2026-10-23 V070-C 误差分析与 Results（未升版本）

在 `0.6.3` / 工程格式 `1.1` 上实现 V070-C。不改 `APP_INFO.version`，不打 tag，不发 Release。基线是 V070-B 的 `a8a2f5e`。

核心：

- Project 增加 `analyses[]`。AnalysisRecord 用 B 阶段 `alignSeries` 算误差，不另写一套对齐。`e = prediction − reference`。指标 MAE、RMSE、MaxAE、Bias、有效 N 和排除原因。N=0 拒绝提交，不输出伪零。
- 显示精度与 CSV 精度分开。Dirty 不能导出。删源后分析标 Invalid。旧工程缺 `analyses` 仍可打开，不升 `projectFormatVersion`。
- 误差曲线是 `role: analysis-error` 的派生 Series 加独立图窗。用户点「生成误差曲线」才创建，不自动进入画布。重复点击复用同一 Series 与图窗。

界面：

- 公式编辑器补齐 AlignmentConfig：对齐模式、参考序列、Δt、有效时间窗口、Nearest 容差、最大插值缺口。草稿 / 应用 / 取消。分析向导共用同一套字段，隐藏重复的参考序列下拉。
- 独立浮动 Results 工具窗口，不进 Plot/Canvas 图层，也不进图窗 Dock。可开关、移动、收起；关闭不删记录。指标卡、重命名、编辑、重算、复制、摘要 CSV、逐点 CSV。

验证：`node --check visualizer-core.js` PASS；`node tests/core-test.js` PASS（SPEC-070 MAE=RMSE=MaxAE=Bias=1、N=4；e=[1,-2,3] MAE=2、RMSE=sqrt(14/3)、MaxAE=3、Bias=2/3）；`node tests/icon-slot-test.js` PASS。Chrome 8771 导入 `tests/fixtures/spec070-A.csv` 与 `spec070-B.csv`，分析向导选参考 A / 预测 B / 线性插值后计算，Results 显示 MAE/RMSE/MaxAE/Bias=1、N=4。生成误差曲线两次：第一次「未放入当前画布」，第二次定位现有 `Analysis_001_error`，画布实例仍为 1。工程 `serializeProject` / `openProjectText` 往返恢复指标。公式编辑器最近邻显示容差。图层只有图窗 1 主图实例。SVG 不含 MAE。Inspector、图窗 Dock、模板菜单、PNG/SVG 按钮仍在。Edge、真机触控板、系统保存框 NOT RUN。V070-D 未做。

---

## 2026-10-23 V070-D 发布候选验收（未升版本、未发版）

在 `0.6.3` / 工程格式 `1.1` 上做 V070-D。不改 `APP_INFO.version`，不打 tag，不发 Release。起点是 V070-C 的 `389da68b3be1141e268dd7ce3061b5a13ae8af6f`。本轮没有新的 Git 提交。验收时工作区里只有 `temperature_trajectory_visualizer.html` 的未提交修复（+43 / −9）。

修复只针对验收里碰到的两处：

- 画布模式下选中计算系列时，属性栏先画画布设置，再追加计算信息。原先会整栏换成计算卡片。
- Results 默认不再压在左侧数据栏上。窗口落在左右栏之间的空隙里，底部留出 Dock 高度，窄宽度下指标改成两列。拖动位置仍由原来的偏好保存。

Chrome 155.0.8059.85、headless、`file://` 打开与 `visualizer-core.js` 同目录的 HTML。非 file/data/blob 请求会被中止，启动时没有这类请求。固定夹具线性对齐后误差为 1,1,1,1，MAE=RMSE=MaxAE=Bias=1，N=4。Δt=+9.081 预览为无重叠且取消后不写入。误差曲线点两次，第二次复用，不进画布。摘要 CSV 与逐点 CSV 由浏览器下载得到，PNG 为 2720×1760，SVG 与预览相同且不含 Results。新工程字节往返恢复 y=1,1,1,1 与 MAE=1。1.0 工程打开后工作副本为 1.1。删除来源先取消再确认，失效分析不能导出。重复时间戳在分析预览里报错。温度数据回归了多选、新图窗不自动入画布、实例上移、模板不含数据、局部视图和读数游标。

10 万点：Node 五条链路 214 ms，MAE=1，N=100000，对齐 100000，JSON/CSV 约 9.25 倍，RSS 约 352 MB。Chrome 导入 62 ms，公式界面 230 ms，随后页内再跑公式、对齐、分析和误差曲线共 81 ms，打开 Results 7 ms。上限分别是 20000 / 20000 / 20000 / 3000 ms。页内后三条不是再走一遍公式对话框。

Edge 未安装，`playwright install msedge` 需要 sudo，file:// 记 NOT RUN，不用 localhost 代替。系统保存框、系统打开框、真机触控板、Windows 也是 NOT RUN。标注新建、复制图窗、检查更新、多条分析记录本轮没有单独点过。1920 的 Results 不压数据栏、属性栏和 Dock。760 的 Results 宽 180、高 244，指标两列可读，打开的 Dock 贴着卡片下沿，操作按钮在卡片内部滚动。

`node tests/core-test.js` 与 `node tests/icon-slot-test.js` PASS。标识 `EXEC_V070-D_20261023T142348_CURSOR_389da68`。Task 保持 WIP，Done 未勾。等用户确认后才提交这处修复、打 v0.7.0 tag 或发 Release。

---

## 2026-10-26 V070-D 发布闸门补项（仍未升版本、未发版）

继续 V070-D，不重做 A/B/C，不重跑 10-23 已通过的全量矩阵。HEAD 仍是 `389da68`。`APP_INFO.version` 仍是 `0.6.3`。两项 HTML 修复仍未提交。本轮没有新的 Git 提交，无关未提交文件保留。

普通 Chrome 155（pid 81645，无 `--allow-file-access-from-files`）用 `open -a "Google Chrome"` 打开 `file:///Users/elssssa/Visualizer/temperature_trajectory_visualizer.html`，窗口标题为 `未命名工程.json · Visualizer`。同一 Chrome 下 `showSaveFilePicker` 在 Playwright 探测中为 function。完整点击导入到导出没有在该已打开窗口里做完：Computer Use 缺 Screen Recording；System Events 读不到 Chrome window 1。

无 `--allow-file-access-from-files` 的 Playwright `channel: "chrome"` headless file:// 补测：导入 spec070-A/B、公式 B-A 得 1,1,1,1、分析 MAE=RMSE=MaxAE=Bias=1 N=4、两条 Results、复制图窗得到「图窗 1 副本」、数据点标注 coordinateMode=data、摘要 CSV、SVG 不含 MAE、工程文本重开、检查更新为 up-to-date v0.6.3。画布属性栏同时保留画布设置和计算信息。1920 Results 在 x=300 宽 420，与左右栏和 Dock 重叠面积 0。760 Results 宽 180、指标两列，卡片内部 overflow:auto，滚动后「删除」可见；展开 Dock 与 Results 底边重叠约 20 px。

10 万点口径：Node 五链路仍是 `visualizer-core.js` API（本轮 145 ms，MAE=1，N=100000）。10-23 Chrome 导入和公式对话框是真实 UI；同一页里后三条公式/对齐/分析/误差曲线是 `VisualizerCore` 直接调用，不是再走一遍对话框；随后 `Results` 按钮是真实点击。本轮未重跑 10 万点 Chrome UI。

系统保存框：headed Playwright 点「另存为」后 osascript 18 s 未见到 sheet，记 NOT RUN。10-23 的 `~/Downloads/测试工程.json` 不是本轮证据。Edge、真机触控板、Windows 仍 NOT RUN。未打 tag，未发 Release。标识 `EXEC_V070-D_20261026T103519_CURSOR_389da68`。Notion MCP 本会话不可用，报告在 `tmp/notion-handoff/`。

---

## v0.7.0

软件版本改为 `0.7.0`。`projectFormatVersion` 仍是 `1.1`，仍可读 `1.0`。没有为发版升级工程格式。

把 V070-A/B/C 已提交的公式列、跨来源对齐、MAE/RMSE 与 Results，以及 V070-D 两项已验证 UI 修复一起发出去：

- 派生 Series / 公式列：受限数学表达式、计算结果虚拟数据簇、Inspector 编辑。原始 CSV 不变。
- 跨来源时间轴对齐：默认参考 X 线性插值，支持 Exact / Nearest、正负时间偏移、有效重叠区间、时间与温度单位、非法数据及大时间缺口处理。
- MAE / RMSE / MaxAE / Bias / N：原始数据与预测数据可来自不同 CSV，不按行号误匹配。
- 独立 Results 浮动窗口：多条分析、摘要及逐点 CSV。误差曲线只在用户明确创建时生成。
- 公式定义、对齐参数、分析记录随工程保存。
- 画布模式选中派生数据时，属性栏同时保留画布设置和计算信息。
- Results 默认落在左右栏之间，窄屏指标改两列。

明确不包含 FONT-001、DOCK-001。仓库没有 LICENSE 文件，不为第三方素材赋许可。

验证：`node --check visualizer-core.js` PASS；`node tests/core-test.js` PASS（`APP_INFO.version` 为 `0.7.0`，工程格式 `1.1`）；`node tests/icon-slot-test.js` PASS。普通 Chrome 无 `--allow-file-access-from-files` 打开工作树与 ZIP 解压 HTML。Playwright Chrome headless `file://` 同样未加该旗标：导入 spec070-A/B、公式 B−A 得 1,1,1,1、MAE=RMSE=MaxAE=Bias=1 N=4、CSV/SVG/PNG、1.0 工程打开后工作副本 1.1、工程文本重开。ZIP 三个文件在压缩包根目录。Edge、真机触控板、系统保存框、Windows NOT RUN。760×480 打开 Dock 时 Results 底边重叠约 20 px。
