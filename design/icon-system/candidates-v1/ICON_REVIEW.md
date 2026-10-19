# ICON-001 审核总表

**2026-10-16 用户人工审批：下面 5 个已生成 SVG 全部 APPROVED。** 审批来源是用户明确确认，不是程序自动判断。本表下方的 PENDING_REVIEW 表格保留为生成当时的历史，不再作为最终结论。备份：`ICON_REVIEW.pending.md`、`manifest.pending-review.json`。SVG 文件没有重画。UI 接入见 ICON-002 与 `design/icon-system/integration-v1/ICON_INTEGRATION_REPORT.md`。

| semantic_id | 审批 |
| --- | --- |
| series-style | APPROVED |
| axes | APPROVED，X Axis 与 Y Axis 共用 |
| legend | APPROVED |
| layout | APPROVED，只用于「位置与尺寸」，不代表画布 |
| fit-view | APPROVED，沿用 16px 版本，不改内部曲线 |

## 生成时记录（历史）

状态一律是 **PENDING_REVIEW**。没有任何图标被标为 APPROVED。逐个审阅请打开 `preview.html`。决定一栏留给你填写。

| semantic_id | 等级 | 中文名 | 功能语义 | 预期位置 | 与现有图标重复 | 小尺寸判断（作者目测，非定论） | 状态 | 你的决定 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| series-style | B 24px | 曲线样式 | 线型/颜色设置：实线 + 虚线两条曲线 | 属性栏「数据系列」（含「样式」子节）标题 | 否（与 trajectory 的区别：卡片内两条不同线型） | 24px 可辨；20px 偏密，虚线只剩 2 段 | PENDING_REVIEW | ☐ APPROVED ☐ REVISE ☐ REJECT |
| axes | B 24px | 坐标轴 | L 形轴 + 两向刻度，无曲线 | 属性栏「X Axis」「Y Axis」 | 否（与 trajectory 的区别：无曲线、有刻度） | 24px 可辨；20px 刻度略挤 | PENDING_REVIEW | ☐ ☐ ☐ |
| legend | B 24px | 图例 | 三行“线段+圆点 + 文字条” | 属性栏「图例」 | 否（与 dataset 的区别：无表格线） | 24px 清晰；16px 圆点糊成块 | PENDING_REVIEW | ☐ ☐ ☐ |
| layout | B 24px | 图窗布局 | 一大两小窗口 | 局部图「位置与尺寸」（主图落点待确认） | **疑似与 A 级 canvas 构图相近** | 24px 可辨，20px 小窗口间隙变窄 | PENDING_REVIEW | ☐ ☐ ☐ |
| fit-view | C 16/20px | 适应窗口 | 四角括号 + 内部曲线 | 缩放栏「适应窗口」按钮（图标 + 文字） | 否（zoom-out 是放大镜+减号） | 20px 清晰；16px 内部曲线只有约 4px，可识别但偏弱 | PENDING_REVIEW | ☐ ☐ ☐ |

## 需要你确认的问题

1. `layout` 要不要继续？主图没有同名一级标题，且与 `canvas` 相近。
2. `axes` 是否需要 X/Y 各一个图标，还是共用一个？
3. 24px 图标进入当前 13px 文字的 accordion 标题行，标题行高要不要放大？这是后续 UI 集成任务的问题。
4. `fit-view` 的 16px 内部曲线若觉得太弱，可改成实心小方块或去掉。
5. 深色主题下 A 级图标墨线不可见，是否另开任务处理？
6. 是否同意：`region-select`、`readout-probe`、`pan`、`pointer` 沿用现有 UI 图标，不新增。

## 本轮没有生成的项

| semantic_id | 结论 | 理由 |
| --- | --- | --- |
| region-select | 重复，复用 | 现有 16px 框选图标（L1662） |
| readout-probe | 重复，复用 | 现有 16px 读数图标（L1663） |
| region-zoom | 取消 | 只是框选后的右键菜单项，无独立工具 |
| inset-region | 取消 | 同为菜单项；局部图语义已有 A/B `inset` |
| layer-order | 取消 | 四个文字按钮含义各异，单图标不能代替 |
| grid-ticks | 取消 | 无网格控件，刻度是 Axis 内子节 |
| typography | 取消 | 无独立“标题/字体”一级模块 |

## 可读性判断的局限

像素放大图来自 Chrome 对 SVG 的光栅化（亮/深两色，1× DPR）。真实屏幕（Windows/macOS 缩放 125%、150%、Retina）上的表现没有检查。这些判断是作者目测，不能代替你的审阅。

## 审批后

- 只有你逐个标 APPROVED 的图标，才会另开 UI 集成 Task。
- 集成前需要按 v0.6.2 既有功能做回归测试，之后才考虑版本和发布。
