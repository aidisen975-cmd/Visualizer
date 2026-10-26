# Visualizer v0.7.0

## Version Goal

把公式列、跨来源时间轴对齐、MAE/RMSE 误差分析和独立 Results 窗口作为正式功能发出去。画布模式选中派生数据时，属性栏同时保留画布设置和计算信息。Results 默认避开左右侧栏。不包含 FONT-001 和 DOCK-001。

软件版本：`0.7.0`  
工程格式：`projectFormatVersion: "1.1"`（未改，仍可读 `1.0`）  
文档结构：`schemaVersion: 2`（未升）  
模板格式：`templateFormatVersion: 1`

## 如何运行

用 Chrome 打开仓库根目录的 `temperature_trajectory_visualizer.html`。开发时也可在仓库根目录执行 `python3 -m http.server` 后访问该页。核心测试：`node tests/core-test.js`。图标槽位：`node tests/icon-slot-test.js`。

## 已完成

- 派生 Series / 公式列：受限数学表达式、计算结果虚拟数据簇、依赖图、Inspector 编辑。原始 CSV 不变。
- 跨来源时间轴对齐：默认参考 X 线性插值，支持 Exact / Nearest、正负时间偏移、有效重叠区间、时间与温度单位、非法数据及大时间缺口处理。
- MAE / RMSE / MaxAE / Bias / N：原始数据与预测数据可来自不同 CSV，不按行号误匹配。
- 独立 Results 浮动窗口：多条分析、重算/状态管理、摘要及逐点 CSV。误差曲线只在用户明确创建时生成，再次点击不重复创建。
- 公式定义、对齐参数、分析记录随工程保存，与原有 Plot / Canvas 结构兼容。
- 画布模式下选中派生数据时，Inspector 同时提供画布设置与计算信息。
- Results 默认落在左右栏之间，窄屏指标改两列。
- 保留 v0.6.3 的一级 28px 图标、Inspector 三级菜单、顶栏图标和图层识别。

## 明确未包含

- FONT-001：Claude 官方字体没有可离线分发的许可，界面字体没有改。
- DOCK-001：独立 Dock 优化没有做。
- 仓库没有 LICENSE 文件，发行说明如实记录，不为第三方素材赋许可。

## 已验证

- `node --check visualizer-core.js` PASS。
- `node tests/core-test.js` PASS，含 `APP_INFO.version === "0.7.0"`，工程格式仍是 `1.1`，SPEC-070 MAE=RMSE=MaxAE=Bias=1、N=4。
- `node tests/icon-slot-test.js` PASS，含 Chrome headless 对一级 Icon 的真实 DOM 断言。
- 普通 Chrome 无 `--allow-file-access-from-files`：`file://` 打开工作树 HTML 与 ZIP 解压 HTML，窗口标题均为 `未命名工程.json · Visualizer`。
- Playwright `channel: "chrome"` headless `file://`，同样未加该旗标。工作树与 ZIP 解压目录均 PASS：导入 spec070-A/B、公式 B−A 得 1,1,1,1、分析 MAE=RMSE=MaxAE=Bias=1 N=4、画布属性栏同时有画布设置和计算信息、Results 1920 不压左右栏和 Dock、760 指标两列、摘要 CSV、SVG 不含 MAE、PNG 2720×1760、1.0 工程打开后工作副本 1.1、工程文本重开恢复公式与分析。
- ZIP 三个文件在压缩包根目录：`temperature_trajectory_visualizer.html`、`visualizer-core.js`、`README.md`。
- Edge、真机触控板、系统保存框、Windows：NOT RUN。

## 未解决 / 未验证

- 没有在本机打开 Edge。
- 没有走系统保存框做保存后再打开。
- 没有在真实 Mac 触控板上手测捏合。
- 没有在 Windows 上打开核对。
- 760×480 打开 Dock 时，Results 底边可能有约 20 px 重叠；内容可滚动。
- Claude 字体替换仍未完成。
- 独立 Dock 优化仍未开始。

## 下一步

FONT-001 在取得可离线分发授权之前不要做。DOCK-001 另开任务。Edge、Windows、真机触控板、系统保存框仍未在本轮实测。
