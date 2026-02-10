/// <reference types="vite/client" />

declare module '@fontsource-variable/inter'

declare module '*.vue' {
  import type { DefineComponent } from 'vue-demi'

  const component: DefineComponent<object, object, unknown>
  export default component
}
