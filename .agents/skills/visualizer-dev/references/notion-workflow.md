# Visualizer Notion 工作流

本文件是 Cursor 与 Codex 共用的操作说明。主 Skill 只保留入口。页面地址以 [notion-project.json](notion-project.json) 为准，报告正文以 [report-template.md](report-template.md) 为准。

闭环是：

ChatGPT 写下 Notion Task → Cursor 或 Codex 读取 → 本地开发与验证 → 写回 Execution Report → ChatGPT 从 Notion 继续。

Notion 负责任务和上下文交接。Git 与本地代码负责真实实现。`DEVLOG.md`、`Progress/` 和版本记录负责历史追溯。

## 发现这份 Skill

- 项目路径：`.agents/skills/visualizer-dev/SKILL.md`
- 目录名与 frontmatter 的 `name: visualizer-dev` 一致
- 仓库根目录 `AGENTS.md` 要求正式任务先读该 Skill
- 不要把这份 Skill 再复制到 `~/.codex/skills`、`.cursor/skills` 或第二个同名目录

两个工具都读取仓库里的 `AGENTS.md` 和 `.agents/skills/`。`AGENTS.md` 只用普通 Markdown，不使用某一种编辑器专有的指令语法。

## 使用哪套 Notion 工具

Skill 不能完成 Notion 授权。开始同步前，先查看当前 Agent 实际暴露的 Notion 工具，再调用。不要假设工具名永远是某一次会话里的名字。

按能力对应，而不是按固定函数名：

| 能力 | 用途 |
| --- | --- |
| 读取页面或数据库 | 打开 Task、CURRENT_STATE、数据库 schema |
| 查询数据源 | 查重，避免同名或同一 Task ID 再建一条 |
| 创建页面 | 只在原有 Task Database 里创建 Visualizer 任务；发布时在版本库创建或更新唯一记录 |
| 追加或替换正文 | 页末追加报告；同一执行标识已存在时改为就地更新 |
| 更新属性 | 仅在验收和回读都通过后勾选 Done |

写入页面前读取当前连接提供的 Notion Markdown 说明。People 和日期用连接要求的 mention。不要用会移动子页面的块去“提及”已有页面。

当前 Cursor 连接的工具位于 Notion MCP；名称以该连接的工具列表为准。Codex 若配置了 Notion MCP，用 Codex 自己列出的工具完成同样的读取、追加、回读和去重，不能把 Cursor 的测试结果当成 Codex 已通过。

## 什么时候走这套流程

走完整流程：

- 用户指定了 Notion Task
- 用户已明确授权的正式功能开发、较大缺陷修复、版本升级
- 回归验证、技术审计、版本发布

不强制创建 Task：

- 简单查询、解释、一次性小修改
- 尚未确认的讨论方案

讨论没有变成明确授权前，不要写成待执行任务。

## 任务开始前

### 判断来源

用户给出 Task URL 或 Task ID 时，用配置里的地址格式读取该页，不靠标题搜索代替。

聊天里已经明确授权、但 Notion 还没有任务时：

1. 先判断它是不是值得留下的正式迭代。不是则直接做本地工作，不建 Task。
2. 是正式功能、较大缺陷修复或版本升级时，先在 Task 数据源查重，再创建，然后执行。
3. 查重范围是本项目：标题中的同一 Task ID，或标题相同且 `Related to Project DB` 指向 Visualizer Project。Task Database 与其他项目共用，不要改无关项目的任务。
4. 已有同名或同一 Task ID 时，继续使用那一条，不新建。

新建任务时先读取 Task 数据源 schema，用当时的真实属性名。按 2026-10-16 核对过的结构，最低内容是：

- `Task`：标题，带稳定 Task ID，例如 `INIT-002｜短标题`
- `Related to Project DB`：Visualizer Project 的页面 URL
- `Done`：未完成
- `选择`：`WIP`（属性仍存在时）
- 正文：Objective、Implementation Prompt、Acceptance Criteria

不要写 `汇总`。它是只读 Rollup，来自项目状态，不是任务完成状态。不要改数据库结构。

### 读取上下文

正式开发前至少读取：

- 当前 Task
- `CURRENT_STATE`

再按需要加读，不要每次读完全部历史：

| 情况 | 再读 |
| --- | --- |
| 架构、工程格式、产品原则 | `PROJECT_CONTEXT` |
| 旧版本兼容 | `RELEASE_HISTORY` |
| 新版本发布 | 开发者版本更新数据库及其 schema |

### 对照本地 Git

读取当前分支、HEAD、工作区是否 dirty、`APP_INFO.version`，以及本任务会碰到的文件。

Notion 叙述与本地代码冲突时，先说明冲突。不自动 `reset`、`clean` 或 `rebase`。最终事实以代码和可复现测试为准。重大基线冲突，或已有未提交改动可能被盖掉时，停下来说明，不继续覆盖。

## 执行期间

按 Task 的 Implementation Prompt 和 Acceptance Criteria 做。代码、交互、版本和测试仍遵守主 Skill 与 SOP。

执行中：

- 不在每次保存文件时写 Notion
- 不修改无关任务的状态
- 不擅自改软件版本或 `projectFormatVersion`
- 不把需求文档中的规划写成已实现功能
- 不用聊天记忆覆盖代码和测试结果
- 不擅自提交、推送或发布
- 不以 Node 测试通过代替浏览器 UI 验证
- `DEVLOG.md` 继续只追加，不覆盖旧章节
- 跨多次会话时，以已存在的 Notion Task 作为同一任务的稳定标识

## 完成后写回

本地检查做完后，按报告模板生成 Execution Report。

顺序固定：

1. 读取 Task。若同一唯一执行标识已经存在，用正文替换更新那一节；不存在才在页末追加。
2. 再次读取 Task，确认该标识确实在页面上。回读失败则视为未同步，不勾 Done。
3. 回读成功后，才按本次证据更新 `CURRENT_STATE`。
4. 重要技术决策或阶段结果，向 `DEVELOPMENT_LOG` 追加摘要，不改写已有历史段落。
5. 只有用户已批准发布，或当前任务写明包含发布授权，才更新 `RELEASE_HISTORY` 和开发者版本说明。
6. 全部验收要求都满足，且第 2 步回读成功，才把 `Done` 勾成完成。属性仍包含 `选择` 时，同时设为 `DONE`，避免和 Done 矛盾。`汇总` 不作为完成依据，也不要尝试写入。

唯一执行标识：

`EXEC_<TaskID>_<YYYYMMDDTHHmmss>_<CURSOR|CODEX>_<StartCommit前7位>`

时间用 `Asia/Shanghai`。重复同步必须命中这个标识，不能因为重新跑了一次就再贴一节。

`CURRENT_STATE` 只写本次能核对的版本、commit、工作区、已实现功能、验证结论和下一步。历史测试不要改记成今天的 PASS。

## 发版时额外同步

未获得发布授权时，不做 Git tag、GitHub Release，也不把版本标成已发布。

发布已经完成，或任务明确要求记录里程碑时：

### CURRENT_STATE

更新已发布或当前里程碑版本、Git commit、Release 状态、已实现功能、验证结论、下一步。开发完成但没有正式 Release 时，状态写开发里程碑，不写已发布。

### RELEASE_HISTORY

为该版本追加技术历史：架构、主要修改、关键缺陷修复、兼容性、验证证据。不改写更早版本里已经写明的事实。

### 开发者版本更新数据库

先按版本号查找。已有该版本则更新那一条，没有才创建。每版只留一条。

属性使用 schema 中的真实列名。2026-10-16 核对过的列是：`版本`、`发布日期`、`类型`（正式发布 / 预发布 / 开发里程碑）、`一句话更新`、`Git Tag`、`Release`、`验证说明`。

页面正文用开发者能读懂的短文，至少包含：

- 版本号与日期
- 正式发布、预发布或开发里程碑
- 一句话更新摘要
- 新功能
- 修复与优化
- 主要技术实现
- 工程数据兼容性
- 验证情况
- 已知限制
- Git / Release 链接

不要把整份技术日志贴进去。没有 Release 时，`类型` 用「开发里程碑」，`Release` 留空，不编造发布链接。

本地 `Updates/更新介绍.html`、`Updates/更新介绍.pdf` 和 `Updates/content.json` 仍按主 Skill 用 `kami` 维护。Notion 只是额外留档，不替换 `DEVLOG.md`、`Progress/` 或更新介绍。

## 页面失效

配置中的 URL 打不开时：

1. 用同一 ID 再读一次。
2. 仍失败则用 Notion 搜索，但必须核对父页面或与 Visualizer Project 的关联，确认是原来的那一页。
3. 确认不了就停止同步并写本地报告。不新建第二份 CURRENT_STATE、Task Database 或版本库。
4. 只有确认新地址后，才改 `notion-project.json`。

## MCP 不可用

连接、授权或工具列表缺失时：

- 不声称任务已经同步
- 已明确授权的本地工作可以继续
- 仍要遵守任务约束；发现重大基线冲突就停下，不跳过
- 把同一份 Execution Report 写到 `tmp/notion-handoff/`
- 文件名包含 Task ID 和唯一执行标识，例如 `tmp/notion-handoff/INIT-002-EXEC_....md`
- 报告写明目标 Task 和失败原因，并提醒用户修好连接后重新同步
- 不编造 Notion 页面内容

`tmp/` 已被仓库 `.gitignore` 忽略。不要把交接报告放进发布包，不要把凭据写进报告。这台机器上的绝对路径不能当成另一台机器上的可读文件。

## 与现有规范的关系

本工作流不替换主 Skill 里的数据模型、离线交互、版本号、工程格式、`DEVLOG.md`、Progress、README、更新介绍、测试验收和发布顺序。两边冲突时，以主 Skill 和 SOP 为准；Notion 只记录那些规则已经允许的结果。
