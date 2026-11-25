/** One rate-limit window as the engine reported it. */
export type UsageWindow = { kind: string; percentUsed: number; resetsAt?: string }

/** The latest usage figures the card and the pane draw. */
export type UsageSnapshot = {
  contextPercent?: number
  contextTokens?: number
  /** The model's whole window. */
  contextWindow?: number
  /** The auto-compact window the engine measures context against, when it reported one. */
  compactWindow?: number
  windows: UsageWindow[]
}

/**
 * Where a figure stands: how far it moved from its first place, in scene units
 * (the scene is 1672 by 941, y grows downward), and its size, 1 being as drawn.
 */
export type Place = { x: number; y: number; s: number }

/** Which figure the layout pane adjusts. */
export type LayoutItem = 'card' | 'girl' | 'clawd'

/** Where the person placed the usage card, the girl, and Clawd with his book stack. */
export type Layout = { card: Place; girl: Place; clawd: Place }

declare module 'claude-code' {
  interface PluginState {
    'clawd-library': {
      usage: Shaped<UsageSnapshot>
      layout: Shaped<Layout>
      isWorking: Shaped<boolean>
      layoutTarget: Shaped<LayoutItem>
      layoutStep: Shaped<string>
      /** A context limit the person typed with /clawd-context, in tokens; 0 means detect it. */
      contextLimit: Shaped<number>
      /** Whether the sticker tray above the prompt is open. */
      stickersOpen: Shaped<boolean>
      /** Which page of stickers the tray shows, from 0. */
      stickerPage: Shaped<number>
    }
  }
}
