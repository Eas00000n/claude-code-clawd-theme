// The backdrop scene, composed per draw: sky, floor, flowers and petals; the traced girl
// with blinking eyelids and sparkles from her book; Clawd on the book stack; the usage card.
// Every moving part has a resting pose in plain markup, so reduced motion shows a finished picture.
import type { Layout, Place } from '../types'
import { BOOKS, GIRL } from './art'

export type CardRow = { label: string; value: string; percent?: number; detail: string }

export const W = 1672
export const H = 941
export const DEFAULT_LAYOUT: Layout = {
  card: { x: 0, y: 0, s: 1 },
  girl: { x: 0, y: 0, s: 1 },
  clawd: { x: 0, y: 0, s: 1 },
}

// Where each figure sits before the person moves it, and the point it grows and shrinks around.
const CARD_HOME = { x: 690, y: 40 }
const FEET = { x: 1390, y: 905 } // her pivot for breathing, leaning and resizing
const BOOKS_FOOT = { x: 1068, y: 875 } // Clawd and his books grow from the bottom of the stack

/**
 * Each figure's box as first drawn, in scene units, and the point it grows around:
 * what the Layout pane's drag map draws and hit-tests. Measured off the traced art.
 */
export type FigureBox = { x: number; y: number; w: number; h: number; ax: number; ay: number }
export const FIGURES: Record<'card' | 'girl' | 'clawd', FigureBox> = {
  card: { x: CARD_HOME.x, y: CARD_HOME.y, w: 330, h: 216, ax: CARD_HOME.x, ay: CARD_HOME.y },
  girl: { x: 1110, y: 15, w: 515, h: 905, ax: FEET.x, ay: FEET.y },
  clawd: { x: 957, y: 620, w: 223, h: 258, ax: BOOKS_FOOT.x, ay: BOOKS_FOOT.y },
}

/** Moves by the place's offset, then scales by its size around `at`. */
function placed(p: Place, at: { x: number; y: number }): string {
  const s = Math.round(p.s * 1000) / 1000
  if (s === 1) {
    return `translate(${p.x} ${p.y})`
  }
  return `translate(${p.x + at.x - at.x * s} ${p.y + at.y - at.y * s}) scale(${s})`
}
const TRACE = 'translate(940 0) scale(1.25)'

const FONT = 'ui-sans-serif,system-ui,sans-serif'

const STYLE = [
  // ground
  '.sky{fill:#fcefe3}.floor{fill:#fdcfad}.fl{fill:#fec9a3}.drift{fill:#ffb98a;opacity:0}',
  '.cb{fill:#ec763a}.ce{fill:#1c1209}.lid{fill:#f9e4d4}.lash{fill:#3e261c}.spark{fill:#ff9a4a;opacity:0}.dot{fill:#3e261c;opacity:0}',
  // card
  '.ucp{fill:#fffaf3;fill-opacity:.92;stroke:#e8c9ad;stroke-width:1.5}.uct{fill:#ffc08c;fill-opacity:.85}',
  `.uch{font:600 13px ${FONT};letter-spacing:2px;fill:#b5522a}`,
  `.ucl{font:500 15px ${FONT};fill:#2b1a10}`,
  `.ucv{font:700 15px ${FONT};fill:#2b1a10;font-variant-numeric:tabular-nums}.ucn{fill:#8c6f5a}`,
  `.ucd{font:400 11.5px ${FONT};fill:#7a5c48}`,
  '.ucb{fill:#f3dcc7}.ucf{fill:#e8763a}.uchot{fill:#c2412d}',
  // the corner sky: a sun by day, a crescent moon with stars by night
  '.halo{fill:#ffe3c8;opacity:.55}.rays{fill:#ffc796}.sun{fill:#ffb878}.sunc{fill:#ffd2a6}.moon{display:none}',
  '.glow{fill:#8fb2ff}.mface{fill:#f6e7c8}.star{fill:#fff1d6}',
  '@media (prefers-color-scheme: dark){.sky{fill:#0e1a30}.floor{fill:#132341}.fl{fill:#1a2b4d}.drift{fill:#35527f}.dot{fill:#eef2fb}',
  '.day{display:none}.moon{display:inline}',
  '.ucp{fill:#13213b;stroke:#2c4268}.uct{fill:#f0a872;fill-opacity:.8}.uch{fill:#ffa266}.ucl,.ucv{fill:#eef2fb}.ucn{fill:#93a1bc}.ucd{fill:#aab7cf}.ucb{fill:#24375b}}',
  // motion shared by both moods
  '.spin,.spin2,.lid,.eyes,.tw{transform-box:fill-box}',
  '.tw{transform-origin:center;animation:tw 4.5s ease-in-out infinite}',
  '@keyframes tw{0%,100%{opacity:.35;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}',
  '.glow{animation:glow 9s ease-in-out infinite}@keyframes glow{0%,100%{opacity:.1}50%{opacity:.17}}',
  '.spin,.spin2{transform-origin:center}.spin{animation:spin 90s linear infinite}.spin2{animation:spin 120s linear infinite reverse}',
  '@keyframes spin{to{transform:rotate(360deg)}}',
  '.drift{animation:drift 28s linear infinite}',
  '@keyframes drift{0%{opacity:0;transform:translate(1200px,80px) rotate(0deg)}10%{opacity:.55}85%{opacity:.45}100%{opacity:0;transform:translate(160px,700px) rotate(320deg)}}',
  '.d1{translate:0 120px}.d2{translate:-180px 40px}.d3{translate:120px 220px}.d4{translate:-60px -40px}',
  '.lid{transform-origin:top;transform:scaleY(0)}',
  '@keyframes blink{0%,93%,100%{transform:scaleY(0)}96%{transform:scaleY(1)}}',
  '.eyes{transform-origin:center}',
  '@keyframes cblink{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.15)}}',
  `.girl{transform-origin:${FEET.x}px ${FEET.y}px}`,
  // idle: she breathes slowly and blinks; Clawd hops now and then
  '.idle .girl{animation:breathe 5s ease-in-out infinite}',
  '@keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.004,1.01)}}',
  '.idle .lid{animation:blink 5.5s infinite}',
  '.idle .clawd{animation:hop 7s ease-in-out infinite}',
  '@keyframes hop{0%,70%,100%{transform:translateY(0)}78%{transform:translateY(-0.6px)}86%{transform:translateY(0)}}',
  '.idle .eyes{animation:cblink 6s infinite}',
  // working: she leans in and reads, sparkles rise from the book; Clawd taps away with typing dots
  '.working .girl{animation:lean 2.6s ease-in-out infinite}',
  '@keyframes lean{0%,100%{transform:rotate(0deg) scale(1,1)}50%{transform:rotate(-0.8deg) scale(1.003,1.008)}}',
  '.working .lid{animation:blink 3.8s infinite}',
  '.working .spark{animation:spark 2.4s ease-out infinite}',
  '@keyframes spark{0%{opacity:0;transform:translate(0,0) scale(.6)}25%{opacity:.95}100%{opacity:0;transform:translate(-30px,-110px) scale(1.2)}}',
  '.working .clawd{animation:tap .6s ease-in-out infinite}',
  '@keyframes tap{0%,100%{transform:translateY(0)}50%{transform:translateY(-0.25px)}}',
  '.working .la{animation:legs .6s steps(1) infinite}.working .lb{animation:legs .6s steps(1) infinite reverse}',
  '@keyframes legs{0%{transform:translateY(0)}50%{transform:translateY(-0.4px)}}',
  '.working .dot{animation:dots 1.5s ease-in-out infinite}',
  '@keyframes dots{0%,100%{opacity:.15}40%{opacity:.9}}',
].join('')

// Each animated selector: its period and its own offset, so a redraw resumes in phase.
const LOOPS: Record<'idle' | 'working', [string, number, number][]> = {
  idle: [
    ['.idle .girl', 5, 0],
    ['.idle .lid', 5.5, 0],
    ['.idle .clawd', 7, 0],
    ['.idle .eyes', 6, 0],
  ],
  working: [
    ['.working .girl', 2.6, 0],
    ['.working .lid', 3.8, 0],
    ['.working .clawd', 0.6, 0],
    ['.working .la', 0.6, 0],
    ['.working .lb', 0.6, 0],
    ['.working .s0', 2.4, 0],
    ['.working .s1', 2.4, 0.6],
    ['.working .s2', 2.4, 1.2],
    ['.working .s3', 2.4, 1.8],
    ['.working .t0', 1.5, 0],
    ['.working .t1', 1.5, 1.0],
    ['.working .t2', 1.5, 0.5],
  ],
}
const SHARED: [string, number, number][] = [
  ['.spin', 90, 0],
  ['.spin2', 120, 0],
  ['.d0', 28, 0],
  ['.d1', 28, 6],
  ['.d2', 28, 12],
  ['.d3', 28, 17],
  ['.d4', 28, 23],
  ['.glow', 9, 0],
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): [string, number, number] => [`.w${i}`, 4.5, i * 1.3]),
]

function phase(now: number, mood: 'idle' | 'working'): string {
  const t = now / 1000
  return [...SHARED, ...LOOPS[mood]]
    .map(([sel, period, offset]) => `${sel}{animation-delay:-${((t + offset) % period).toFixed(2)}s}`)
    .join('')
}

function flower(cx: number, cy: number, r: number, cls: string): string {
  let petals = ''
  for (let k = 0; k < 6; k++) {
    petals += `<ellipse cx="0" cy="${Math.round(-r * 0.55)}" rx="${Math.round(r * 0.27)}" ry="${Math.round(r * 0.5)}" transform="rotate(${k * 60})"/>`
  }
  return `<g transform="translate(${cx} ${cy})"><g class="${cls}">${petals}<circle r="${Math.round(r * 0.2)}"/></g></g>`
}

// Top right, beside her head: a sun with slowly turning rays by day; by night a crescent moon in a
// soft glow, and stars across the open sky that keep clear of the card and of her.
const SKY_AT = { x: 1578, y: 104 }
const RAYS = Array.from(
  { length: 12 },
  (_, k) => `<rect x="-5" y="-86" width="10" height="22" rx="5" transform="rotate(${k * 30})"/>`,
).join('')
const STARS: [number, number, number][] = [
  [1462, 46, 0.55],
  [1652, 214, 0.7],
  [1500, 196, 0.45],
  [1118, 52, 0.6],
  [560, 120, 0.5],
  [372, 54, 0.75],
  [168, 168, 0.55],
  [470, 300, 0.4],
]
const SKY_CORNER =
  `<g class="day" transform="translate(${SKY_AT.x} ${SKY_AT.y})"><circle class="halo" r="62"/>` +
  `<g class="rays spin2">${RAYS}</g><circle class="sun" r="44"/><circle class="sunc" cx="-12" cy="-12" r="20"/></g>` +
  '<g class="moon">' +
  `<g transform="translate(${SKY_AT.x} ${SKY_AT.y})"><g class="glow"><circle r="112" opacity=".3"/><circle r="92" opacity=".45"/><circle r="76" opacity=".6"/><circle r="62"/></g>` +
  '<path class="mface" d="M-6.6-45.5A46 46 0 1 0 42.5 17.6A40 40 0 0 1-6.6-45.5Z"/></g>' +
  STARS.map(([x, y, k], i) => `<g transform="translate(${x} ${y}) scale(${k})"><path class="star tw w${i}" d="M0-12L3-3 12 0 3 3 0 12-3 3-12 0-3-3Z"/></g>`).join('') +
  '</g>'

const PETAL = '<path d="M0-9C6-6 6 4 0 9C-6 4-6-6 0-9Z"/>'
const GROUND =
  `<rect class="sky" width="${W}" height="${H}"/><rect class="floor" y="822" width="${W}" height="119"/>` +
  flower(28, 718, 190, 'fl spin') +
  SKY_CORNER +
  [0, 1, 2, 3, 4].map(i => `<g class="drift d${i}">${PETAL}</g>`).join('')

// Eyelids over her eyes (scaled to nothing until a blink), and sparkles at the top of her book.
const LIDS =
  '<g class="lid"><path d="M1342 118H1370V141Q1356 146 1342 141Z"/><path class="lash" d="M1342 139Q1356 144 1370 139V142Q1356 147 1342 142Z"/></g>' +
  '<g class="lid"><path d="M1318 140H1334V155Q1326 158 1318 155Z"/><path class="lash" d="M1318 153Q1326 156 1334 153V156Q1326 159 1318 156Z"/></g>'
const STAR = 'M0-12L3-3 12 0 3 3 0 12-3 3-12 0-3-3Z'
const SPARKS = [
  [1262, 214],
  [1290, 206],
  [1276, 222],
  [1304, 214],
]
  .map(([x, y], i) => `<g transform="translate(${x} ${y})"><path class="spark s${i}" d="${STAR}"/></g>`)
  .join('')

// Clawd on a 1-unit grid, after the reference sticker: body, arms, four legs, two eyes.
const U = 14.5
const CLAWD_AT = { x: 1017, y: 652 }
const CLAWD =
  `<g transform="translate(${CLAWD_AT.x} ${CLAWD_AT.y}) scale(${U})"><g class="clawd" shape-rendering="crispEdges">` +
  '<g class="cb"><rect x="-2" y="2" width="12" height="2"/><rect width="8" height="5"/>' +
  '<rect class="la" y="4.9" width="1" height="3.1"/><rect class="lb" x="2" y="4.9" width="1" height="3.1"/>' +
  '<rect class="la" x="5" y="4.9" width="1" height="3.1"/><rect class="lb" x="7" y="4.9" width="1" height="3.1"/></g>' +
  '<g class="eyes ce"><rect x="1" y="1" width="1" height="1"/><rect x="6" y="1" width="1" height="1"/></g>' +
  '<rect class="dot t0" x="1.5" y="-2.2" width="1" height="1"/><rect class="dot t1" x="3.5" y="-2.2" width="1" height="1"/><rect class="dot t2" x="5.5" y="-2.2" width="1" height="1"/>' +
  '</g></g>'

function card(rows: CardRow[], p: Place): string {
  const w = 330
  const rowH = 56
  const inner = w - 40
  const h = 48 + rows.length * rowH
  const body = rows
    .map((row, i) => {
      const ry = 48 + i * rowH
      const p = row.percent
      const hot = p !== undefined && p >= 80
      const fill = p === undefined ? 0 : Math.max(0, Math.min(inner, (inner * p) / 100))
      return (
        `<text class="ucl" x="20" y="${ry + 12}">${row.label}</text>` +
        `<text class="ucv${p === undefined ? ' ucn' : ''}" x="${w - 20}" y="${ry + 12}" text-anchor="end">${row.value}</text>` +
        `<rect class="ucb" x="20" y="${ry + 20}" width="${inner}" height="7" rx="3.5"/>` +
        (fill > 0 ? `<rect class="${hot ? 'uchot' : 'ucf'}" x="20" y="${ry + 20}" width="${fill.toFixed(1)}" height="7" rx="3.5"/>` : '') +
        `<text class="ucd" x="20" y="${ry + 42}">${row.detail}</text>`
      )
    })
    .join('')
  return (
    `<g transform="translate(${CARD_HOME.x + p.x} ${CARD_HOME.y + p.y})${p.s === 1 ? '' : ` scale(${Math.round(p.s * 1000) / 1000})`}"><rect class="ucp" width="${w}" height="${h}" rx="14"/>` +
    `<rect class="uct" x="${w / 2 - 36}" y="-10" width="72" height="22" rx="3" transform="rotate(-3 ${w / 2} 0)"/>` +
    `<text class="uch" x="20" y="32">USAGE</text>${body}</g>`
  )
}

/** The whole scene for this moment: where things sit, whether a turn is running, the usage rows. */
export function buildScene(args: { rows: CardRow[]; layout: Layout; isWorking: boolean; now: number }): string {
  const { rows, layout, isWorking, now } = args
  const mood = isWorking ? 'working' : 'idle'
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice">` +
    `<style>${STYLE}${phase(now, mood)}</style>` +
    `<g class="${mood}">` +
    GROUND +
    `<g transform="${placed(layout.girl, FEET)}"><g class="girl"><g transform="${TRACE}">${GIRL}</g>${LIDS}${SPARKS}</g></g>` +
    `<g transform="${placed(layout.clawd, BOOKS_FOOT)}"><g transform="${TRACE}">${BOOKS}</g>${CLAWD}</g>` +
    card(rows, layout.card) +
    '</g></svg>'
  )
}
