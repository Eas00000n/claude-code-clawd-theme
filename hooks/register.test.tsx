import { expect, test } from 'claude-code/testing'

import { applyCommand, move, resize, wholeLayout } from './layout'
import { parseTokens } from './register'
import { DEFAULT_LAYOUT } from './scene'

const PANE = {
  plugin: 'clawd-library',
  component: 'Pane',
  requestId: 'usage',
  props: {
    title: 'Usage',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const BACKDROP = {
  plugin: 'clawd-library',
  component: 'Backdrop',
  surface: 'desktop',
  props: { scene: 'reading-room' },
} as any

function engine(on: any, themes: unknown[], stored: Record<string, unknown> = {}, opened: any[] = [], compactWindow?: number) {
  on('theme.set', (_: unknown, e: unknown) => {
    themes.push(e)
    return { value: { isDrawn: true } }
  })
  on('command.register', (_: unknown, e: any) => ({ value: { command: e.name } }))
  on('ui.open', (_: unknown, e: any) => {
    opened.push(e)
    return { value: { isPlaced: true } }
  })
  on('store.get', (_: unknown, e: any) => ({ value: stored[e.key] }))
  on('store.set', (_: unknown, e: any) => {
    stored[e.key] = e.value
    return { value: undefined }
  })
  on('session.usage', (_: unknown, e: any) => ({
    value: {
      startedAt: 0,
      context: {
        window: 200_000,
        ...(e?.breakdown && compactWindow !== undefined ? { breakdown: { rawMaxTokens: compactWindow, autocompactSource: 'settings' } } : {}),
      },
      rateLimits: [],
    },
  }))
  on('clock.now', () => ({ value: Date.parse('2026-11-25T10:00:00Z') }))
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('session.measure', (_: unknown, e: any) => ({ changed: e.changed }))
  on('turn.start', () => ({ turnId: 't1' }))
  on('turn.complete', () => ({ text: '' }))
  on('command.run', () => ({ text: '' }))
}

const MEASURE = {
  context: { tokens: 84_000, window: 200_000, percent: 42 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 91, resetsAt: '2026-11-25T12:14:00Z' },
    { kind: 'seven_day', percentUsed: 12.5, resetsAt: '2026-11-28T10:00:00Z' },
  ],
  changed: ['context', 'rateLimits'],
} as const

async function sceneSource(ui: any): Promise<string> {
  const svg: any = await ui.find({ type: 'Svg' } as any)
  return svg.props.source
}

test('session start sets the look: scene backdrop, no blur, a thin veil', async ($, on) => {
  const themes: any[] = []
  engine(on, themes)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(themes[0].backdrop.scene).toBe('reading-room')
  expect(themes[0].backdrop.glass.blur).toBe(0)
  expect(themes[0].backdrop.glass.opacity).toBe(0.3)
})

test('the backdrop card shows context, 5-hour and weekly, in English, with no Fable row', async ($, on) => {
  engine(on, [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure(MEASURE as any)

  const ui = await $.ui.mount(BACKDROP)
  const source = await sceneSource(ui)
  expect(source.includes('>USAGE<')).toBe(true)
  expect(source.includes('>42%<')).toBe(true)
  expect(source.includes('>84k / 200k tokens · model window<')).toBe(true)
  expect(source.includes('>5-hour limit<')).toBe(true)
  expect(source.includes('>Resets in 2h 14m<')).toBe(true)
  expect(source.includes('class="uchot"')).toBe(true)
  expect(source.includes('>Weekly · All Models<')).toBe(true)
  expect(source.includes('>13%<')).toBe(true)
  expect(/fable/i.test(source)).toBe(false)
  expect(/[一-鿿]/.test(source)).toBe(false)
  expect(source.length < 131072).toBe(true)
  await ui.unmount()
})

test('the pane has the same three rows', async ($, on) => {
  engine(on, [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure(MEASURE as any)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /All Models/ }))?.text).toBe('Weekly · All Models')
  expect(await ui.find({ type: 'Text', text: /Fable/ })).toBe(undefined)
  await ui.unmount()
})

test('a main turn switches her and Clawd to the working mood, and back when it ends', async ($, on) => {
  engine(on, [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  let ui = await $.ui.mount(BACKDROP)
  expect((await sceneSource(ui)).includes('<g class="idle">')).toBe(true)
  await ui.unmount()

  await $.turn.start({} as any)
  ui = await $.ui.mount(BACKDROP)
  expect((await sceneSource(ui)).includes('<g class="working">')).toBe(true)
  await ui.unmount()

  await $.turn.complete({ reason: 'completed' } as any)
  ui = await $.ui.mount(BACKDROP)
  expect((await sceneSource(ui)).includes('<g class="idle">')).toBe(true)
  await ui.unmount()
})

test('a subagent turn leaves the mood alone', async ($, on) => {
  engine(on, [])
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ agentId: 'a1' } as any)

  const ui = await $.ui.mount(BACKDROP)
  expect((await sceneSource(ui)).includes('<g class="idle">')).toBe(true)
  await ui.unmount()
})

test('typed layout commands: nudge, set, size, reset, and bad input shows help', () => {
  let l = applyCommand(DEFAULT_LAYOUT, 'card left 120').layout!
  expect(l.card).toEqual({ x: -120, y: 0, s: 1 })
  l = applyCommand(l, 'card down').layout!
  expect(l.card).toEqual({ x: -120, y: 40, s: 1 })
  l = applyCommand(l, 'girl -300 20').layout!
  expect(l.girl).toEqual({ x: -300, y: 20, s: 1 })
  l = applyCommand(l, 'girl size 120').layout!
  expect(l.girl.s).toBe(1.2)
  l = applyCommand(l, 'Clawd Bigger').layout!
  expect(l.clawd.s).toBe(1.1)
  l = applyCommand(l, 'girl reset').layout!
  expect(l.girl).toEqual({ x: 0, y: 0, s: 1 })
  expect(l.card).toEqual({ x: -120, y: 40, s: 1 })
  expect(applyCommand(l, 'reset').layout).toEqual(DEFAULT_LAYOUT)
  const bad = applyCommand(DEFAULT_LAYOUT, 'sofa left')
  expect(bad.layout).toBe(undefined)
  expect(bad.text.includes('Items: card, girl, clawd')).toBe(true)
  expect(applyCommand(DEFAULT_LAYOUT, 'girl 99999 0').layout!.girl.x).toBe(1672)
  expect(applyCommand(DEFAULT_LAYOUT, 'girl size 900').layout!.girl.s).toBe(3)
  expect(resize(DEFAULT_LAYOUT, 'card', 0.01).card.s).toBe(0.3)
  expect(move(DEFAULT_LAYOUT, 'clawd', 5, -5).clawd).toEqual({ x: 5, y: -5, s: 1 })
})

test('a layout an earlier version stored, with no size, reads as size 100%', () => {
  expect(wholeLayout({ card: { x: -150, y: 0 } }).card).toEqual({ x: -150, y: 0, s: 1 })
})

test('/clawd-layout moves the card in the scene and remembers it across sessions', async ($, on) => {
  const stored: Record<string, unknown> = {}
  engine(on, [], stored)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'clawd-layout', args: 'card left 100' } as any)

  expect(stored.layout).toEqual({ card: { x: -100, y: 0, s: 1 }, girl: { x: 0, y: 0, s: 1 }, clawd: { x: 0, y: 0, s: 1 } })
  const ui = await $.ui.mount(BACKDROP)
  expect((await sceneSource(ui)).includes('<g transform="translate(590 40)"><rect class="ucp"')).toBe(true)
  await ui.unmount()
})

test('a stored layout is read back at session start, repaired where broken', async ($, on) => {
  engine(on, [], { layout: { card: { x: 10, y: 'oops' }, girl: { x: -200, y: 0 } } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount(BACKDROP)
  const source = await sceneSource(ui)
  expect(source.includes('<g transform="translate(-200 0)"><g class="girl">')).toBe(true)
  expect(source.includes('<g transform="translate(690 40)"><rect class="ucp"')).toBe(true)
  await ui.unmount()
})

test('/clawd-layout alone opens the Layout pane, whose buttons move and resize the chosen figure', async ($, on) => {
  const stored: Record<string, unknown> = {}
  const opened: any[] = []
  engine(on, [], stored, opened)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'clawd-layout', args: '' } as any)
  expect(opened.some(o => o.id === 'layout')).toBe(true)

  const ui: any = await $.ui.mount({ ...PANE, requestId: 'layout', props: { ...PANE.props, title: 'Layout' }, surface: 'desktop' })
  await ui.press({ key: 'left' })
  await ui.press({ key: 'bigger' })
  expect((stored.layout as any).girl).toEqual({ x: -40, y: 0, s: 1.1 })

  await ui.select({ key: 'figure', value: 'card' })
  await ui.select({ key: 'step', value: 'big' })
  await ui.press({ key: 'down' })
  expect((stored.layout as any).card).toEqual({ x: 0, y: 120, s: 1 })
  expect((await ui.find({ type: 'Text', text: /^x / }))?.text).toBe('x +0, y +120, size 100%')

  await ui.press({ key: 'reset-all' })
  expect(stored.layout).toEqual(DEFAULT_LAYOUT)
  await ui.unmount()
})

test('a resized girl grows around her feet', async ($, on) => {
  engine(on, [], { layout: { girl: { x: 0, y: 0, s: 2 } } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount(BACKDROP)
  expect((await sceneSource(ui)).includes('<g transform="translate(-1390 -905) scale(2)"><g class="girl">')).toBe(true)
  await ui.unmount()
})

const MEASURE_1M = {
  context: { tokens: 84_000, window: 1_000_000, percent: 8 },
  rateLimits: [],
  changed: ['context'],
} as const

test('context is measured against the auto-compact window the engine reports', async ($, on) => {
  engine(on, [], {}, [], 400_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure(MEASURE_1M as any)

  const ui = await $.ui.mount(BACKDROP)
  const source = await sceneSource(ui)
  expect(source.includes('>21%<')).toBe(true)
  expect(source.includes('>84k / 400k tokens · auto-compact<')).toBe(true)
  await ui.unmount()
})

test('/clawd-context sets a manual limit that wins, and auto goes back to detecting', async ($, on) => {
  const stored: Record<string, unknown> = {}
  engine(on, [], stored, [], 400_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure(MEASURE_1M as any)
  await $.command.run({ command: 'clawd-context', args: '300k' } as any)
  expect(stored.contextLimit).toBe(300_000)

  let ui = await $.ui.mount(BACKDROP)
  expect((await sceneSource(ui)).includes('>84k / 300k tokens · manual limit<')).toBe(true)
  expect((await sceneSource(ui)).includes('>28%<')).toBe(true)
  await ui.unmount()

  await $.command.run({ command: 'clawd-context', args: 'auto' } as any)
  ui = await $.ui.mount(BACKDROP)
  expect((await sceneSource(ui)).includes('>84k / 400k tokens · auto-compact<')).toBe(true)
  await ui.unmount()
})

test('token counts are read in the usual spellings', () => {
  expect(parseTokens('400k')).toBe(400_000)
  expect(parseTokens('400000')).toBe(400_000)
  expect(parseTokens('1M')).toBe(1_000_000)
  expect(parseTokens('1.5m')).toBe(1_500_000)
  expect(parseTokens('400,000')).toBe(400_000)
  expect(parseTokens('lots')).toBe(undefined)
  expect(parseTokens('5')).toBe(undefined)
})

test('/clawd-theme off clears the look and keeps it off next session; on sets it again', async ($, on) => {
  const themes: unknown[] = []
  const stored: Record<string, unknown> = {}
  let cleared = 0
  engine(on, themes, stored)
  on('theme.clear', () => {
    cleared++
    return { value: { isDrawn: false, reason: 'cleared' } }
  })
  on('store.delete', (_: unknown, e: any) => {
    delete stored[e.key]
    return { value: undefined }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(themes.length).toBe(1)

  await $.command.run({ command: 'clawd-theme', args: 'off' } as any)
  expect(cleared).toBe(1)
  expect(stored.themeOff).toBe(true)

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(themes.length).toBe(1)

  await $.command.run({ command: 'clawd-theme', args: 'on' } as any)
  expect(themes.length).toBe(2)
  expect(stored.themeOff).toBe(undefined)
})

test('the drag map moves a figure where it is dropped, and its corner resizes it', async ($, on) => {
  const stored: Record<string, unknown> = {}
  engine(on, [], stored)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui: any = await $.ui.mount({ ...PANE, requestId: 'layout', props: { ...PANE.props, title: 'Layout' }, surface: 'desktop' })
  // 40 cells wide: 38 inside the frame, 44 scene units a column and about 85.5 a row.
  await ui.resize({ columns: 40, rows: 13, in: 'map' })

  // The card sits at columns 16 to 23 and rows 0 to 2 inside the frame: drag it 5 left and 2 down.
  await ui.pointer({ type: 'down', x: 18, y: 2, button: 'left', in: 'map' })
  await ui.pointer({ type: 'move', x: 13, y: 4, button: 'left', in: 'map' })
  await ui.pointer({ type: 'up', x: 13, y: 4, button: 'left', in: 'map' })
  expect((stored.layout as any).card).toEqual({ x: -220, y: 171, s: 1 })

  // The girl's corner is her last column and row: dragging it 5 columns right grows her by 220 units.
  await ui.pointer({ type: 'down', x: 36, y: 11, button: 'left', in: 'map' })
  await ui.pointer({ type: 'up', x: 41, y: 11, button: 'left', in: 'map' })
  expect((stored.layout as any).girl).toEqual({ x: 0, y: 0, s: 1.427 })
  expect((await ui.find({ type: 'Text', text: /^x / }))?.text).toBe('x +0, y +0, size 143%')

  // A press on empty sky moves nothing.
  await ui.pointer({ type: 'down', x: 2, y: 2, button: 'left', in: 'map' })
  await ui.pointer({ type: 'up', x: 8, y: 6, button: 'left', in: 'map' })
  expect((stored.layout as any).card).toEqual({ x: -220, y: 171, s: 1 })
  await ui.unmount()
})

test('a layout another session saves reaches this one on its next sync', async ($, on) => {
  const stored: Record<string, unknown> = {}
  const ticks: (() => void)[] = []
  engine(on, [], stored)
  on('clock.every', (_: unknown, e: any) => {
    ticks.push(e.fn ?? e)
    return { value: undefined }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  let ui = await $.ui.mount(BACKDROP)
  expect((await sceneSource(ui)).includes('translate(690 40)')).toBe(true)
  await ui.unmount()

  // Another session drags the card and saves; this one picks it up at its next turn.
  stored.layout = { card: { x: -200, y: 30, s: 1 }, girl: { x: 0, y: 0, s: 1 }, clawd: { x: 0, y: 0, s: 1 } }
  stored.contextLimit = 300_000
  await $.turn.start({ prompt: 'hi' } as any)
  ui = await $.ui.mount(BACKDROP)
  const source = await sceneSource(ui)
  expect(source.includes('translate(490 70)')).toBe(true)
  expect(source.includes('300k tokens · manual limit')).toBe(true)
  await ui.unmount()
})

test('the sticker button above the prompt opens her stickers; a caption fills the box and closes them', async ($, on) => {
  const fills: any[] = []
  engine(on, [])
  on('prompt.fill', (_: unknown, e: any) => {
    fills.push(e)
    return { isFilled: true }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const BAND = {
    plugin: 'clawd-library',
    component: 'AbovePrompt',
    surface: 'desktop',
    props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 9 } },
  } as any
  const ui: any = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Button', key: 's-go' })).toBe(undefined)

  await ui.press({ key: 'stickers' })
  expect((await ui.find({ type: 'Button', key: 's-what' }))?.props.label).toBe('这是什么意思？')
  const pic = await ui.find({ type: 'Svg' })
  expect(String(pic?.props.source).startsWith('<svg')).toBe(true)
  expect(String(pic?.props.source).length < 131072).toBe(true)
  expect(pic?.props.alt).toBe('继续')

  // The second page holds the last eight.
  await ui.press({ key: 'next' })
  expect(await ui.find({ type: 'Button', key: 's-go' })).toBe(undefined)
  expect((await ui.find({ type: 'Button', key: 's-great' }))?.props.label).toBe('太棒了！')
  await ui.press({ key: 'prev' })

  await ui.press({ key: 's-go' })
  expect(fills.map(f => [f.text, f.mode])).toEqual([['继续', 'insert']])
  expect(await ui.find({ type: 'Button', key: 's-go' })).toBe(undefined)
  await ui.unmount()
})

test('/clawd-stickers zh-TW shows Traditional Chinese captions, kept for the next session', async ($, on) => {
  const fills: any[] = []
  const stored: Record<string, unknown> = {}
  engine(on, [], stored)
  on('prompt.fill', (_: unknown, e: any) => {
    fills.push(e)
    return { isFilled: true }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const BAND = {
    plugin: 'clawd-library',
    component: 'AbovePrompt',
    surface: 'desktop',
    props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 9 } },
  } as any

  await $.command.run({ command: 'clawd-stickers', args: 'zh-TW' } as any)
  expect(stored.stickerLang).toBe('zh-TW')

  // A new session reads the choice back from the store.
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui: any = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Button', key: 'stickers' }))?.props.label).toBe('✿ 貼圖')
  await ui.press({ key: 'stickers' })
  expect((await ui.find({ type: 'Button', key: 's-what' }))?.props.label).toBe('這是什麼意思？')
  await ui.press({ key: 's-go' })
  expect(fills.map(f => [f.text, f.mode])).toEqual([['繼續', 'insert']])
  await ui.unmount()

  // Back to Simplified.
  await $.command.run({ command: 'clawd-stickers', args: 'zh-CN' } as any)
  const again: any = await $.ui.mount(BAND)
  expect((await again.find({ type: 'Button', key: 'stickers' }))?.props.label).toBe('✿ 表情包')
  await again.unmount()
})

test('/clawd-theme status reports versions, apps, whether the theme draws, and backdrop requests', async ($, on) => {
  engine(on, [])
  on('session.version', () => ({ value: { version: '2.1.330' } }))
  on('session.info', () => ({ value: { platform: 'windows', transcriptPath: '/t.jsonl' } as any }))
  on('session.surfaces', () => ({ value: [] }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  let text = (await $.command.run({ command: 'clawd-theme', args: 'status' } as any)).text ?? ''
  expect(text.includes('Clawd Library 1.0.1')).toBe(true)
  expect(text.includes('Claude Code: 2.1.330 · platform: windows')).toBe(true)
  expect(text.includes('Apps attached: none')).toBe(true)
  expect(text.includes('Theme: set, an app draws themes')).toBe(true)
  expect(text.includes('Backdrop asked to draw: 0 times')).toBe(true)
  expect(text.includes('has not asked for the backdrop')).toBe(true)

  const ui = await $.ui.mount(BACKDROP)
  await ui.unmount()
  text = (await $.command.run({ command: 'clawd-theme', args: 'status' } as any)).text ?? ''
  expect(/Backdrop asked to draw: [1-9]/.test(text)).toBe(true)
  expect(text.includes('last on desktop')).toBe(true)
  expect(text.includes('has not asked')).toBe(false)
})
