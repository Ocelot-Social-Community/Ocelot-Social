import { render } from '@testing-library/vue'
import { RouterLinkStub } from '@vue/test-utils'
import GroupAvatarPopover from './GroupAvatarPopover.vue'

const localVue = global.localVue

const group = {
  id: 'g1',
  name: 'Journalism Collective',
  slug: 'journalism-collective',
  groupType: 'public',
  membersCount: 12,
  postsCount: 4,
}

const groupLink = {
  name: 'groups-id-slug',
  params: { slug: 'journalism-collective', id: 'g1' },
}

describe('GroupAvatarPopover', () => {
  // Passing `group` directly skips the Apollo query (see its own `skip()`); `showContent` is
  // forced true here too (instead of waiting on its own mount-time spinner delay, see
  // GroupAvatarPopover's `mounted()`) so these tests don't need to await a timer.
  const Wrapper = ({ withGroupLink = true, showProfileLink = false, groupData = group } = {}) => {
    return render(GroupAvatarPopover, {
      localVue,
      propsData: {
        groupId: groupData.id,
        group: groupData,
        groupLink: withGroupLink ? groupLink : null,
        showProfileLink,
      },
      data: () => ({ showContent: true }),
      stubs: {
        NuxtLink: RouterLinkStub,
      },
      mocks: {
        $t: jest.fn((t) => t),
      },
    })
  }

  // The explicit "open group" button is off by default everywhere now — the whole card is a
  // link instead (see canNavigate), on both touch and non-touch devices. showProfileLink is kept
  // only for a caller that might still want that extra, more discoverable call-to-action.
  describe('explicit "open group" button (showProfileLink)', () => {
    it('is not shown by default, even with a groupLink', () => {
      const wrapper = Wrapper({ withGroupLink: true })
      expect(wrapper.queryByText('group.teaser.openGroup')).toBeNull()
    })

    it('is shown when showProfileLink is explicitly enabled', () => {
      const wrapper = Wrapper({ withGroupLink: true, showProfileLink: true })
      expect(wrapper.queryByText('group.teaser.openGroup')).not.toBeNull()
    })

    it('stays hidden with showProfileLink enabled but no groupLink', () => {
      const wrapper = Wrapper({ withGroupLink: false, showProfileLink: true })
      expect(wrapper.queryByText('group.teaser.openGroup')).toBeNull()
    })
  })

  describe('whole card as a link (canNavigate)', () => {
    it('renders the card itself as a link when a groupLink is provided', () => {
      const wrapper = Wrapper({ withGroupLink: true })
      const root = wrapper.container.querySelector('.group-avatar-popover')
      expect(root.tagName).toBe('A')
    })

    it('renders a plain div, not a link, when no groupLink is provided', () => {
      const wrapper = Wrapper({ withGroupLink: false })
      const root = wrapper.container.querySelector('.group-avatar-popover')
      expect(root.tagName).toBe('DIV')
    })
  })

  it('shows the group name and slug', () => {
    const wrapper = Wrapper()
    expect(wrapper.getByText('Journalism Collective')).toBeTruthy()
    expect(wrapper.getByText('&journalism-collective')).toBeTruthy()
  })
})
