# Visualizer v0.7.2

## Version Goal

修复用户实测的画布拼图、图例分行、刻度密度、模板同名和标注按钮问题，并带上已验收的 v0.7.1：切段、快捷公式、相对时间 X、CSV 编码。正式版。

软件版本：`0.7.2`  
工程格式：`projectFormatVersion: "1.1"`（未升，仍可读 `1.0`）  
文档结构：`schemaVersion: 2`  
模板格式：`templateFormatVersion: 1`

## 如何运行

用 Chrome 打开仓库根目录的 `temperature_trajectory_visualizer.html`。开发时也可在仓库根目录执行 `python3 -m http.server` 后访问该页。核心测试：`node tests/core-test.js`。

## 已完成

- V072-A：画布实例持有 `display` 快照与 `sourcePlotId`。改副本图例 / 标题 / 标注不写回源图。删除副本不删源图。显式「从源图重新同步」。
- V072-B：布局菜单分成上下两组。占用改为精确矩形匹配。下方点「一大两小」左大槽时，中心落在槽内但尺寸不合的小图不再误报「已在该分区」；部分重叠确认后铺满目标槽。
- V072-C：图窗拖角按实例宽高重绘 SVG。拖动吸附含槽位边；四边接近时虚线填充预览，松手铺满槽。C-FIX03：resize 独立等宽/等高吸附（8 CSS px，Alt 绕过），提示「与图A同宽/同高」。
- V072-D：图例「手动分行」同时遵守列数与 `rowBreaks`。长图例 Inspector 为搜索 + 行芯片 + 「重置自动排版」，不再铺 57 个勾选。D-FIX03：规则网格行共享列宽，手动独立行按自身测宽，长名称不再撑开 T 项 x。
- V072-E：自动刻度默认更密；模板保存 `tickMode` / `majorTick` / `tickTargetCount`。
- V072-F：模板按稳定 ID；同名需覆盖 / 另存 / 取消。
- V072-G：标注按钮进入添加模式。命中始终优先标注；数据点文字框用 `labelOffset` 独立拖动，锚点留在数据点。G-FIX03：标注模式悬停显示读数预览，真实鼠标可拖标签；落点后收起 Inspector 以免挡住命中区。
- V072-H：Node 回归 + Mac Chrome `file://` 已复测 C-FIX03 / D-FIX03 / G-FIX03。用户 2026-11-02 人工验收 18 项 PASS。当时 H2 预览/导出缺主图 FAIL，随后按 V072-I 修复。
- V072-I：画布预览和 PNG/SVG 共用的 `buildCanvasSvg()` 不再因局部视图盖掉父图节点。父图、局部视图、引导线和无局部视图的邻图一起导出。
- V072-J：创建片段后仍保持新建模式，底部 CSV 按最近保存或左侧点选的片段导出，不再跟着草稿编辑模式禁用。编码、列、相对时间和 ZIP 与左侧共用 `exportOneSegment`。导出目标不写入工程。
- 2026-11-02 用户确认当前版本全部功能人工验收通过，含 H2 与 V072-J。记录 `USER_MANUAL_ACCEPTANCE_V072_20261102`。

## 明确未包含

- 52 条真机温度长图例的完整人工视觉终验未做。
- Edge / Windows / 真机触控板 / 系统保存框 NOT RUN。
- v0.7.1 没有单独打 tag。编码、快捷公式、切段、相对时间 X 随 v0.7.2 进入正式版。

## 已验证

- `node --check visualizer-core.js` PASS。
- `node tests/core-test.js` PASS，含实例隔离、1:1 / 2×2 / 3×2 布局、溢出空槽、定向放入/交换/不复制、刻度、图例分行与独立行 x 隔离、等宽等高吸附、模板同名冲突、工程往返仍为 `1.1`，`APP_INFO.version === "0.7.2"`。
- Mac Chrome `file://`（2026-10-29 17:20）：B-FIX03 交叠四图点左大槽确认重叠后铺满 628×800，第二次点击才「已在该分区」。C-FIX02 拖动出现槽位虚线预览并填充。D-FIX02 59 项 8 列手动分行 + 行芯片，图例未裁切。G：T45 可选中，文字框相对锚点独立偏移。合成指针拖标注当时 IMPLEMENTED_UNVERIFIED。
- Mac Chrome 156 `file://`（2026-10-30 11:38，Playwright `channel: "chrome"` headless）：C-FIX03 图B 拖成 680×410 并显示「与「图A」同宽/同高」，Alt 绕过到 720×450。D-FIX03 长名称拉长后 T1/T2 x 不变。G-FIX03 真实鼠标悬停 `T1 · x = 1 · y = 25.11` 并拖动 `labelOffset`。证据 `tmp/v072-fix03-chrome/`。
- Edge / Windows / 触控板 / 系统保存框：NOT RUN。
- 2026-11-02 V072-I：`node tests/canvas-export-test.js` 修前 9 项 FAIL（父图缺失），修后 PASS。打开 `tmp/v072i/canvas.png` 与 `canvas.svg`，主图、局部视图、引导线、右侧图都在。Chrome 预览对话框含这三项。`node tests/core-test.js` PASS。用户 H2 复验未做。本轮又跑了一次 `node tests/canvas-export-test.js`，`canvas export checks passed`。
- 2026-11-02 V072-J：`node tests/core-test.js` PASS。`node tests/segment-acceptance.js` PASS（60319 行，放电 CC 10529 行）。Mac Chrome 156 `file://`：构造夹具 1732×177，创建后底部 CSV 可点并指向刚保存的片段；改草稿不切换目标；连续三段互不覆盖；底部与左侧 CSV 一致；UTF-8 BOM、GB18030、指定列、相对时间 0、ZIP 解压、保存重开和删除后禁用均按页面结果核对。Edge / Windows NOT RUN。
- 2026-11-02 发布前重跑：`node --check visualizer-core.js` PASS；`node tests/core-test.js` PASS；`node tests/canvas-export-test.js` PASS（Chrome headless）；`node tests/segment-acceptance.js` PASS；`node tests/icon-slot-test.js` PASS。用户确认全部功能人工验收通过。Edge / Windows / 触控板 / 系统保存框 NOT RUN。

## 未解决 / 未验证

- 已有画布实例默认不自动接收之后加入源图的 Series，需点「从源图重新同步」。这是规格里的不传播默认，但容易让人以为曲线丢了。
- 2026-11-02 用户已人工 PASS：C1–C4、D1–D4、G1–G4、B1–B3、H1、H3、H4，并确认 H2 与 V072-J 在复修后一并通过。这些不重复返工。
- Edge / Windows / 触控板 / 系统保存框仍 NOT RUN。

## 下一步

v0.7.2 已作为正式版发布。Edge、Windows、真机触控板、系统保存框仍未在本轮实测。

## 发布

- 分支：`feat/v0.1.0`
- 提交：`a8770c5a1a4d0b7008e0ca6ba64c9aa32663b1ce`
- tag：`v0.7.2`
- Release：https://github.com/aidisen975-cmd/Visualizer/releases/tag/v0.7.2
- 附件：`Visualizer-v0.7.2.zip`，SHA256 `1cc1cc71edb47f97b0467438353d8ec76f05966cd65a96271196283885c8cbc2`
