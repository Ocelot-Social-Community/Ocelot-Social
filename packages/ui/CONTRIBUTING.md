# Contributing to @ocelot-social/ui

Thank you for contributing to the ocelot.social UI library!

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint
```

## Creating a New Component

### File Structure

```
src/components/
└── OsButton/
    ├── OsButton.vue       # Component
    ├── OsButton.spec.ts   # Tests
    └── index.ts           # Export
```

### Naming Convention

- All components use the `Os` prefix: `OsButton`, `OsCard`, `OsModal`
- Files use PascalCase: `OsButton.vue`

### Component Template

```vue
<script setup lang="ts">
import { computed } from 'vue-demi'

import type { Size, Variant } from '@/types'

interface Props {
  /** Button size */
  size?: Size
  /** Visual variant */
  variant?: Variant
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
})

const classes = computed(() => [
  'os-button',
  `os-button--${props.size}`,
  `os-button--${props.variant}`,
])
</script>

<template>
  <button :class="classes">
    <slot />
  </button>
</template>
```

## Code Standards

### TypeScript

- `strict: true` is enabled
- All props must be typed
- Use JSDoc comments for documentation

### Props

Use the complete Tailwind-based scales:

| Prop | Values |
|------|--------|
| `size` | `xs`, `sm`, `md`, `lg`, `xl`, `2xl` |
| `rounded` | `none`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full` |
| `shadow` | `none`, `sm`, `md`, `lg`, `xl`, `2xl` |
| `variant` | `primary`, `secondary`, `danger`, `warning`, `success`, `info` |

### Styling

- Use CSS Custom Properties (no hardcoded colors)
- Use Tailwind utility classes
- Dark mode via `dark:` prefix

```vue
<template>
  <button class="bg-[--button-primary-bg] dark:bg-[--button-primary-bg-dark]">
    <slot />
  </button>
</template>
```

### Vue 2/3 Compatibility

Always import from `vue-demi`, not `vue`:

```typescript
// Correct
import { ref, computed } from 'vue-demi'

// Wrong
import { ref, computed } from 'vue'
```

## Testing

### Requirements

- **100% code coverage** is required
- Tests must pass for both Vue 2.7 and Vue 3

### Writing Tests

```typescript
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsButton from './OsButton.vue'

describe('OsButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(OsButton, {
      slots: { default: 'Click me' },
    })
    expect(wrapper.text()).toBe('Click me')
  })

  it('applies size class', () => {
    const wrapper = mount(OsButton, {
      props: { size: 'lg' },
    })
    expect(wrapper.classes()).toContain('os-button--lg')
  })
})
```

### Running Tests

```bash
# Run once
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) for automatic releases:

```bash
# Features (minor version bump)
feat(button): add loading state

# Bug fixes (patch version bump)
fix(modal): correct focus trap behavior

# Breaking changes (major version bump)
feat(input)!: rename value prop to modelValue

# Other types
docs: update README
test: add button accessibility tests
chore: update dependencies
refactor: simplify dropdown logic
```

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] 100% code coverage maintained
- [ ] New components have Histoire stories
- [ ] Props have JSDoc documentation
- [ ] Commit messages follow Conventional Commits

## Example Apps

Test your changes in the example apps:

```bash
# Vue 3 + Tailwind
cd examples/vue3-tailwind && npm install && npm run dev

# Vue 3 + CSS
cd examples/vue3-css && npm install && npm run dev

# Vue 2 + Tailwind
cd examples/vue2-tailwind && npm install && npm run dev

# Vue 2 + CSS
cd examples/vue2-css && npm install && npm run dev
```

## Questions?

- Check the [main CONTRIBUTING.md](../../CONTRIBUTING.md) for general guidelines
- Join the [Discord](https://discord.gg/AJSX9DCSUA) for questions
- Open an issue for bugs or feature requests
