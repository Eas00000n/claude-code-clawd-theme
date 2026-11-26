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

/**
 * Which captions the tray shows: Simplified Chinese (the default) or Traditional Chinese with
 * Taiwan wording. Chosen with /clawd-stickers and kept for later sessions.
 */
export type StickerLang = 'zh-CN' | 'zh-TW'
export const STICKER_LANGS: readonly StickerLang[] = ['zh-CN', 'zh-TW']

/** The tray button's name in each language. */
export const TRAY_LABEL: Record<StickerLang, string> = { 'zh-CN': '表情包', 'zh-TW': '貼圖' }

// Traditional Chinese, Taiwan wording (程式碼 for 代码, 計畫 for 计划, 復原 for 撤回...), by sticker key.
const ZH_TW: Record<string, string> = {
  's-go': '繼續',
  's-what': '這是什麼意思？',
  's-ok': '可以，就這樣做',
  's-explain': '解釋一下這段程式碼',
  's-simple': '簡單一點，講重點',
  's-retry': '再試一次',
  's-test': '跑一下測試',
  's-fix': '幫我修一下這個 bug',
  's-why': '為什麼要這樣改？',
  's-undo': '不對，復原剛才的修改',
  's-sum': '整理一下剛才做了什麼',
  's-plan': '先說計畫，不要改程式碼',
  's-commit': '提交程式碼',
  's-thanks': '謝謝，做得很好',
  's-wait': '等一下，先不要繼續',
  's-great': '太棒了！',
}

/** A sticker's caption in the chosen language; Simplified when a translation is missing. */
export function captionOf(st: Sticker, lang: StickerLang): string {
  return lang === 'zh-TW' ? (ZH_TW[st.key] ?? st.text) : st.text
}

/** Reads a typed or stored language, forgiving case and zh_tw / tw / cn; undefined when unknown. */
export function langOf(value: unknown): StickerLang | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const v = value.trim().toLowerCase().replace('_', '-')
  if (v === 'zh-tw' || v === 'tw' || v === 'zh-hant') {
    return 'zh-TW'
  }
  if (v === 'zh-cn' || v === 'cn' || v === 'zh-hans') {
    return 'zh-CN'
  }
  return undefined
}
