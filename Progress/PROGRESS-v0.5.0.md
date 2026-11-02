# Visualizer v0.5.0

## Version Goal

把科研绘图编辑器的四件基础事做完：对象怎么选、对象怎么编辑、对象怎么叠放、图表格式怎么复用。

软件版本：`0.5.0`  
工程格式：`projectFormatVersion: "1.0"`（未升）  
文档结构：`schemaVersion: 2`（未升）  
模板格式：`templateFormatVersion: 1`

## 本轮完成

- 统一选中对象。画布上一次只有一个焦点：主图、局部图、图例、标注、来源框、引导线。
- 右栏由这个焦点决定。子对象只显示自己的设置。
- 图层可以拖拽排序，眼睛和锁保持原有语义，列表上方是最上层。
- 图表模板：从当前主图保存、设为默认、用来新建图、应用到已有图、导入导出 `.tvtemplate.json`。
- 工作台换成实验记录外壳：暖纸顶栏、居中工程名、桌面画布。按钮和交互仍是这一版已有的。界面用「温升轨迹」衬线；图内和导出字体不变。

## Object Model

`selectedObject` 为 `{ type, figureId, objectId }`。类型是 `plot`、`detail`、`legend`、`annotation`、`source-box`、`connector`，原有 inset 仍可表示。来源框和引导线的 `objectId` 是局部图 id，几何和样式继续读 `detailSource`，不另建模型。图例继续读 `plot.legend`。

命中用 DOM 上的 `data-object` / `data-edit`，不在每次点击时扫描全部几何。选中不改 `zOrder`，不把图节点挪到末尾。选中框留在 overlay。Esc 先取消拖动、缩放、框选或创建；否则只清除选中，不写工程、不记撤销。Delete 对主图、局部图、标注是删除；对图例、来源框、引导线是隐藏。

`plot.locked` 只禁止画布拖动、缩放和直接改位置。锁定对象仍可点选、改属性和解锁。

## Layer System

图层只列主图和局部视图。拖握把松手后一次性把 `zOrder` 归一化成 `1..n`，记一条撤销。点名字只选中。隐藏的图不绘制、不导出，行还在。引导线与局部图共用 `zOrder`，画在局部图之前。

## Figure Template

模板描述怎么画，不描述画什么。保存尺寸、背景、标题、X/Y 轴外观、上边和右边、图例，以及 `defaultSeriesStyle`。不保存数据、Series 身份、当前 min/max、标注、局部图、画布坐标、图层和选中。

样式优先级：

```text
Series Override > Group Style > Figure Template Default > System Default
```

应用时白名单复制样式。`layout.x/y`、系列、范围、标注、局部图关系和 `zOrder` 不动。已有系列覆盖不被清掉。一次应用一条撤销。Figure 保存的是抄进来的样式，不实时绑定模板。`plot.templateMeta` 只记最近一次应用的模板名，缺模板不影响打开。

局部图不能保存为模板。

## 数据模型变化

Plot 增加可缺省字段：

- `defaultSeriesStyle`：`colorMode`、`lineType`、`lineWidth`、`opacity`、可选 `color` / `paletteId`。没有则为 `null`。
- `templateMeta`：`{ templateId, templateName }` 或 `null`。

旧工程缺这两项时 normalize 为 `null`。因此 `schemaVersion` 保持 2，`projectFormatVersion` 保持 `"1.0"`。

## App State

模板库不在工程里。键：`visualizer.templates.figure.v1`。系统默认模板来自当前默认图样式，不写入存储，不能删除。库的增删改和默认模板不把工程标脏。存储不可用、配额或 JSON 损坏时提示错误，绘图和工程继续工作。

以下不写入 `.tvproj.json`：`selectedObject`、图层拖拽状态、属性焦点、Accordion 展开、模板库、模板管理界面状态。

## 向后兼容

v0.1.0 到 v0.4.1 的工程按原 normalize 打开，不要求重新保存。局部图 `yRangeMode` 的 `follow-main` / `auto-window` / `manual` 不变。应用模板不改范围模式。

## 测试

`node --check visualizer-core.js` 通过。`node tests/core-test.js` 全部通过。覆盖选中与删除/隐藏、图层归一化和撤销、模板提取/校验/往返/应用白名单、样式优先级、工程序列化隔离，以及旧工程缺省字段。外壳改动后同一套测试仍通过。

## 浏览器验证

Cursor 内置 Chromium，`http://127.0.0.1:8765/`。没有另开系统 Chrome / Edge。

- 图例、来源框、引导线、局部图、主图、自由文本的右栏焦点正确，点击不改 `zOrder`。导出 SVG 没有选中框和命中目标。顶栏 52px。
- 图层拖拽后顺序和连续 `zOrder` 正确，撤销/重做有效，再点名字不改顺序。
- 锁定后不能拖、不能缩放，能点选和解锁。Delete 隐藏图例并可撤销。
- 「论文单图」保存 Times、标题 18、轴标题 16、刻度 13、轴线 1.5、图例右上、线宽 2.5。新建图一致。第二份数据的 T1 为 2.5，改成 5 后 T2 仍为 2.5。
- 手动 X 100–900 上应用模板后范围、标注、位置和系列不变，撤销恢复应用前标题。局部图 X 1550–1800、自动窗口、5% 边距，Y 仍为 34.8–39.2。
- 模板导出、删除、导入成功。工程文件被拒绝且不清空库。v0.1 夹具能打开。
- 局部图移到主图下方后引导线可选中。双击图标题聚焦标题输入。

## 已知限制

- 不做多选、对齐、分布、复制图，也不做图例/标注/引导线的子图层。
- 局部图不能保存为图表模板。
- 来源框与局部图重叠时不生成引导线。来源图被排到局部图之上时，引导线可能被来源图盖住。
- 模板只在当前浏览器的 localStorage 和用户导出的文件里。没有云同步。
- 不做 Formula、MAE/RMSE、Results、双 Y 轴、Heatmap、3D 或桌面打包。

## 下一步

停在 v0.5.0。下一阶段再根据使用情况决定进入 v0.5.1（多选、对齐、分布、复制图）或 v0.6.0（数据处理、公式、派生系列）。
