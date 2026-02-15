import _IconBars from './svgs/bars.svg?icon'
import _IconCheck from './svgs/check.svg?icon'
import _IconChevronDown from './svgs/chevron-down.svg?icon'
import _IconChevronUp from './svgs/chevron-up.svg?icon'
import _IconClose from './svgs/close.svg?icon'
import _IconCopy from './svgs/copy.svg?icon'
import _IconEyeSlash from './svgs/eye-slash.svg?icon'
import _IconEye from './svgs/eye.svg?icon'
import _IconPlus from './svgs/plus.svg?icon'
import _IconSearch from './svgs/search.svg?icon'
import _IconSpinner from './svgs/spinner.svg?icon'

import type { Component } from 'vue-demi'

export const IconBars = _IconBars
export const IconCheck = _IconCheck
export const IconChevronDown = _IconChevronDown
export const IconChevronUp = _IconChevronUp
export const IconClose = _IconClose
export const IconCopy = _IconCopy
export const IconEye = _IconEye
export const IconEyeSlash = _IconEyeSlash
export const IconPlus = _IconPlus
export const IconSearch = _IconSearch
export const IconSpinner = _IconSpinner

export const SYSTEM_ICONS: Record<string, Component> = {
  check: IconCheck,
  close: IconClose,
  plus: IconPlus,
}

export type SystemIconName = keyof typeof SYSTEM_ICONS
