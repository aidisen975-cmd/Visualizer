# Visualizer v0.2.4

## Version Goal

Data Group Styling & Update System

- 软件版本：`0.2.4`
- 工程格式：`projectFormatVersion: "1.0"`
- 日期：2026-09-22
- 正式版：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.2.4

## 如何运行

1. 用浏览器直接打开 `temperature_trajectory_visualizer.html`（需同目录的 `visualizer-core.js`）。
2. 或在仓库根目录执行 `python3 -m http.server` 后访问该页面。
3. 核心数据测试：`node tests/core-test.js`
4. 对外能力说明：根目录 [README.md](../README.md)。

## Completed

- 数据面板按数据来源进行数据簇分组，显示已选 n/总数，可折叠
- 数据簇批量样式：只写入该 Dataset 的 Series style，以及已经引用这些 Series 的图；不是永久继承
- HEX 色值输入，与颜色选择器共用同一颜色状态
- 线型菜单使用与 Renderer 相同的 dash pattern 做预览
- 图标题左 / 中 / 右对齐；缺省为左
- About Modal 改为 `showModal`，层级高于左右分隔条
- GitHub Releases 更新检查：正式版、SemVer、超时、限流和断网都不影响绘图

## Compatibility

Project format: 1.0

Backward compatibility: v0.2.3 → v0.2.4 supported。缺 `title.align` 或 Series style 时加载补默认值。

## 已知限制

- 浏览器版本不能自动覆盖本地文件。更新是 GitHub Release 检查，再由用户打开 Release 页面或下载压缩包。
- 无 File System Access 的浏览器只能用默认下载目录。
- 窄视口下三栏仍会挤压画布。
- 等间距提示没有数值标签。
- PNG/SVG 导出整张画布，没有「只导出选中单图」。
- 图例自由拖动时覆盖图例项点击显隐，改用右侧眼睛按钮。
- 本机没有微软雅黑 / 宋体时走 fallback，不报错。
- `releases/latest` 只返回非 draft、非 prerelease 的正式版。本地版本更高时显示不低于最新正式版，不提示降级。

## 下一步

停在 v0.2.4。不在本版加入 v0.3.0 的 Local Zoom、Inset、Cursor、Annotation、Formula。
