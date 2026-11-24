import { storiesOf } from '@storybook/vue'
import GroupStateCard from '~/components/Group/GroupStateCard.vue'
import helpers from '~/storybook/helpers'
import { iconRegistry } from '~/utils/iconRegistry'

helpers.init()

storiesOf('GroupStateCard', module)
  .addDecorator(helpers.layout)
  // A row of template cards as the create form offers them: one picked, one that can be picked,
  // and one the viewer may not create — dimmed, dashed and saying so before it is clicked (#11084).
  .add('template cards', () => ({
    components: { GroupStateCard },
    data: () => ({ icons: iconRegistry }),
    template: `
      <ul style="display: grid; grid-auto-flow: column; gap: 8px; list-style: none; padding: 0">
        <li>
          <group-state-card tag="button" type="button" :icon="icons.globe" active aria-disabled="false">
            <template #title>{{ $t('group.types.public') }}</template>
          </group-state-card>
        </li>
        <li>
          <group-state-card tag="button" type="button" :icon="icons.lock" aria-disabled="false">
            <template #title>{{ $t('group.types.closed') }}</template>
          </group-state-card>
        </li>
        <li>
          <group-state-card tag="button" type="button" :icon="icons.eyeSlash" aria-disabled="true">
            <template #title>{{ $t('group.types.hidden') }}</template>
            {{ $t('group.templateRefused') }}
          </group-state-card>
        </li>
      </ul>`,
  }))
