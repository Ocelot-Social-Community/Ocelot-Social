import { computed, h } from 'vue'

import OsButton from './OsButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

/**
 * Inline SVG icons for demo purposes (from Heroicons).
 * In real usage, the webapp passes its own BaseIcon component.
 */
const CheckIcon = () =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor' }, [
    h('path', {
      'fill-rule': 'evenodd',
      d: 'M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z',
      'clip-rule': 'evenodd',
    }),
  ])

const CloseIcon = () =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor' }, [
    h('path', {
      d: 'M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z',
    }),
  ])

const PlusIcon = () =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor' }, [
    h('path', {
      d: 'M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z',
    }),
  ])

const meta: Meta<typeof OsButton> = {
  title: 'Components/OsButton',
  component: OsButton,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsButton>

/** Custom args for Playground (icon selector + label are not real component props) */
interface PlaygroundArgs {
  as: string
  variant: string
  appearance: string
  size: string
  fullWidth: boolean
  circle: boolean
  disabled: boolean
  loading: boolean
  icon: string
  label: string
}

const iconMap: Record<string, (() => ReturnType<typeof h>) | null> = {
  none: null,
  check: CheckIcon,
  close: CloseIcon,
  plus: PlusIcon,
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    as: {
      control: 'select',
      options: ['button', 'a'],
    },
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'danger', 'warning', 'success', 'info'],
    },
    appearance: {
      control: 'select',
      options: ['filled', 'outline', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    fullWidth: {
      control: 'boolean',
    },
    circle: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    icon: {
      control: 'select',
      options: Object.keys(iconMap),
    },
    label: {
      control: 'text',
    },
  },
  args: {
    as: 'button',
    variant: 'primary',
    appearance: 'filled',
    size: 'md',
    fullWidth: false,
    circle: false,
    disabled: false,
    loading: false,
    icon: 'none',
    label: 'Button',
  },
  render: (args) => ({
    components: { OsButton },
    setup() {
      const buttonProps = computed(() => {
        const { icon: _icon, label: _label, ...rest } = args
        return rest
      })
      const IconComponent = computed(() => iconMap[args.icon] ?? null)
      const label = computed(() => args.label)
      return { buttonProps, IconComponent, label }
    },
    template: `
      <OsButton v-bind="buttonProps" :href="buttonProps.as === 'a' ? '#' : undefined">
        <template v-if="IconComponent" #icon><component :is="IconComponent" /></template>
        {{ label }}
      </OsButton>
    `,
  }),
}

export const AllVariants: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton variant="default">Default</OsButton>
        <OsButton variant="primary">Primary</OsButton>
        <OsButton variant="secondary">Secondary</OsButton>
        <OsButton variant="danger">Danger</OsButton>
        <OsButton variant="warning">Warning</OsButton>
        <OsButton variant="success">Success</OsButton>
        <OsButton variant="info">Info</OsButton>
      </div>
    `,
  }),
}

export const AllSizes: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Small (26px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton size="sm" variant="default">Default</OsButton>
            <OsButton size="sm" variant="primary">Primary</OsButton>
            <OsButton size="sm" variant="secondary">Secondary</OsButton>
            <OsButton size="sm" variant="danger">Danger</OsButton>
            <OsButton size="sm" variant="warning">Warning</OsButton>
            <OsButton size="sm" variant="success">Success</OsButton>
            <OsButton size="sm" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Medium (36px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton size="md" variant="default">Default</OsButton>
            <OsButton size="md" variant="primary">Primary</OsButton>
            <OsButton size="md" variant="secondary">Secondary</OsButton>
            <OsButton size="md" variant="danger">Danger</OsButton>
            <OsButton size="md" variant="warning">Warning</OsButton>
            <OsButton size="md" variant="success">Success</OsButton>
            <OsButton size="md" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Large</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton size="lg" variant="default">Default</OsButton>
            <OsButton size="lg" variant="primary">Primary</OsButton>
            <OsButton size="lg" variant="secondary">Secondary</OsButton>
            <OsButton size="lg" variant="danger">Danger</OsButton>
            <OsButton size="lg" variant="warning">Warning</OsButton>
            <OsButton size="lg" variant="success">Success</OsButton>
            <OsButton size="lg" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Extra Large</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton size="xl" variant="default">Default</OsButton>
            <OsButton size="xl" variant="primary">Primary</OsButton>
            <OsButton size="xl" variant="secondary">Secondary</OsButton>
            <OsButton size="xl" variant="danger">Danger</OsButton>
            <OsButton size="xl" variant="warning">Warning</OsButton>
            <OsButton size="xl" variant="success">Success</OsButton>
            <OsButton size="xl" variant="info">Info</OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const AllAppearances: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Filled (default)</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="filled" variant="default">Default</OsButton>
            <OsButton appearance="filled" variant="primary">Primary</OsButton>
            <OsButton appearance="filled" variant="secondary">Secondary</OsButton>
            <OsButton appearance="filled" variant="danger">Danger</OsButton>
            <OsButton appearance="filled" variant="warning">Warning</OsButton>
            <OsButton appearance="filled" variant="success">Success</OsButton>
            <OsButton appearance="filled" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Outline</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="outline" variant="default">Default</OsButton>
            <OsButton appearance="outline" variant="primary">Primary</OsButton>
            <OsButton appearance="outline" variant="secondary">Secondary</OsButton>
            <OsButton appearance="outline" variant="danger">Danger</OsButton>
            <OsButton appearance="outline" variant="warning">Warning</OsButton>
            <OsButton appearance="outline" variant="success">Success</OsButton>
            <OsButton appearance="outline" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Ghost</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="ghost" variant="default">Default</OsButton>
            <OsButton appearance="ghost" variant="primary">Primary</OsButton>
            <OsButton appearance="ghost" variant="secondary">Secondary</OsButton>
            <OsButton appearance="ghost" variant="danger">Danger</OsButton>
            <OsButton appearance="ghost" variant="warning">Warning</OsButton>
            <OsButton appearance="ghost" variant="success">Success</OsButton>
            <OsButton appearance="ghost" variant="info">Info</OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const AppearanceFilled: Story = {
  name: 'Appearance: Filled',
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton appearance="filled" variant="default">Default</OsButton>
        <OsButton appearance="filled" variant="primary">Primary</OsButton>
        <OsButton appearance="filled" variant="secondary">Secondary</OsButton>
        <OsButton appearance="filled" variant="danger">Danger</OsButton>
        <OsButton appearance="filled" variant="warning">Warning</OsButton>
        <OsButton appearance="filled" variant="success">Success</OsButton>
        <OsButton appearance="filled" variant="info">Info</OsButton>
      </div>
    `,
  }),
}

export const AppearanceOutline: Story = {
  name: 'Appearance: Outline',
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton appearance="outline" variant="default">Default</OsButton>
        <OsButton appearance="outline" variant="primary">Primary</OsButton>
        <OsButton appearance="outline" variant="secondary">Secondary</OsButton>
        <OsButton appearance="outline" variant="danger">Danger</OsButton>
        <OsButton appearance="outline" variant="warning">Warning</OsButton>
        <OsButton appearance="outline" variant="success">Success</OsButton>
        <OsButton appearance="outline" variant="info">Info</OsButton>
      </div>
    `,
  }),
}

export const AppearanceGhost: Story = {
  name: 'Appearance: Ghost',
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton appearance="ghost" variant="default">Default</OsButton>
        <OsButton appearance="ghost" variant="primary">Primary</OsButton>
        <OsButton appearance="ghost" variant="secondary">Secondary</OsButton>
        <OsButton appearance="ghost" variant="danger">Danger</OsButton>
        <OsButton appearance="ghost" variant="warning">Warning</OsButton>
        <OsButton appearance="ghost" variant="success">Success</OsButton>
        <OsButton appearance="ghost" variant="info">Info</OsButton>
      </div>
    `,
  }),
}

export const Disabled: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Filled</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton disabled appearance="filled" variant="default">Default</OsButton>
            <OsButton disabled appearance="filled" variant="primary">Primary</OsButton>
            <OsButton disabled appearance="filled" variant="secondary">Secondary</OsButton>
            <OsButton disabled appearance="filled" variant="danger">Danger</OsButton>
            <OsButton disabled appearance="filled" variant="warning">Warning</OsButton>
            <OsButton disabled appearance="filled" variant="success">Success</OsButton>
            <OsButton disabled appearance="filled" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Outline</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton disabled appearance="outline" variant="default">Default</OsButton>
            <OsButton disabled appearance="outline" variant="primary">Primary</OsButton>
            <OsButton disabled appearance="outline" variant="secondary">Secondary</OsButton>
            <OsButton disabled appearance="outline" variant="danger">Danger</OsButton>
            <OsButton disabled appearance="outline" variant="warning">Warning</OsButton>
            <OsButton disabled appearance="outline" variant="success">Success</OsButton>
            <OsButton disabled appearance="outline" variant="info">Info</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Ghost</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton disabled appearance="ghost" variant="default">Default</OsButton>
            <OsButton disabled appearance="ghost" variant="primary">Primary</OsButton>
            <OsButton disabled appearance="ghost" variant="secondary">Secondary</OsButton>
            <OsButton disabled appearance="ghost" variant="danger">Danger</OsButton>
            <OsButton disabled appearance="ghost" variant="warning">Warning</OsButton>
            <OsButton disabled appearance="ghost" variant="success">Success</OsButton>
            <OsButton disabled appearance="ghost" variant="info">Info</OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const FullWidth: Story = {
  render: () => ({
    components: { OsButton },
    template: `
      <div class="flex flex-col gap-2">
        <OsButton fullWidth variant="default">Default</OsButton>
        <OsButton fullWidth variant="primary">Primary</OsButton>
        <OsButton fullWidth variant="secondary">Secondary</OsButton>
        <OsButton fullWidth variant="danger">Danger</OsButton>
        <OsButton fullWidth variant="warning">Warning</OsButton>
        <OsButton fullWidth variant="success">Success</OsButton>
        <OsButton fullWidth variant="info">Info</OsButton>
      </div>
    `,
  }),
}

export const Icon: Story = {
  render: () => ({
    components: { OsButton, CheckIcon, PlusIcon, CloseIcon },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton variant="primary">
          <template #icon><CheckIcon /></template>
          Save
        </OsButton>
        <OsButton variant="success">
          <template #icon><CheckIcon /></template>
          Confirm
        </OsButton>
        <OsButton variant="default">
          <template #icon><PlusIcon /></template>
          Add
        </OsButton>
        <OsButton variant="danger">
          <template #icon><CloseIcon /></template>
          Delete
        </OsButton>
        <OsButton variant="info">
          <template #icon><PlusIcon /></template>
          Create
        </OsButton>
      </div>
    `,
  }),
}

export const IconOnly: Story = {
  render: () => ({
    components: { OsButton, CloseIcon, PlusIcon, CheckIcon },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton variant="danger" aria-label="Close">
          <template #icon><CloseIcon /></template>
        </OsButton>
        <OsButton variant="primary" aria-label="Add">
          <template #icon><PlusIcon /></template>
        </OsButton>
        <OsButton variant="success" aria-label="Confirm">
          <template #icon><CheckIcon /></template>
        </OsButton>
        <OsButton variant="default" aria-label="Close" appearance="outline">
          <template #icon><CloseIcon /></template>
        </OsButton>
        <OsButton variant="primary" aria-label="Add" appearance="ghost">
          <template #icon><PlusIcon /></template>
        </OsButton>
      </div>
    `,
  }),
}

export const IconSizes: Story = {
  render: () => ({
    components: { OsButton, CheckIcon },
    template: `
      <div class="flex flex-wrap gap-2 items-center">
        <OsButton size="sm" variant="primary">
          <template #icon><CheckIcon /></template>
          Small
        </OsButton>
        <OsButton size="md" variant="primary">
          <template #icon><CheckIcon /></template>
          Medium
        </OsButton>
        <OsButton size="lg" variant="primary">
          <template #icon><CheckIcon /></template>
          Large
        </OsButton>
        <OsButton size="xl" variant="primary">
          <template #icon><CheckIcon /></template>
          Extra Large
        </OsButton>
      </div>
    `,
  }),
}

export const IconAppearances: Story = {
  render: () => ({
    components: { OsButton, CheckIcon },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Filled</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="filled" variant="primary">
              <template #icon><CheckIcon /></template>
              Primary
            </OsButton>
            <OsButton appearance="filled" variant="danger">
              <template #icon><CheckIcon /></template>
              Danger
            </OsButton>
            <OsButton appearance="filled" variant="success">
              <template #icon><CheckIcon /></template>
              Success
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Outline</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="outline" variant="primary">
              <template #icon><CheckIcon /></template>
              Primary
            </OsButton>
            <OsButton appearance="outline" variant="danger">
              <template #icon><CheckIcon /></template>
              Danger
            </OsButton>
            <OsButton appearance="outline" variant="success">
              <template #icon><CheckIcon /></template>
              Success
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Ghost</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="ghost" variant="primary">
              <template #icon><CheckIcon /></template>
              Primary
            </OsButton>
            <OsButton appearance="ghost" variant="danger">
              <template #icon><CheckIcon /></template>
              Danger
            </OsButton>
            <OsButton appearance="ghost" variant="success">
              <template #icon><CheckIcon /></template>
              Success
            </OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const Circle: Story = {
  render: () => ({
    components: { OsButton, PlusIcon, CloseIcon, CheckIcon },
    template: `
      <div class="flex flex-wrap gap-2 items-center">
        <OsButton circle variant="default" aria-label="Add">
          <template #icon><PlusIcon /></template>
        </OsButton>
        <OsButton circle variant="primary" aria-label="Add">
          <template #icon><PlusIcon /></template>
        </OsButton>
        <OsButton circle variant="secondary" aria-label="Confirm">
          <template #icon><CheckIcon /></template>
        </OsButton>
        <OsButton circle variant="danger" aria-label="Close">
          <template #icon><CloseIcon /></template>
        </OsButton>
        <OsButton circle variant="warning" aria-label="Close">
          <template #icon><CloseIcon /></template>
        </OsButton>
        <OsButton circle variant="success" aria-label="Confirm">
          <template #icon><CheckIcon /></template>
        </OsButton>
        <OsButton circle variant="info" aria-label="Add">
          <template #icon><PlusIcon /></template>
        </OsButton>
      </div>
    `,
  }),
}

export const CircleSizes: Story = {
  render: () => ({
    components: { OsButton, PlusIcon },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Small (26px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle size="sm" variant="primary" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle size="sm" variant="danger" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle size="sm" variant="default" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Medium (36px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle size="md" variant="primary" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle size="md" variant="danger" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle size="md" variant="default" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Large (48px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle size="lg" variant="primary" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle size="lg" variant="danger" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle size="lg" variant="default" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Extra Large (56px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle size="xl" variant="primary" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle size="xl" variant="danger" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle size="xl" variant="default" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const CircleAppearances: Story = {
  render: () => ({
    components: { OsButton, PlusIcon, CloseIcon, CheckIcon },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Filled</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle appearance="filled" variant="primary" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle appearance="filled" variant="danger" aria-label="Close">
              <template #icon><CloseIcon /></template>
            </OsButton>
            <OsButton circle appearance="filled" variant="success" aria-label="Confirm">
              <template #icon><CheckIcon /></template>
            </OsButton>
            <OsButton circle appearance="filled" variant="default" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Outline</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle appearance="outline" variant="primary" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle appearance="outline" variant="danger" aria-label="Close">
              <template #icon><CloseIcon /></template>
            </OsButton>
            <OsButton circle appearance="outline" variant="success" aria-label="Confirm">
              <template #icon><CheckIcon /></template>
            </OsButton>
            <OsButton circle appearance="outline" variant="default" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Ghost</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle appearance="ghost" variant="primary" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
            <OsButton circle appearance="ghost" variant="danger" aria-label="Close">
              <template #icon><CloseIcon /></template>
            </OsButton>
            <OsButton circle appearance="ghost" variant="success" aria-label="Confirm">
              <template #icon><CheckIcon /></template>
            </OsButton>
            <OsButton circle appearance="ghost" variant="default" aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const AsLink: Story = {
  name: 'As Link',
  render: () => ({
    components: { OsButton, CheckIcon, PlusIcon },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">as="a" (anchor element)</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton as="a" href="#" variant="primary">Primary Link</OsButton>
            <OsButton as="a" href="#" variant="primary" appearance="outline">Outline Link</OsButton>
            <OsButton as="a" href="#" variant="primary" appearance="ghost">Ghost Link</OsButton>
            <OsButton as="a" href="#" variant="danger">Danger Link</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">as="a" with icon</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton as="a" href="#" variant="primary">
              <template #icon><CheckIcon /></template>
              Save
            </OsButton>
            <OsButton as="a" href="#" variant="success" circle aria-label="Add">
              <template #icon><PlusIcon /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">as="a" disabled</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton as="a" href="#" variant="primary" disabled>Disabled Link</OsButton>
            <OsButton as="a" href="#" variant="primary" appearance="outline" disabled>Disabled Outline</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">as="button" (default)</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton variant="primary">Button (default)</OsButton>
            <OsButton as="button" variant="primary">Button (explicit)</OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const Loading: Story = {
  render: () => ({
    components: { OsButton, CheckIcon },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Filled</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton loading appearance="filled" variant="default">Default</OsButton>
            <OsButton loading appearance="filled" variant="primary">Primary</OsButton>
            <OsButton loading appearance="filled" variant="danger">Danger</OsButton>
            <OsButton loading appearance="filled" variant="success">Success</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Outline</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton loading appearance="outline" variant="default">Default</OsButton>
            <OsButton loading appearance="outline" variant="primary">Primary</OsButton>
            <OsButton loading appearance="outline" variant="danger">Danger</OsButton>
            <OsButton loading appearance="outline" variant="success">Success</OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">With Icon</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton loading variant="primary">
              <template #icon><CheckIcon /></template>
              Save
            </OsButton>
            <OsButton loading variant="danger">Delete</OsButton>
            <OsButton loading circle variant="primary" aria-label="Loading">
              <template #icon><CheckIcon /></template>
            </OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}
