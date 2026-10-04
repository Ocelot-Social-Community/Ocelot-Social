import { ref } from 'vue'

import { OsIcon } from '#src/components/OsIcon'

import OsToggleGroup from './OsToggleGroup.vue'

import type { ToggleGroupActivation, ToggleGroupOption } from './types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

const meta: Meta<typeof OsToggleGroup> = {
  title: 'Components/OsToggleGroup',
  component: OsToggleGroup,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof OsToggleGroup>

const OPTIONS: ToggleGroupOption[] = [
  { value: 'public', label: 'Public' },
  { value: 'closed', label: 'Closed' },
  { value: 'hidden', label: 'Secret' },
]

/** A group that keeps its own value, the way a page would. */
const interactive = (options: ToggleGroupOption[], initial: string | null, testId: string) => ({
  components: { OsToggleGroup },
  setup() {
    const value = ref(initial)
    return { options, value, testId }
  },
  template: `
    <div :data-testid="testId">
      <OsToggleGroup :options="options" :value="value" label="Visibility" @select="value = $event" />
    </div>
  `,
})

interface PlaygroundArgs {
  activation: ToggleGroupActivation
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    activation: { control: 'select', options: ['auto', 'manual'] },
  },
  args: { activation: 'auto' },
  render: (args) => ({
    components: { OsToggleGroup },
    setup() {
      const value = ref<string | null>('public')
      return { args, options: OPTIONS, value }
    },
    template: `
      <OsToggleGroup
        :options="options"
        :value="value"
        :activation="args.activation"
        label="Visibility"
        @select="value = $event"
      />
    `,
  }),
}

export const Default: Story = {
  render: () => interactive(OPTIONS, 'public', 'default'),
}

export const NoneSelected: Story = {
  render: () => interactive(OPTIONS, null, 'none-selected'),
}

export const WithDisabled: Story = {
  render: () =>
    interactive(
      [
        OPTIONS[0],
        OPTIONS[1],
        { ...OPTIONS[2], disabled: true, title: 'You may not create these' },
      ],
      'public',
      'with-disabled',
    ),
}

export const Highlighted: Story = {
  render: () =>
    interactive(
      [OPTIONS[0], { ...OPTIONS[1], highlighted: true }, OPTIONS[2]],
      'public',
      'highlighted',
    ),
}

export const WithExtraContent: Story = {
  render: () => ({
    components: { OsToggleGroup, OsIcon },
    setup() {
      const value = ref('member')
      const options: ToggleGroupOption[] = [
        { value: 'guest', label: 'Guest' },
        { value: 'member', label: 'Member' },
        { value: 'owner', label: 'Owner' },
      ]
      return { options, value }
    },
    template: `
      <div data-testid="with-extra-content">
        <OsToggleGroup :options="options" :value="value" label="Role" @select="value = $event">
          <template #option="{ option }">
            <!-- An icon, not a text glyph: a character like a star is drawn from whatever fallback
                 font the machine has, and the screenshot then differs between machines. -->
            <OsIcon v-if="option.value === 'owner'" name="check" size="xs" aria-hidden="true" />
          </template>
        </OsToggleGroup>
      </div>
    `,
  }),
}
