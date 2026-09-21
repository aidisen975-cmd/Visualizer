# PROGRESS v0.2.1

当前进度只写在本文件。完整开发历史见 [DEVLOG.md](../DEVLOG.md)，旧版本不得从那里删掉。

- 软件版本：`0.2.1`
- 工程格式：`projectFormatVersion: "1.0"`
- 日期：2026-09-21
- GitHub Latest Release：https://github.com/aidisen975-cmd/Visualizer/releases/latest

## 如何运行

1. 用浏览器直接打开 `temperature_trajectory_visualizer.html`（需同目录的 `visualizer-core.js`）。
2. 或在仓库根目录执行 `python3 -m http.server` 后访问该页面。
3. 核心数据测试：`node tests/core-test.js`
4. 对外发布页：https://github.com/aidisen975-cmd/Visualizer/releases/latest 。下载 `Visualizer-v0.2.1.zip`，解压后保持 html 与 `visualizer-core.js` 同目录，用 Chrome 或 Edge 打开。Windows / macOS 共用这一份，无需安装客户端。

## 当前状态

v0.2.1 已推到 `main`，并发布为 GitHub Latest Release。在 v0.1.0 P0 数据模型和 v0.2.0 通用 CSV / 工程保存之上，本版是画布编辑、图例、多图排版与出图体验。

已实现（累计到当前）：

- Project / Dataset / Series / Plot / Canvas；Series 独立 x/y；`.tvproj.json` 嵌入原始数据。
- 通用数值 CSV 导入、Dataset 折叠、批量选列、轴标题自动/手动。
- 工程新建 / 打开 / 保存 / 另存为（File System Access API，否则下载）。
- 预览与 PNG/SVG 共用画布 SVG。
- 栏宽拖动与折叠、Canvas Zoom、图例对象、布局模板与磁吸、轴手动刻度、曲线重命名。

未做（完整 V1 / 后续）：Formula、MAE/RMSE、Results、Split、Selection、Local Zoom、Inset、Annotation、Cursor / Data Inspector、Undo、Dual Y Axis、轴联动、布局锁定、工程缩略图、Electron/Tauri。

## 已知限制

- 极大数量图例仍可能超出 maxHeight；会提示批量重命名，不偷偷删项。
- 窄视口下三栏仍会挤压画布。
- 等间距提示没有数值标签。
- 布局模板作用于当前画布全部图，尚未做多选图。
- PNG/SVG 导出整张画布，没有「只导出选中单图」。
- 系统保存对话框仍需真实用户手势。

## 下一步

停在 v0.2.1，等实际排图反馈。后续可补：多选图布局、单图导出、等距数值标签、Undo。
