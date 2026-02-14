import { IconBars } from './bars'
import { IconCheck } from './check'
import { IconChevronDown } from './chevron-down'
import { IconChevronUp } from './chevron-up'
import { IconClose } from './close'
import { IconCopy } from './copy'
import { IconEye } from './eye'
import { IconEyeSlash } from './eye-slash'
import { IconSearch } from './search'
import { IconSpinner } from './spinner'

import type { Component } from 'vue-demi'

export { IconBars } from './bars'
export { IconCheck } from './check'
export { IconChevronDown } from './chevron-down'
export { IconChevronUp } from './chevron-up'
export { IconClose } from './close'
export { IconCopy } from './copy'
export { IconEye } from './eye'
export { IconEyeSlash } from './eye-slash'
export { IconSearch } from './search'
export { IconSpinner } from './spinner'

export const SYSTEM_ICONS: Record<string, Component> = {
  bars: IconBars,
  check: IconCheck,
  'chevron-down': IconChevronDown,
  'chevron-up': IconChevronUp,
  close: IconClose,
  copy: IconCopy,
  eye: IconEye,
  'eye-slash': IconEyeSlash,
  search: IconSearch,
  spinner: IconSpinner,
}

export type SystemIconName = keyof typeof SYSTEM_ICONS
