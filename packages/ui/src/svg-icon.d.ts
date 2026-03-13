declare module '*.svg?icon' {
  import type { Component, VNode } from 'vue-demi'

  // Icon render functions accept optional (h, isVue2) for cross-version rendering.
  // The intersection with Component allows usage in component registrations.
  type IconFn = ((h?: unknown, isVue2?: boolean) => VNode) & Component
  const icon: IconFn
  export default icon
}
