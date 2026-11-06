# Visualizer v0.7.3

## Version Goal

在 v0.7.2 正式版基础上发布片段导出与指定列体验补丁：可读列名与快捷多选、CSV 表头可用系列重命名、片段内相对时间列与导出去重。正式版。

软件版本：`0.7.3`  
工程格式：`projectFormatVersion: "1.1"`（未升，仍可读 `1.0`）  
文档结构：`schemaVersion: 2`  
模板格式：`templateFormatVersion: 1`

## 如何运行

用 Chrome 打开仓库根目录的 `temperature_trajectory_visualizer.html`。开发时也可在仓库根目录执行 `python3 -m http.server` 后访问该页。核心测试：`node tests/core-test.js`。

## 已完成

- V072-K：「导出列→指定列」改用独立列选择器，列名完整可读；Shift / Cmd/Ctrl 多选、全选/清空、已选计数；按列索引导出并保持源序。
- V072-L：CSV 导出可选「原始列名（默认）」或「使用数据系列重命名后的列名」。按源列索引映射系列显示名，不改单元格与列序。适用于全部列、指定列、底部/左侧 CSV 和 ZIP。
- V072-M：创建片段可勾选「在片段中新增相对时间列」，在片段 Dataset 内派生相对时间 Series（可作 X 轴、参与公式、随工程保存）；导出区「导出时补充相对时间列」与片段已有列去重；创建模式移除冗余「继续创建新片段」。
- v0.7.2 及更早能力不变；v0.7.1 仍无单独 tag，随 v0.7.2 进入正式版。

## 明确未包含

- Edge / Windows / 真机触控板 / 系统保存框 NOT RUN。
- `segment-acceptance.js` 在本机缺原 UTF8 CSV 时 NOT RUN。

## 已验证

- `node --check visualizer-core.js` PASS。
- `node tests/core-test.js` PASS，含指定列、表头别名、片段相对时间 Series / 导出去重、工程往返仍为 `1.1`，`APP_INFO.version === "0.7.3"`。
- `node tests/canvas-export-test.js` PASS。
- Mac Chrome headless：`tmp/v072k/run-chrome.js`、`tmp/v072l/run-chrome.js`、`tmp/v072m/run-chrome.js` PASS（177 列夹具与片段相对时间场景）。
- V072-K/L 用户人工 6/6 PASS（记录于 DEVLOG V072-L 章节）。V072-M 用户人工 NOT RUN。

## 未解决 / 未验证

- Edge / Windows / 触控板 / 系统保存框仍 NOT RUN。
- 真实 177 列实验原文件未在本轮单独复测（自动化用构造夹具）。

## 下一步

Edge、Windows、真机触控板与系统保存框补测；`segment-acceptance.js` 在具备原 CSV 的环境重跑。

## 发布

- 分支：`feat/v0.1.0`
- tag：`v0.7.3`（发布后填写提交哈希与 SHA256）
