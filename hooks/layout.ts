// Moving and resizing the usage card, the girl, and Clawd with his books: pure functions
// shared by the Layout pane's buttons and the /clawd-layout command.
import type { Layout, LayoutItem, Place } from '../types'
import { DEFAULT_LAYOUT, H, W } from './scene'

export const ITEMS: readonly LayoutItem[] = ['card', 'girl', 'clawd']
export const ITEM_NAMES: Record<LayoutItem, string> = { card: 'Usage card', girl: 'Girl', clawd: 'Clawd + books' }

/** How far one press moves (scene units) and how much it resizes (a factor), per step size. */
export const STEPS = {
  fine: { move: 10, size: 1.05, name: 'Fine' },
  normal: { move: 40, size: 1.1, name: 'Normal' },
  big: { move: 120, size: 1.25, name: 'Big' },
} as const
export type StepName = keyof typeof STEPS
export const isStep = (v: unknown): v is StepName => typeof v === 'string' && v in STEPS

export const MIN_SIZE = 0.3
export const MAX_SIZE = 3

const clampMove = (v: number, max: number) => Math.max(-max, Math.min(max, Math.round(v)))
const clampSize = (s: number) => Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, s)) * 1000) / 1000

export function copyLayout(l: Layout): Layout {
  return { card: { ...l.card }, girl: { ...l.girl }, clawd: { ...l.clawd } }
}

/** A stored layout, made whole: what an earlier version (no size) or a hand edit left is repaired. */
export function wholeLayout(v: unknown): Layout {
  const out = copyLayout(DEFAULT_LAYOUT)
  const src = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>
  const num = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

  for (const item of ITEMS) {
    const o = src[item] as { x?: unknown; y?: unknown; s?: unknown } | undefined

    if (o && num(o.x) && num(o.y)) {
      out[item] = { x: clampMove(o.x, W), y: clampMove(o.y, H), s: num(o.s) ? clampSize(o.s) : 1 }
    }
  }

  return out
}

export function move(l: Layout, item: LayoutItem, dx: number, dy: number): Layout {
  const next = copyLayout(l)
  next[item] = { ...next[item], x: clampMove(next[item].x + dx, W), y: clampMove(next[item].y + dy, H) }
  return next
}

export function place(l: Layout, item: LayoutItem, x: number, y: number): Layout {
  const next = copyLayout(l)
  next[item] = { ...next[item], x: clampMove(x, W), y: clampMove(y, H) }
  return next
}

export function resize(l: Layout, item: LayoutItem, factor: number): Layout {
  const next = copyLayout(l)
  next[item] = { ...next[item], s: clampSize(next[item].s * factor) }
  return next
}

export function sized(l: Layout, item: LayoutItem, percent: number): Layout {
  const next = copyLayout(l)
  next[item] = { ...next[item], s: clampSize(percent / 100) }
  return next
}

export function resetItem(l: Layout, item: LayoutItem): Layout {
  const next = copyLayout(l)
  next[item] = { ...DEFAULT_LAYOUT[item] }
  return next
}

export function describePlace(p: Place): string {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n))
  return `x ${sign(p.x)}, y ${sign(p.y)}, size ${Math.round(p.s * 100)}%`
}

export const HELP = [
  'Run /clawd-layout with nothing after it to open the Layout pane: pick a figure, then press',
  'the arrows to move it and the minus or plus to resize it (W A S D and Q E once the pane has focus).',
  'Typed forms, for the same moves:',
  '  /clawd-layout <item> left 80        nudge (left, right, up, down; default 40)',
  '  /clawd-layout <item> -300 20        set its offset from where it first stood',
  '  /clawd-layout <item> size 120       set its size in percent (30 to 300)',
  '  /clawd-layout <item> bigger | smaller',
  '  /clawd-layout <item> reset   |   /clawd-layout reset',
  'Items: card, girl, clawd. The scene is 1672 by 941 units; y grows downward.',
].join('\n')

/** Applies a typed /clawd-layout command; `undefined` layout means nothing changed. */
export function applyCommand(current: Layout, args: string): { layout?: Layout; text: string } {
  const t = args.trim().toLowerCase().split(/\s+/).filter(Boolean)

  if (t.length === 1 && t[0] === 'reset') {
    return { layout: copyLayout(DEFAULT_LAYOUT), text: 'Everything is back where it started.' }
  }
  const item = t[0] as LayoutItem

  if (!ITEMS.includes(item)) {
    return { text: `Unknown item "${t[0] ?? ''}".\n\n${HELP}` }
  }
  const say = (l: Layout, what: string) => ({ layout: l, text: `${ITEM_NAMES[item]} ${what}: ${describePlace(l[item])}` })

  if (t[1] === 'reset' && t.length === 2) {
    return say(resetItem(current, item), 'reset')
  }
  if ((t[1] === 'bigger' || t[1] === 'smaller') && t.length === 2) {
    return say(resize(current, item, t[1] === 'bigger' ? STEPS.normal.size : 1 / STEPS.normal.size), 'resized')
  }
  if (t[1] === 'size' && t.length === 3 && Number.isFinite(Number(t[2]))) {
    return say(sized(current, item, Number(t[2])), 'resized')
  }
  const dirs: Record<string, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }
  const dir = dirs[t[1] ?? '']

  if (dir !== undefined && t.length <= 3) {
    const n = t[2] === undefined ? STEPS.normal.move : Number(t[2])

    if (Number.isFinite(n)) {
      return say(move(current, item, dir[0] * n, dir[1] * n), 'moved')
    }
  }
  if (t.length === 3 && Number.isFinite(Number(t[1])) && Number.isFinite(Number(t[2]))) {
    return say(place(current, item, Number(t[1]), Number(t[2])), 'placed')
  }

  return { text: HELP }
}
