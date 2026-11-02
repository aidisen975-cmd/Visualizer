# Execution Report 模板

Cursor 与 Codex 写回 Notion Task，以及 Notion 不可用时的本地交接报告，都使用这一份结构。事实只来自本次仓库和实际跑过的检查。未运行写 `NOT RUN`。已改代码但没有足够验证写 `IMPLEMENTED_UNVERIFIED`。失败不得写成 `PASS`。

本地交接报告在标题下增加：

- 同步状态：`NOT SYNCED`
- 目标 Task URL 或当时已知的 Task ID
- 失败原因（连接、权限、页面不存在、回读未见到标识）
- 待用户修复连接后重试的同步动作

不要在报告里写 Token、密码或 OAuth 内容。本机绝对路径只说明这台机器上的位置，不表示另一台机器或 ChatGPT 能读取该文件。

---

### Execution Report

**Task Identity**

- Task ID：
- Task URL：
- 执行时间：
- 执行工具：Cursor 或 Codex
- 执行环境：操作系统、Agent 名称

**Code Baseline**

- Git branch：
- Start commit：
- End commit：没有新提交时写「未提交」，并保留 Start commit
- Working tree：clean，或列出与本任务相关的未提交改动；不要用 reset 把它们清掉
- 当前软件版本：来自 `APP_INFO.version`，不要用聊天记忆代替

**Implementation**

- 本轮开发目标：
- 实际完成的功能：
- 主要修改文件：
- 关键技术方案：
- 是否涉及工程格式变更：否，或写明 `projectFormatVersion` 与 migration

**Validation**

- 实际执行的测试命令：
- PASS：
- FAIL：
- NOT RUN：
- IMPLEMENTED_UNVERIFIED：没有则写「无」
- Browser / OS / Device：
- 测试证据和产物位置：

**Remaining Issues**

- 未解决 Bug：
- 未完成需求：
- 兼容性风险：
- 下一轮建议：

**Sync Status**

- 唯一执行标识：`EXEC_<TaskID>_<YYYYMMDDTHHmmss>_<CURSOR|CODEX>_<StartCommit前7位>`
- Notion 写入结果：`NOTION_WRITE_PASS` 或 `NOTION_WRITE_FAIL` 或 `NOT SYNCED`
- Notion 回读结果：回读见到该标识，或未见到
- 是否成功更新 CURRENT_STATE：是 / 否 / 本任务不需要
- 是否允许将 Task 标记 Done：仅当全部验收通过且回读确认写入后为是

唯一执行标识已存在时，更新该节，不要再追加一节同名报告。`汇总` Rollup 不是完成依据。
