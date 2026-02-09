# @ocelot-social/ui

Vue component library for ocelot.social - works with Vue 2.7+ and Vue 3.

## Installation

```bash
npm install @ocelot-social/ui
```

## Usage

### Option 1: Individual Imports (recommended)

Import only the components you need. This enables tree-shaking for smaller bundle sizes.

```ts
import { OsButton } from '@ocelot-social/ui'
```

```vue
<template>
  <OsButton variant="primary">Click me</OsButton>
</template>

<script setup>
import { OsButton } from '@ocelot-social/ui'
</script>
```

### Option 2: Global Registration

Register all components globally via the Vue plugin. No tree-shaking - all components are included in the bundle.

```ts
// main.ts
import { createApp } from 'vue'
import { OcelotUI } from '@ocelot-social/ui'
import App from './App.vue'

const app = createApp(App)
app.use(OcelotUI)
app.mount('#app')
```

Components are then available globally without imports:

```vue
<template>
  <OsButton variant="primary">Click me</OsButton>
</template>
```

## Vue 2.7 Support

This library uses [vue-demi](https://github.com/vueuse/vue-demi) for Vue 2/3 compatibility.

```ts
// Vue 2.7
import Vue from 'vue'
import { OcelotUI } from '@ocelot-social/ui'

Vue.use(OcelotUI)
```
