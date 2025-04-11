import GroupContentMenu from './GroupContentMenu.vue'
import { render } from '@testing-library/vue'

const localVue = global.localVue

const stubs = {
  'router-link': {
    template: '<span><slot /></span>',
  },
  'v-popover': true,
}

describe('GroupContentMenu', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((s) => s),
    }
  })

  const Wrapper = (propsData) => {
    return render(GroupContentMenu, { propsData, mocks, localVue, stubs })
  }

  it('renders as groupTeaser', () => {
    const wrapper = Wrapper({ usage: 'groupTeaser', group: { id: 'groupid' } })
    expect(wrapper.baseElement).toMatchSnapshot()
  })

  it('renders as groupProfile, not muted', () => {
    const wrapper = Wrapper({
      usage: 'groupProfile',
      group: { isMutedByMe: false, id: 'groupid' },
    })
    expect(wrapper.baseElement).toMatchSnapshot()
  })

  it('renders as groupProfile, muted', () => {
    const wrapper = Wrapper({
      usage: 'groupProfile',
      group: { isMutedByMe: true, id: 'groupid' },
    })
    expect(wrapper.baseElement).toMatchSnapshot()
  })
})
