# ICON-005 审核总表

**2026-10-19 用户人工审批：下面 5 个已生成 SVG 全部 APPROVED。** 审批标识 `USER_APPROVAL_ICON005_20261019`。审批来源是用户明确确认，不是程序自动判断。本表下方的 PENDING_REVIEW 表格保留为生成当时的历史，不再作为最终结论。备份：`ICON_REVIEW.pending.md`、`manifest.pending-review.json`。SVG 文件没有重画。

三项必装已接入正式 Inspector：`figure-title` → 图标题，`frame` → 背景与尺寸，`export-settings` → 导出设置。`range` 与 `source-link` 只接到实际存在的局部图一级菜单「范围与缩放」「来源框与引导线」，没有新建虚假入口。三级 Axis「范围与缩放」不加图标。

| semantic_id | 审批 | 实际接入 |
| --- | --- | --- |
| figure-title | APPROVED | 主图「图标题」、局部图「标题」 |
| frame | APPROVED | 主图「背景与尺寸」 |
| export-settings | APPROVED | 主图与局部图「导出设置」 |
| range | APPROVED | 仅局部图一级「范围与缩放」 |
| source-link | APPROVED | 仅局部图一级「来源框与引导线」 |

## 生成时记录（历史）

状态一律是 **PENDING_REVIEW**。没有任何图标被标为 APPROVED。逐个审阅请打开 `preview.html`。决定一栏留给你填写。

| semantic_id | 等级 | 中文名 | 功能语义 | 预期位置 | 与现有图标重复 | 状态 | 你的决定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| figure-title | B 28px | 图标题 | 卡片里三条长短不同的文字线，没有图例圆点 | 属性栏一级「图标题」 | 否（legend 有圆点） | PENDING_REVIEW | ☐ APPROVED ☐ REVISE ☐ REJECT |
| frame | B 28px | 背景与尺寸 | 一个窗口加角上的尺寸线 | 属性栏一级「背景与尺寸」 | 否（layout 是一大两小） | PENDING_REVIEW | ☐ ☐ ☐ |
| export-settings | B 28px | 导出设置 | 页面里一支向上的箭头 | 属性栏一级「导出设置」 | 否 | PENDING_REVIEW | ☐ ☐ ☐ |
| range | B 28px | 范围与缩放 | 一条轴和两端括号 | 仅当存在独立一级「范围与缩放」 | 否（axes 是 L 形刻度） | PENDING_REVIEW | ☐ ☐ ☐ |
| source-link | B 28px | 来源框与引导线 | 两个框和一条连线 | 仅当存在独立一级「来源框与引导线」 | 否（inset 是放大窗口） | PENDING_REVIEW | ☐ ☐ ☐ |
