# Visualizer v0.3.0

## Version Goal

Scientific Inspection & Annotation

- 软件版本：`0.3.0`
- 工程格式：`projectFormatVersion: "1.0"`（未升格式版本）
- 日期：2026-09-22

## 如何运行

1. 用浏览器直接打开 `temperature_trajectory_visualizer.html`（需同目录的 `visualizer-core.js`）。
2. 或在仓库根目录执行 `python3 -m http.server` 后访问该页面。
3. 核心数据测试：`node tests/core-test.js`
4. 对外能力说明：根目录 [README.md](../README.md)。

## 已完成

- Local Zoom：框选后放大到该范围；X 向细条只改 X
- 手动 View Range：与框选共用 `xAxis` / `yAxis` 的 auto / min / max；非法数字不写入；From > To 会交换
- 重置视图
- Inset：按数据重绘，可移动、缩放、保存、恢复，并进入预览 / PNG / SVG
- Cursor / Inspector：最近点与插值；隐藏曲线不读；超出范围显示 —
- Cursor A/B：显示 ΔX / ΔY。悬停不导出。勾选「导出时绘制固定游标」后，预览与 PNG/SVG 才包含 A/B
- Annotation：文字、箭头、标记、区域；数据坐标与画布坐标分开
- Undo / Redo：Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z、Ctrl+Y。拖拽一次手势只记一条

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

Backward compatibility: v0.1.0–v0.2.4 工程可打开。缺 `insets`、`annotations`、`fixedCursors` 时加载为空数组。`exportCursors` 缺省为 false。

## 已知限制

- 浏览器版本不能自动覆盖本地文件。更新仍是用户主动检查 GitHub Release。
- 固定游标默认只在编辑器里显示，不进入预览和导出。
- Inset 连接线是直线，不做避让。
- 非单调 X 的最近点查找是线性扫描。
- 悬停读数不写入工程。
- PNG/SVG 仍导出整张画布。
- 本机没有微软雅黑 / 宋体时走 fallback。

## 下一步

停在 v0.3.0。不在本版加入 Formula、MAE/RMSE、Results、双 Y 轴。
