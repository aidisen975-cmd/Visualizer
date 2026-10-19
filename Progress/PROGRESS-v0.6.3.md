# Visualizer v0.6.3

## Version Goal

把 ICON-002 到 ICON-005 已经完成的工作台界面正式发出去：属性栏一级 28px 图标全覆盖、Inspector 三级菜单、顶栏与图层样式、画布对象标题与图层识别。不包含 Claude 字体替换，也不包含独立 Dock 优化。

软件版本：`0.6.3`  
工程格式：`projectFormatVersion: "1.1"`（未改）  
文档结构：`schemaVersion: 2`（未升）  
模板格式：`templateFormatVersion: 1`

## 如何运行

用 Chrome 打开仓库根目录的 `temperature_trajectory_visualizer.html`。开发时也可在仓库根目录执行 `python3 -m http.server` 后访问该页。核心测试：`node tests/core-test.js`。图标槽位：`node tests/icon-slot-test.js`。

## 已完成

- 属性栏一级菜单全部带 28px 图标。主图一级：图标题、背景与尺寸、轴线与刻度、图例、数据系列、局部视图、标注与引导线、导出设置，以及画布。缺的三枚（图标题、背景与尺寸、导出设置）已用审批后的 SVG 接入。
- 轴线与刻度作为一级卡片。X Axis 和 Y Axis 在它下面，原来的轴线、轴标题、范围、时间单位、上边、右边仍是三级文字分组。
- 局部图一级另有范围与缩放、来源框与引导线，用审批后的 `range` / `source-link`。三级 Axis「范围与缩放」仍无图标。
- 顶部新建、打开、保存、导入、添加图、布局、预览、导出带线性图标。窄于 1180px 时收成图标，文字仍在按钮里供读屏。
- 属性 / 图层改成可点的 Tab。图层每一项是独立圆角卡片。点名字只选中，不改叠放。
- 画布里点中的图显示真实图名；没有自定义标题时用稳定图窗名。图层能区分主图、局部图、引导线和标注。
- 五枚新增 SVG：`figure-title`、`frame`、`export-settings`、`range`、`source-link`。源文件在 `design/icon-system/candidates-icon005/`，已内联进页面。

## 明确未包含

- FONT-001：Claude 官方字体没有可离线分发的许可，界面字体没有改。
- DOCK-001：独立 Dock 优化没有做。Dock 仍是底部自动隐藏，图窗卡仍显示曲线缩略图。

## 已验证

- `node --check visualizer-core.js` PASS。
- `node tests/core-test.js` PASS，含 `APP_INFO.version === "0.6.3"`。
- `node tests/icon-slot-test.js` PASS，含 Chrome headless 对一级 Icon 的真实 DOM 断言（可渲染 SVG，slot 与 SVG 为 28×28）。
- Chrome 1920×1080：一级图标 28px 全覆盖；画布图层五条可识别；保存文本再打开后图层名仍在；SVG / PNG 能导出；关于面板显示 v0.6.3。
- Chrome 760×480：`documentElement.scrollWidth` 为 760，无横向溢出；顶栏收成图标。
- 离线：产品脚本无远程依赖。检查更新仍只在点击后访问 GitHub Releases。

## 未解决 / 未验证

- 没有在本机打开 Edge。
- 没有走系统保存框做保存后再打开。
- 没有在真实 Mac 触控板上手测捏合。
- Claude 字体替换仍未完成。
- 独立 Dock 优化仍未开始。

## 下一步

FONT-001 在取得可离线分发授权之前不要做。DOCK-001 另开任务。真机触控板、Edge、系统保存框仍未在本轮重测。
