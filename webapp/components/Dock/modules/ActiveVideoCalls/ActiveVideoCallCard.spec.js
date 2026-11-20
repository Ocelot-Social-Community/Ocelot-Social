import { mount, RouterLinkStub } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import Vuex from 'vuex'
import ActiveVideoCallCard from './ActiveVideoCallCard.vue'

const localVue = global.localVue

const user = (id, extra = {}) => ({ id, slug: id, name: `Name ${id}`, isBlocked: false, ...extra })
const callWith = (participants, extra = {}) => ({
  group: { id: 'g1', slug: 'circle', name: 'Circle', visibility: 'public', avatar: null },
  participantCount: participants.length,
  participants,
  ...extra,
})

describe('ActiveVideoCallCard.vue', () => {
  let open
  let close
  let inCall
  let toastError

  const Wrapper = (propsData, { showVideoCall = false } = {}) => {
    // The call window, as far as the card sees it: whether it is open, and the order of
    // what is done to it.
    inCall = []
    toastError = jest.fn()
    open = jest.fn(() => inCall.push('open'))
    close = jest.fn(() => inCall.push('close'))
    const store = new Vuex.Store({
      getters: { 'videoCall/showVideoCall': () => showVideoCall },
      mutations: { 'videoCall/OPEN': open, 'videoCall/CLOSE': close },
    })
    return mount(ActiveVideoCallCard, {
      localVue,
      store,
      propsData,
      mocks: {
        $t: (key, args) => (args ? `${key} ${JSON.stringify(args)}` : key),
        $toast: { error: toastError },
      },
      stubs: { NuxtLink: RouterLinkStub, 'avatar-image': true },
    })
  }

  it('links to the group', () => {
    const wrapper = Wrapper({ call: callWith([user('u1')]) })
    const link = wrapper.findComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({
      name: 'groups-id-slug',
      params: { id: 'g1', slug: 'circle' },
    })
    expect(link.text()).toContain('Circle')
  })

  it('marks a group that is not public with a lock', () => {
    expect(
      Wrapper({ call: callWith([]) })
        .find('[data-test="call-lock"]')
        .exists(),
    ).toBe(false)

    const hidden = callWith([])
    hidden.group.visibility = 'hidden'
    const lock = Wrapper({ call: hidden }).find('[data-test="call-lock"]')
    expect(lock.attributes('aria-label')).toBe('group.types.hidden')
  })

  it('shows the connections, which may be more than the people', () => {
    const wrapper = Wrapper({ call: callWith([user('u1')], { participantCount: 2 }) })
    expect(wrapper.find('[data-test="call-count"]').text()).toBe(
      'dock.activeVideoCalls.count {"count":2}',
    )
    expect(wrapper.findAll('.active-video-call__avatar')).toHaveLength(1)
  })

  it('shows a user once per connection: it may be two people sharing an account', () => {
    const wrapper = Wrapper({ call: callWith([user('u1'), user('u1')]) })
    expect(wrapper.findAll('.active-video-call__avatar')).toHaveLength(2)
  })

  it('shows up to five people, and "+n" in the last place for more', () => {
    const five = Wrapper({ call: callWith(['a', 'b', 'c', 'd', 'e'].map((id) => user(id))) })
    expect(five.findAll('.active-video-call__avatar')).toHaveLength(5)
    expect(five.find('[data-test="call-more"]').exists()).toBe(false)

    const seven = Wrapper({
      call: callWith(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => user(id))),
    })
    expect(seven.findAll('.active-video-call__avatar')).toHaveLength(4)
    expect(seven.find('[data-test="call-more"]').text()).toBe('+3')
  })

  it('marks a participant the viewer blocked, so they can decide whether to join', () => {
    const wrapper = Wrapper({ call: callWith([user('u1'), user('u2', { isBlocked: true })]) })
    const [plain, blocked] = wrapper.findAll('.active-video-call__avatar').wrappers

    expect(plain.find('[data-test="call-blocked"]').exists()).toBe(false)
    expect(plain.attributes('title')).toBe('Name u1')
    expect(blocked.find('[data-test="call-blocked"]').exists()).toBe(true)
    expect(blocked.attributes('title')).toBe('dock.activeVideoCalls.blocked {"name":"Name u2"}')
  })

  it('opens the call of this group on join', async () => {
    const call = callWith([user('u1')])
    const wrapper = Wrapper({ call })

    await wrapper.find('[data-test="call-join"]').trigger('click')

    expect(close).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalledWith(expect.anything(), {
      groupId: 'g1',
      groupName: 'Circle',
      groupSlug: 'circle',
      groupAvatar: null,
    })
    expect(wrapper.emitted('joined')).toHaveLength(1)
  })

  it('leaves the call the viewer is in before joining this one', async () => {
    // The call window connects when it opens; told to show another group while open, it
    // would stay in the old room.
    const wrapper = Wrapper({ call: callWith([user('u1')]) }, { showVideoCall: true })

    await wrapper.find('[data-test="call-join"]').trigger('click')
    await flushPromises()

    expect(inCall).toEqual(['close', 'open'])
    expect(open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ groupId: 'g1' }))
  })

  it('says on the button that the viewer was removed from this call, and does not join it', async () => {
    const wrapper = Wrapper({ call: callWith([user('u1')], { removed: true }) })
    const button = wrapper.find('[data-test="call-join"]')

    expect(button.text()).toBe('videoCall.groupVideoCallButton.removed')
    expect(button.classes()).toContain('permission-denied')
    expect(button.attributes('aria-disabled')).toBe('true')

    await button.trigger('click')

    expect(open).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('backendErrors.VIDEO_CALL_REMOVED_FROM_CALL')
    expect(wrapper.emitted('joined')).toBeUndefined()
  })

  it('says the viewer is in the call instead of offering to join', () => {
    const wrapper = Wrapper({ call: callWith([user('u1')]), joined: true })
    expect(wrapper.classes()).toContain('active-video-call--joined')
    expect(wrapper.find('[data-test="call-joined"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="call-join"]').exists()).toBe(false)
  })
})
