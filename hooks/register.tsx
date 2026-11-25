import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Layout, LayoutItem, UsageSnapshot, UsageWindow } from '../types'
import {
  applyCommand,
  describePlace,
  isStep,
  ITEM_NAMES,
  ITEMS,
  move,
  resetItem,
  resize,
  STEPS,
  wholeLayout,
} from './layout'
import type { StepName } from './layout'
import { makeColors } from './make-colors.js'
import type { DragMapPost, DragMapProps } from './drag-map'
import { buildScene, DEFAULT_LAYOUT, FIGURES } from './scene'
import { STICKER_PICS } from './sticker-pics'
import { PAGE_SIZE, STICKERS } from './stickers'
import type { CardRow } from './scene'

const PANE = 'usage'
const LAYOUT_PANE = 'layout'
const SCENE_NAME = 'reading-room'
const LAYOUT_KEY = 'layout'
const LIMIT_KEY = 'contextLimit'
const OFF_KEY = 'themeOff'

// Change a tag when its value's fields change: it declines what an earlier
// version stored, which outlives a reload.
const usage = atom({ plugin: 'clawd-library', key: 'usage' } as const, { windows: [] } as UsageSnapshot, {
  shape: 'usage-2',
})
const contextLimit = atom({ plugin: 'clawd-library', key: 'contextLimit' } as const, 0, { shape: 'limit-1' })
const layoutAtom = atom({ plugin: 'clawd-library', key: 'layout' } as const, DEFAULT_LAYOUT, { shape: 'layout-2' })
const target = atom({ plugin: 'clawd-library', key: 'layoutTarget' } as const, 'girl' as LayoutItem, { shape: 'target-1' })
const step = atom({ plugin: 'clawd-library', key: 'layoutStep' } as const, 'normal' as string, { shape: 'step-1' })
const stickersOpen = atom({ plugin: 'clawd-library', key: 'stickersOpen' } as const, false, { shape: 'stickers-1' })
const stickerPage = atom({ plugin: 'clawd-library', key: 'stickerPage' } as const, 0, { shape: 'page-1' })
const working = atom({ plugin: 'clawd-library', key: 'isWorking' } as const, false, { shape: 'working-1' })

// Cream paper and tangerine by day, deep night blue after dark: the scene's own colors.
const { theme, problems } = makeColors({
  label: 'Clawd library',
  roles: { accent: '#e8763a', danger: '#c2412d', success: '#5f8a3a', warning: '#c98a14', pro: '#8a5aa8' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#fcefe3',
        'surface-1': '#fdf4ea',
        'surface-2': '#fff9f2',
        'text-primary': '#2b1a10',
        'text-secondary': '#563b2a',
        'text-muted': '#6e523f',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0e1a30',
        'surface-1': '#13213b',
        'surface-2': '#162540',
        'surface-3': '#1a2a48',
        'text-primary': '#eef2fb',
        'text-secondary': '#c6d0e3',
        'text-muted': '#98a7c2',
      },
    },
  },
})

// No blur and a thin veil, so the scene stays sharp behind the panels.
const BASE: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: SCENE_NAME, glass: { blur: 0, opacity: 0.3 } },
}

const LOOK: ThemeSetArgs = {
  ...BASE,
  style: {
    UserMessage: { backgroundColor: 'surface-2', radius: 16, paddingX: 14, paddingY: 10 },
    ToolUse: { backgroundColor: 'surface-1', radius: 8, paddingX: 8 },
  },
}

/** What the engine measures, kept as the card and the pane read it. */
function snapshot(
  context: { percent?: number; tokens?: number; window: number },
  limits: readonly UsageWindow[],
  compactWindow: number | undefined,
): UsageSnapshot {
  return {
    contextPercent: context.percent,
    contextTokens: context.tokens,
    contextWindow: context.window,
    compactWindow,
    windows: limits.map(w => ({ kind: w.kind, percentUsed: w.percentUsed, resetsAt: w.resetsAt })),
  }
}

function tokens(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)
}

function resetsIn(iso: string | undefined, now: number): string | undefined {
  if (iso === undefined) {
    return undefined
  }
  const at = Date.parse(iso)

  if (Number.isNaN(at)) {
    return undefined
  }
  const minutes = Math.max(0, Math.round((at - now) / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60

  if (days > 0) {
    return `Resets in ${days}d ${hours}h`
  }

  return hours > 0 ? `Resets in ${hours}h ${mins}m` : `Resets in ${mins}m`
}

const pctText = (p: number | undefined) => (p === undefined ? 'n/a' : `${Math.round(p)}%`)

/**
 * The window context is measured against: a limit the person typed, else the
 * auto-compact window the engine reported (settings, environment or account),
 * else the model's whole window.
 */
export function contextLimitOf(u: UsageSnapshot, manual: number): { limit?: number; source: string } {
  if (manual > 0) {
    return { limit: manual, source: 'manual limit' }
  }
  if (u.compactWindow !== undefined && u.compactWindow > 0) {
    return { limit: u.compactWindow, source: 'auto-compact' }
  }
  return { limit: u.contextWindow, source: 'model window' }
}

export function rowsOf(u: UsageSnapshot, now: number, manualLimit = 0): CardRow[] {
  const find = (kind: string) => u.windows.find(w => w.kind === kind)
  const fiveHour = find('five_hour')
  const weekly = find('seven_day')
  const { limit, source } = contextLimitOf(u, manualLimit)
  const used = u.contextTokens
  const contextPct = used !== undefined && limit !== undefined && limit > 0 ? Math.min(100, (used / limit) * 100) : undefined

  return [
    {
      label: 'Context',
      value: pctText(contextPct),
      percent: contextPct,
      detail:
        used !== undefined && limit !== undefined
          ? `${tokens(used)} / ${tokens(limit)} tokens · ${source}`
          : limit !== undefined
            ? `0 / ${tokens(limit)} tokens · ${source}`
            : 'Waiting for the first reply',
    },
    {
      label: '5-hour limit',
      value: pctText(fiveHour?.percentUsed),
      percent: fiveHour?.percentUsed,
      detail: resetsIn(fiveHour?.resetsAt, now) ?? 'No reading yet',
    },
    {
      label: 'Weekly · All Models',
      value: pctText(weekly?.percentUsed),
      percent: weekly?.percentUsed,
      detail: resetsIn(weekly?.resetsAt, now) ?? 'No reading yet',
    },
  ]
}

/** Reads "400k", "400000", "1m" or "1.5M" as tokens; `undefined` when it is none of those. */
export function parseTokens(text: string): number | undefined {
  const m = /^(\d+(?:\.\d+)?)\s*([km]?)$/i.exec(text.trim().replace(/[,_]/g, ''))
  if (m === null) {
    return undefined
  }
  const n = Number(m[1]) * (m[2]?.toLowerCase() === 'm' ? 1_000_000 : m[2]?.toLowerCase() === 'k' ? 1000 : 1)
  return Number.isFinite(n) && n >= 1000 && n <= 10_000_000 ? Math.round(n) : undefined
}

/** The auto-compact window the engine measures context against, from a local estimate (no requests). */
async function compactWindowOf($: EngineInterface): Promise<number | undefined> {
  try {
    const r = await $.session.usage({ breakdown: 'summary' })
    const w = r.context.breakdown?.rawMaxTokens
    return w !== undefined && w > 0 ? w : undefined
  } catch {
    return undefined
  }
}

// ---- hooks ----------------------------------------------------------------------------------

/** Shows a new layout at once and keeps it for later sessions. */
async function saveLayout($: EngineInterface, layout: Layout): Promise<void> {
  await update($, layoutAtom, () => layout)
  await $.store.set(LAYOUT_KEY, layout)
}

/**
 * Takes up what another session saved: the layout and a typed context limit live in the store,
 * which every session shares, so each one reads it again now and then and redraws on a change.
 */
async function syncFromStore($: EngineInterface): Promise<void> {
  const saved = wholeLayout(await $.store.get(LAYOUT_KEY))
  if (JSON.stringify(saved) !== JSON.stringify(await read($, layoutAtom))) {
    await update($, layoutAtom, () => saved)
  }
  const typed = await $.store.get(LIMIT_KEY)
  const limit = typeof typed === 'number' && typed > 0 ? typed : 0
  if (limit !== (await read($, contextLimit))) {
    await update($, contextLimit, () => limit)
  }
}

/** How often a session looks for a layout another session saved. */
const SYNC_MS = 3000
let syncTimer: { cancel: () => void } | undefined

/** One sticker: its picture on a rounded cream card, drawn as an image the size the card is. */
function stickerSvg(pic: { w: number; h: number; jpeg: string }): string {
  const pad = 12
  const w = pic.w + 2 * pad
  const h = pic.h + 2 * pad
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" rx="22" fill="#fff3e6"/>` +
    `<image href="data:image/jpeg;base64,${pic.jpeg}" x="${pad}" y="${pad}" width="${pic.w}" height="${pic.h}"/></svg>`
  )
}

/** Sets this mod's look: the colors, the backdrop and the message style. */
async function applyLook($: EngineInterface): Promise<void> {
  let set
  try {
    set = await $.theme.set(LOOK)
  } catch (error) {
    // A build that does not take `style` throws: set the look without it.
    $.ui.log(String(error))
    set = await $.theme.set(BASE)
  }

  // At session start the app often has not attached yet: the theme stands and draws once it does,
  // so that is no news for the status line. Clear any line an earlier version left there.
  $.ui.status(undefined)
  if (!set.isDrawn) {
    $.ui.log(`theme set, not drawn yet: ${set.reason}`)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // While building: the line that would stop Desktop painting this look.
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    // Turned off with /clawd-theme off: leave the app's own look (or another mod's) alone.
    if ((await $.store.get(OFF_KEY)) !== true) {
      await applyLook($)
    }
    await $.command.register({
      name: 'clawd-theme',
      description: 'Turn the Clawd library look on or off (off is the app\'s own look)',
      argumentHint: '<on | off>',
    })

    await $.command.register({ name: 'usage-pane', description: 'Show context and plan usage in a side pane' })
    await $.command.register({
      name: 'clawd-layout',
      description: 'Move the usage card, the girl or Clawd in the backdrop',
      argumentHint: '(opens the Layout pane) | <card|girl|clawd> <left|right|up|down N | X Y | size N | reset>',
    })
    const saved = wholeLayout(await $.store.get(LAYOUT_KEY))
    await update($, layoutAtom, () => saved)
    await update($, working, () => false)
    const typed = await $.store.get(LIMIT_KEY)
    await update($, contextLimit, () => (typeof typed === 'number' && typed > 0 ? typed : 0))
    await $.command.register({
      name: 'clawd-context',
      description: 'Set the context limit the usage card measures against (auto detects auto-compact)',
      argumentHint: '<400k | 1m | auto>',
    })
    syncTimer?.cancel()
    syncTimer = $.clock.every(SYNC_MS, () => void syncFromStore($).catch(() => undefined))
    const now = await $.session.usage()
    const compact = await compactWindowOf($)
    await update($, usage, () => snapshot(now.context, now.rateLimits, compact))

    return next(e)
  })

  on('command.run', { command: 'clawd-theme' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === 'off') {
      await $.store.set(OFF_KEY, true)
      await $.theme.clear()
      return { text: "Clawd library look off: the app's own look is back, in this and new sessions. /clawd-theme on brings it back." }
    }
    if (arg === 'on') {
      await $.store.delete(OFF_KEY)
      await applyLook($)
      return { text: 'Clawd library look on.' }
    }
    const off = (await $.store.get(OFF_KEY)) === true
    return { text: `The Clawd library look is ${off ? 'off' : 'on'}. Use /clawd-theme on or /clawd-theme off.` }
  })

  on('command.run', { command: 'usage-pane' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Usage' })

    return { text: 'Usage pane opened.' }
  })

  on('command.run', { command: 'clawd-layout' }, async ($, e) => {
    if (e.args.trim() === '') {
      await $.ui.open({ id: LAYOUT_PANE, title: 'Layout', focus: true })
      return { text: 'Layout pane opened: pick a figure, then move or resize it.' }
    }
    const done = applyCommand(await read($, layoutAtom), e.args)

    if (done.layout !== undefined) {
      await saveLayout($, done.layout)
    }

    return { text: done.text }
  })

  on('command.run', { command: 'clawd-context' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const u = await read($, usage)

    if (arg === '') {
      const { limit, source } = contextLimitOf(u, await read($, contextLimit))
      return {
        text: `Context is measured against ${limit !== undefined ? tokens(limit) : 'nothing yet'} (${source}).\nSet one: /clawd-context 400k   Detect again: /clawd-context auto`,
      }
    }
    if (arg === 'auto') {
      await update($, contextLimit, () => 0)
      await $.store.delete(LIMIT_KEY)
      const compact = await compactWindowOf($)
      await update($, usage, x => ({ ...x, compactWindow: compact }))
      const { limit, source } = contextLimitOf({ ...u, compactWindow: compact }, 0)
      return { text: `Context limit detected: ${limit !== undefined ? tokens(limit) : 'not yet known'} (${source}).` }
    }
    const n = parseTokens(arg)

    if (n === undefined) {
      return { text: 'Give a token count such as 400k, 400000 or 1m, or auto to detect the auto-compact window.' }
    }
    await update($, contextLimit, () => n)
    await $.store.set(LIMIT_KEY, n)
    return { text: `Context limit set to ${tokens(n)}.` }
  })

  on('session.measure', async ($, e, next) => {
    // The window changes with the model or the settings: read it again when the fill moved.
    const before = await read($, usage)
    const compact = e.changed.includes('context') || before.compactWindow === undefined ? await compactWindowOf($) : before.compactWindow
    await update($, usage, () => snapshot(e.context, e.rateLimits, compact))

    return next(e)
  })

  // Main turns only: a subagent's turn does not change her mood.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, working, () => true)
      await syncFromStore($)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, working, () => false)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE_NAME) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const now = await $.clock.now()
    const rows = rowsOf(await read($, usage), now, await read($, contextLimit))
    const isWorking = await read($, working)
    const source = buildScene({ rows, layout: await read($, layoutAtom), isWorking, now })
    const alt =
      `A girl with long orange hair ${isWorking ? 'reading intently' : 'reading'}, Clawd the pixel crab beside her on a stack of books. Usage: ` +
      rows.map(r => `${r.label} ${r.value}`).join(', ')

    return <Svg source={source} alt={alt} />
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const rows = rowsOf(await read($, usage), await $.clock.now(), await read($, contextLimit))
    const SEGMENTS = 20

    return (
      <Box flexDirection="column" gap="md" paddingY={1}>
        {rows.map(row => {
          const pct = row.percent
          const filled = pct === undefined ? 0 : Math.min(SEGMENTS, Math.round((pct / 100) * SEGMENTS))
          const hot = pct !== undefined && pct >= 80
          const fill = hot ? 'error' : '#e8763a'

          return (
            <Box key={row.label} flexDirection="column" gap="xs">
              <Box flexDirection="row" justifyContent="space-between">
                <Text weight="semibold">{row.label}</Text>
                <Text tabular color={hot ? 'error' : undefined} dimColor={pct === undefined}>
                  {row.value}
                </Text>
              </Box>
              <Box flexDirection="row" gap={0} height={1}>
                {Array.from({ length: SEGMENTS }, (_, i) => (
                  <Box key={String(i)} flexGrow={1} height={1} backgroundColor={i < filled ? fill : 'subtle'} />
                ))}
              </Box>
              <Text size="caption" dimColor>
                {row.detail}
              </Text>
            </Box>
          )
        })}
      </Box>
    )
  })

  // The Layout pane: pick a figure and a step, then press to move or resize it.
  // The sticker tray: a button above the prompt opens her stickers, a page at a time. A press on a
  // sticker's caption puts its prompt in the box at the cursor, to edit or send, and closes the tray.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const open = await read($, stickersOpen)

    if (!open) {
      return (
        <Box flexDirection="row">
          <Button key="stickers" label="✿ 表情包" plain onPress={() => update($, stickersOpen, () => true)} />
        </Box>
      )
    }
    const pages = Math.ceil(STICKERS.length / PAGE_SIZE)
    const page = Math.min(Math.max(0, await read($, stickerPage)), pages - 1)
    const shown = STICKERS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    // The terminal draws no Svg: there the captions alone.
    const Svg = e.surface === 'terminal' ? undefined : $.ui.resolve(e).Svg
    const pick = (text: string) => async () => {
      await $.prompt.fill({ text, mode: 'insert' })
      await update($, stickersOpen, () => false)
    }

    return (
      <Box flexDirection="column" gap="xs">
        <Box flexDirection="row" gap="xs" alignItems="center">
          <Button key="stickers" label="✿ ✕" plain onPress={() => update($, stickersOpen, () => false)} />
          <Button key="prev" label="‹" plain onPress={() => update($, stickerPage, p => (p + pages - 1) % pages)} />
          <Text dimColor size="caption">
            {`${page + 1} / ${pages}`}
          </Text>
          <Button key="next" label="›" plain onPress={() => update($, stickerPage, p => (p + 1) % pages)} />
        </Box>
        <Box flexDirection="row" flexWrap="wrap" gap="sm">
          {shown.map(st => {
            const pic = STICKER_PICS[STICKERS.indexOf(st)]
            return (
              <Box key={`card-${st.key}`} flexDirection="column" alignItems="center" gap="xs">
                {Svg !== undefined && pic !== undefined ? (
                  <Svg source={stickerSvg(pic)} alt={st.text} width={96} height={Math.round((96 * (pic.h + 24)) / (pic.w + 24))} />
                ) : null}
                <Button key={st.key} label={st.text} onPress={pick(st.text)} />
              </Box>
            )
          })}
        </Box>
      </Box>
    )
  })

  // A drag on the map ends here: keep the figure where it was dropped and pick it for the buttons.
  on('ui.message', async ($, e, next) => {
    if (e.element !== 'map') {
      return next(e)
    }
    const d = e.data as Partial<DragMapPost> | null
    if (!d || !ITEMS.includes(d.item as LayoutItem) || typeof d.place !== 'object' || d.place === null) {
      return {}
    }
    const item = d.item as LayoutItem
    const merged = wholeLayout({ ...(await read($, layoutAtom)), [item]: d.place })
    await saveLayout($, merged)
    await update($, target, () => item)
    // The pane redraws from the saved layout, which hands the map its next props.
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: LAYOUT_PANE }, async ($, e) => {
    const { Box, Text, Button, Select } = $.ui.resolve(e)
    const layout = await read($, layoutAtom)
    const item = await read($, target)
    // The drag map, where the surface draws one: as wide as the pane, the scene's shape in cells
    // about twice as tall as they are wide.
    const mapWidth = Math.max(24, Math.min(90, e.props.bodyColumns))
    const mapHeight = Math.max(8, Math.round((mapWidth - 2) * (941 / 1672) * 0.5) + 2)
    const mapProps: DragMapProps = { layout, figures: FIGURES, selected: item, width: mapWidth, height: mapHeight }
    let map = null
    if (e.surface === 'desktop' || e.surface === 'terminal') {
      const { Client } = $.ui.resolve(e)
      map = (
        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Drag to place</Text>
          <Client key="map" module="./drag-map.ts" props={mapProps} width={mapWidth} height={mapHeight} />
          <Text size="caption" dimColor>
            Drag a figure to move it. Drag its ◢ corner to resize it.
          </Text>
        </Box>
      )
    }
    const stepName: StepName = isStep(await read($, step)) ? ((await read($, step)) as StepName) : 'normal'
    const st = STEPS[stepName]
    const change = (fn: (l: Layout) => Layout) => async () => saveLayout($, fn(await read($, layoutAtom)))

    return (
      <Box flexDirection="column" gap="md" paddingY={1}>
        {map}
        <Select
          key="figure"
          label="Adjust"
          value={item}
          options={ITEMS.map(i => ({ value: i, label: ITEM_NAMES[i] }))}
          onSelect={v => void update($, target, () => v as LayoutItem)}
        />
        <Select
          key="step"
          label="Step"
          value={stepName}
          options={(Object.keys(STEPS) as StepName[]).map(k => ({ value: k, label: STEPS[k].name }))}
          onSelect={v => void update($, step, () => v)}
        />
        <Text dimColor>{describePlace(layout[item])}</Text>
        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Move</Text>
          <Box flexDirection="row" gap="xs">
            <Button key="left" label="← Left" hotkey="a" onPress={change(l => move(l, item, -st.move, 0))} />
            <Button key="up" label="↑ Up" hotkey="w" onPress={change(l => move(l, item, 0, -st.move))} />
            <Button key="down" label="↓ Down" hotkey="s" onPress={change(l => move(l, item, 0, st.move))} />
            <Button key="right" label="→ Right" hotkey="d" onPress={change(l => move(l, item, st.move, 0))} />
          </Box>
        </Box>
        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Size</Text>
          <Box flexDirection="row" gap="xs">
            <Button key="smaller" label="− Smaller" hotkey="q" onPress={change(l => resize(l, item, 1 / st.size))} />
            <Button key="bigger" label="+ Bigger" hotkey="e" onPress={change(l => resize(l, item, st.size))} />
          </Box>
        </Box>
        <Box flexDirection="row" gap="xs">
          <Button key="reset" label="Reset this" hotkey="r" dimColor onPress={change(l => resetItem(l, item))} />
          <Button key="reset-all" label="Reset all" dimColor onPress={change(() => DEFAULT_LAYOUT)} />
        </Box>
        <Text size="caption" dimColor>
          Keys while this pane has focus: W A S D move, Q E resize, R resets.
        </Text>
      </Box>
    )
  })
}
