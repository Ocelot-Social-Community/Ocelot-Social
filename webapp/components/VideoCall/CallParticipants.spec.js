import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import flushPromises from 'flush-promises'
import CallParticipants, { SEARCH_FROM } from './CallParticipants.vue'

const localVue = global.localVue

const person = (userId, overrides = {}) => ({
  userId,
  name: userId,
  slug: `${userId}-slug`,
  profile: { id: userId, name: userId },
  isMe: false,
  micOn: true,
  cameraOn: false,
  screenSharing: false,
  speaking: false,
  devices: 1,
  ...overrides,
})

describe('CallParticipants', () => {
  let wrapper
  let mocks

  const Wrapper = (propsData = {}) => {
    const store = new Vuex.Store({
      getters: {
        'videoCall/groupId': () => 'g1',
        'auth/user': () => ({ id: 'me' }),
      },
    })
    mocks = {
      $t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
      $apollo: {
        query: jest.fn().mockResolvedValue({
          data: {
            videoCallModerationRights: { userId: 'bob', remove: true, revokeModeration: true },
          },
        }),
        mutate: jest.fn().mockResolvedValue({ data: {} }),
      },
      $toastBackendError: jest.fn(),
      $router: { push: jest.fn() },
    }
    return mount(CallParticipants, {
      localVue,
      store,
      mocks,
      propsData: {
        people: [person('me', { isMe: true }), person('bob'), person('anna')],
        ...propsData,
      },
      attachTo: document.body,
    })
  }

  const moderatedByMe = { moderators: ['me'], everyone: false, speakers: [] }
  const names = (actions) => actions.map((action) => action.name)

  afterEach(() => {
    wrapper.destroy()
  })

  describe('the list', () => {
    it('puts whoever speaks first, then oneself, then the moderation, then the rest by name', () => {
      wrapper = Wrapper({
        people: [
          person('zoe'),
          person('anna'),
          person('me', { isMe: true }),
          person('mod'),
          person('loud', { speaking: true }),
        ],
        moderation: { moderators: ['mod'], everyone: false, speakers: [] },
      })
      expect(wrapper.vm.shown.map((p) => p.userId)).toEqual(['loud', 'me', 'mod', 'anna', 'zoe'])
    })

    it('marks moderators, those with the floor, oneself and several devices, on one line', () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('bob', { devices: 2 }), person('anna')],
        moderation: { moderators: ['me', 'bob'], everyone: false, speakers: ['bob'] },
      })
      const line = (userId) =>
        wrapper.find(`[data-test="call-participant-badges-${userId}"]`).text()
      expect(line('bob')).toBe(
        'videoCall.participants.moderator – videoCall.participants.hasFloor – videoCall.participants.devices {"count":2}',
      )
      expect(line('me')).toBe('videoCall.you: videoCall.participants.moderator')
      expect(wrapper.find('[data-test="call-participant-badges-anna"]').exists()).toBe(false)
    })

    it('says "you" alone when nothing else sets one apart', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.badgeLine(person('me', { isMe: true }))).toBe('videoCall.you')
    })

    it('tells a screen reader what each one has on', () => {
      wrapper = Wrapper()
      expect(
        wrapper.vm.stateLabel(person('x', { micOn: false, cameraOn: true, screenSharing: true })),
      ).toBe(
        'videoCall.participants.micOff, videoCall.participants.cameraOn, videoCall.participants.sharing',
      )
      expect(wrapper.vm.stateLabel(person('y'))).toBe(
        'videoCall.participants.micOn, videoCall.participants.cameraOff',
      )
    })

    it('can be searched once it is long', async () => {
      const many = Array.from({ length: SEARCH_FROM }, (_, i) => person(`p${i}`, { name: `P${i}` }))
      wrapper = Wrapper({ people: [...many, person('anna', { name: 'Anna' })] })
      expect(wrapper.find('[data-test="call-participants-search"]').exists()).toBe(true)
      await wrapper.find('[data-test="call-participants-search"]').setValue('ann')
      expect(wrapper.vm.shown.map((p) => p.userId)).toEqual(['anna'])
    })

    it('has no search while it is short', () => {
      wrapper = Wrapper()
      expect(wrapper.find('[data-test="call-participants-search"]').exists()).toBe(false)
    })
  })

  describe('what everybody can do', () => {
    it('shows somebody large, opens their profile and mutes them for oneself', () => {
      wrapper = Wrapper({ locallyMuted: { anna: true } })
      const bob = person('bob')
      const actions = wrapper.vm.actionsFor(bob)
      expect(names(actions)).toEqual(['spotlight', 'profile', 'localMute'])
      actions.forEach((action) => action.callback())
      expect(wrapper.emitted('spotlight')).toEqual([['bob']])
      expect(mocks.$router.push).toHaveBeenCalledWith({
        name: 'profile-id-slug',
        params: { id: 'bob', slug: 'bob-slug' },
      })
      expect(wrapper.emitted('local-mute')).toEqual([['bob', true]])
      // Somebody already muted for oneself is offered to be heard again.
      wrapper.vm.actionsFor(person('anna'))[2].callback()
      expect(wrapper.emitted('local-mute')[1]).toEqual(['anna', false])
    })

    it('offers no profile without a slug, and no muting of oneself for oneself', () => {
      wrapper = Wrapper()
      expect(
        names(wrapper.vm.actionsFor(person('me', { isMe: true, slug: null, micOn: false }))),
      ).toEqual(['spotlight'])
    })

    it("switches off one's own microphone, camera and share right here, not through the server", () => {
      wrapper = Wrapper()
      const me = person('me', { isMe: true, cameraOn: true, screenSharing: true })
      const actions = wrapper.vm.actionsFor(me)
      expect(names(actions)).toEqual(['spotlight', 'profile', 'mute', 'camera', 'screen'])
      actions.slice(2).forEach((action) => action.callback())
      expect(wrapper.emitted('switch-off')).toEqual([['mic'], ['camera'], ['screen']])
      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
    })

    it('asks nothing of the server when the menu opens for one who does not moderate', async () => {
      wrapper = Wrapper()
      const toggleMenu = jest.fn()
      await wrapper.vm.openMenu(person('bob'), toggleMenu)
      expect(toggleMenu).toHaveBeenCalled()
      expect(mocks.$apollo.query).not.toHaveBeenCalled()
    })
  })

  describe('what a moderator can do', () => {
    it('mutes, switches off, ends a share, gives the floor and makes moderators', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      const bob = person('bob', { cameraOn: true, screenSharing: true })
      const actions = wrapper.vm.actionsFor(bob)
      expect(names(actions)).toEqual([
        'spotlight',
        'profile',
        'localMute',
        'mute',
        'camera',
        'screen',
        'floor',
        'appoint',
      ])
      for (const name of ['mute', 'camera', 'screen', 'floor', 'appoint']) {
        actions.find((action) => action.name === name).callback()
        await flushPromises()
      }
      const sent = mocks.$apollo.mutate.mock.calls.map(([{ variables }]) => variables)
      expect(sent).toEqual([
        { groupId: 'g1', userId: 'bob', action: 'MUTE_MICROPHONE' },
        { groupId: 'g1', userId: 'bob', action: 'DISABLE_CAMERA' },
        { groupId: 'g1', userId: 'bob', action: 'STOP_SCREEN_SHARE' },
        { groupId: 'g1', userId: 'bob', floor: true },
        { groupId: 'g1', userId: 'bob', moderator: true },
      ])
    })

    it('offers what the ranks allow once the server has answered', async () => {
      wrapper = Wrapper({
        moderation: { moderators: ['me', 'bob'], everyone: false, speakers: ['bob'] },
      })
      const bob = person('bob', { micOn: false })
      expect(names(wrapper.vm.actionsFor(bob))).not.toContain('remove')
      await wrapper.vm.openMenu(bob, jest.fn())
      const actions = wrapper.vm.actionsFor(bob)
      expect(names(actions)).toEqual([
        'spotlight',
        'profile',
        'localMute',
        'floor',
        'revoke',
        'remove',
      ])
      actions.find((action) => action.name === 'floor').callback()
      actions.find((action) => action.name === 'revoke').callback()
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls.map(([{ variables }]) => variables)).toEqual([
        { groupId: 'g1', userId: 'bob', floor: false },
        { groupId: 'g1', userId: 'bob', moderator: false },
      ])
    })

    it('leaves the heavier entries away when the server cannot be asked', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      mocks.$apollo.query.mockRejectedValueOnce(new Error('offline'))
      await wrapper.vm.openMenu(person('bob'), jest.fn())
      expect(names(wrapper.vm.actionsFor(person('bob')))).not.toContain('remove')
    })

    it('removes somebody only once it is confirmed', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      await wrapper.vm.openMenu(person('bob'), jest.fn())
      wrapper.vm
        .actionsFor(person('bob'))
        .find((action) => action.name === 'remove')
        .callback()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="call-participants-dialog"]').exists()).toBe(true)
      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      await wrapper.find('[data-test="remove-confirm"]').trigger('click')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[0][0].variables).toEqual({
        groupId: 'g1',
        userId: 'bob',
        action: 'REMOVE',
      })
      expect(wrapper.find('[data-test="call-participants-dialog"]').exists()).toBe(false)
    })

    it('keeps the question open and says why when the server refuses', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      const error = new Error('outranked')
      mocks.$apollo.mutate.mockRejectedValueOnce(error)
      wrapper.vm.removing = person('bob')
      wrapper.vm.dialog = 'remove'
      await wrapper.vm.remove(person('bob'))
      expect(mocks.$toastBackendError).toHaveBeenCalledWith(error)
      expect(wrapper.vm.dialog).toBe('remove')
      wrapper.vm.closeDialog()
      expect(wrapper.vm.dialog).toBeNull()
    })

    it('lets a moderator named as such give it up', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      const me = person('me', { isMe: true, micOn: false })
      const actions = wrapper.vm.actionsFor(me)
      expect(names(actions)).toEqual(['spotlight', 'profile', 'resign', 'floor'])
      expect(wrapper.emitted('switch-off')).toBeUndefined()
      actions.find((action) => action.name === 'resign').callback()
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[0][0].variables).toEqual({
        groupId: 'g1',
        userId: 'me',
        moderator: false,
      })
    })

    it('runs an entry of the menu and closes it', () => {
      wrapper = Wrapper()
      const toggleMenu = jest.fn()
      const callback = jest.fn()
      wrapper.vm.run({ callback }, toggleMenu)
      expect(toggleMenu).toHaveBeenCalled()
      expect(callback).toHaveBeenCalled()
    })
  })

  describe('muting everybody', () => {
    it('spares oneself and whoever speaks, and mutes the rest', async () => {
      wrapper = Wrapper({
        people: [
          person('me', { isMe: true }),
          person('loud', { speaking: true }),
          person('bob'),
          person('quiet', { micOn: false }),
        ],
        moderation: moderatedByMe,
      })
      await wrapper.find('[data-test="call-participants-mute-all"]').trigger('click')
      expect(wrapper.vm.spared).toEqual(['me', 'loud'])
      expect(wrapper.vm.muteCount).toBe(1)
      await wrapper.find('[data-test="mute-all-confirm"]').trigger('click')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[0][0].variables).toEqual({
        groupId: 'g1',
        exceptUserIds: ['me', 'loud'],
        floorUserIds: [],
      })
      expect(wrapper.vm.dialog).toBeNull()
      expect(wrapper.emitted('switch-off')).toBeUndefined()
    })

    it('switches off the own microphone too when oneself is not spared', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      wrapper.vm.openMuteAll()
      wrapper.vm.spared = []
      await wrapper.vm.muteAll()
      expect(wrapper.emitted('switch-off')).toEqual([['mic']])
    })

    it('keeps the question open when the server refuses', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      mocks.$apollo.mutate.mockRejectedValueOnce(new Error('no'))
      wrapper.vm.openMuteAll()
      await wrapper.vm.muteAll()
      expect(wrapper.vm.dialog).toBe('muteAll')
      expect(wrapper.emitted('switch-off')).toBeUndefined()
    })

    it('spares those with the floor instead of whoever speaks, and gives it on the way', async () => {
      wrapper = Wrapper({
        people: [
          person('me', { isMe: true }),
          person('loud', { speaking: true }),
          person('speaker'),
          person('bob'),
        ],
        moderation: { moderators: ['me'], everyone: false, speakers: ['speaker'] },
      })
      wrapper.vm.openMuteAll()
      expect(wrapper.vm.spared).toEqual(['me', 'speaker'])
      expect(wrapper.vm.floorUnchanged).toBe(true)
      wrapper.vm.toggleFloor('bob')
      expect(wrapper.vm.spared).toContain('bob')
      expect(wrapper.vm.floor).toEqual(['speaker', 'bob'])
      expect(wrapper.vm.floorUnchanged).toBe(false)
      // Taking it back leaves the tick for the moderator to clear.
      wrapper.vm.toggleFloor('bob')
      expect(wrapper.vm.floor).toEqual(['speaker'])
      expect(wrapper.vm.spared).toContain('bob')
    })
  })

  describe('the moderation as a whole', () => {
    it('lets somebody who may step in take it over', async () => {
      wrapper = Wrapper({ mayTakeOver: true })
      await wrapper.find('[data-test="call-participants-take-over"]').trigger('click')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[0][0].variables).toEqual({ groupId: 'g1' })
    })

    it('lets a moderator let everybody moderate', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      expect(wrapper.vm.mayToggleEveryone).toBe(true)
      const box = wrapper.find('[data-test="call-participants-everyone"] input')
      box.element.checked = true
      await box.trigger('change')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[0][0].variables).toEqual({
        groupId: 'g1',
        enabled: true,
      })
    })

    it('does not let whoever moderates only because everybody does end it', () => {
      wrapper = Wrapper({ moderation: { moderators: ['bob'], everyone: true, speakers: [] } })
      expect(wrapper.vm.isModerator).toBe(true)
      expect(wrapper.vm.mayToggleEveryone).toBe(false)
    })

    it('lets somebody who may step in end it', () => {
      wrapper = Wrapper({
        moderation: { moderators: [], everyone: true, speakers: [] },
        mayTakeOver: true,
      })
      expect(wrapper.vm.mayToggleEveryone).toBe(true)
    })

    it('offers nobody else the switch', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.mayToggleEveryone).toBe(false)
      expect(wrapper.find('[data-test="call-participants-everyone"]').exists()).toBe(false)
    })
  })
})
