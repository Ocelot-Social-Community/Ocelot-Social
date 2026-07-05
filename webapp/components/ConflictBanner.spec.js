import { mount } from '@vue/test-utils'
import ConflictBanner from './ConflictBanner.vue'

// Stub os-button as a plain button that re-emits click, so the emit wiring is tested
// independently of the ui library.
const stubs = {
  OsButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
}

const factory = (props = {}) =>
  mount(ConflictBanner, {
    stubs,
    propsData: {
      message: 'A setting changed on the server.',
      loadLabel: 'Load',
      keepLabel: 'Keep',
      dataTest: 'policy-conflict',
      ...props,
    },
  })

describe('ConflictBanner', () => {
  it('renders the message and derives button data-test ids from the base', () => {
    const wrapper = factory()
    expect(wrapper.find('[data-test="policy-conflict"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('A setting changed on the server.')
    expect(wrapper.find('[data-test="policy-conflict-load"]').text()).toBe('Load')
    expect(wrapper.find('[data-test="policy-conflict-keep"]').text()).toBe('Keep')
  })

  it('derives the selectors from a dynamic base (roles tab)', () => {
    const wrapper = factory({ dataTest: 'role-badge-setter-conflict' })
    expect(wrapper.find('[data-test="role-badge-setter-conflict"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-badge-setter-conflict-load"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="role-badge-setter-conflict-keep"]').exists()).toBe(true)
  })

  it('emits load when the load button is clicked', async () => {
    const wrapper = factory()
    await wrapper.find('[data-test="policy-conflict-load"]').trigger('click')
    expect(wrapper.emitted('load')).toHaveLength(1)
    expect(wrapper.emitted('keep')).toBeUndefined()
  })

  it('emits keep when the keep button is clicked', async () => {
    const wrapper = factory()
    await wrapper.find('[data-test="policy-conflict-keep"]').trigger('click')
    expect(wrapper.emitted('keep')).toHaveLength(1)
    expect(wrapper.emitted('load')).toBeUndefined()
  })
})
