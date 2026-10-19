# ICON-002 集成报告

软件版本保持 **0.6.2**。工程格式保持 **1.1**。没有提交、没有 tag、没有 GitHub Release。

本轮没有重画任何已批准 SVG。运行时把 SVG 字符串内嵌进 `temperature_trajectory_visualizer.html`，不 fetch、不加 npm、不加 CDN，仍然是 HTML + `visualizer-core.js` 两份文件离线打开。

## 审批

用户于 2026-10-16 确认 ICON-001 实际生成的 5 个 SVG 全部 APPROVED。本地 `manifest.json` 已从 PENDING_REVIEW 改为 APPROVED，并写明审批标识 `USER_APPROVAL_ICON-001_20261016`。生成当时的记录留在 `manifest.pending-review.json` 和 `ICON_REVIEW.pending.md`。SVG 字节与源文件一致，由 `node tests/icon-slot-test.js` 对照。

## 实际接入

| 界面 | 位置 | semantic_id | 等级 | 方式 |
| --- | --- | --- | --- | --- |
| 左栏 | 「数据」标题 | dataset | A | 复用 `tmp/handdrawn-icons/svg/dataset.svg`，26px 纸色底板 |
| 左栏 | 尚未导入数据 | dataset | A | 同上，40px，只在空状态 |
| Dock | 画布卡 | canvas | A | 复用，紧凑 40px / 展开 64px，不盖住强调色 |
| Dock | 图窗卡 | 无 |  | 仍是曲线缩略图，不用 trajectory 替换 |
| 右栏 | 「画布」、绘图模式底部画布尺寸 | canvas | A | 20px |
| 右栏 | 「图窗实例」 | trajectory | A | 20px |
| 右栏 | 「X Axis」「Y Axis」 | axes | B | 同一枚已批准图标，显示 20px |
| 右栏 | 「图例」 | legend | B | 已批准，20px |
| 右栏 | 「数据系列」 | series-style | B | 已批准，20px。子节「系列」「样式」不加 |
| 右栏 | 「局部视图」 | inset | A | 复用 |
| 右栏 | 「标注」/「标注与引导线」 | annotation | A | 复用 |
| 右栏 | 局部图「位置与尺寸」 | layout | B | 已批准。不拿它代表画布 |
| 图层 | 列表标题 | layers | A | 只在标题。行内上移/下移/置顶/置底仍是文字 |
| 模板 | 「图表模板」对话框标题和空列表 | template | A | 复用 |
| 缩放栏 | 「适应窗口」 | fit-view | C | 已批准 16px，保留文字，`currentColor` |
| 缩放栏 | 框选、读数 | region-select、readout-probe | C | 原 16px 线性图标，不重画 |

深色界面用容器底板 `#FAF8F5` 托住 `#222` 墨线，不用滤镜，彩色块保持原色。属性栏带图标的标题行高约 28px，无图标的行仍约 31px。

## 明确跳过

- 不新建 Dock 入口。`project`、`export` 顶部已有文字按钮，不在 Dock 再做一套，也不把 A 级彩色图标贴进深色「导出」按钮。
- `formula`、MAE、RMSE 仍未实现，不出现。
- `region-zoom`、`inset-region`、`layer-order`、`grid-ticks`、`typography` 不生成、不接入。
- 「图表」「图标题」「背景与尺寸」「导出设置」「范围与缩放」「来源框与引导线」不加图标。
- 数据簇、系列行、参数行、右键菜单、模板对话框里的逐行操作不加图标。
- 没有现成线性 SVG 的导入、保存、撤销、下载，不新画替代品。
- `fit-view` 在 16px 内部曲线偏细，按批准稿使用，不改源图。

## 截图

目录：`design/icon-system/integration-v1/screenshots/`（本机路径，随仓库未跟踪文件）。

- 改前：`before-light-1440.png`、`before-inspector.png`
- 改后浅色工作台：`after-light-1440.png`、`after-1920.png`
- 改后属性栏：`after-inspector-light.png`、`after-inspector-dark.png`
- 改后深色空数据：`after-data-dark.png`
- 窄窗口：`after-narrow-760.png`

## 验证

| 检查 | 结果 |
| --- | --- |
| `node --check visualizer-core.js` | PASS |
| `node tests/core-test.js` | PASS（`all core tests passed`） |
| `node tests/icon-slot-test.js` | PASS（内嵌 SVG 与源文件逐字节一致） |
| Chrome 导入 CSV、勾选、加入图窗 | PASS。样例 `t,T1,T2`，状态「已将 1 条曲线加入「图窗 1」。」 |
| 簇样式线宽改为 4 | PASS。图上 `stroke-width` 从 1.5 变为 4，无 JS 错误 |
| 适应窗口、加一档缩放 | PASS。比例先到 64%，再为 70% |
| 创建局部视图 | PASS。状态「已创建局部视图「局部视图 1」。」「位置与尺寸」带 layout 图标 |
| 排版模式拖动图窗实例 | PASS。位置从 `40px,40px` 到 `80px,68px` |
| 图层「上移」 | PASS。按钮仍是文字，行内无图标，无 JS 错误 |
| Dock 展开、图窗右键菜单 | PASS。菜单 7 项无图标，落在 1440×900 视口内 |
| 系列行、参数区图标数 | PASS。均为 0 |
| 760×480 布局 | PASS。无横向溢出。展开 Dock 会占住中部，这是原有展开行为 |
| Edge | NOT RUN |
| 真机触控板 | NOT RUN |
| 系统保存框打开/保存后再打开 | NOT RUN |
| macOS Retina / 125% / 150% 单独目测 | NOT RUN。浏览器截图按 CSS 像素，不能代替系统缩放 |

## 代码基线

- 分支 `feat/v0.1.0`
- HEAD `bba90a1d11722c7eefc5d58a6ccdc3ed3d6b635c`
- 本轮未提交
- 产品代码只改 `temperature_trajectory_visualizer.html`
- 另有测试 `tests/icon-slot-test.js`、本报告、截图、manifest 审批状态、`DEVLOG.md` 追加、`Progress/PROGRESS-v0.6.2.md` 一节
- 工作区里原有的未跟踪文件没有清理

## 风险

- 空数据时左栏标题和空状态各有一枚 `dataset`。有数据后空状态消失。若两枚叠在一起嫌多，可以只留空状态那一枚。
- A 级源图带纸纹滤镜。20px 下仍可辨，但比 B 级为 24px 简化过的稿更密。本轮不重画。
- `fit-view` 16px 内部曲线仍然偏细。

本地预览：在仓库根目录执行 `python3 -m http.server 8765`，打开 `http://127.0.0.1:8765/temperature_trajectory_visualizer.html`。本轮检查时该服务已在 8765 端口。
