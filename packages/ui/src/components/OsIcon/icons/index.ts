import _IconCheck from './svgs/check.svg?icon'
import _IconClose from './svgs/close.svg?icon'
import _IconPlus from './svgs/plus.svg?icon'

import type { Component } from 'vue-demi'

export const IconCheck = _IconCheck
export const IconClose = _IconClose
export const IconPlus = _IconPlus

export const SYSTEM_ICONS = {
  check: IconCheck,
  close: IconClose,
  plus: IconPlus,
} as const satisfies Record<string, Component>

export type SystemIconName = keyof typeof SYSTEM_ICONS
