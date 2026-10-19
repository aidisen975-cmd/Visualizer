# ICON-001 审计笔记（只读审计）

基线：Visualizer v0.6.2（`visualizer-core.js` 中 `version: "0.6.2"`），分支 `feat/v0.1.0`，HEAD `bba90a1`。本轮没有改动 `temperature_trajectory_visualizer.html` 或任何产品代码。

## 1. Skill 能力核对

已读：`~/.cursor/skills/handdrawn-icons/SKILL.md`、`assets/gen.py`、`assets/tokens.md`、`assets/template.html`（只读，未改动；sha256 见 `manifest.json`）。

| 问题 | 结论 |
| --- | --- |
| 有 A/B/C 参数吗 | **没有**。Skill 只有一套 100×100、彩色块 + 4.5/3.5 线宽、带 feTurbulence 纸纹的“手绘拼贴”体系。 |
| B（24px）如何满足 | 用 `gen.py` 的 `wob/rr/circ/block/L` 与调色板（以 `importlib` 只读导入，不改 Skill），在 `tools/build.py` 里写 B 变体渲染：线宽 6/4.8（24px 下约 1.4/1.15px）、去掉纸纹滤镜（24px 下是噪点）、色块缩小到约 35%、封闭轮廓一律纸色填充。**这是对 Skill 的 24px 适配，不是 Skill 原生 B 模式。** |
| C（16–20px）如何满足 | Notion 要求 C 为单色 currentColor 线性、无彩色块、无手绘纹理，**与 Skill 的风格定义相反**，Skill 不支持。`fit-view` 按 Notion C 规范和真实 UI 的 16px 线性约定手写（viewBox 16、线宽 1.4、圆端点）。`manifest.json` 里 `source_skill` 写 `NONE`，不声称由 Skill 生成。 |
| 副作用 | `gen.py` 导入时会在当前目录写 `svg/`、`index.html`。构建脚本在临时目录里导入，没有污染仓库或 Skill 目录。 |

## 2. 真实 UI 对照（`temperature_trajectory_visualizer.html`）

| 规划位置 | 真实 UI 状态 | 结果 |
| --- | --- | --- |
| Dock | 底部自动隐藏浮动 Dock，由 JS 渲染缩略图卡片（`#tvDock`） | A 级复用，本轮不涉及 |
| 左侧「数据」 | `<h2>数据</h2>` + `#tvDataPanel`；顶部有“导入”文字按钮 | A/B 复用 `dataset`；导入属 C 现成库，不新增 |
| 缩放栏工具条 | 已有 16px 线性图标：选择 V、框选 M、读数 R、平移 H（L1661–1664） | `region-select`、`readout-probe` **重复，复用** |
| 缩放栏 | `−`、比例输入、`+`、**适应窗口**、适应宽度、100%，全是文字 | `fit-view` 有真实入口 → 生成 C 候选 |
| 框选后的菜单 | 「放大到此范围」「创建局部视图」是逐行菜单项（L3730） | `region-zoom`、`inset-region` 取消 |
| 图层页签 | 上移/下移/置顶/置底四个文字按钮（L8151） | `layer-order` 取消 |
| 右侧属性（主图） | 一级：图表（含图标题、背景与尺寸）、X Axis、Y Axis、图例、数据系列（含“系列”“样式”子节）、局部视图、标注与引导线、导出设置 | `series-style`、`axes`、`legend` 成立 |
| 右侧属性（局部图） | 一级含「位置与尺寸」 | `layout` 的唯一明确落点 |
| 网格 / 刻度 | 无网格控件；刻度在 X/Y Axis 内的子节「轴线与刻度」 | `grid-ticks` 取消 |
| 标题 / 字体 | 「图标题」是「图表」子节，字体控件按对象分散 | `typography` 取消 |
| Formula/MAE/RMSE | v0.6.2 未实现 | 按规划只预留，不生成 |

## 3. 四类结论

- **直接复用**：`region-select`、`readout-probe`、`pan`、`pointer`（现有 UI 内联 SVG）；B 复用 `dataset / trajectory / canvas / layers / inset / annotation / template / project / readout`（画廊里仅做 24px 可读性对照）。
- **生成候选（5）**：B `series-style`、`axes`、`legend`、`layout`；C `fit-view`。
- **条件不满足而取消**：`region-zoom`、`inset-region`、`layer-order`、`grid-ticks`、`typography`。
- **明确不加**：数据簇标题、数据簇概览、每条系列、参数行、逐行菜单项（沿规划表）。

## 4. 发现的问题

1. **深色主题下已有 A 级图标几乎不可见。** 它们的墨线 `#222222` 直接落在深色背景上（应用有 `data-theme="dark"`）。这是 A 级现状，本轮不重画；新 B 候选用纸色卡片托底来规避。需要你决定 A 级是否也要处理，另开任务。
2. **`layout` 的位置不明确。** 主图没有“布局”一级标题；而且它与 A 级 `canvas` 构图相近，存在混淆风险。
3. **`axes` 一个图标服务 X Axis 与 Y Axis 两个标题。** 是否要区分 X/Y 需要你确认。
4. **24px 图标放进当前 accordion 标题会偏大。** 现有 `<summary>` 仅 13px 文字，接入前要先定标题行高度。这是 UI 集成任务的问题，本轮不处理。
5. **Skill 与 Notion 的 C 级规范冲突**，见第 1 节。
