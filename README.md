<img src=".claude-plugin/icon.png" width="128" alt="Clawd Library icon">

# Clawd Library · Claude Code 主题

A reading-room theme for the **Claude Code desktop app**: an animated vector backdrop of an AI girl
reading and Clawd on a stack of books, a live usage card, and a sticker tray of common prompts.

一个 Claude Code 桌面版主题：会动的背景（看书的女孩和坐在书堆上的 Clawd）、实时用量卡片，以及聊天框上方的表情包快捷提示词。

> **Unofficial fan work. Not affiliated with, endorsed by, or sponsored by Anthropic.**
> 非官方粉丝作品，与 Anthropic 无关。

## Features · 功能

- **Backdrop 背景**: cream and tangerine by day; deep night blue with a crescent moon and stars after dark. She breathes and blinks; while Claude is working she leans in to read and Clawd taps away.
  白天奶油橙色、夜间深蓝配月亮星星；她会呼吸眨眼，Claude 工作时她会凑近看书，Clawd 会敲键盘。
- **Usage card 用量卡片**: context (measured against your auto-compact window when you set one), the 5-hour limit and the weekly limit, drawn right in the backdrop.
  在背景里直接显示 context（设置了 auto compact 会按压缩阈值计算）、5 小时额度和每周额度。
- **Sticker tray 表情包**: a ✿ 表情包 button above the prompt opens her chibi stickers, each with a common Chinese prompt (继续, 这是什么意思？, 跑一下测试 …). Click a caption to put it in the prompt box.
  聊天框上方的 ✿ 表情包按钮，点开是她的 Q 版表情包，点下面的文字就把常用提示词放进输入框。
- **Layout 布局**: drag the card, the girl and Clawd on a small map to move or resize them; the layout is shared by every session.
  在小地图上拖动卡片、女孩和 Clawd 来调整位置和大小，所有会话共用。

## Requirements · 要求

- Claude Code **2.1.330 or later**. The backdrop, card and stickers draw in the **desktop app** (and the mobile app); the terminal draws no themes.
  需要 Claude Code 2.1.330 或更新版本。背景、卡片和表情包只在桌面 App（和手机 App）里显示，终端不显示主题。

## Install · 安装

At the prompt of a Claude Code terminal session 在 Claude Code 终端会话里输入：

```
/plugin install clawd-library --marketplace Eas00000n/claude-code-clawd-theme
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).
按 `y` 添加插件源，再选择安装范围（选 user 会在所有会话里加载）。

From a shell 或者在命令行：

```bash
claude plugin install clawd-library --marketplace Eas00000n/claude-code-clawd-theme
```

In the desktop app 在桌面 App 里：click **+** next to the prompt box → **Plugins** → **Add marketplace** with `Eas00000n/claude-code-clawd-theme` → **Add plugin**.
点输入框旁边的 **+** → **Plugins** → **Add marketplace**，填 `Eas00000n/claude-code-clawd-theme` → **Add plugin**。

Sessions that were already open pick it up after `/reload-plugins`.
已经打开的会话运行一次 `/reload-plugins` 即可。

## Commands · 命令

| Command | What it does |
| --- | --- |
| `/clawd-theme on \| off` | Turn the look on, or back to the app's own look. 开关主题 |
| `/clawd-layout` | Open the Layout pane: drag figures, or use the buttons. 打开布局面板 |
| `/clawd-context 400k \| auto` | Set the context limit by hand, or detect the auto-compact window. 手动设置或自动识别 context 上限 |
| `/usage-pane` | Show the usage in a side pane. 在侧边栏显示用量 |

To change the sticker prompts, edit `hooks/stickers.ts` (entry *i* goes with picture *i* in `hooks/sticker-pics.ts`).
想改表情包文字，编辑 `hooks/stickers.ts`。

## Uninstall · 卸载

```bash
claude plugin uninstall clawd-library
```

## Credits · 致谢

- Character design from **ZipZipPipe**'s 《AI娘化》 series. The backdrop, icon and stickers are fan art of that design, generated with an image model and traced or kept as pictures; the character belongs to its creator.
  角色设计出自 ZipZipPipe 的《AI娘化》系列；本插件中的背景、图标和表情包是基于该设计的二次创作，角色版权归原作者所有。
- Clawd and Claude are Anthropic's. This project is not affiliated with Anthropic.
  Clawd 与 Claude 归 Anthropic 所有，本项目与 Anthropic 无关。

## License

The code is under the [MIT License](LICENSE). The character design is not the author's to license; see Credits.
代码采用 MIT 许可证；角色设计不在此许可范围内，见上方致谢。
