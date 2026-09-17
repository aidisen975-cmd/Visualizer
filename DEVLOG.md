# DEVLOG

## 本轮版本

- 软件版本：`0.1.0`
- 工程格式：`projectFormatVersion: "1.0"`
- 分支：`feat/v0.1.0`
- 日期：2026-09-17

v0.1.0 完成 SOP 第 32 节 **P0 数据模型**，并打通最小可用主链（多源导入、建图、自由布局、工程保存/打开、预览、PNG/SVG）。**不是** SOP 中的完整 V1。

## 如何运行

1. 用浏览器直接打开 `temperature_trajectory_visualizer.html`（需同目录的 `visualizer-core.js`）。
2. 或在仓库根目录执行 `python3 -m http.server` 后访问该页面。
3. 核心数据测试：`node tests/core-test.js`

拆出 `visualizer-core.js` 的原因：数据模型与工程解析无 DOM，才能用 Node 做最小可运行检查；页面仍通过本地 `<script>` 引用，无 CDN、无构建链。

## 本轮实际完成

- Project / Dataset / Series / Plot / Canvas 分离。
- Series 使用 `datasetId::localId`，每条曲线独立 `x[]` / `y[]`。
- Plot 只引用 Series ID，可跨 Dataset 组图。
- 工作台：导入、新建工程、打开、保存、新建图、预览、导出 PNG/SVG。
- Data 面板多选曲线加入指定 Plot；Canvas 上创建/选择/移动/缩放/删除 Plot。
- 属性：标题、副标题、备注、曲线显隐与颜色、X/Y 自动或手动范围。
- `.tvproj.json` 嵌入原始 CSV 与本轮已实现的图、样式、坐标、布局。
- 预览/导出共用 `buildCanvasSvg()`，只含画布内容。
- 中文界面；空状态、错误提示、未保存标记。

## 明确未做（完整 V1 / 后续）

Formula、MAE/RMSE、Results、Split、Selection、Inset、Annotation、Cursor / Data Inspector、轴联动、吸附对齐、布局锁定、工程缩略图。界面不展示这些功能的假按钮。

## 验证

### Node（已执行）

`node tests/core-test.js` 全部通过。覆盖：两个标注为测试数据的 CSV（同名列 T1/T2、不同采样时间轴）、唯一 ID、跨源引用、工程往返、损坏 JSON、不支持版本、无效 CSV。解析失败不改写当前工程对象。

测试数据：

- `tests/fixtures/TESTDATA_exp_25C.csv`
- `tests/fixtures/TESTDATA_sim_25C.csv`

### 浏览器（已执行，macOS / Cursor 内置浏览器）

通过本地 `http://127.0.0.1:8770/` 交互检查：

- 导入两个测试 CSV；ID 为 `ds-exp::T1` 与 `ds-sim::T1`，无冲突。
- 新建图，勾选实验 T1/T2 与仿真 T1 加入同一 Plot。
- 修改标题/副标题/备注、隐藏仿真 T1、改颜色、X 轴手动 0–20。
- 第二张图、指针移动与缩放布局。
- 无效 CSV、损坏工程、`projectFormatVersion: "9.9"` 均报错且不清空现有工程。
- `serializeProject` 后再 `openProjectText(..., { force: true })` 恢复图、显隐、颜色、坐标、布局、嵌入 CSV。
- 预览与导出来自同一画布 SVG；SVG 含标题/图例/两张图，不含工具栏；PNG 约 59 KB 且可栅格化。

未验证：Windows、`file://` 直接打开、真实下载文件后再用系统文件选择器打开（打开路径与 `openProjectText` 相同）。

## 已知问题

- 窄视口下三栏可能挤压画布；属性面板需较宽窗口。
- 手动坐标若 min/max 未填全，仍回退自动范围。
- Plot 过多时默认级联可能超出画布，需手动拖回。
- 属性面板中同名曲线现已带数据源前缀；图例在曲线很多时可能换行拥挤。
- 未保存提示依赖 `beforeunload`，浏览器实现不一致。

## 下一步（建议按 SOP 38）

1. Split 自动/手动。
2. Cursor 与 Data Inspector。
3. Selection / Local Zoom / Inset。
4. Annotation。
5. Formula 与 MAE/RMSE / Results。
6. Windows 与 `file://` 补测。
