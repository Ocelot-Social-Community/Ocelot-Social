import { computed } from 'vue'

import { IconCheck, IconClose, IconPlus } from '#src/components/OsIcon'

import OsButton from './OsButton.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

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

const iconMap: Record<string, (() => unknown) | null> = {
  none: null,
  check: IconCheck,
  close: IconClose,
  plus: IconPlus,
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
    components: { OsButton, IconCheck, IconPlus, IconClose },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton variant="primary">
          <template #icon><IconCheck /></template>
          Save
        </OsButton>
        <OsButton variant="success">
          <template #icon><IconCheck /></template>
          Confirm
        </OsButton>
        <OsButton variant="default">
          <template #icon><IconPlus /></template>
          Add
        </OsButton>
        <OsButton variant="danger">
          <template #icon><IconClose /></template>
          Delete
        </OsButton>
        <OsButton variant="info">
          <template #icon><IconPlus /></template>
          Create
        </OsButton>
      </div>
    `,
  }),
}

export const IconOnly: Story = {
  render: () => ({
    components: { OsButton, IconClose, IconPlus, IconCheck },
    template: `
      <div class="flex flex-wrap gap-2">
        <OsButton variant="danger" aria-label="Close">
          <template #icon><IconClose /></template>
        </OsButton>
        <OsButton variant="primary" aria-label="Add">
          <template #icon><IconPlus /></template>
        </OsButton>
        <OsButton variant="success" aria-label="Confirm">
          <template #icon><IconCheck /></template>
        </OsButton>
        <OsButton variant="default" aria-label="Close" appearance="outline">
          <template #icon><IconClose /></template>
        </OsButton>
        <OsButton variant="primary" aria-label="Add" appearance="ghost">
          <template #icon><IconPlus /></template>
        </OsButton>
      </div>
    `,
  }),
}

export const IconSizes: Story = {
  render: () => ({
    components: { OsButton, IconCheck },
    template: `
      <div class="flex flex-wrap gap-2 items-center">
        <OsButton size="sm" variant="primary">
          <template #icon><IconCheck /></template>
          Small
        </OsButton>
        <OsButton size="md" variant="primary">
          <template #icon><IconCheck /></template>
          Medium
        </OsButton>
        <OsButton size="lg" variant="primary">
          <template #icon><IconCheck /></template>
          Large
        </OsButton>
        <OsButton size="xl" variant="primary">
          <template #icon><IconCheck /></template>
          Extra Large
        </OsButton>
      </div>
    `,
  }),
}

export const IconAppearances: Story = {
  render: () => ({
    components: { OsButton, IconCheck },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Filled</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="filled" variant="primary">
              <template #icon><IconCheck /></template>
              Primary
            </OsButton>
            <OsButton appearance="filled" variant="danger">
              <template #icon><IconCheck /></template>
              Danger
            </OsButton>
            <OsButton appearance="filled" variant="success">
              <template #icon><IconCheck /></template>
              Success
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Outline</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="outline" variant="primary">
              <template #icon><IconCheck /></template>
              Primary
            </OsButton>
            <OsButton appearance="outline" variant="danger">
              <template #icon><IconCheck /></template>
              Danger
            </OsButton>
            <OsButton appearance="outline" variant="success">
              <template #icon><IconCheck /></template>
              Success
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Ghost</h3>
          <div class="flex flex-wrap gap-2">
            <OsButton appearance="ghost" variant="primary">
              <template #icon><IconCheck /></template>
              Primary
            </OsButton>
            <OsButton appearance="ghost" variant="danger">
              <template #icon><IconCheck /></template>
              Danger
            </OsButton>
            <OsButton appearance="ghost" variant="success">
              <template #icon><IconCheck /></template>
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
    components: { OsButton, IconPlus, IconClose, IconCheck },
    template: `
      <div class="flex flex-wrap gap-2 items-center">
        <OsButton circle variant="default" aria-label="Add">
          <template #icon><IconPlus /></template>
        </OsButton>
        <OsButton circle variant="primary" aria-label="Add">
          <template #icon><IconPlus /></template>
        </OsButton>
        <OsButton circle variant="secondary" aria-label="Confirm">
          <template #icon><IconCheck /></template>
        </OsButton>
        <OsButton circle variant="danger" aria-label="Close">
          <template #icon><IconClose /></template>
        </OsButton>
        <OsButton circle variant="warning" aria-label="Close">
          <template #icon><IconClose /></template>
        </OsButton>
        <OsButton circle variant="success" aria-label="Confirm">
          <template #icon><IconCheck /></template>
        </OsButton>
        <OsButton circle variant="info" aria-label="Add">
          <template #icon><IconPlus /></template>
        </OsButton>
      </div>
    `,
  }),
}

export const CircleSizes: Story = {
  render: () => ({
    components: { OsButton, IconPlus },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Small (26px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle size="sm" variant="primary" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle size="sm" variant="danger" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle size="sm" variant="default" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Medium (36px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle size="md" variant="primary" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle size="md" variant="danger" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle size="md" variant="default" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Large (48px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle size="lg" variant="primary" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle size="lg" variant="danger" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle size="lg" variant="default" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Extra Large (56px)</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle size="xl" variant="primary" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle size="xl" variant="danger" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle size="xl" variant="default" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const CircleAppearances: Story = {
  render: () => ({
    components: { OsButton, IconPlus, IconClose, IconCheck },
    template: `
      <div class="flex flex-col gap-4">
        <div>
          <h3 class="text-sm font-bold mb-2">Filled</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle appearance="filled" variant="primary" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle appearance="filled" variant="danger" aria-label="Close">
              <template #icon><IconClose /></template>
            </OsButton>
            <OsButton circle appearance="filled" variant="success" aria-label="Confirm">
              <template #icon><IconCheck /></template>
            </OsButton>
            <OsButton circle appearance="filled" variant="default" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Outline</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle appearance="outline" variant="primary" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle appearance="outline" variant="danger" aria-label="Close">
              <template #icon><IconClose /></template>
            </OsButton>
            <OsButton circle appearance="outline" variant="success" aria-label="Confirm">
              <template #icon><IconCheck /></template>
            </OsButton>
            <OsButton circle appearance="outline" variant="default" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold mb-2">Ghost</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <OsButton circle appearance="ghost" variant="primary" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
            <OsButton circle appearance="ghost" variant="danger" aria-label="Close">
              <template #icon><IconClose /></template>
            </OsButton>
            <OsButton circle appearance="ghost" variant="success" aria-label="Confirm">
              <template #icon><IconCheck /></template>
            </OsButton>
            <OsButton circle appearance="ghost" variant="default" aria-label="Add">
              <template #icon><IconPlus /></template>
            </OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}

export const Polymorphic: Story = {
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
    components: { OsButton, IconCheck },
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
              <template #icon><IconCheck /></template>
              Save
            </OsButton>
            <OsButton loading variant="danger">Delete</OsButton>
            <OsButton loading circle variant="primary" aria-label="Loading">
              <template #icon><IconCheck /></template>
            </OsButton>
          </div>
        </div>
      </div>
    `,
  }),
}
