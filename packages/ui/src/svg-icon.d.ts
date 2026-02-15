declare module '*.svg?icon' {
  import type { VNode } from 'vue-demi'

  const icon: () => VNode
  export default icon
}
