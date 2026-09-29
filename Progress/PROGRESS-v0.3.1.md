# Visualizer v0.3.1

## Version Goal

把 v0.3.0 已有的数据、Figure、样式、读数、框选和布局收成一套稳定工作流。本版不新增分析功能。

- 软件版本：`0.3.1`（只改 `APP_INFO.version`）
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本）
- 日期：2026-09-22

## 如何运行

1. 用浏览器直接打开 `temperature_trajectory_visualizer.html`（需同目录的 `visualizer-core.js`）。
2. 或在仓库根目录执行 `python3 -m http.server` 后访问该页面。
3. 核心数据测试：`node tests/core-test.js`
4. 对外能力说明：根目录 [README.md](../README.md)。

## 已完成

- 左栏只保留导入、浏览和选择。数据簇样式移到右栏当前图。
- Checkbox 由 `checkedSeries` 驱动。第一次点击立即勾选，并与「已选 x/y」一致。
- 加入当前图、导入新数据、切换 Figure 时清空临时选择，不删除已在图中的曲线。
- 右栏按数据簇收起，显示「已加入 x/y」，展开后只列出当前图里的系列。
- 样式优先级：Series Override > Group Style > Default。覆盖写入 `seriesRef.styleOverrides`。
- 读数是一根临时游标。再点击会移动它；Esc、退出读数、切换图都会清除。不进工程和导出。
- 框选转换为 Plot Area 上的数据坐标。「放大到此范围」写入当前图范围；「创建局部视图」新建独立 Figure。
- 右侧恢复画布尺寸：16:9、4:3、A4 横向、A4 纵向、自定义。视口缩放不改画布逻辑尺寸。
- 每张图可指定 Snap 分区。快速布局仍在。两者都用画布逻辑坐标。

## 未完成

- Formula
- MAE / RMSE
- Results
- Dual Y Axis
- 轴联动
- 图拆分
- Heatmap / 3D
- Desktop packaging

## Compatibility

Project format: 1.0

Backward compatibility: v0.1.0–v0.3.0 工程可打开。缺 `groupStyles` 时补 `{}`。缺 `styleOverrides` 时保持原 `seriesRef.style`，不再套一层数据簇样式。

## 已知限制

- 浏览器版本不能自动覆盖本地文件。更新仍是用户主动检查 GitHub Release。
- 新的读数点击不再生成固定游标 A/B。旧工程里已有的 A/B 仍会画出来，可用「清除游标」去掉。
- 拖动或缩放 Figure 超出画布时，画布仍会跟着变大，以免图被裁掉。手动设置的尺寸在缩放视口和 Snap 时保持不变。
- Snap 与快速布局使用内边距 40、间距 24，不是贴着画布边缘一分为二。
- 局部图复制可见系列、数据簇样式、系列样式、图例和标题，不复制标注、Inset 和固定游标。
- 非单调 X 的最近点查找是线性扫描。
- PNG/SVG 仍导出整张画布。
- 本机没有微软雅黑 / 宋体时走 fallback。

## 下一步

停在 v0.3.1。不在本版加入 Formula、MAE/RMSE、Results、双 Y 轴。
