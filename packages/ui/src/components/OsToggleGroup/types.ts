/** One choice of an OsToggleGroup. */
export interface ToggleGroupOption {
  /** What `select` reports, and what the group's `value` names. */
  value: string
  /** The text on the button. */
  label: string
  /** Not pickable. */
  disabled?: boolean
  /** Shown on hover — on a disabled option, say why. */
  title?: string
  /** Something elsewhere on the page points at this option. */
  highlighted?: boolean
  /** Further attributes for the option's button, e.g. a test id. */
  attrs?: Record<string, string>
}

/** Whether moving with the arrow keys also picks (`auto`) or only focuses (`manual`). */
export type ToggleGroupActivation = 'auto' | 'manual'
