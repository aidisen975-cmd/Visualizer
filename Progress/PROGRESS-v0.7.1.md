# Visualizer v0.7.1

## Version Goal

跨平台兼容性修复 + 快捷公式功能增强 + 数据切段与 CSV 导出。以本地 v0.7.0（`feat/v0.1.0`，HEAD `a39a953`）为基线，不重构菜单、Dock、Inspector、Results 或公式引擎。2026-10-29 用户人工验收通过。未提交、未打 tag、未发 GitHub Release。

软件版本：`0.7.1`  
工程格式：`projectFormatVersion: "1.1"`（未改，仍可读 `1.0`）  
文档结构：`schemaVersion: 2`  
模板格式：`templateFormatVersion: 1`

## 如何运行

用 Chrome 打开仓库根目录的 `temperature_trajectory_visualizer.html`。开发时也可在仓库根目录执行 `python3 -m http.server` 后访问该页。核心测试：`node tests/core-test.js`。切段整文件：`node tests/segment-acceptance.js`。编码整文件：`node tests/csv-encoding-bench.js`。图标槽位：`node tests/icon-slot-test.js`。

## 已完成

- CSV 导入不再对未知编码调用 `file.text()`。使用 ArrayBuffer + 严格 TextDecoder：BOM → UTF-8 → GB18030/GBK。含 U+FFFD 的结果不得提交 Dataset。低置信度弹出表头预览，手动选择编码后才导入。
- Windows UI 字体栈在宋体回退中加入 SimSun / NSimSun，不把全站换成微软雅黑。Windows 下关闭 `-webkit-font-smoothing: antialiased`，改用系统 ClearType。科研绘图字体选项未改。图内默认栈增加 Segoe UI 作为 Aptos 缺失时的西文回退。
- 计算工具 → 快捷公式。SUM / AVERAGE / MAX / MIN。序列统计写 Results 标量，不创建常数曲线。逐点计算复用现有公式引擎与对齐，写入「计算结果」簇。可进入手动公式编辑。v0.7.0 手动公式与误差分析保留。
- V071-C-FIX01：别名改为 Excel 列名（A–Z、AA…），不再用 `fromCharCode(65+i)`。超过 26 条可算。逐点 AVERAGE 为 `average(A, …)`。缺失值：严格 / 忽略缺失。超过 8 条默认折叠列表。未截断输入。
- 数据切段：对已导入 Dataset 建一个或多个 Segment（框选 X、时间区间、工步、行号）。原始数据不变。片段可绘图、可进公式、可导出 CSV / ZIP，并随工程保存。Segment 不是计算结果簇。
- V071-04-FIX02：同源连续创建多个独立 Segment。创建后仍停留在创建模式，主按钮为「创建片段」。编辑需显式选中片段。另存为新片段。区间可重叠。不静默覆盖。
- V071-X-01：数据源默认 X 列与图窗覆盖映射。相对时间 / 绝对时间 / SOC 等数值列可作绘图 X。不改 `series.x`，不改公式 AlignmentConfig。`projectFormatVersion` 仍是 1.1。

## 明确未包含

- 未发布 GitHub Release / tag。
- FONT-001 Claude 官方字体仍未替换。
- DOCK-001 独立 Dock 优化没有做。
- 旧工程里已被 `file.text()` 写进 JSON 的乱码表头无法无损恢复（原始字节已丢失）。重新导入原始 CSV 会得到新 Dataset，不会自动把旧 Series 样式迁过去。

## 已验证

- `node --check visualizer-core.js` PASS。
- `node tests/core-test.js` PASS，含编码检测、快捷公式 1/2/26/27/52/53/57/100/200 条、57×60319 独立数值基准、切段/CSV 导出、FIX02 同源六段、X-01 相对/绝对时间映射与公式隔离、既有 v0.7.0 回归，`APP_INFO.version === "0.7.1"`。
- `node tests/segment-acceptance.js` PASS：60319×94，10 个工步区间，工步 3 / 放电 CC = 10529 行 × 94 列；5 个重叠附加段 + 另存为；工程往返与 GB18030 导出可逆。本轮 parse 1912 ms / detect 285 ms / segment 399 ms / export 82 ms / reimport 147 ms。
- `node tests/icon-slot-test.js` 本轮 NOT RUN（Chrome 正用于 `file://`）。上一轮 PASS。
- `node tests/csv-encoding-bench.js` 本轮 NOT RUN。上一轮 PASS：60319 × 94。UTF-8 合计 1861 ms；GB18030 合计 2031 ms。中文表头完整。本机没有原始 GBK 文件。
- Mac Chrome 155 `file://`：GBK 夹具导入恢复「入口温度 / 出口温度」；快捷公式 SUM 统计 A=6、B=15；逐点 SUM 生成 `Formula_001` 到计算结果簇。FIX01：57 条 Series，预览 `average(A … BE)`，完整公式 A–BE 无 `[`，输出 `T_mean` 12 点、t=0 为 28。切段：8 行夹具建「放电 CC」3 行。FIX02：同源连续创建、编辑第 2 段、另存为第 6 段、继续创建回到「创建片段」。X-01：segA/segB 选相对时间后图窗 X=0–3000，两曲线从 0 叠加，Y 与公式不变。无 `--allow-file-access-from-files`。
- Mac 实际 UI 字体栈：`--ui-font` 以 Iowan Old Style + Songti SC 为主；`data-os` 未设，平滑仍为 antialiased。

## 未解决 / 未验证

- Edge `file://`：NOT RUN。
- Windows Chrome / Edge，系统显示缩放 100% / 125% / 150%：NOT RUN。不得声称任务 B 完全通过。
- 系统保存框、真机触控板、浏览器实际 ZIP 下载：NOT RUN。
- 切段 CSV 在 Windows Chrome/Edge 的编码与保存框：NOT RUN。
- 窄顶栏下「计算工具」可能换行；1920 未单独再截。
- `Updates/更新介绍.pdf` 仍是 0.7.0 文案，待验收后再用 kami 更新。
- 用户 57 条真机 CSV 快捷公式 AVERAGE、FIX02 连续切段、X-01 相对时间叠加：2026-10-29 用户称「人工验收可，目前没有什么问题」。记 `USER_MANUAL_ACCEPTANCE_V071_20261029`。未把 Edge / Windows / 系统保存框 / 触控板的 NOT RUN 改成 PASS。
- Chrome 未单独点 tooltip、局部图第二图窗、以及「设为该数据源默认」按钮；这些由 Node 覆盖。

## 下一步

v0.7.1 任务已标 Done。代码仍未提交。等用户明确授权后再 commit / tag / GitHub Release。下一产品线是已立项的 v0.7.2（V072-A–H），勿覆盖 v0.7.1 未提交改动。
