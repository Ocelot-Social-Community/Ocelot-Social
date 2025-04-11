import GroupContentMenu from './GroupContentMenu.vue'
import { render, screen, fireEvent } from '@testing-library/vue'

const localVue = global.localVue

const stubs = {
  'router-link': {
    template: '<span><slot /></span>',
  },
  'v-popover': true,
}

// Mock Math.random, used in Dropdown
Object.assign(Math, {
  random: () => 0,
})

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

  it('renders as groupProfile when I am the owner', () => {
    const wrapper = Wrapper({
      usage: 'groupProfile',
      group: { myRole: 'owner', id: 'groupid' },
    })
    expect(wrapper.baseElement).toMatchSnapshot()
  })

  describe('mute button', () => {
    it('emits mute', async () => {
      const wrapper = Wrapper({
        usage: 'groupProfile',
        group: { isMutedByMe: false, id: 'groupid' },
      })
      const muteButton = screen.getByText('group.contentMenu.muteGroup')
      await fireEvent.click(muteButton)
      expect(wrapper.emitted().mute).toBeTruthy()
    })
  })

  describe('unmute button', () => {
    it('emits unmute', async () => {
      const wrapper = Wrapper({
        usage: 'groupProfile',
        group: { isMutedByMe: true, id: 'groupid' },
      })
      const muteButton = screen.getByText('group.contentMenu.unmuteGroup')
      await fireEvent.click(muteButton)
      expect(wrapper.emitted().unmute).toBeTruthy()
    })
  })
})
