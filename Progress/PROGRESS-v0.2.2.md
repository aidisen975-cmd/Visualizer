# PROGRESS v0.2.2

当前进度只写在本文件。完整开发历史见 [DEVLOG.md](../DEVLOG.md)，旧版本不得从那里删掉。

- 软件版本：`0.2.2`
- 工程格式：`projectFormatVersion: "1.0"`
- 日期：2026-09-21
- GitHub 测试版：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.2.2

## 如何运行

1. 用浏览器直接打开 `temperature_trajectory_visualizer.html`（需同目录的 `visualizer-core.js`）。
2. 或在仓库根目录执行 `python3 -m http.server` 后访问该页面。
3. 核心数据测试：`node tests/core-test.js`
4. 对外能力说明：根目录 [README.md](../README.md)（随本版本增删，不写未实现功能）。

## 当前状态

v0.2.2 基于 v0.2.1 继续迭代，不重写引擎。目标是把「能把 CSV 画出来」推进到可较高效率制作科研/工程报告图。

已实现（累计到当前）：

- CSV 导入、数据簇、多 Series、多图画布、快速布局、图例、标题/坐标轴、工程保存/打开、PNG/SVG 导出。
- 时间单位（每图）、批量重命名、画布缩放、面板宽度、数据簇折叠、Series 批量选择、预览。
- Series 编辑选择与可见性解耦；批量重命名按 seriesId。
- 一大两小主图槽位；Legend 自由拖动与行列；Series/文字/轴线样式。
- 新建工程自动 Figure 1；导出/另存为统一文件对话框（不支持则回退下载）。
- X Auto Range 无左右 padding。

未做（完整 V1 / 后续）：Formula、MAE/RMSE、Results、Split、Local Zoom、Inset、Annotation 编辑器、Cursor / Data Inspector、Undo、Dual Y Axis、轴联动、布局锁定、工程缩略图、Electron/Tauri、3D/Heatmap。

## 已知限制

- 无 File System Access 的浏览器只能用默认下载目录。
- 窄视口下三栏仍会挤压画布。
- 等间距提示没有数值标签。
- PNG/SVG 导出整张画布，没有「只导出选中单图」。
- 图例自由拖动时覆盖图例项点击显隐，改用右侧眼睛按钮。

## 下一步

停在 v0.2.2。后续可补：Undo、单图导出、标注编辑、等距数值标签。
