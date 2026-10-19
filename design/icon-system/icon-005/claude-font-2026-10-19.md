# Claude 字体实测（2026-10-19）

来源页面：`https://claude.ai/login`（页面语言 `zh-Hans`，标题 Sign in - Claude）。检查环境：Cursor 内置 Chrome，macOS。读取方式：`getComputedStyle` 与 `CSS.getPlatformFontsForNode`。

结论：**BLOCKED**。不能把 Anthropic Sans / Anthropic Serif 放进 Visualizer。应用 UI 的 `--ui-font` 没有改。图内字体（轴题、图标题、图例、PNG/SVG）也没有改。

## 许可

`@font-face` 的 `src` 指向 `https://assets-proxy.anthropic.com/claude-ai/v2/assets/...woff2`。家族名是 `anthropic-sans` 与 `anthropic-serif`，字重轴 `300 800`。页面没有给出可再分发的许可。第三方转载说明这些文件属于 Anthropic，不能当作开源字体打包。Visualizer 要求离线、无运行时网络字体，因此不能下载这些 woff2 再内嵌。

## 西文实际绘制

| 元素 | 指定 family | 实际平台字体 | size | weight | line-height | letter-spacing |
| --- | --- | --- | --- | --- | --- | --- |
| 大标题「追问未来」指定样式 | anthropic-serif | 见中文行 | 56px | 330 | 64.4px | normal |
| 卡片标题「Free」 | anthropic-serif | Anthropic Serif Variable Text | 30px | 400 | 36px | normal |
| 英文链接 Privacy Policy | anthropic-sans | Anthropic Sans Variable Text | 12px | 400 | 19.5px | normal |
| 按钮西文部分 | anthropic-sans | Anthropic Sans Variable Text | 15px | 400 | 22px | normal |

`font-variation-settings` 在界面文字上是 `"GRAD" 0`。大标题另有 `"opsz" 48`。

## 中文实际绘制

Claude 页面是中文，但自定义字体没有画出汉字。

| 文字 | 实际平台字体 |
| --- | --- |
| 追问未来（4 字） | PingFang SC Thin |
| 助您实现远大抱负的思考伙伴 | PingFang SC Regular |
| 按钮「使用 Google 继续」里的 4 个汉字 | PingFang SC Regular |
| 同一按钮里的 “ Google ” | Anthropic Sans Variable Text |
| 「个人」 | PingFang SC Regular |

指定的中文回退包含 `"PingFang SC"`、`"Microsoft YaHei"`、`"Noto Sans CJK SC"`。这是系统字体，不是 Anthropic 字体。

## 若以后获准再替换

不要用「看起来接近」的开源字体宣称完成。可选路径只有：取得可离线分发的授权文件，或用户另行批准一套系统回退，并接受西文与 Claude 不同。
