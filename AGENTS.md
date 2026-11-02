# Visualizer 项目规则

本文件仅适用于本仓库及其子目录，不修改或约束其他项目。

## 开始工作前必须阅读

在本项目进行开发、修改、调试、重构、配置或代码审查前，必须完整读取
[项目 skill](.agents/skills/visualizer-dev/SKILL.md)，再按其中的指引读取 SOP 相关章节及任务涉及的代码。不得仅凭 skill 名称、摘要或旧会话记忆跳过阅读。

涉及代码、数据、UI、科研写作、配置、工具安装或多步骤交付时，还必须读取：
`/Users/elssssa/Documents/Codex/2026-05-27/codex-ui-codex-agent-codex/codex_experience_replay_2026-05-27.md`。
该路径是当前机器的外部依赖；其他机器缺失时明确报告并请求可用位置，不声称已读取。

## 必用技能

- 代码工作必须读取并使用 `ponytail`（默认 full）。
- 前端设计和 UI 工作必须同时读取并使用 `frontend-design`、`web-design-engineer`、`algorithmic-art` 与 `ui`。四套都读，具体应用边界见项目 skill。
- 调试、报错、崩溃、回归、测试失败、截图对不上：必须先读取并使用 `hunt`，写出根因句之后，才允许进入 `tdd-guide`、`tdd-workflow`、`build-error-resolver` 或 `orch-fix-defect`。只排查时只报告，不改文件。
- 慢、卡顿、性能、优化：必须先读取并使用 `hunt` 的 Performance 规则并量到基线数字，之后才允许进入 `performance-optimizer`。不得只凭感觉改。
- 其余 Waza 技能和 `kami` 按任务读取，不把整套一次载入。触发条件、安装路径、更新介绍和项目优先规则见项目 skill。
- 通用技能使用当前环境已安装版本，不修改其全局内容；缺失时先查找同名技能，再明确报告，不静默跳过。
- 与 ECC 的 `common-agents`、`common-testing`、`common-performance` 冲突时，以上面两条 hunt 规则为准，不得跳过 hunt 直接调用那些 agent。

生成 LaTeX 块公式时全部使用 `\[...\]` 包裹。

## Notion 协作

- 本项目使用 `.agents/skills/visualizer-dev/SKILL.md` 作为 Cursor 与 Codex 共享的开发 Skill。
- 正式开发、缺陷修复、回归验证、技术审计和版本发布，按该 Skill 的 Notion 工作流执行。页面地址、调用方式和报告模板在 `.agents/skills/visualizer-dev/references/`。
- 开始正式任务时，从 Notion 读取当前 Task 和 CURRENT_STATE。
- 完成本地检查后，把执行报告写回对应 Task，并按证据更新相关项目状态。
- Notion 不可用时必须标明未同步，并把交接报告留在仓库 `tmp/notion-handoff/`。不得声称已经同步。
- 只在版本发布或重要里程碑时更新完整版本档案。
- 不得违反现有代码、版本、安全和发布规则。未获当次授权时不提交、不推送、不发布。
