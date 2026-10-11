import GroupContentMenu from './GroupContentMenu.vue'
import { render, screen, fireEvent } from '@testing-library/vue'
import { groupRights } from '~/test/groupRightsFixture'

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
    expect(wrapper.container).toMatchSnapshot()
  })

  it('renders as groupProfile, not muted', () => {
    const wrapper = Wrapper({
      usage: 'groupProfile',
      group: { ...groupRights('usual'), isMutedByMe: false, id: 'groupid' },
    })
    expect(wrapper.container).toMatchSnapshot()
  })

  it('renders as groupProfile, muted', () => {
    const wrapper = Wrapper({
      usage: 'groupProfile',
      group: { ...groupRights('usual'), isMutedByMe: true, id: 'groupid' },
    })
    expect(wrapper.container).toMatchSnapshot()
  })

  it('renders as groupProfile when I am the owner', () => {
    const wrapper = Wrapper({
      usage: 'groupProfile',
      group: { ...groupRights('owner'), id: 'groupid' },
    })
    expect(wrapper.container).toMatchSnapshot()
  })

  describe('for somebody who is not a member', () => {
    it('renders nothing while there is nothing in it for them', () => {
      const wrapper = Wrapper({
        usage: 'groupProfile',
        group: { ...groupRights(null), isMutedByMe: false, id: 'groupid' },
      })
      expect(wrapper.container.querySelector('.content-menu')).toBeNull()
    })

    it('offers what a network admin acting in the group holds, and no muting', () => {
      // An elevation: rights over the group without a membership in it.
      Wrapper({
        usage: 'groupProfile',
        group: {
          myGroupRole: null,
          myGroupPermissions: ['group.read', 'group.settings.manage', 'group.role.manage'],
          isMutedByMe: false,
          id: 'groupid',
        },
      })
      expect(screen.getByText('admin.settings.name')).toBeTruthy()
      expect(screen.getByText('group.rights.title')).toBeTruthy()
      expect(screen.queryByText('group.contentMenu.muteGroup')).toBeNull()
    })
  })

  describe('mute button', () => {
    it('emits mute', async () => {
      const wrapper = Wrapper({
        usage: 'groupProfile',
        group: { ...groupRights('usual'), isMutedByMe: false, id: 'groupid' },
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
        group: { ...groupRights('usual'), isMutedByMe: true, id: 'groupid' },
      })
      const muteButton = screen.getByText('group.contentMenu.unmuteGroup')
      await fireEvent.click(muteButton)
      expect(wrapper.emitted().unmute).toBeTruthy()
    })
  })
})
