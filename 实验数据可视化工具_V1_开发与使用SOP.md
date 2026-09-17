# 实验数据可视化工具 V1.0 开发与使用 SOP

**文档名称**：实验数据可视化工具 V1.0 开发与使用 SOP  
**适用阶段**：V1 功能冻结与重构开发阶段  
**产品形态**：浏览器本地运行的轻量实验数据可视化工作台  
**目标平台**：Windows / macOS  
**数据处理方式**：本地浏览器内处理，不依赖远程服务器  
**工程文件策略**：嵌入原始数据，保证工程可迁移、可恢复、可继续编辑  

---

## 1. 文档目的

本 SOP 用于统一实验数据可视化工具 V1 的产品目标、功能边界、数据结构、交互规则、工程保存方式、绘图机制、分析能力、导出机制和开发实施顺序。

本文件用于以下场景：

1. 作为后续开发的唯一需求基线；
2. 作为功能验收依据；
3. 作为后续版本迭代的回溯依据；
4. 避免后续新增功能时破坏既有数据结构和交互逻辑；
5. 保证 Windows 与 macOS 下体验一致；
6. 保持工具轻量，不逐步膨胀成完整 Origin 替代品。

---

# 2. 产品定位

## 2.1 产品目标

构建一个：

> **浏览器本地运行、工程数据自包含，支持多文件数据融合、基础公式计算、误差指标、一键局部分析、主图/子图拆分、自由排版、精确数据读取、坐标控制、事件标注、曲线备注标注、预览以及 PNG/SVG 输出的轻量实验数据可视化工作台。**

核心使用场景：

- 电池实验数据；
- 仿真数据；
- 实验 vs 仿真对比；
- 多温度测点；
- BMS / 热电偶等多源数据；
- 不同工况对比；
- 数据筛选与局部分析；
- 论文 / 汇报图快速整理与导出。

## 2.2 不追求的目标

V1 不做以下内容：

- 完整复刻 Origin；
- 高级统计平台；
- 复杂拟合工具；
- FFT 等高级信号分析；
- 云端账户系统；
- 云端同步；
- 多人协作；
- Windows 原生客户端；
- macOS 原生客户端；
- Electron / Tauri 打包；
- 复杂脚本语言；
- 完整电子表格功能。

---

# 3. 平台与运行方式

## 3.1 已确认方案

V1 继续保持：

- 浏览器运行；
- 本地数据处理；
- Mac / Windows 同时支持；
- 不考虑安装桌面端；
- 不引入重型桌面框架；
- 原则上无需网络即可完成主要使用流程。

## 3.2 技术方向

优先继续使用现有：

- HTML
- CSS
- JavaScript
- SVG / Canvas

推荐后续逐步模块化，但 V1 不强制改为某个大型前端框架。

## 3.3 本地运行目标

用户的理想使用方式：

1. 打开本地网页；
2. 导入 CSV；
3. 创建图；
4. 分析；
5. 保存工程；
6. 关闭浏览器；
7. 下次重新打开；
8. 打开工程文件；
9. 完整恢复现场；
10. 继续编辑与导出。

---

# 4. 当前版本需要重构的核心问题

现有初版存在以下结构性限制：

1. “一个 CSV ≈ 一张图”的绑定过强；
2. 主图 + 辅助图布局固定；
3. 子图拆分基于固定分组；
4. 多文件不能自由融合到同一张图；
5. 图标题可改，但副标题/说明不可完整自由修改；
6. Tooltip 只按 X 轴时刻读取大量曲线，信息密度低；
7. 坐标边距固定，无法自适应与人工覆盖；
8. 导出使用固定版式，而不是当前所见画布；
9. 缺乏工程保存；
10. 缺乏计算列；
11. 缺乏 MAE / RMSE 等快捷分析；
12. 缺乏正式 Annotation 系统；
13. 缺乏局部放大 / Inset；
14. 缺乏预览；
15. 缺乏独立 Canvas 概念。

因此 V1 不应在现有结构上继续简单堆按钮，而应完成一次数据模型与绘图模型的重构。

---

# 5. V1 核心架构

V1 必须明确区分以下对象：

1. **Project**
2. **Dataset**
3. **Series**
4. **Plot**
5. **Canvas**
6. **Formula**
7. **Metric**
8. **Annotation**
9. **Selection**
10. **Inset**
11. **Split**
12. **Preview**

整体关系：

```text
Project
├─ Datasets
│  ├─ Dataset A
│  │  ├─ Series A1
│  │  ├─ Series A2
│  │  └─ ...
│  ├─ Dataset B
│  └─ ...
│
├─ Computed Series
├─ Plots
│  ├─ Plot 1
│  ├─ Plot 2
│  └─ ...
│
├─ Selections
├─ Insets
├─ Annotations
├─ Metrics
├─ Results
└─ Canvas Layout
```

核心原则：

> **数据文件 ≠ 曲线 ≠ 图 ≠ 页面。**

---

# 6. Project 工程系统

## 6.1 工程保存必须支持

保存后恢复：

- 所有导入数据；
- 所有计算列；
- 所有图；
- 所有图引用的曲线；
- 曲线显隐状态；
- 曲线颜色；
- 曲线样式；
- 标题；
- 副标题；
- 说明；
- 坐标轴；
- 图的位置；
- 图大小；
- 子图拆分状态；
- Inset；
- Selection；
- Annotation；
- MAE / RMSE 等指标；
- Results；
- Canvas 尺寸；
- 主题；
- 导出设置。

## 6.2 工程数据保存方式

**必须使用嵌入数据。**

不依赖原 CSV 路径。

工程文件必须在以下情况下仍能打开：

- CSV 被删除；
- CSV 被移动；
- 工程复制到另一台电脑；
- Windows → Mac；
- Mac → Windows。

## 6.3 工程文件建议扩展名

建议：

```text
.tvproj.json
```

或者：

```text
.tvproj
```

V1 推荐直接使用 JSON，便于调试。

## 6.4 工程版本号

每个工程文件必须包含：

```text
projectFormatVersion
```

例如：

```json
"projectFormatVersion": "1.0"
```

用于未来兼容旧工程。

## 6.5 工程文件建议结构

```json
{
  "projectFormatVersion": "1.0",
  "projectName": "25C_1C_compare",
  "savedAt": "...",
  "datasets": [],
  "computedSeries": [],
  "plots": [],
  "selections": [],
  "insets": [],
  "annotations": [],
  "metrics": [],
  "results": [],
  "canvas": {},
  "options": {}
}
```

---

# 7. Dataset 数据集

## 7.1 定义

Dataset 表示一次导入的数据源。

例如：

```text
25C_1C_Experiment.csv
25C_1C_Simulation.csv
45C_2C.csv
```

## 7.2 Dataset 必须保存

- id；
- name；
- source filename；
- importedAt；
- 原始表头；
- 时间单位；
- 数据列；
- 数据来源说明；
- 原始数据内容。

## 7.3 Dataset 名称可修改

显示名称与原文件名分离。

例如原文件：

```text
20260917_test_002.csv
```

显示名可改成：

```text
25°C-1C 实验
```

---

# 8. Series 数据系列

## 8.1 Series 必须拥有唯一 ID

禁止只使用：

```text
T1
```

作为唯一身份。

推荐：

```text
datasetId::seriesId
```

例如：

```text
exp25_1c::T1
sim25_1c::T1
```

## 8.2 Series 数据结构

推荐每条 Series 自己保存：

```text
x[]
y[]
```

而不是强制所有曲线共享 dataset.time。

原因：

- 未来可能有不同采样率；
- 不同文件时间轴不同；
- 仿真 / 实验采样不一致；
- 多数据融合需要独立时间轴。

## 8.3 Series 类型

至少包括：

```text
raw
computed
metric-derived
```

---

# 9. 多文件导入与多源融合绘图

## 9.1 必须支持一次导入多个文件

导入后在 Data 面板中分别显示。

## 9.2 不允许强制每个 Dataset 单独成图

用户必须可以从多个文件选择 Series 放入同一个 Plot。

例如：

```text
Plot 1

25C_Exp::T1
25C_Exp::T2
25C_Sim::T1
25C_Sim::T2
```

## 9.3 Add Series 交互

推荐：

```text
Add Series
├─ Dataset A
│  ├─ T1
│  ├─ T2
│  └─ ...
├─ Dataset B
│  ├─ T1
│  └─ ...
└─ Computed Series
```

支持：

- 单选；
- 多选；
- 全选；
- 按名称筛选。

---

# 10. Formula 公式计算

## 10.1 产品定位

提供类似 Excel “新增计算列”的轻量计算能力。

不做完整脚本语言。

## 10.2 第一阶段基础算术

必须支持：

```text
A + B
A - B
A * k
A / k
```

## 10.3 聚合函数

建议支持：

```text
mean(...)
sum(...)
min(...)
max(...)
```

## 10.4 常用处理

建议第一阶段支持：

```text
abs(A)
moving_avg(A, window)
diff(A)
baseline(A)
A - baseline(A)
normalize(A)
```

## 10.5 温度场常用快捷计算

建议内置快捷入口：

```text
全场最大温度
全场最小温度
平均温度
最大温差 = Tmax - Tmin
某组平均温度
两组平均温差
```

## 10.6 计算结果行为

Computed Series 与普通 Series 等价。

必须支持：

- 绘图；
- 再参与公式；
- 拆分；
- Annotation；
- MAE / RMSE；
- 工程保存；
- 导出。

---

# 11. Metric 指标分析

## 11.1 V1 必须支持

- MAE；
- RMSE。

## 11.2 建议同步支持

- MaxAE；
- Mean Error / Bias；
- Error Std；
- R²；
- Pearson r；
- Final Value Difference；
- Peak Difference；
- Peak Time Difference；
- Area Difference；
- ΔT Range。

这些可分阶段实现。

## 11.3 指标输入结构

推荐：

```text
Reference Series
Target Series
Range
Metric
Alignment Method
```

## 11.4 计算范围

必须支持：

```text
全区间
Selection 区间
手动输入区间
```

## 11.5 时间对齐

跨文件比较时必须考虑：

- 相同时间轴；
- nearest；
- interpolate。

V1 可默认提供最近邻或线性插值。

---

# 12. Results 结果面板

## 12.1 功能

保存所有指标计算结果。

例如：

```text
RMSE   0.426 °C
MAE    0.318 °C
```

## 12.2 Results 必须

- 可查看；
- 可删除；
- 随工程保存；
- 记录计算对象；
- 记录计算区间。

## 12.3 后续增强建议

- 一键复制；
- 导出 CSV；
- 插入 Annotation；
- 插入图表说明。

---

# 13. Plot 图表对象

每张 Plot 必须独立保存：

- id；
- title；
- subtitle；
- note；
- seriesRefs；
- xAxis；
- yAxis；
- legend；
- layout；
- annotations；
- insets；
- split state；
- visibility；
- style。

Plot 不应拥有 Dataset。

Plot 只引用 Series。

---

# 14. 标题系统

每张图至少有三层文本：

```text
Title
Subtitle
Note / Description
```

三项均必须支持：

- 自动生成；
- 手动修改；
- 清空；
- 隐藏。

例如：

```text
全测点温度
52个温度传感器 + 5个辅助温度通道
25°C · 1C · Cooling OFF
```

---

# 15. Split View 拆分视图

## 15.1 必须保留现有优点

当前“主图 + 分组小图”的形式继续保留，但不再写死。

## 15.2 拆分总开关

```text
Split View
OFF / ON
```

## 15.3 自动拆分

V1 必须至少支持按默认分组：

```text
T1–T7
T8–T22
T23–T37
T38–T52
```

## 15.4 手动拆分

必须支持任意 Series 组合。

例如：

```text
子图 A:
T8, T9, T10

子图 B:
T31, T32, T33
```

## 15.5 手动拆分入口

建议：

1. 图例多选；
2. Data 面板多选；
3. 当前图内选中曲线；
4. 右键 / 操作菜单；
5. “拆分到新子图”。

## 15.6 子图性质

拆出来的小图必须是完整 Plot。

可以：

- 移动；
- 缩放；
- 改标题；
- 改坐标；
- 添加/删除曲线；
- 添加 Annotation；
- 添加 Inset；
- 导出；
- 随工程保存。

---

# 16. Canvas 自由排版

## 16.1 核心原则

所有 Plot 都放在 Canvas 上。

Canvas 是：

> **最终导出区域。**

界面工具栏、Data 面板、Property 面板不属于 Canvas。

## 16.2 Plot 在 Canvas 上必须支持

- 拖动；
- 调整宽高；
- 放大为主图；
- 缩小为辅助图；
- 前移；
- 后移；
- 删除；
- 复制。

## 16.3 推荐布局辅助

建议支持：

- 吸附；
- 对齐辅助线；
- 左对齐；
- 右对齐；
- 上对齐；
- 下对齐；
- 等宽；
- 等高；
- 等间距；
- 自动排列。

## 16.4 锁定布局

建议加入：

```text
Lock Layout
```

防止误拖。

---

# 17. 坐标轴系统

## 17.1 默认自适应

坐标轴必须根据：

- tick label；
- axis title；
- 字体大小；
- Plot 大小；

自动计算边距。

禁止长期依赖固定 margin。

## 17.2 手动模式

用户必须能覆盖自动设置。

至少支持：

```text
X min
X max
Y min
Y max
Major tick
```

## 17.3 高级 spacing

建议支持：

```text
Left
Right
Top
Bottom
X label distance
Y label distance
Tick distance
```

## 17.4 模式

```text
Auto
Manual
```

## 17.5 轴联动

建议支持：

```text
Link X Axis
Link Y Axis
```

用于主图与子图同步。

---

# 18. Cursor 单曲线读取

## 18.1 当前 Tooltip 需要替换

禁止只显示：

```text
T1
T2
...
51 additional curves
```

## 18.2 Cursor 行为

鼠标接近曲线时：

1. 查找距离鼠标最近的曲线；
2. 查找最近数据点；
3. 高亮该点；
4. 显示 Series 名；
5. 显示 X；
6. 显示 Y；
7. 显示数据来源。

示例：

```text
T37
Time        854 s
Temperature 39.72 °C
Source      25C_1C.csv
```

## 18.3 核心算法

应基于二维距离：

```text
distance(pointer, rendered data point)
```

而不是只按 X 找 nearest index。

---

# 19. Crosshair 与 Data Inspector

## 19.1 Crosshair

显示垂直游标。

## 19.2 Data Inspector

大量曲线信息统一放进 Data Inspector。

示例：

```text
Time: 854 s

Series      Value
T1          39.4
T2          39.7
T3          39.6
...
```

## 19.3 Data Inspector 必须支持滚动

避免 Tooltip 过大。

---

# 20. Selection 数据选区

Selection 是 V1 的核心中间对象。

## 20.1 Selection 创建方式

必须支持：

### A. 手动输入范围

```text
Start
End
```

### B. 鼠标框选

默认时间窗框选。

### C. XY 矩形框选

作为高级模式。

## 20.2 Selection 保存内容

建议：

```text
plotId
xMin
xMax
yMin
yMax
selectionMode
```

## 20.3 Selection 可复用

同一个 Selection 可以用于：

- Local Zoom；
- Inset；
- Split；
- RMSE；
- MAE；
- 最大值统计；
- 导出选区；
- 区间标注。

---

# 21. Local Zoom 局部放大

## 21.1 必须支持

局部放大必须是 V1 核心功能。

## 21.2 两种选区入口

1. 手动输入时间窗；
2. 鼠标框选。

## 21.3 框选后动作

框选完成后提供：

```text
局部放大窗
放大当前图
拆为子图
取消
```

## 21.4 放大当前图

直接将当前 Plot 坐标范围切换到 Selection。

## 21.5 创建 Inset

生成图内局部放大窗。

必须重新基于数据绘制。

禁止截取主图图片。

---

# 22. Inset 局部放大窗

## 22.1 Inset 本质

Inset 是依附于 Plot 的子 Plot。

## 22.2 必须支持

- 移动；
- 改宽高；
- 改 X 范围；
- 改 Y 范围；
- 自动 Y Fit；
- 手动 Y；
- 改曲线；
- 改标题；
- 删除；
- 调整层级。

## 22.3 默认轴行为

默认：

```text
X = Selection 范围
Y = 根据 Selection 内可见曲线自动 fit
```

## 22.4 主图区间标识

创建 Inset 后，主图应可显示：

- 选区矩形；
- 或边界线；
- 或浅色高亮。

## 22.5 连接线

建议支持：

```text
Auto
None
Left/Right
Custom
```

---

# 23. Annotation 备注标注系统

Annotation 不仅用于事件线。

V1 需要统一 Annotation 系统。

## 23.1 类型

至少支持：

1. 数据点标注；
2. 自由文字；
3. 垂直事件线；
4. 时间区间标注。

## 23.2 数据点标注

用于标记：

- 拐点；
- 峰值；
- 冷却开始；
- 突变；
- 异常；
- 关键实验现象。

## 23.3 数据绑定

数据点 Annotation 必须绑定：

```text
seriesId
xValue
yValue
text
```

不能只保存像素位置。

这样在 Plot 缩放或调整坐标后仍能正确定位。

## 23.4 自由文字

自由文字可放在 Plot 内任意位置。

## 23.5 垂直事件线

支持：

```text
Cooling ON
Power OFF
Restart
```

## 23.6 区间标注

支持阴影区域：

```text
Parking Window
Cooling Active
Measurement Window
```

---

# 24. 工具模式与鼠标冲突管理

为了避免 Canvas 拖动、框选、游标、Annotation 同时抢鼠标操作，必须定义工具模式。

推荐：

```text
Select
Cursor
Crosshair
Zoom / Selection
Annotation
Pan
```

原则：

- 一次只有一个主要工具模式；
- 工具状态必须清晰可见；
- ESC 可退出当前模式；
- 普通 Select 模式用于移动 Plot / Annotation；
- Zoom 模式用于框选数据；
- Cursor 模式用于读取曲线。

---

# 25. Preview 预览系统

## 25.1 预览是 V1 必需功能

## 25.2 导出预览

导出 PNG / SVG 前显示：

- 最终画布；
- 最终尺寸；
- 最终布局；
- 是否裁切；
- 是否有超出边界；
- 背景；
- 标题；
- Annotation；
- Inset。

## 25.3 工程预览

建议工程文件保存一张轻量预览图。

用于：

- 打开工程时快速识别；
- 最近工程列表；
- 工程文件选择预览。

---

# 26. Export 导出

## 26.1 导出对象

从：

```text
当前主图
```

升级为：

```text
当前 Canvas
```

## 26.2 V1 支持格式

- PNG；
- SVG。

## 26.3 输出内容

必须包含：

- 所有 Plot；
- 子图；
- Inset；
- Annotation；
- 坐标；
- 图例；
- 标题；
- 副标题；
- 备注；
- 当前布局。

## 26.4 核心原则

> **所见即所得。**

---

# 27. Canvas 尺寸

建议支持：

```text
Auto
16:9
A4 Landscape
A4 Portrait
Custom
```

Custom：

```text
Width
Height
```

V1 如果开发量需要控制，可以先实现：

```text
Auto
Custom
```

---

# 28. 推荐界面结构

建议最终界面：

```text
┌─────────────────────────────────────────────────────┐
│ Import | Open | Save | Add Plot | Split | Export   │
├───────────────┬─────────────────────┬───────────────┤
│ DATA          │                     │ PROPERTY      │
│               │                     │               │
│ Dataset A     │                     │ Plot          │
│ ├─ T1         │      Canvas         │ Series        │
│ ├─ T2         │                     │ Axis          │
│ └─ T3         │                     │ Annotation    │
│               │                     │ Inset         │
│ Dataset B     │                     │ Layout        │
│               │                     │               │
├───────────────┴─────────────────────┴───────────────┤
│ Data Inspector / Results                            │
└─────────────────────────────────────────────────────┘
```

---

# 29. Data 面板

需要展示：

- Dataset；
- 原始 Series；
- Computed Series；
- Series 类型；
- 显隐状态。

建议支持：

- 搜索；
- 多选；
- 拖入 Plot；
- 右键菜单。

---

# 30. Property 面板

根据当前选择对象切换属性。

## 30.1 Plot

- title；
- subtitle；
- note；
- axis；
- series；
- legend；
- layout。

## 30.2 Series

- name；
- color；
- line width；
- line style；
- visibility。

## 30.3 Annotation

- text；
- anchor；
- position；
- line；
- style。

## 30.4 Inset

- range；
- Y fit；
- position；
- size；
- connector。

---

# 31. 推荐使用流程 SOP

## 31.1 新建工程

1. 打开工具；
2. 新建工程；
3. 设置工程名称；
4. 导入 CSV；
5. 检查识别结果。

## 31.2 数据准备

1. 查看 Dataset；
2. 修改 Dataset 显示名称；
3. 修改 Series 显示名称；
4. 如需要，创建 Computed Series。

## 31.3 创建图

1. Add Plot；
2. 选择 Series；
3. 生成 Plot；
4. 设置标题；
5. 设置坐标；
6. 设置图例。

## 31.4 拆分视图

1. 开启 Split；
2. 选择 Auto 或 Manual；
3. 检查生成子图；
4. 调整子图内容；
5. 调整布局。

## 31.5 局部放大

方法 A：

1. 点击 Local Zoom；
2. 输入 Start / End；
3. Create Inset。

方法 B：

1. 进入 Zoom / Selection；
2. 鼠标框选；
3. 松开鼠标；
4. 选择“局部放大窗”。

## 31.6 添加标注

1. 进入 Annotation；
2. 选择类型；
3. 点击数据点或位置；
4. 输入文字；
5. 调整位置。

## 31.7 指标分析

1. 选择 Reference；
2. 选择 Target；
3. 选择全区间或 Selection；
4. 点击 MAE / RMSE；
5. 查看 Results。

## 31.8 导出

1. 打开 Preview；
2. 检查画布；
3. 检查裁切；
4. 导出 PNG / SVG。

## 31.9 保存

1. Save Project；
2. 工程自动嵌入数据；
3. 保存 `.tvproj.json`；
4. 下次 Open Project；
5. 完整恢复。

---

# 32. 功能优先级

## P0：底层重构

必须先完成：

1. Project；
2. Dataset；
3. Series；
4. Plot；
5. Canvas；
6. Series 独立 x/y；
7. Plot 引用 Series。

未完成 P0 前，不建议继续大量叠加 UI 功能。

---

## P1：V1 主链

1. 多文件导入；
2. 多源融合绘图；
3. 工程保存 / 打开；
4. Canvas；
5. 自由布局；
6. Split 自动 / 手动；
7. Title / Subtitle / Note；
8. 坐标轴 Auto / Manual；
9. Cursor；
10. Data Inspector；
11. Selection；
12. Local Zoom；
13. Inset；
14. Annotation；
15. Formula 基础；
16. MAE；
17. RMSE；
18. Results；
19. Preview；
20. PNG / SVG。

---

## P2：体验增强

1. 吸附；
2. 对齐工具；
3. Lock Layout；
4. Link X/Y；
5. 工程预览缩略图；
6. 公式快捷模板；
7. 更多指标；
8. 区间导出；
9. Annotation 样式增强；
10. Canvas 预设尺寸。

---

# 33. 验收标准

## 33.1 工程保存

验收：

- 导入 2 个 CSV；
- 建 3 张图；
- 创建 1 个计算列；
- 添加 1 个 RMSE；
- 添加 1 个 Annotation；
- 添加 1 个 Inset；
- 保存；
- 关闭页面；
- 重开；
- 打开工程；
- 所有内容完全恢复。

---

## 33.2 多文件融合

验收：

同一 Plot 中成功绘制：

```text
Dataset A::T1
Dataset B::T1
Dataset A::T2
```

不得发生 ID 冲突。

---

## 33.3 拆分

验收：

- Auto Split 正确生成；
- Manual Split 可任意选择 Series；
- 子图可独立编辑；
- 子图可拖动。

---

## 33.4 局部放大

验收：

- 输入时间范围成功；
- 框选成功；
- 创建 Inset；
- Y 自动适应；
- Inset 可拖动；
- Inset 随工程恢复；
- 导出中保留。

---

## 33.5 Annotation

验收：

数据点 Annotation 在：

- Plot 放大；
- Plot 缩小；
- Canvas 移动；
- 坐标范围变化；

之后仍然绑定正确数据点。

---

## 33.6 指标

验收：

MAE / RMSE：

- 全时域可计算；
- Selection 可计算；
- 跨 Dataset 可计算；
- Results 可保存。

---

## 33.7 导出

验收：

Preview 与最终 PNG / SVG 基本一致。

必须保证：

> 编辑区 Canvas = 导出结果。

---

# 34. 开发约束

1. V1 不再把 Dataset 直接等同于 Plot；
2. 不允许把所有 Series 永久绑死到一个统一时间数组；
3. Annotation 不允许只保存屏幕像素；
4. Inset 不允许使用截图模拟；
5. 导出不允许另外重建一套固定图版式；
6. 工程文件不依赖原 CSV 路径；
7. V1 仍以轻量浏览器工具为核心；
8. 新功能加入前先判断是否能够复用 Selection / Series / Plot / Annotation 等现有对象；
9. 避免为单独功能创建重复的数据体系。

---

# 35. V1 冻结后的新增需求管理规则

从本 SOP 生效后：

任何新需求均分为：

```text
V1 必须
V1 可选
V1 后延期
V2
```

不得直接在开发过程中无分类追加。

新增需求必须回答：

1. 它属于 Dataset / Series / Plot / Canvas / Annotation / Analysis 哪一层？
2. 是否需要修改 Project 文件格式？
3. 是否影响旧工程兼容？
4. 是否影响导出？
5. 是否影响跨平台？
6. 是否会显著增加产品重量？

---

# 36. V1 最终产品主链

```text
Import
  ↓
Datasets
  ↓
Series Pool
  ├─ Raw Series
  └─ Computed Series
  ↓
Plot
  ↓
Split / Selection / Local Zoom
  ↓
Plot Set + Insets
  ↓
Canvas
  ↓
Axis + Annotation + Layout
  ↓
Analysis
  ├─ MAE
  └─ RMSE
  ↓
Preview
  ├─ Export PNG
  ├─ Export SVG
  └─ Save Project
```

---

# 37. 一句话冻结定义

**V1 是一个浏览器本地运行、工程文件自包含、支持多数据源融合、简单数据计算、基础误差评价、图表拆分、自由布局、局部放大、数据读取、坐标控制、备注标注、预览与图片导出的轻量实验数据可视化工作台。**

---

# 38. 后续开发建议

推荐严格按以下顺序实施：

### Step 1
重构 Project / Dataset / Series / Plot / Canvas 数据模型。

### Step 2
实现工程保存与打开。

### Step 3
实现多源 Series → Plot。

### Step 4
实现 Canvas 自由布局。

### Step 5
实现 Split。

### Step 6
实现 Cursor / Data Inspector。

### Step 7
实现 Selection / Local Zoom / Inset。

### Step 8
实现 Annotation。

### Step 9
实现 Formula。

### Step 10
实现 MAE / RMSE / Results。

### Step 11
实现 Preview。

### Step 12
统一 PNG / SVG 导出。

---

**本文件作为当前 V1 功能冻结基线。后续开发以本 SOP 为准。**
