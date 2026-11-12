# Visualizer v0.7.4

## Version Goal

在 v0.7.3 正式版基础上发布 V073-01：数据源列名写回、图例名、片段工作台整合，以及批量改列名与窄栏布局修复。正式版。

软件版本：`0.7.4`  
工程格式：`projectFormatVersion: "1.1"`（未升，仍可读 `1.0`）  
文档结构：`schemaVersion: 2`  
模板格式：`templateFormatVersion: 1`

## 如何运行

用 Chrome 打开仓库根目录的 `temperature_trajectory_visualizer.html`。开发时也可在仓库根目录执行 `python3 -m http.server` 后访问该页。核心测试：`node tests/core-test.js`。

## 已完成

- V073-01-A：左侧编辑数据源 CSV 表头（含非系列列）；批量 `T{n}` 与查找/替换预览；空名/新重名拒绝；未保存徽章与撤销；「保存到原文件」写回头行，保留 BOM/换行/引用/正文；列数变化禁止覆写；写后校验；File System Access 有句柄时覆写，否则另存。
- V073-01-B：写回前可选 `.csv.bak` 备份，备份失败阻止覆写；切换数据源、删除未保存数据源、新建/打开工程、关闭或重载页面提示未写回列名。
- V073-01-C：右侧 `legendName` 只覆盖当前图窗显示名，不改源 CSV 与其他图窗。
- V073-01-D：切段创建、导出与右键 CSV 收成右侧四区工作台（选择 / 处理 / 预览 / 操作）；保存片段、直接导出 CSV、保存并导出；未保存列名导出前三选一。
- V073-01-E：左侧单列与批量改列名支持中文输入法；批量改列名改用应用内弹层，不再调用浏览器 `prompt`。
- V073-01-F：片段工作台与字段网格在 320/400/520 px 侧栏与 125% 缩放下不再越界。
- v0.7.3 及更早能力不变。

## 明确未包含

- Edge / Windows / 真机触控板 / 系统保存框 NOT RUN。
- `segment-acceptance.js` 在本机缺原 UTF-8 CSV 时 NOT RUN。

## 已验证

- `node --check visualizer-core.js` PASS。
- `node tests/core-test.js` PASS，含列名写回、备份、工作台、批量弹层、IME 与工程往返仍为 `1.1`，`APP_INFO.version === "0.7.4"`。
- Mac Chrome headless：`node tmp/v07301/run-chrome.js` PASS。
- 用户 2026-11-12 确认 V073-01 人工验收通过。

## 未解决 / 未验证

- Edge / Windows / 触控板 / 系统保存框仍 NOT RUN。
- A04 真实实验原文件覆写在用户环境完成验收；自动化仅用构造件与 UI 路径。

## 下一步

Edge、Windows、真机触控板与系统保存框补测；`segment-acceptance.js` 在具备原 CSV 的环境重跑。

## 发布

- 分支：`feat/v0.1.0`
- 提交：`38c35fe73fb32b960d04d46c8b54f9d91392852b`
- tag：`v0.7.4`
- Release：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.7.4
- 附件：`Visualizer-v0.7.4.zip`，SHA256 `b7062ebf2bda973f07bd20518bc4d0141c68478b0bf6a2762ba493f70b613463`
