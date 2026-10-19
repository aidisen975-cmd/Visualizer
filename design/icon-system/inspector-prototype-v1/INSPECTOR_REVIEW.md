# ICON-003 Inspector 样板

状态：等待人工验收。软件版本仍是 0.6.2，未提交，未打 tag，未发 Release。

## 改了什么

只动属性栏里的 **X Axis** 和 **图例**。

- 一级标题做成浅色卡片。展开时标题行 62px，折叠时 54px。已批准的 B 级图标显示为 24px，纸色底板 `#FAF8F5` 保留，SVG 源文件没有改。
- 模块之间留 10px。属性栏宽度仍是 300px，1920 视口下绘图区仍是 1342px，760 视口下仍是 182px。
- X Axis 原有二级行（轴线与刻度、轴标题、范围与缩放、时间单位、上边）行高 42px。上边没有图标。
- 图例里「显示图例」「位置」「排列方式」是 42px 选项行。列数、字体、间距、背景和边框缩进在下面，仍是文字和控件。没有再加一层需要点击的折叠。
- Y Axis、数据系列、图表、局部视图、标注、导出、Dock、绘图计算都保持原样。

## 二级图标

仓库里能复用的线性图标只有工具栏的选择、框选、读数、平移，以及已批准的 `fit-view`。它们和这几个二级项不是同一个动作，所以没有套上去，也没有新画。

| 二级项 | 看过的现有图标 | 处理 |
| --- | --- | --- |
| 轴线与刻度 | 读数十字、B 级 `axes` | 留文字。读数是探针；B 级图不能缩成 C 级 |
| 轴标题 | 无对应线性图 | 留文字 |
| 范围与缩放 | `fit-view`、框选虚线框 | 留文字。前者是适应窗口，后者是画布框选 |
| 时间单位 | 无时钟图标 | 留文字 |
| 图例的位置、排列 | 无对应线性图 | 留文字 |
| 上边 | 规范写明语义含糊时不加 | 留文字，行高与其他二级行对齐 |

## 代码与 Git

- HEAD：`bba90a1`（`docs: record the v0.6.2 stable GitHub release`）
- 分支：`feat/v0.1.0`
- 本轮产品代码：`temperature_trajectory_visualizer.html`
- 测试：`tests/icon-slot-test.js` 增加了样板类名检查，原有 SVG 对照还在
- 记录：本文件、`DEVLOG.md` 追加一节、`Progress/PROGRESS-v0.6.2.md` 追加一节
- `visualizer-core.js`、已批准 SVG、Dock 未改
- 工作区里 ICON-002 之前就有的未提交文件没有清理

回退：删掉样式表里 `.tv-proto-l1` 这一段，并去掉 `markInspectorProto` 以及对 `tv-proto-l2`、`tv-proto-option`、`tv-proto-params` 的调用。不要动 `ICON_SVG`。

## 验证

命令：

- `node --check visualizer-core.js`：PASS
- `node tests/core-test.js`：PASS
- `node tests/icon-slot-test.js`：PASS

Chrome（本机 Google Chrome，headless，CSS 像素）导入 `tests/fixtures/TESTDATA_temperature.csv`，勾选 T1、T2，加入图窗 1。

| 检查 | 结果 |
| --- | --- |
| 轴线宽度改为 3.2，图立即变化 | PASS |
| 折叠再展开，宽度仍是 3.2 | PASS |
| 关闭「显示轴线」，绘图 SVG 变短 | PASS |
| 图例位置改为左下 | PASS |
| 新建图窗 2，X Axis 仍是样板，Y Axis 仍是 20px 旧图标，轴线宽度是 1.1 | PASS |
| Dock 点回图窗 1，轴线宽度仍是 3.2 | PASS |
| 数据系列线宽改为 4，曲线立即变粗 | PASS |
| Enter 折叠一级模块 | PASS |
| 760×480 属性栏无横向溢出，宽度仍 300 | PASS |
| 页面 JS 错误 | 无 |

NOT RUN：Edge、真机触控板、系统保存框、屏幕阅读器。

深色截图把现有 `data-theme` 设为 `dark`。样式表支持这个状态。当前顶栏没有单独的主题开关，所以这不是一条用户可见的切换路径。

## 截图

目录：`design/icon-system/inspector-prototype-v1/screenshots/`

前后各有 1920 与 760，以及浅色下的折叠、只开 X Axis、只开图例、两个都开。1920 另有深色和把图例滚到标题下的截图。交互截图是 `after-interaction-axis.png`、`after-interaction-legend.png`。测量数字在 `before-metrics.json`、`after-metrics.json`，交互记录在 `interaction-log.json`。

## 预览

在仓库根目录已启动：

`http://127.0.0.1:8765/temperature_trajectory_visualizer.html`

打开后点「绘图」，导入 CSV，把曲线加入当前图，再展开右侧 X Axis 或图例。若 8765 没在听，在仓库根目录执行 `python3 -m http.server 8765`。

## 和设计图的差别

- 二级没有 C 级图标。原因见上表，不是漏做。
- 图例没有新增折叠层，避免多一次点击。层次靠 42px 选项行和下面缩进的参数。
- 一级标题没有加副标题。300px 栏里子行已经说明内容，副标题会再占一行。
- 折叠和展开仍是浏览器原生 `details`，没有加展开动画。这个控件会反复点，动画会显得拖。
