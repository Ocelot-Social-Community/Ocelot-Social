import { IconCheck } from './check'
import { IconClose } from './close'
import { IconPlus } from './plus'

import type { Component } from 'vue-demi'

export { IconBars } from './bars'
export { IconCheck } from './check'
export { IconChevronDown } from './chevron-down'
export { IconChevronUp } from './chevron-up'
export { IconClose } from './close'
export { IconCopy } from './copy'
export { IconEye } from './eye'
export { IconEyeSlash } from './eye-slash'
export { IconPlus } from './plus'
export { IconSearch } from './search'
export { IconSpinner } from './spinner'

export const SYSTEM_ICONS: Record<string, Component> = {
  check: IconCheck,
  close: IconClose,
  plus: IconPlus,
}

export type SystemIconName = keyof typeof SYSTEM_ICONS
