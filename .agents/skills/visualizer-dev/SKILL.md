---
name: visualizer-dev
description: 在 Visualizer 实验数据可视化工具仓库中进行开发、修改、调试、重构、配置或代码审查时使用。以本仓库 SOP 为需求基线，约束数据模型、离线交互、工程恢复及导出验收；仅用于本项目。
---

# Visualizer 项目开发 Skill

## 入口与需求基线

本 skill 随仓库维护，仅用于本项目，不安装到全局技能目录。
每次相关任务开始时完整读取本文件，再读取根目录
[实验数据可视化工具 V1 SOP](../../../实验数据可视化工具_V1_开发与使用SOP.md)
中与任务相关的章节；首次架构工作必须完整读取 SOP。

SOP 是 V1 唯一需求基线，本文件提炼约束，不复制或替代详细需求。
先检查实际代码，再判断功能状态；不能把 SOP 的目标写成已实现功能。
现有入口是根目录 `temperature_trajectory_visualizer.html`。
当前进度读 `Progress/PROGRESS-v{softwareVersion}.md`（现为 [PROGRESS-v0.6.1.md](../../../Progress/PROGRESS-v0.6.1.md)）；开发全过程读根目录 [DEVLOG.md](../../../DEVLOG.md)。
只执行当前授权范围，不因完整阅读 SOP 就启动全部开发。

用户当前明确指令优先。新增需求按 SOP 第 35 节分类为 V1 必须、V1 可选、V1 后延期或 V2；说明所属对象层、工程格式、旧工程兼容性、导出、跨平台和依赖体积的影响。

## 必用技能

按名称从当前环境定位并完整读取。以下是当前机器路径，不能假定其他电脑具有相同路径。

| 任务 | 必用技能 | 当前安装位置 |
| --- | --- | --- |
| 代码实现、调试、重构与代码审查 | `ponytail`，默认 full | `/Users/elssssa/.agents/skills/ponytail/SKILL.md` |
| 前端设计与 UI | `frontend-design` | `/Users/elssssa/.cursor/skills/frontend-design/SKILL.md` |
| 前端设计与 UI | `web-design-engineer` | `/Users/elssssa/.codex/skills/web-design-engineer/SKILL.md` |
| 前端设计与 UI | `algorithmic-art` | `/Users/elssssa/.codex/skills/anthropic-art/SKILL.md` |
| 前端设计与 UI | `ui` | `/Users/elssssa/.agents/skills/ui/SKILL.md` |

前端代码同时适用 `ponytail` 与上表四套 UI 技能。路径失效时查找当前环境同名技能；仍缺失则明确报告，不能静默跳过或声称已使用。仅引用，不修改通用技能或全局配置。

- `ponytail`：优先浏览器原生 API、标准能力和已有实现；不引入无需求的框架或抽象。简化不得牺牲明确需求、输入验证、数值正确性、数据安全和可访问性。
- `frontend-design`：为工作台 UI 定独特视觉方向（色彩、字体、结构、文案），避免通用生成式模板。题材是科研出图工作台，画布与曲线是主体，不另做营销落地页。辨识度用在工作台 chrome；图内字体仍用科研出图选项（系统默认、微软雅黑、宋体、Arial、Times New Roman），不引入运行时在线字体。
- `web-design-engineer`：负责工作台信息层级、布局、控件状态和视觉验证。依据现有原型与 SOP 设计，不创建无关营销页。
- `algorithmic-art`：UI 任务必读，使用适用的视觉平衡、色彩和可复现原则；仅在明确的生成艺术任务中采用完整艺术创作流程。用户已选择工作台优先，不强制植入艺术查看器、随机种子控件、p5.js 或 Anthropic 品牌。
- `ui`：工作台界面的做法。新面板沿用现有组件。它的数据图规则只用于检查器、表格和属性栏；图上的实验曲线仍按 Dataset、Series、Plot 绘制。不引入在线字体，不为高频工具加动效，不做营销首屏。分页文档、PDF 和幻灯片交给 `kami`。
- SOP 的离线运行、科研数据真实性和工作台交互要求优先于通用模板；不得用生成艺术改变实验曲线或结果，不增加运行时在线 CDN 依赖。

下表按任务触发。命中一行就完整读取那一个技能，不把整套一起载入。

| 任务 | 技能 | 当前安装位置 |
| --- | --- | --- |
| 报错、崩溃、回归、以前是好的、截图对不上 | `hunt`，先于改代码 | `/Users/elssssa/.agents/skills/hunt/SKILL.md` |
| 方案还没定、要不要做、架构选择 | `think` | `/Users/elssssa/.agents/skills/think/SKILL.md` |
| 看 diff、合并前、发版是否值得、issue / PR | `check`，默认只审查 | `/Users/elssssa/.agents/skills/check/SKILL.md` |
| 面向使用者的说明、`README.md` 文案、GitHub Release Notes | `write` | `/Users/elssssa/.agents/skills/write/SKILL.md` |
| 抓取 URL 或 PDF | `read` | `/Users/elssssa/.agents/skills/read/SKILL.md` |
| 不熟的领域，整理成一篇参考 | `learn` | `/Users/elssssa/.agents/skills/learn/SKILL.md` |
| Agent 配置、指令漂移、hooks / MCP | `health` | `/Users/elssssa/.agents/skills/health/SKILL.md` |
| 分页文档、幻灯片，以及下面的更新介绍 | `kami` | `/Users/elssssa/.agents/skills/kami/SKILL.md` |

- 用户已经要求实现、继续或按计划做时，直接做，不进入 `think`。
- 用户只说排查或看看时，`hunt` 只报告，不改文件。
- `check` 不提交、不推送、不打 tag、不发 Release，除非用户当次明确要求。
- `write` 只改面向使用者的文字。`DEVLOG.md` 旧章节、SOP 和 progress 里的事实记录不拿去润色。
- `read` 只用于仓库以外的 URL 或 PDF。
- 应用本身的 bug 不走 `health`。
- 上面这些技能与本节冲突时，以本节和 SOP 为准：离线可用、不改实验曲线、`DEVLOG.md` 只追加、块公式用 `\[...\]`、发布顺序以下文为准。

## 产品与架构约束

- 浏览器本地处理，面向 Windows/macOS，主要流程离线可用。V1 不增加云账户、云同步、后端服务、Electron/Tauri 或高级统计平台。
- Dataset、Series、Plot、Canvas 分离：文件不等于曲线、图或页面。Plot 引用 Series，不拥有 Dataset；跨数据集同名列必须具有不同 ID。
- Series 保留独立 x/y，不强制所有曲线共享统一时间轴。导入与计算前检查表头、单位、缺失值、时间轴及边界行，不隐式改变数据语义。
- 工程使用自包含 JSON，建议 `.tvproj.json`，包含 `projectFormatVersion`，嵌入原始数据及编辑状态，不依赖 CSV 路径。工程格式版本与软件版本分开管理。
- Formula 结果作为 Series 参与绘图与计算；跨源指标明确对齐方式和计算区间，不静默插值或外推。
- 复用 Selection、Series、Plot、Annotation 等对象，不为每项功能创建重复数据体系。
- 数据点 Annotation 绑定数据坐标，不仅保存屏幕像素。Inset 根据选区数据重新绘制，禁止截图模拟。
- Cursor 按屏幕二维距离定位数据点；大量曲线信息放入可滚动 Data Inspector。
- 鼠标主要工具模式互斥、显式可见，ESC 退出当前模式；图例与数据可见性保持同步。
- Canvas 是最终导出区域。Preview、PNG、SVG 使用当前画布内容及布局，不另建固定导出版式。

## 版本、发布与应用状态

只记长期契约。某一版的按钮位置、弹窗尺寸和文案不写在这里。

- 内部版本 `MAJOR.MINOR.PATCH`，集中在 `APP_INFO.version`（与 `SOFTWARE_VERSION` 同一值）。界面展示时才加 `v`。比较版本必须解析 major / minor / patch 后按数字比较，禁止字符串比较。Git tag 为 `vX.Y.Z`，Release 标题为 `Visualizer vX.Y.Z`，发行包为 `Visualizer-vX.Y.Z.zip`。
- `APP_INFO.version` 与 `projectFormatVersion` 分开。只有工程 JSON schema 的兼容性变化才改 `projectFormatVersion`。已进入工程 JSON 的字段视为兼容 API，不随意重命名；必须改时要有 migration。`seriesId`、`plotId` 等稳定 ID 不随显示名变化。小版本新增字段必须能从旧工程缺省补齐，不能让旧工程打不开。
- 数据簇就是 Dataset / Source，用稳定 `datasetId` 关联，不用文件名当主键，也不另建一套平行 Group 模型。当前图的数据簇样式存在 `plot.groupStyles[datasetId]`。绘制时的优先级是 Series Override > Group Style > Figure Template Default > System Default。单独改过的字段记在 `seriesRef.styleOverrides`，重新渲染、保存、打开和应用图表模板都不会被数据簇样式或模板默认盖掉。只有用户再次执行「应用到该数据簇全部系列」时，才清掉这些 override 并重写该簇在当前图里的系列。
- 颜色控件支持直接输入或粘贴 HEX，并与同一个颜色状态双向同步。非法色值不写入绘图状态。线型预览和 Renderer 共用 `LINE_STYLES` 的 dash pattern，不维护第二套线型定义。
- 页面层级：内容在下，面板分隔条高于画布，普通浮动菜单高于分隔条，Modal（含 backdrop）高于分隔条、画布和普通浮动层。Modal 用 `showModal` 进入顶层，打开时挡住下层操作。不要只抬高某一根分隔条来压过弹窗。
- 核心流程必须离线可用。网络能力可选、隔离、失败安全：GitHub 不可用不得影响导入、绘图、工程和导出。更新源只有 GitHub Releases（`releases/latest`），不另维护 `version.json`。当前浏览器架构只做用户主动检查、告知、下载 ZIP，不自动安装或覆盖本地文件，也不在启动时请求 GitHub。
- 检查结果、About 状态、Release 元数据和 `lastUpdateCheck` 属于 Application State，不得写入工程 JSON。图表模板库也是 Application State，键为 `visualizer.templates.figure.v1`。LocalStorage 键使用 `visualizer.<domain>.<key>`，例如 `visualizer.update.lastCheck`。
- JavaScript 使用 camelCase。函数前缀：`get` / `set` / `parse` / `normalize` / `compare` / `render` / `handle` / `fetch` / `check` / `create` / `remove` / `update`。布尔：`is` / `has` / `can` / `should`。
- 领域对象沿用 Dataset、Series、Plot、Figure、Canvas、Legend、Annotation、Inset、Cursor、Project、App、Release、Update。持久化曲线用 Series，不用 curve / trace / line 指代同一对象。编辑选择与可见性分开：选中 Series 做批量编辑不改变它是否显示。
- 发布顺序：更新 APP version → 更新 `Progress/PROGRESS-vX.Y.Z.md` → `DEVLOG.md` 追加且不覆盖旧章节 → 按已实现能力改 `README.md` → 用 `kami` 更新 `Updates/更新介绍.html` 与同目录 PDF → Core Tests → 浏览器回归 → tag `vX.Y.Z` → Release 标题 `Visualizer vX.Y.Z`（正式版，不是 Draft / Prerelease）→ 上传 `Visualizer-vX.Y.Z.zip` → 用上一正式版验证手动检查更新。
- GitHub Release Notes 用 New / Improved / Fixed / Compatibility。空栏省略。Compatibility 写明 project format 与旧工程是否可读。需要润色时读 `write`。这是发布页上的说明，和下面的更新介绍是两份文字。

## V0.3.1 固定规则

1. 左栏只做数据导入、浏览和选择。右栏负责当前 Figure 的数据、样式和图形属性。样式控件不放回左栏。
2. 左侧临时选择（`checkedSeries`）和 Figure 成员（`plot.seriesRefs`）必须分开。Checkbox、已选数量、全选、Shift、Ctrl/Cmd 和「添加到当前图」只读这一份选择状态。
3. 成功加入当前图后清空临时选择。导入新数据、切换当前 Figure 时也清空临时选择。已经在图里的曲线不因此删除。
4. 右栏按数据簇列出当前图里的系列，默认收起。计数是「已加入 x/y」：x 是该簇已在当前图中的系列数，y 是该簇的系列总数。不要默认铺开未加入当前图的系列。
5. 样式优先级：Series Override > Group Style > Figure Template Default > System Default。覆盖记在 `seriesRef.styleOverrides`，不能靠 DOM 颜色反推。
6. Figure 布局只用画布逻辑坐标（`canvas.width` / `canvas.height`）。浏览器窗口和视口缩放只改变 `canvasZoom`，不改变画布逻辑尺寸和图的布局坐标。
7. 读数游标和框选是临时 UI 状态。退出模式、Esc 或切换 Figure 时清除。不写入工程、标注、PNG/SVG，也不进入永久对象的撤销历史。用户明确创建的 Annotation 才进入 Figure。
8. Checkbox 是受控控件，`checked` 只来自统一选择状态。不用 `defaultChecked`，不用第二份 checked 状态，不用 `setTimeout` 或下一次点击来补齐勾选。

## V0.4.0 固定规则

1. 选中、拖动、改属性都不改变图层顺序。只有图层面板的上移、下移、置顶、置底和拖拽排序会改 `zOrder`。不要用把节点 `appendChild` 到末尾，或给选中对象加高 `z-index`，来画选中框。
2. 选中框和缩放手柄在 Selection Overlay 上。Overlay 永远盖在画布对象之上，不写入 `zOrder`，不进入 PNG / SVG。
3. 局部视图是来源主图的另一个 Viewport，不是第二份 Series。用 `detailSource.sourceFigureId` 引用主图。绘制时的数据、显隐、名称和系列样式都读来源主图，不在局部视图上保存一套独立 `seriesRefs`。
4. 图标题和轴标题用显式 `showTitle`。空字符串或透明色不能代替关闭。关闭后对应边距要收回。图层名称和画在图上的标题是两回事。

## V0.4.1 固定规则

1. 工作区四块职责固定。左侧是数据与对象：导入、数据源、数据簇、选择，以及以后的图层列表。中间画布只放图表、局部图、标注、引导线和排版交互。右侧只编辑当前选中对象的属性。顶部只放工程级操作：导入、新建、打开、保存、新建图、布局、预览、导出、关于。
2. 新增属性先回答「它控制哪个对象」，再放进对应 Section。不要因为多了一个开关就把控件追加到右侧面板底部。字体、字号、颜色、粗细跟它所修饰的文字走；导出行为放进导出设置；重置视图放进范围与缩放。
3. 右侧是可折叠 Accordion，不是一条长表单。同一对象上用户展开或收起的状态记在内存，普通重绘不得清掉。切换对象后只展开和该对象最相关的 Section，其余一级 Section 收起。Accordion 展开状态不写入工程 JSON。
4. 局部视图 Y 有三种模式，记在 `detailSource.yRangeMode`：`follow-main` 用主图当前 Y domain；`auto-window` 只用当前可见 Series 在当前 X 窗口内的有限数据点，再按 Y span 的百分比加边距；`manual` 严格使用用户输入的 Y min/max，不再重算。新建局部视图默认 `auto-window`，边距 5%（`yPaddingRatio: 0.05`）。
5. `auto-window` 不得先用整条曲线的 Y 再裁 X。隐藏 Series、NaN、Infinity、null 不参与计算。窗口内没有有效点时保留上一次有效 Y，不写出 NaN domain。span 为 0 时用最小显示宽度，避免 domain 两端相等。
6. 绘图使用的 X/Y domain 必须和属性栏是同一套结果。局部图走 `calculateLocalViewDomain` / `plotExtents`，不能只改输入框。旧工程没有 `yRangeMode` 时：`autoFitY === false` 视为 `manual`，否则视为 `auto-window`。`autoFitY` 继续写成 `yRangeMode === "auto-window"`，不升 `projectFormatVersion`。

## V0.5.0 固定规则

1. Figure Template 与 Project 是两个独立持久化域。模板库在 `visualizer.templates.figure.v1`，文件扩展名 `.tvtemplate.json`，`templateFormatVersion` 与 `projectFormatVersion` 分开。
2. Template 保存绘图样式，不保存数据、Series、当前 X/Y 范围、标注、局部视图、画布位置或图层状态。
3. Template Apply 必须通过白名单复制尺寸、背景、标题、轴外观、四边、图例和 `defaultSeriesStyle`。不得 `Object.assign` 整个 Plot。
4. 应用模板时把实际 style 写入 Figure。工程打开后不依赖外部模板仍然存在。可选的 `plot.templateMeta` 只作名称提示。
5. `selectedObject` 属于临时 UI state，不进入工程，也不进入撤销历史。
6. 选中对象绝不能改变 `zOrder`。
7. Layer order 只能由显式图层操作修改：上移、下移、置顶、置底、拖拽排序。排序后 `zOrder` 归一化为连续整数。
8. `locked` 不等于 `pointer-events: none`。锁定后不能在画布上拖动或缩放，仍可点选、查看和修改属性、解锁、改图层和显隐。
9. Figure Template Default 的优先级低于 Group Style 和 Series Override。它只给尚未单独设置的字段和新加入的 Series 提供默认值。
10. 模板库的创建、重命名、复制、删除和默认模板不改变当前工程的 dirty 状态，也不进入工程撤销。应用到图上、图层排序和对象属性修改才进入工程历史。

## V0.6.0 固定规则

1. Plot Window 是资产，Canvas 是排版页，Instance 是某张画布上的一次放置。图窗内容（数据、样式、坐标轴、标注、局部视图）改一处，所有引用它的画布一起变。位置、大小、层级、锁定属于实例，不写回图窗的固有尺寸。
2. 局部视图仍挂在父图窗上，不出现在 Dock，也不变成画布实例。
3. Dock 只导航一级图窗和画布。图层管理器只列当前画布里的实例，或当前图窗里的内部对象。点 Dock、点图层名字、点画布，都不改变 Z 顺序。Z 顺序只由上移、下移、置顶、置底和明确的排序改变。
4. 新建工程给出画布 1 和图窗 1，图窗 1 作为画布 1 的初始实例。之后新建的图窗不自动放进当前画布。
5. 删除仍被画布引用的图窗前，必须列出这些画布的名称。移除实例不删除图窗资产。确认删除图窗时清掉全部实例。
6. 图窗导出只含该图窗及其局部视图。画布导出含当前画布上的实例位置、尺寸和层级。视口缩放不写入导出尺寸。
7. 旧工程没有 `canvases` 时，把每张非局部图的 `layout` 收成画布 1 上的一个实例。`projectFormatVersion` 升到 `1.1` 仍读取 `1.0`。不删旧字段。`selectedObject`、悬停、框选和手风琴展开不写入工程。
8. 绘图模式的纸面只包住当前图窗及其可见局部视图。排版模式的框选多选实例。多选字段不一致时显示「混合值」，只把用户改过的字段写回这些实例。对齐和等间距只改实例位置。这些选择不进工程，也不要为此重写 SVG 绘图。

## V0.6.1 固定规则

1. Dock 的自动隐藏和紧凑 / 展开是应用偏好，键为 `visualizer.workspace.dock`。自动隐藏时 Dock 不占工作区高度。只有固定后才占布局高度。
2. 绘图模式的显示缩放是视口。100%、适应窗口、适应宽度是三件不同的事。它不改图窗布局、画布实例几何，也不改 PNG / SVG 的物理尺寸。
3. 读数框里的关注系列是临时 UI。它不改变左侧勾选，也不改变系列是否显示。
4. 图窗宽高在属性栏里用毫米输入。单栏 89 mm、双栏 183 mm 只改宽度。

## 开发顺序

遵循 SOP 第 32 节。仅初始化仓库或规范的任务不开始产品重构。

1. P0：Project、Dataset、Series、Plot、Canvas、Series 独立 x/y 与引用关系；完成底层后再大量扩展 UI。
2. P1：多源导入绘图、工程恢复、自由排版、拆分、坐标与数据读取、Selection/Inset/Annotation、基础公式、MAE/RMSE、Results、预览和 PNG/SVG 主链。
3. P2：吸附对齐、布局锁定、轴联动、缩略图、公式模板和更多指标等增强；不提前混入当前任务。

保留可回退的 Git 提交，不顺手改写无关功能，不用破坏性 reset 处理环境问题。

## 开发记录

1. `DEVLOG.md` 放在仓库根目录，必须完整记录开发全过程。每个版本、仓库初始化、发布都追加独立章节，保留当时目标、完成项、数据模型变化、验证和未做事项；不得只保留最新版，不得用新章节覆盖或删改旧记录。
2. 要展示最新的写在 progress 文件：当前版本、如何运行、已实现摘要、已知限制、下一步。不要把当前状态只写在 DEVLOG 顶部代替全程记录。
3. 所有 progress 文件放在 `Progress/` 文件夹；命名必须带软件版本号，格式为 `Progress/PROGRESS-v{softwareVersion}.md`（当前 `Progress/PROGRESS-v0.6.1.md`）。升版本时在该文件夹新建对应文件，不把旧 progress 改名或覆盖，不把 progress 放在根目录。
4. 根目录 `README.md` 只描述当前软件版本已实现的能力与特色，给使用者和 GitHub 首页看。升版本、删功能或发布时必须按实际代码增删，文首版本号与当前 `PROGRESS-v*.md` 一致；不得把 SOP 未实现项写成已上线。不另存 README 历史副本，历史写在 `DEVLOG.md`。发布 zip 应包含该 README。更新介绍存在后，README 用一句话指向 `Updates/更新介绍.pdf`，不把更新叙述抄进 README。
5. 每次软件版本更新，用 `kami` 的中文 changelog 模板维护一份更新介绍，给使用软件的人看。固定三份文件，一起改，不按版本另存副本：
   - `Updates/content.json`：内容契约
   - `Updates/更新介绍.html`：排版源
   - `Updates/更新介绍.pdf`：成稿
   文件还不存在时，在这次版本更新里新建；之后只改这三份。工作目录是 `Updates/`，按已安装的 `kami` 重新生成 PDF。
   一句一条，写界面上能看到的变化。不写内部字段名、函数名、测试命令和实现过程。事实只来自该版本已经完成的行为，不把 SOP 未做项写进去。模板一份最多保留 10 个版本；更早的说法留在 `DEVLOG.md` 和对应的 progress 文件。不升软件版本的修改不改这份介绍。

交付代码或发布时同步更新：本轮追加根目录 `DEVLOG.md` 章节，写入或更新 `Progress/PROGRESS-v*.md`，并按当前已实现功能增删根目录 `README.md`。软件版本变化时，同时更新 `Updates/` 里的更新介绍。

## 验证与交付

选择能证明本次变更行为的最小验证；非平凡代码留下可运行的轻量检查，UI 变更进行实际浏览器交互与视觉检查。不得把未执行的验证写成通过。
完整 V1 验收依据 SOP 第 33 节，按本次功能覆盖：

- 工程往返：两个 CSV、三张图、计算列、RMSE、标注及 Inset 保存后关闭重开，恢复全部状态；原 CSV 移动或删除后仍可打开。
- 多源融合：同图 Dataset A::T1、Dataset B::T1、Dataset A::T2 无 ID 冲突。
- 自动及手动拆分：子图独立编辑、拖动；Inset 支持输入及框选、自动 Y fit、恢复和导出。
- 标注在图尺寸、位置及坐标范围变化后仍绑定正确数据点。
- MAE/RMSE 覆盖全区间、Selection 和跨 Dataset，验证数值、对齐方式及 Results 保存。
- Preview 与导出具有相同 Plot、Inset、Annotation、标题、图例和布局；检查离线与平台兼容，不把单机检查描述为跨平台已通过。

交付时说明实际改动、验证证据和未解决问题。不将项目规范建立视为产品功能已实现。
