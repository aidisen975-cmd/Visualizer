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
只执行当前授权范围，不因完整阅读 SOP 就启动全部开发。

用户当前明确指令优先。新增需求按 SOP 第 35 节分类为 V1 必须、V1 可选、V1 后延期或 V2；说明所属对象层、工程格式、旧工程兼容性、导出、跨平台和依赖体积的影响。

## 必用技能

按名称从当前环境定位并完整读取。以下是当前机器路径，不能假定其他电脑具有相同路径。

| 任务 | 必用技能 | 当前安装位置 |
| --- | --- | --- |
| 代码实现、调试、重构与代码审查 | `ponytail`，默认 full | `/Users/elssssa/.agents/skills/ponytail/SKILL.md` |
| 前端设计与 UI | `web-design-engineer` | `/Users/elssssa/.codex/skills/web-design-engineer/SKILL.md` |
| 前端设计与 UI | `algorithmic-art` | `/Users/elssssa/.codex/skills/anthropic-art/SKILL.md` |

前端代码同时适用三个技能。路径失效时查找当前环境同名技能；仍缺失则明确报告，不能静默跳过或声称已使用。仅引用，不修改通用技能或全局配置。

- `ponytail`：优先浏览器原生 API、标准能力和已有实现；不引入无需求的框架或抽象。简化不得牺牲明确需求、输入验证、数值正确性、数据安全和可访问性。
- `web-design-engineer`：负责工作台信息层级、布局、控件状态和视觉验证。依据现有原型与 SOP 设计，不创建无关营销页。
- `algorithmic-art`：UI 任务必读，使用适用的视觉平衡、色彩和可复现原则；仅在明确的生成艺术任务中采用完整艺术创作流程。用户已选择工作台优先，不强制植入艺术查看器、随机种子控件、p5.js 或 Anthropic 品牌。
- SOP 的离线运行、科研数据真实性和工作台交互要求优先于通用模板；不得用生成艺术改变实验曲线或结果，不增加运行时在线 CDN 依赖。

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

## 开发顺序

遵循 SOP 第 32 节。仅初始化仓库或规范的任务不开始产品重构。

1. P0：Project、Dataset、Series、Plot、Canvas、Series 独立 x/y 与引用关系；完成底层后再大量扩展 UI。
2. P1：多源导入绘图、工程恢复、自由排版、拆分、坐标与数据读取、Selection/Inset/Annotation、基础公式、MAE/RMSE、Results、预览和 PNG/SVG 主链。
3. P2：吸附对齐、布局锁定、轴联动、缩略图、公式模板和更多指标等增强；不提前混入当前任务。

保留可回退的 Git 提交，不顺手改写无关功能，不用破坏性 reset 处理环境问题。

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
