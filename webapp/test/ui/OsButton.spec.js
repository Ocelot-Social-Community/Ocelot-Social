import { mount } from '@vue/test-utils'
import { OsButton } from '@ocelot-social/ui'

const localVue = global.localVue

// The Vue 2 half of packages/ui's OsButton tests: Vue 2 marks a comment with a flag rather than a
// type, and its template compiler keeps the line breaks between two elements as text. A slot whose
// every `v-if` is false then hands back a comment, a blank text node and another comment — which
// is not content, so no wrapper and no gap may render around it.
describe('OsButton in Vue 2, given slots that show nothing', () => {
  const Button = (slots) =>
    mount(
      {
        components: { OsButton },
        data: () => ({ shown: false }),
        template: `<os-button>${slots}</os-button>`,
      },
      { localVue },
    )

  it('renders no suffix wrapper', () => {
    const wrapper = Button(`Role
      <template #suffix>
        <span v-if="shown" class="lock" />
        <span v-if="shown" class="dot" />
      </template>`)

    expect(wrapper.find('.os-button__suffix').exists()).toBe(false)
  })

  it('renders no icon wrapper', () => {
    const wrapper = Button(`Save
      <template #icon>
        <span v-if="shown" class="icon" />
      </template>`)

    expect(wrapper.find('.os-button__icon').exists()).toBe(false)
  })

  it('renders the wrapper as soon as something shows', async () => {
    const wrapper = Button(`Role
      <template #suffix>
        <span v-if="shown" class="lock" />
        <span v-if="shown" class="dot" />
      </template>`)
    await wrapper.setData({ shown: true })

    expect(wrapper.find('.os-button__suffix .lock').exists()).toBe(true)
  })
})
