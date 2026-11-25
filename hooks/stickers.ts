// The sticker tray above the prompt: her chibi stickers, each with a common Chinese prompt for
// Claude Code. Index i draws STICKER_PICS[i].
export type Sticker = { key: string; text: string }

export const STICKERS: readonly Sticker[] = [
  { key: 's-go', text: '继续' },
  { key: 's-what', text: '这是什么意思？' },
  { key: 's-ok', text: '可以，就这么做' },
  { key: 's-explain', text: '解释一下这段代码' },
  { key: 's-simple', text: '简单一点，说重点' },
  { key: 's-retry', text: '再试一次' },
  { key: 's-test', text: '跑一下测试' },
  { key: 's-fix', text: '帮我修一下这个 bug' },
  { key: 's-why', text: '为什么要这样改？' },
  { key: 's-undo', text: '不对，撤回刚才的改动' },
  { key: 's-sum', text: '总结一下刚才做了什么' },
  { key: 's-plan', text: '先说计划，不要改代码' },
  { key: 's-commit', text: '提交代码' },
  { key: 's-thanks', text: '谢谢，做得很好' },
  { key: 's-wait', text: '等一下，先别继续' },
  { key: 's-great', text: '太棒了！' },
]

/** Stickers shown at once: two pages keep each drawing small. */
export const PAGE_SIZE = 8
