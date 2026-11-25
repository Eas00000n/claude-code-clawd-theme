// The Layout pane's drag map: a small picture of the backdrop in character cells. Drag a figure to
// move it; drag the ◢ at its lower right corner to resize it. On release it posts the new place to
// the hooks module, which saves it and answers with the layout to draw next.
import type { ClientModule, ClientPointerEvent, RenderElement } from 'claude-code'

type Item = 'card' | 'girl' | 'clawd'
type Place = { x: number; y: number; s: number }
type Box = { x: number; y: number; w: number; h: number; ax: number; ay: number }

/** What the hooks module hands the map. */
export type DragMapProps = {
  layout: Record<Item, Place>
  figures: Record<Item, Box>
  selected: Item
  width: number
  height: number
}

/** What the map posts when a drag ends. */
export type DragMapPost = { item: Item; place: Place }

type Drag = { item: Item; mode: 'move' | 'size'; x0: number; y0: number; orig: Place }
// `live` is what the drag shows; it stands until new props arrive (`from` is the layout it began on).
type State = { drag?: Drag; live?: Record<Item, Place>; from?: string; selected?: Item }

// Drawn back to front as the scene is: the girl, Clawd on his books, then the card on top.
const ORDER: Item[] = ['girl', 'clawd', 'card']
const NAMES: Record<Item, string> = { card: 'Usage', girl: 'Girl', clawd: 'Clawd' }
const FILL: Record<Item, string> = { card: '#4f6fa8', girl: '#e8763a', clawd: '#a8481f' }
const MIN_SIZE = 0.3
const MAX_SIZE = 3

const clampSize = (s: number) => Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, s)) * 1000) / 1000

/** Where a figure stands in scene units, its place applied around its anchor. */
function rectOf(b: Box, p: Place) {
  return { x: b.x * p.s + b.ax * (1 - p.s) + p.x, y: b.y * p.s + b.ay * (1 - p.s) + p.y, w: b.w * p.s, h: b.h * p.s }
}

const DragMap: ClientModule<DragMapProps, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  const st: State = surface.state ?? {}
  const fresh = JSON.stringify(props.layout)
  const layout = st.live !== undefined && st.from === fresh ? st.live : props.layout
  const selected = st.drag?.item ?? st.selected ?? props.selected
  // The inside of the frame, in cells: the border takes one on each side.
  const cols = Math.max(4, (surface.columns || props.width) - 2)
  const rows = Math.max(3, (surface.rows || props.height) - 2)
  const sx = 1672 / cols
  const sy = 941 / rows

  const cells = (item: Item) => {
    const r = rectOf(props.figures[item], layout[item])
    const left = Math.round(r.x / sx)
    const top = Math.round(r.y / sy)
    return { left, top, width: Math.max(3, Math.round(r.w / sx)), height: Math.max(1, Math.round(r.h / sy)) }
  }

  surface.onPointer((ev: ClientPointerEvent) => {
    const now: State = surface.state ?? {}
    // Region cells to frame cells: the border is the region's first row and column.
    const px = (ev.fine?.x ?? ev.x + 0.5) - 1
    const py = (ev.fine?.y ?? ev.y + 0.5) - 1

    if (ev.type === 'down' && ev.button === 'left') {
      for (const item of [...ORDER].reverse()) {
        const c = cells(item)
        const inside = px >= c.left && px < c.left + c.width && py >= c.top && py < c.top + c.height
        if (!inside) {
          continue
        }
        const corner = px >= c.left + c.width - 2 && py >= c.top + c.height - 1
        surface.setState({
          selected: item,
          live: props.layout,
          from: JSON.stringify(props.layout),
          drag: { item, mode: corner ? 'size' : 'move', x0: px, y0: py, orig: props.layout[item] },
        })
        return
      }
      return
    }
    const drag = now.drag
    if (drag === undefined || now.live === undefined) {
      return
    }
    const dx = (px - drag.x0) * sx
    const dy = (py - drag.y0) * sy
    let place: Place
    if (drag.mode === 'move') {
      place = { ...drag.orig, x: Math.round(drag.orig.x + dx), y: Math.round(drag.orig.y + dy) }
    } else {
      const w = props.figures[drag.item].w * drag.orig.s
      place = { ...drag.orig, s: clampSize((drag.orig.s * (w + dx)) / w) }
    }
    const live = { ...now.live, [drag.item]: place }

    if (ev.type === 'up') {
      surface.post({ item: drag.item, place } satisfies DragMapPost)
      surface.setState({ selected: drag.item, live, from: now.from })
      return
    }
    if (ev.type === 'move') {
      surface.setState({ ...now, live })
    }
  })

  const figures: RenderElement[] = ORDER.map(item => {
    const c = cells(item)
    const isOn = item === selected
    const label = (isOn ? '● ' : '') + NAMES[item]
    return Box({
      key: item,
      position: 'absolute',
      left: c.left,
      top: c.top,
      width: c.width,
      height: c.height,
      backgroundColor: FILL[item],
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      children: [
        Text({ color: '#ffffff', bold: isOn, wrap: 'truncate-end', children: label }),
        Box({
          key: 'corner',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          children: [Text({ color: '#ffffff', children: '◢' })],
        }),
      ],
    })
  })

  return Box({
    width: cols + 2,
    height: rows + 2,
    borderStyle: 'round',
    borderColor: 'subtle',
    overflow: 'hidden',
    children: [Box({ key: 'stage', position: 'relative', width: cols, height: rows, children: figures })],
  })
}

export default DragMap
