# ICON-004 Inspector 三级菜单与工作台收尾

软件版本仍是 0.6.2。工程格式仍是 1.1。未提交，未打 tag，未发 Release。

## 菜单树

改前，主图属性栏：

- L1 图表
  - L2 图标题
  - L2 背景与尺寸
- L1 X Axis（错误地使用了一级卡片和 B 级 axes 图标）
  - L2 轴线与刻度 / 轴标题 / 范围与缩放 / 时间单位 / 上边
- L1 Y Axis（旧折叠样式，共用 axes 图标）
  - L2 轴线与刻度 / 轴标题 / 范围与缩放 / 右边
- L1 图例（一级卡片）
- L1 数据系列
- L1 局部视图
- L1 标注与引导线
- L1 导出设置
- 删除此图
- L1 画布（和当前图窗混在同一列表末尾）

改后，主图属性栏：

- L1 图标题
- L1 背景与尺寸
- L1 轴线与刻度（B 级 axes）
  - L2 X Axis
    - L3 轴线与刻度 / 轴标题 / 范围与缩放 / 时间单位 / 上边
  - L2 Y Axis
    - L3 轴线与刻度 / 轴标题 / 范围与缩放 / 右边
- L1 图例
  - L2 显示图例 / 位置 / 排列方式
  - L3 列数、字体、间距、背景
- L1 数据系列
  - L2 系列 / 样式
- L1 局部视图
- L1 标注与引导线
- L1 导出设置
- 删除此图（独立危险按钮）
- L1 画布，带「全局 ·」前缀和虚线边框

局部图把「局部视图、范围与缩放、标题、轴线与刻度、图例、来源框与引导线、位置与尺寸、标注、导出设置」都做成同一套一级卡片。图窗名称、尺寸、锁定和背景仍按原来的规则分到局部视图和位置与尺寸，没有删控件。

「上边」「右边」仍是纯文字。三级参数没有逐项图标。

## 二级图标

这些是本轮新增的 16px 单色线性图标，不是已审批手绘资产，也不覆盖 B/C 手绘 SVG。`fit-view` 仍只用于「适应窗口」。

| semantic_id | 位置 |
| --- | --- |
| axis-x | L2 X Axis |
| axis-y | L2 Y Axis |
| series-list | L2 系列 |
| series-style-mini | L2 样式 |
| legend-show | L2 显示图例 |
| legend-pos | L2 位置 |
| legend-arrange | L2 排列方式 |
| tool-new | 顶栏 新建 |
| tool-open | 顶栏 打开 |
| tool-save | 顶栏 保存 |
| tool-import | 顶栏 导入 |
| tool-add | 顶栏 添加图 |
| tool-layout | 顶栏 布局 |
| tool-preview | 顶栏 预览 |
| tool-export | 顶栏 导出 |

一级仍用已审批 B/A 图标：轴线与刻度 `axes`，图例 `legend`，数据系列 `series-style`，局部视图 `inset`，标注 `annotation`，位置与尺寸 `layout`，画布 `canvas`。标题、背景与尺寸、导出设置、范围与缩放、来源框与引导线没有已审批的对应 B 级图标，所以卡片不加新的手绘图标。

## 截图

`design/icon-system/icon-004/screenshots/`

- `before-1920-inspector.png`
- `before-1920-workbench-panel.png`
- `after-1920-inspector.png`
- `after-1920-workbench.png`
- `after-760-workbench.png`
