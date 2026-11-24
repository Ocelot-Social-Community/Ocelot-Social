import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import flushPromises from 'flush-promises'
import Dropdown from '~/components/Dropdown'
import CallParticipants, { ORDER_REST } from './CallParticipants.vue'

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
  // What was sent: which mutation (by the field it asks for) and with what — a wrong document
  // with the right variables would pass unnoticed otherwise.
  const sent = () =>
    mocks.$apollo.mutate.mock.calls.map(([{ mutation, variables }]) => ({
      mutation: mutation.definitions[0].selectionSet.selections[0].name.value,
      ...variables,
    }))

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
      // As the browser shows it: runs of white space between the marks fall into one.
      const line = (userId) =>
        wrapper.find(`[data-test="call-participant-badges-${userId}"]`).text().replace(/\s+/g, ' ')
      // The roles in the call stand out.
      const bob = wrapper.find('[data-test="call-participant-bob"]')
      expect(bob.find('[data-test="call-participant-moderator"]').classes()).toContain(
        'call-participants__mark--role',
      )
      expect(bob.find('[data-test="call-participant-floor"]').classes()).toContain(
        'call-participants__mark--role',
      )
      expect(bob.find('[data-test="call-participant-devices"]').classes()).not.toContain(
        'call-participants__mark--role',
      )
      expect(line('bob')).toBe(
        'videoCall.participants.moderator – videoCall.participants.hasFloor – videoCall.participants.devices {"count":2}',
      )
      expect(line('me')).toBe('videoCall.you: videoCall.participants.moderator')
      expect(wrapper.find('[data-test="call-participant-badges-anna"]').exists()).toBe(false)
    })

    it('marks everybody as moderating while everybody moderates, those named as leading', () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('bob'), person('anna')],
        moderation: { moderators: ['bob'], everyone: true, speakers: [] },
      })
      expect(wrapper.vm.badgeLine(person('me', { isMe: true }))).toBe(
        'videoCall.you: videoCall.participants.moderator',
      )
      expect(wrapper.vm.badgeLine(person('bob'))).toBe('videoCall.participants.leadModerator')
      expect(wrapper.vm.badgeLine(person('anna'))).toBe('videoCall.participants.moderator')
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
      // The ring around whoever speaks, in words.
      expect(wrapper.vm.stateLabel(person('z', { speaking: true }))).toBe(
        'videoCall.participants.speaking, videoCall.participants.micOn, videoCall.participants.cameraOff',
      )
      expect(wrapper.vm.stateLabel(person('y'))).toBe(
        'videoCall.participants.micOn, videoCall.participants.cameraOff',
      )
    })
  })

  describe('the filter', () => {
    const find = (name) => wrapper.find(`[data-test="call-participants-${name}"]`)
    const shown = () => wrapper.vm.shown.map((p) => p.userId)

    it('opens its field before its button, for everybody, with the field in focus', async () => {
      wrapper = Wrapper()
      expect(find('filter-name').exists()).toBe(false)
      expect(find('filter-toggle').attributes('aria-expanded')).toBe('false')
      await find('filter-toggle').trigger('click')
      await wrapper.vm.$nextTick()
      const field = find('filter-name').element.parentElement
      expect(field.nextElementSibling).toBe(find('filter-toggle').element)
      expect(document.activeElement).toBe(find('filter-name').element)
    })

    it('takes less room where the filter is all the toolbar holds, its field open or not', async () => {
      const slim = () => find('toolbar').classes('call-participants__toolbar--slim')
      wrapper = Wrapper()
      expect(slim()).toBe(true)
      // Open, as high as closed: its button stays where it is.
      await find('filter-toggle').trigger('click')
      expect(slim()).toBe(true)
      wrapper.destroy()
      wrapper = Wrapper({ mayTakeOver: true })
      expect(slim()).toBe(false)
      wrapper.destroy()
      wrapper = Wrapper({ moderation: moderatedByMe })
      expect(slim()).toBe(false)
    })

    it("has the moderation's controls step aside while its field is open, and keeps its button last", async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      expect(find('mute-all').exists()).toBe(true)
      expect(find('everyone').exists()).toBe(true)
      const slim = find('toolbar').classes('call-participants__toolbar--slim')
      await find('filter-toggle').trigger('click')
      expect(find('mute-all').exists()).toBe(false)
      expect(find('everyone').exists()).toBe(false)
      expect(find('toolbar').classes('call-participants__toolbar--slim')).toBe(slim)
      expect(find('filter-toggle').element.parentElement.lastElementChild).toBe(
        find('filter-toggle').element,
      )
      await find('filter-toggle').trigger('click')
      expect(find('mute-all').exists()).toBe(true)
      expect(find('everyone').exists()).toBe(true)
    })

    it('has the offer to step in step aside too while its field is open', async () => {
      wrapper = Wrapper({ mayTakeOver: true })
      expect(find('take-over').exists()).toBe(true)
      await find('filter-toggle').trigger('click')
      expect(find('take-over').exists()).toBe(false)
    })

    it('finds a part of a name whatever its case and accents, and tells how many of all', async () => {
      wrapper = Wrapper({
        people: [person('jose', { name: 'José' }), person('anna', { name: 'Anna' })],
      })
      await find('filter-toggle').trigger('click')
      expect(find('filter-count').exists()).toBe(false)
      await find('filter-name').setValue('  JOS ')
      expect(shown()).toEqual(['jose'])
      expect(find('filter-count').text()).toBe(
        'videoCall.participants.filterCount {"shown":1,"total":2}',
      )
    })

    it('shows everybody while "mute all" is chosen, and filters again afterwards', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      await find('filter-toggle').trigger('click')
      await find('filter-name').setValue('an')
      expect(shown()).toEqual(['anna'])
      wrapper.vm.openMuteAll()
      await wrapper.vm.$nextTick()
      // Bob, whom it would mute, has his row and his tick.
      expect(shown()).toEqual(['me', 'anna', 'bob'])
      expect(wrapper.find('[data-test="mute-all-pick-bob"]').exists()).toBe(true)
      wrapper.vm.stopMuting()
      await wrapper.vm.$nextTick()
      expect(shown()).toEqual(['anna'])
      expect(find('filter-name').element.value).toBe('an')
    })

    it('filters no more once closed, and keeps the name for when it opens again', async () => {
      wrapper = Wrapper()
      await find('filter-toggle').trigger('click')
      await find('filter-name').setValue('bo')
      expect(shown()).toEqual(['bob'])
      await find('filter-toggle').trigger('click')
      expect(find('filter-name').exists()).toBe(false)
      expect(wrapper.vm.filtering).toBe(false)
      expect(shown()).toHaveLength(3)
      await find('filter-toggle').trigger('click')
      expect(find('filter-name').element.value).toBe('bo')
      expect(shown()).toEqual(['bob'])
    })

    it('empties the name with the cross or Esc, and folds away on a second Esc', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      // "Mute all" chosen first: its button steps aside while the field is open.
      await find('mute-all').trigger('click')
      await find('filter-toggle').trigger('click')
      await find('filter-name').setValue('bo')
      await find('filter-clear').trigger('click')
      expect(wrapper.vm.filterName).toBe('')
      await find('filter-name').setValue('bo')
      // Esc in the field leaves "mute all" alone.
      await find('filter-name').trigger('keydown', { key: 'Escape' })
      expect(wrapper.vm.filterName).toBe('')
      expect(wrapper.vm.muting).toBe(true)
      await find('filter-name').trigger('keydown', { key: 'Escape' })
      expect(find('filter-name').exists()).toBe(false)
    })

    it('says when nobody matches, and resets', async () => {
      wrapper = Wrapper()
      await find('filter-toggle').trigger('click')
      await find('filter-name').setValue('zz')
      expect(find('filter-none').exists()).toBe(true)
      await find('filter-reset').trigger('click')
      expect(find('filter-none').exists()).toBe(false)
      expect(shown()).toHaveLength(3)
    })

    describe('its chips', () => {
      const chip = (key) => find('filter-chip-' + key)
      const people = [
        person('me', { isMe: true, micOn: false, cameraOn: true }),
        person('bob', { speaking: true, screenSharing: true }),
        person('anna', { cameraOn: true }),
        person('mod', { micOn: false }),
      ]
      const moderation = { moderators: ['mod'], everyone: false, speakers: ['anna'] }

      it('are ticked in a menu in the field, and the ticked ones show in the field', async () => {
        wrapper = Wrapper()
        expect(find('filter-more').exists()).toBe(false)
        await find('filter-toggle').trigger('click')
        expect(find('filter-more').attributes('aria-expanded')).toBe('false')
        expect(wrapper.findAll('[data-test^="call-participants-filter-chip-"]')).toHaveLength(7)
        expect(chip('micOn').element.checked).toBe(false)
        expect(find('filter-chosen-micOn').exists()).toBe(false)
        await chip('micOn').setChecked(true)
        expect(find('filter-chosen-micOn').exists()).toBe(true)
        // As a badge, with a cross that tells a click lets go of it.
        expect(find('filter-chosen-micOn').find('.os-badge').exists()).toBe(true)
        expect(
          find('filter-chosen-micOn').find('.call-participants__filter-chosen-cross').exists(),
        ).toBe(true)
        await chip('micOn').setChecked(false)
        expect(find('filter-chosen-micOn').exists()).toBe(false)
      })

      it('let go of one with a click on its symbol in the field', async () => {
        wrapper = Wrapper({ people })
        await find('filter-toggle').trigger('click')
        await chip('cameraOn').setChecked(true)
        await chip('micOn').setChecked(true)
        expect(shown()).toEqual(['anna'])
        await find('filter-chosen-micOn').trigger('click')
        expect(find('filter-chosen-micOn').exists()).toBe(false)
        expect(chip('micOn').element.checked).toBe(false)
        expect(shown().sort()).toEqual(['anna', 'me'])
      })

      it.each([
        ['micOn', ['bob', 'anna']],
        ['cameraOn', ['me', 'anna']],
        ['speaking', ['bob']],
        ['floor', ['anna']],
        ['moderator', ['mod']],
        ['sharing', ['bob']],
        ['mutedForMe', ['anna']],
      ])('"%s" keeps only whoever matches it', async (key, expected) => {
        wrapper = Wrapper({ people, moderation, locallyMuted: { anna: true } })
        await find('filter-toggle').trigger('click')
        await chip(key).setChecked(true)
        expect(chip(key).element.checked).toBe(true)
        expect(shown().sort()).toEqual([...expected].sort())
      })

      it('counts everybody as moderating while everybody moderates', async () => {
        wrapper = Wrapper({ people, moderation: { ...moderation, everyone: true } })
        await find('filter-toggle').trigger('click')
        await chip('moderator').setChecked(true)
        expect(shown()).toHaveLength(4)
      })

      it('keep only whoever matches all chips chosen, and the name too', async () => {
        wrapper = Wrapper({ people })
        await find('filter-toggle').trigger('click')
        await chip('cameraOn').setChecked(true)
        expect(shown().sort()).toEqual(['anna', 'me'])
        await chip('micOn').setChecked(true)
        expect(shown()).toEqual(['anna'])
        expect(find('filter-count').text()).toBe(
          'videoCall.participants.filterCount {"shown":1,"total":4}',
        )
        await find('filter-name').setValue('bo')
        expect(find('filter-none').exists()).toBe(true)
        await chip('cameraOn').setChecked(false)
        expect(chip('cameraOn').element.checked).toBe(false)
        expect(shown()).toEqual(['bob'])
      })

      it('filter no more once closed, and are chosen again when it opens', async () => {
        wrapper = Wrapper({ people })
        await find('filter-toggle').trigger('click')
        await chip('speaking').setChecked(true)
        await find('filter-toggle').trigger('click')
        expect(wrapper.vm.filtering).toBe(false)
        expect(shown()).toHaveLength(4)
        await find('filter-toggle').trigger('click')
        expect(chip('speaking').element.checked).toBe(true)
        expect(shown()).toEqual(['bob'])
      })

      it('are left alone by the cross and Esc, and reset with the name', async () => {
        wrapper = Wrapper({ people })
        await find('filter-toggle').trigger('click')
        await chip('sharing').setChecked(true)
        await find('filter-name').setValue('zz')
        await find('filter-clear').trigger('click')
        expect(shown()).toEqual(['bob'])
        await find('filter-name').setValue('zz')
        await find('filter-reset').trigger('click')
        expect(wrapper.vm.filterKeys).toEqual([])
        expect(wrapper.vm.filterName).toBe('')
        expect(shown()).toHaveLength(4)
      })
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
      const moderate = 'moderateVideoCallParticipant'
      expect(sent()).toEqual([
        { mutation: moderate, groupId: 'g1', userId: 'bob', action: 'MUTE_MICROPHONE' },
        { mutation: moderate, groupId: 'g1', userId: 'bob', action: 'DISABLE_CAMERA' },
        { mutation: moderate, groupId: 'g1', userId: 'bob', action: 'STOP_SCREEN_SHARE' },
        { mutation: 'setVideoCallFloor', groupId: 'g1', userId: 'bob', floor: true },
        { mutation: 'setVideoCallModerator', groupId: 'g1', userId: 'bob', moderator: true },
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
      expect(sent()).toEqual([
        { mutation: 'setVideoCallFloor', groupId: 'g1', userId: 'bob', floor: false },
        { mutation: 'setVideoCallModerator', groupId: 'g1', userId: 'bob', moderator: false },
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

    it('takes the keyboard into the question, keeps it there and gives it back', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      await wrapper.vm.openMenu(person('bob'), jest.fn())
      wrapper.vm
        .actionsFor(person('bob'))
        .find((action) => action.name === 'remove')
        .callback()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      const dialog = wrapper.find('[data-test="call-participants-dialog"]')
      const cancel = wrapper.find('[data-test="remove-cancel"]')
      expect(document.activeElement).toBe(cancel.element)
      // From the first answer back to the last, without leaving the question.
      await dialog.trigger('keydown', { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(wrapper.find('[data-test="remove-confirm"]').element)
      await dialog.trigger('keydown.esc')
      await wrapper.vm.$nextTick()
      // The menu entry that asked is gone: the keyboard is back on that person's menu.
      expect(document.activeElement).toBe(
        wrapper.find('[data-test="call-participant-menu-bob"]').element,
      )
    })

    it('takes the keyboard nowhere for a question gone before it was drawn', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      wrapper.vm.removing = person('bob')
      wrapper.vm.$options.watch.removalOpen.call(wrapper.vm, true)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.giveRemovalFocusBack).toBeUndefined()
      // Closing it then has nothing to give back.
      wrapper.vm.$options.watch.removalOpen.call(wrapper.vm, false)
      expect(wrapper.vm.giveRemovalFocusBack).toBeNull()
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

    it('forgets what the ranks allowed until the server answers again, and takes its latest answer only', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      const bob = person('bob')
      await wrapper.vm.openMenu(bob, jest.fn())
      expect(names(wrapper.vm.actionsFor(bob))).toContain('remove')
      // Asked again, twice: the first answer arrives last and is out of date.
      let answerFirst
      mocks.$apollo.query
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              answerFirst = resolve
            }),
        )
        .mockResolvedValueOnce({
          data: { videoCallModerationRights: { userId: 'bob', remove: false } },
        })
      const first = wrapper.vm.openMenu(bob, jest.fn())
      expect(names(wrapper.vm.actionsFor(bob))).not.toContain('remove')
      await wrapper.vm.openMenu(bob, jest.fn())
      answerFirst({ data: { videoCallModerationRights: { userId: 'bob', remove: true } } })
      await first
      expect(names(wrapper.vm.actionsFor(bob))).not.toContain('remove')
    })

    it('closes only its own question once the removal is through', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      let removed
      mocks.$apollo.mutate.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            removed = resolve
          }),
      )
      const ask = (who) =>
        wrapper.vm
          .actionsFor(who)
          .find((action) => action.name === 'remove')
          .callback()
      wrapper.vm.rights = { bob: { remove: true }, anna: { remove: true } }
      ask(person('bob'))
      const removal = wrapper.vm.remove(person('bob'))
      // Dismissed, and Anna asked about meanwhile.
      wrapper.vm.closeDialog()
      ask(person('anna'))
      removed({ data: {} })
      await removal
      expect(wrapper.vm.removing.userId).toBe('anna')
      expect(wrapper.vm.dialog).toBe('remove')
    })

    describe('once the row of the one removed is gone', () => {
      // Removes `userId` as a moderator does, the row going before the answer comes.
      const removeAndLose = async (people, userId, after = people) => {
        wrapper = Wrapper({ people, moderation: moderatedByMe })
        await wrapper.vm.openMenu(person(userId), jest.fn())
        wrapper.vm
          .actionsFor(person(userId))
          .find((action) => action.name === 'remove')
          .callback()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        let removed
        mocks.$apollo.mutate.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              removed = resolve
            }),
        )
        await wrapper.find('[data-test="remove-confirm"]').trigger('click')
        // Gone from the call, by the removal, before its answer is.
        await wrapper.setProps({ people: after.filter((p) => p.userId !== userId) })
        removed({ data: {} })
        await flushPromises()
        expect(sent()).toEqual([
          { mutation: 'moderateVideoCallParticipant', groupId: 'g1', userId, action: 'REMOVE' },
        ])
      }
      const menuOf = (userId) =>
        wrapper.find(`[data-test="call-participant-menu-${userId}"]`).element

      it('gives the keyboard to the row that took its place', async () => {
        // In order: me, anna, bob, carl.
        await removeAndLose(
          [person('me', { isMe: true }), person('bob'), person('anna'), person('carl')],
          'bob',
        )
        expect(document.activeElement).toBe(menuOf('carl'))
      })

      it('asks the rows shown by then, not those there when the question opened', async () => {
        // Carl joins behind Bob while the removal is on its way, and takes his place.
        await removeAndLose([person('me', { isMe: true }), person('bob')], 'bob', [
          person('me', { isMe: true }),
          person('bob'),
          person('carl'),
        ])
        expect(document.activeElement).toBe(menuOf('carl'))
      })

      it('gives it to the row before when it was the last one', async () => {
        await removeAndLose([person('me', { isMe: true }), person('bob'), person('anna')], 'bob')
        expect(document.activeElement).toBe(menuOf('anna'))
      })

      it('gives it to the list when nobody else is left in it', async () => {
        await removeAndLose([person('bob')], 'bob')
        const list = wrapper.find('.call-participants__list').element
        expect(document.activeElement).toBe(list)
      })
    })

    it('does not close a question asked anew about the same one by the answer to the first', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      const bob = person('bob')
      await wrapper.vm.openMenu(bob, jest.fn())
      const ask = () =>
        wrapper.vm
          .actionsFor(bob)
          .find((action) => action.name === 'remove')
          .callback()
      ask()
      let removed
      mocks.$apollo.mutate.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            removed = resolve
          }),
      )
      const removal = wrapper.vm.remove(wrapper.vm.removing)
      // Dismissed, and asked again about Bob — the very same person — meanwhile.
      wrapper.vm.closeDialog()
      ask()
      removed({ data: {} })
      await removal
      expect(wrapper.vm.dialog).toBe('remove')
      expect(wrapper.vm.removing.userId).toBe('bob')
    })

    it('stays busy until every request on its way is answered', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      const answers = []
      mocks.$apollo.mutate.mockImplementation(
        () =>
          new Promise((resolve) => {
            answers.push(resolve)
          }),
      )
      const floor = wrapper.vm.setFloor(person('bob'), true)
      const mute = wrapper.vm.moderate(person('anna'), 'MUTE_MICROPHONE')
      expect(wrapper.vm.busy).toBe(true)
      answers[0]({ data: {} })
      await floor
      expect(wrapper.vm.busy).toBe(true)
      answers[1]({ data: {} })
      await mute
      expect(wrapper.vm.busy).toBe(false)
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

  describe('switching off right in the row', () => {
    it('lets a moderator switch off a microphone or a camera that is on with a click on it', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('bob', { cameraOn: true })],
        moderation: moderatedByMe,
      })
      await wrapper.find('[data-test="call-participant-switch-mic-bob"]').trigger('click')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[0][0].variables).toEqual({
        groupId: 'g1',
        userId: 'bob',
        action: 'MUTE_MICROPHONE',
      })
      await wrapper.find('[data-test="call-participant-switch-camera-bob"]').trigger('click')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[1][0].variables.action).toBe('DISABLE_CAMERA')
      // One's own goes off right here.
      await wrapper.find('[data-test="call-participant-switch-mic-me"]').trigger('click')
      expect(wrapper.emitted('switch-off')).toEqual([['mic']])
    })

    it('offers nothing to switch off what is off already, or somebody else to whoever does not moderate', () => {
      wrapper = Wrapper({
        people: [person('bob', { micOn: false, cameraOn: false }), person('anna')],
        moderation: moderatedByMe,
      })
      expect(wrapper.find('[data-test="call-participant-switch-mic-bob"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="call-participant-switch-camera-bob"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="call-participant-switch-mic-anna"]').exists()).toBe(true)
      wrapper.destroy()
      wrapper = Wrapper({ people: [person('anna')] })
      expect(wrapper.find('[data-test="call-participant-switch-mic-anna"]').exists()).toBe(false)
    })

    it('lets everybody switch off their own microphone, camera and share right in the row', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true, cameraOn: true, screenSharing: true })],
      })
      for (const kind of ['screen', 'mic', 'camera']) {
        await wrapper.find(`[data-test="call-participant-switch-${kind}-me"]`).trigger('click')
      }
      expect(wrapper.emitted('switch-off')).toEqual([['screen'], ['mic'], ['camera']])
    })

    it("switches this device in one's own row, whatever one's other devices have on", async () => {
      // On on the other device, off on this one: the row offers switching it on here.
      wrapper = Wrapper({
        people: [
          person('me', {
            isMe: true,
            micOn: true,
            cameraOn: true,
            devices: 2,
            here: { mic: false, camera: false },
          }),
        ],
      })
      await wrapper.find('[data-test="call-participant-switch-mic-me"]').trigger('click')
      await wrapper.find('[data-test="call-participant-switch-camera-me"]').trigger('click')
      expect(wrapper.emitted('switch-on')).toEqual([['mic'], ['camera']])
      expect(wrapper.emitted('switch-off')).toBeUndefined()
    })

    it('lets everybody switch their own microphone and camera on again right in the row', async () => {
      wrapper = Wrapper({ people: [person('me', { isMe: true, micOn: false, cameraOn: false })] })
      const mic = wrapper.find('[data-test="call-participant-switch-mic-me"]')
      expect(mic.classes()).toEqual(
        expect.arrayContaining(['call-participants__switch-on', 'call-participants__off']),
      )
      expect(mic.classes()).not.toContain('call-participants__inert')
      expect(mic.attributes('aria-label')).toBe('videoCall.participants.micOnAction')
      await mic.trigger('click')
      await wrapper.find('[data-test="call-participant-switch-camera-me"]').trigger('click')
      expect(wrapper.emitted('switch-on')).toEqual([['mic'], ['camera']])
      expect(wrapper.find('[data-test="call-participant-device-mic-me"]').exists()).toBe(false)
    })

    it('lets whatever the viewer cannot switch step back, for everybody alike', () => {
      const classes = (kind, id) =>
        wrapper.find(`[data-test="call-participant-device-${kind}-${id}"]`).classes()
      wrapper = Wrapper({
        people: [person('bob', { micOn: false, cameraOn: false })],
        moderation: moderatedByMe,
      })
      expect(classes('mic', 'bob')).toEqual(
        expect.arrayContaining(['call-participants__inert', 'call-participants__off']),
      )
      expect(classes('camera', 'bob')).toContain('call-participants__inert')
      wrapper.destroy()
      // Whoever does not moderate switches nobody else's: on or off, it steps back, and so does
      // the bubble; their own microphone that is on is a switch.
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('bob', { micOn: true, cameraOn: false })],
        moderation: { moderators: ['carl'], everyone: false, speakers: ['bob'] },
      })
      expect(classes('mic', 'bob')).toContain('call-participants__inert')
      expect(classes('mic', 'bob')).not.toContain('call-participants__off')
      expect(classes('camera', 'bob')).toEqual(
        expect.arrayContaining(['call-participants__inert', 'call-participants__off']),
      )
      expect(wrapper.find('[data-test="call-participant-has-floor-bob"]').classes()).toContain(
        'call-participants__inert',
      )
      expect(wrapper.find('[data-test="call-participant-switch-mic-me"]').exists()).toBe(true)
    })
  })

  describe('the screen share and the floor right in the row', () => {
    it('lets a moderator end a screen share with a click on it', async () => {
      wrapper = Wrapper({
        people: [person('bob', { screenSharing: true }), person('anna')],
        moderation: moderatedByMe,
      })
      expect(wrapper.find('[data-test="call-participant-switch-screen-anna"]').exists()).toBe(false)
      // Before the microphone, as it is not always there.
      const screen = wrapper.find('[data-test="call-participant-switch-screen-bob"]').element
      expect(screen.nextElementSibling).toBe(
        wrapper.find('[data-test="call-participant-switch-mic-bob"]').element,
      )
      await wrapper.find('[data-test="call-participant-switch-screen-bob"]').trigger('click')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[0][0].variables.action).toBe('STOP_SCREEN_SHARE')
    })

    it('lets a moderator give and take the floor with a click', async () => {
      wrapper = Wrapper({
        people: [person('bob'), person('anna')],
        moderation: { moderators: ['me'], everyone: false, speakers: ['bob'] },
      })
      const bob = wrapper.find('[data-test="call-participant-floor-toggle-bob"]')
      const anna = wrapper.find('[data-test="call-participant-floor-toggle-anna"]')
      expect(bob.attributes('aria-pressed')).toBe('true')
      expect(bob.attributes('aria-label')).toBe('videoCall.participants.takeFloor')
      expect(anna.attributes('aria-label')).toBe('videoCall.participants.giveFloor')
      await bob.trigger('click')
      await flushPromises()
      await anna.trigger('click')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls.map((call) => call[0].variables)).toEqual([
        { groupId: 'g1', userId: 'bob', floor: false },
        { groupId: 'g1', userId: 'anna', floor: true },
      ])
    })

    it('shows whoever does not moderate only the bubble of whoever has the floor', () => {
      wrapper = Wrapper({
        people: [person('bob'), person('anna')],
        moderation: { moderators: ['mod'], everyone: false, speakers: ['bob'] },
      })
      expect(wrapper.find('[data-test="call-participant-floor-toggle-bob"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="call-participant-has-floor-bob"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="call-participant-has-floor-anna"]').exists()).toBe(false)
    })

    it('shows the floor toggle neither to whoever does not moderate nor while muting', async () => {
      wrapper = Wrapper({ people: [person('bob')] })
      expect(wrapper.find('[data-test="call-participant-floor-toggle-bob"]').exists()).toBe(false)
      wrapper.destroy()
      wrapper = Wrapper({ people: [person('bob')], moderation: moderatedByMe })
      wrapper.vm.openMuteAll()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="call-participant-floor-toggle-bob"]').exists()).toBe(false)
    })
  })

  describe('muted for oneself', () => {
    it('shows it first in the row, and lets one hear them again with a click', async () => {
      wrapper = Wrapper({ people: [person('bob'), person('anna')], locallyMuted: { bob: true } })
      expect(wrapper.find('[data-test="call-participant-unmute-for-me-anna"]').exists()).toBe(false)
      const unmute = wrapper.find('[data-test="call-participant-unmute-for-me-bob"]')
      expect(unmute.element.parentElement.firstElementChild).toBe(unmute.element)
      await unmute.trigger('click')
      expect(wrapper.emitted('local-mute')).toEqual([['bob', false]])
    })
  })

  describe('holding the order', () => {
    const order = () => wrapper.vm.ordered.map((p) => p.userId)
    const speakUp = () =>
      wrapper.setProps({
        people: [
          person('anna'),
          person('bob', { speaking: true }),
          person('carl', { speaking: true }),
        ],
      })
    const pointer = (type, pointerType = 'mouse') => {
      const event = new Event(type)
      event.pointerType = pointerType
      wrapper.find('.call-participants__list').element.dispatchEvent(event)
    }

    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('keeps the order while a menu is open, puts whoever joins last, and a moment longer', async () => {
      wrapper = Wrapper({ people: [person('anna'), person('bob')] })
      wrapper.vm.holdOrder(true)
      await speakUp()
      expect(order()).toEqual(['anna', 'bob', 'carl'])
      jest.advanceTimersByTime(ORDER_REST * 2)
      expect(order()).toEqual(['anna', 'bob', 'carl'])
      wrapper.vm.holdOrder(false)
      expect(order()).toEqual(['anna', 'bob', 'carl'])
      jest.advanceTimersByTime(ORDER_REST)
      expect(order()).toEqual(['bob', 'carl', 'anna'])
    })

    it('keeps whoever joins meanwhile where they came, also when they start to speak', async () => {
      wrapper = Wrapper({ people: [person('anna')] })
      wrapper.vm.holdOrder(true)
      await wrapper.setProps({ people: [person('anna'), person('carl'), person('dana')] })
      expect(order()).toEqual(['anna', 'carl', 'dana'])
      await wrapper.setProps({
        people: [person('anna'), person('carl'), person('dana', { speaking: true })],
      })
      expect(order()).toEqual(['anna', 'carl', 'dana'])
    })

    it('gives up the place of whoever leaves meanwhile; back again, they come last', async () => {
      wrapper = Wrapper({ people: [person('anna'), person('bob'), person('carl')] })
      wrapper.vm.holdOrder(true)
      await wrapper.setProps({ people: [person('anna'), person('carl')] })
      await wrapper.setProps({ people: [person('anna'), person('bob'), person('carl')] })
      expect(order()).toEqual(['anna', 'carl', 'bob'])
      // A second device of somebody there moves nobody.
      await wrapper.setProps({
        people: [person('anna'), person('bob'), person('carl', { devices: 2 })],
      })
      expect(order()).toEqual(['anna', 'carl', 'bob'])
    })

    it('holds it when a row menu opens', async () => {
      wrapper = Wrapper({ people: [person('anna'), person('bob')] })
      await wrapper.findComponent(Dropdown).vm.$emit('open-change', true)
      expect(wrapper.vm.heldOrder).toEqual(['anna', 'bob'])
    })

    it('keeps it while the pointer moves in the list, until it has rested there a while', async () => {
      wrapper = Wrapper({ people: [person('anna'), person('bob')] })
      pointer('pointermove')
      await speakUp()
      jest.advanceTimersByTime(ORDER_REST - 1)
      pointer('pointerdown')
      jest.advanceTimersByTime(ORDER_REST - 1)
      expect(order()).toEqual(['anna', 'bob', 'carl'])
      jest.advanceTimersByTime(1)
      expect(order()).toEqual(['bob', 'carl', 'anna'])
    })

    it('lets it go as soon as the mouse leaves the list, but not when a finger lifts', async () => {
      wrapper = Wrapper({ people: [person('anna'), person('bob')] })
      pointer('pointerdown', 'touch')
      await speakUp()
      pointer('pointerleave', 'touch')
      expect(order()).toEqual(['anna', 'bob', 'carl'])
      pointer('pointermove')
      pointer('pointerleave')
      expect(order()).toEqual(['bob', 'carl', 'anna'])
    })

    it('keeps it while a key is used in the list, and lets it go when the focus leaves', async () => {
      wrapper = Wrapper({ people: [person('anna'), person('bob')] })
      const list = wrapper.find('.call-participants__list')
      await list.trigger('keydown', { key: 'Tab' })
      await speakUp()
      expect(order()).toEqual(['anna', 'bob', 'carl'])
      await list.trigger('focusout', { relatedTarget: null })
      expect(order()).toEqual(['bob', 'carl', 'anna'])
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
      // Chosen right in the list: ticked is who is muted, the floor in place of the menu.
      expect(wrapper.find('[data-test="call-participants-mute-all"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="mute-all-pick-loud"]').element.checked).toBe(false)
      expect(wrapper.find('[data-test="mute-all-pick-bob"]').element.checked).toBe(true)
      // Unticked and ticked again by hand.
      const bob = wrapper.find('[data-test="mute-all-pick-bob"]')
      bob.element.checked = false
      await bob.trigger('change')
      expect(wrapper.vm.spared).toEqual(['me', 'loud', 'bob'])
      expect(wrapper.vm.muteCount).toBe(0)
      bob.element.checked = true
      await bob.trigger('change')
      expect(wrapper.vm.spared).toEqual(['me', 'loud'])
      expect(wrapper.find('[data-test="mute-all-floor-bob"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="call-participant-menu-bob"]').exists()).toBe(false)
      await wrapper.find('[data-test="mute-all-confirm"]').trigger('click')
      await flushPromises()
      expect(sent()).toEqual([
        { mutation: 'muteAllInVideoCall', groupId: 'g1', exceptUserIds: ['me', 'loud'] },
      ])
      expect(wrapper.vm.muting).toBe(false)
      expect(wrapper.find('[data-test="mute-all-pick-bob"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="call-participant-menu-bob"]').exists()).toBe(true)
      expect(wrapper.emitted('switch-off')).toBeUndefined()
    })

    it('goes back to the list as it was when cancelled, by button or by Escape', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      wrapper.vm.openMuteAll()
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="mute-all-cancel"]').trigger('click')
      expect(wrapper.vm.muting).toBe(false)
      expect(wrapper.find('[data-test="call-participants-mute-all"]').exists()).toBe(true)
      wrapper.vm.openMuteAll()
      await wrapper.find('section').trigger('keydown.esc')
      expect(wrapper.vm.muting).toBe(false)
      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
    })

    it('takes the keyboard to the choice and back to the button that opened it', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      await wrapper.find('[data-test="call-participants-mute-all"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(document.activeElement).toBe(wrapper.find('[data-test="mute-all-cancel"]').element)
      // Escape reaches the list's handler from there.
      await wrapper.find('[data-test="mute-all-cancel"]').trigger('keydown.esc')
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.muting).toBe(false)
      expect(document.activeElement).toBe(
        wrapper.find('[data-test="call-participants-mute-all"]').element,
      )
    })

    it('leaves the keyboard where it is when the choice ends while it is elsewhere', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      const elsewhere = document.createElement('button')
      document.body.appendChild(elsewhere)
      wrapper.vm.openMuteAll()
      await wrapper.vm.$nextTick()
      elsewhere.focus()
      wrapper.vm.stopMuting()
      await wrapper.vm.$nextTick()
      expect(document.activeElement).toBe(elsewhere)
      elsewhere.remove()
    })

    it('locks the ticks while the choice is on its way, and frees them again when it fails', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      let answer
      mocks.$apollo.mutate.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            answer = reject
          }),
      )
      wrapper.vm.openMuteAll()
      await wrapper.vm.$nextTick()
      const pick = () => wrapper.find('[data-test="mute-all-pick-bob"]')
      const muting = wrapper.vm.muteAll()
      await wrapper.vm.$nextTick()
      expect(pick().attributes('disabled')).toBe('disabled')
      answer(new Error('offline'))
      await muting
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.muting).toBe(true)
      expect(pick().attributes('disabled')).toBeUndefined()
    })

    it('does not let a floor answered late change a choice opened anew', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('bob')],
        moderation: moderatedByMe,
      })
      let answer
      mocks.$apollo.mutate.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            answer = resolve
          }),
      )
      wrapper.vm.openMuteAll()
      const giving = wrapper.vm.toggleFloor('bob')
      wrapper.vm.stopMuting()
      wrapper.vm.openMuteAll()
      answer({ data: {} })
      await giving
      expect(wrapper.vm.floor).toEqual([])
      expect(wrapper.vm.spared).toEqual(['me'])
    })

    it('ends the choice when one no longer moderates', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      wrapper.vm.openMuteAll()
      await wrapper.setProps({ moderation: { moderators: [], everyone: true, speakers: [] } })
      expect(wrapper.vm.muting).toBe(true)
      await wrapper.setProps({ moderation: { moderators: ['bob'], everyone: false, speakers: [] } })
      expect(wrapper.vm.muting).toBe(false)
    })

    it('leaves the own microphone to the server, which may have spared one meanwhile', async () => {
      // Ticked to be muted, then given the floor by another moderator before the request
      // arrives: the server spares them, and tells their devices only when it does mute them.
      wrapper = Wrapper({ moderation: moderatedByMe })
      wrapper.vm.openMuteAll()
      wrapper.vm.spared = []
      await wrapper.vm.muteAll()
      expect(sent()).toEqual([{ mutation: 'muteAllInVideoCall', groupId: 'g1', exceptUserIds: [] }])
      expect(wrapper.emitted('switch-off')).toBeUndefined()
    })

    it('sends what was ticked when asked, not what is ticked meanwhile', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      wrapper.vm.openMuteAll()
      mocks.$apollo.mutate.mockImplementationOnce(async () => {
        wrapper.vm.spare('me', false)
        return { data: {} }
      })
      await wrapper.vm.muteAll()
      expect(mocks.$apollo.mutate.mock.calls[0][0].variables.exceptUserIds).toContain('me')
    })

    it('does not close a choice opened anew by the answer to the one cancelled', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      let muted
      mocks.$apollo.mutate.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            muted = resolve
          }),
      )
      wrapper.vm.openMuteAll()
      const muting = wrapper.vm.muteAll()
      wrapper.vm.stopMuting()
      wrapper.vm.openMuteAll()
      muted({ data: {} })
      await muting
      expect(wrapper.vm.muting).toBe(true)
    })

    it('names only the deliberate exceptions, not those spared only for having the floor', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('speaker'), person('bob')],
        moderation: { moderators: ['me'], everyone: false, speakers: ['speaker'] },
      })
      wrapper.vm.openMuteAll()
      wrapper.vm.spare('bob', true)
      await wrapper.vm.muteAll()
      expect(sent()).toEqual([
        { mutation: 'muteAllInVideoCall', groupId: 'g1', exceptUserIds: ['me', 'bob'] },
      ])
    })

    it('lets the room have the last word over a floor answered after it told', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('bob')],
        moderation: moderatedByMe,
      })
      let answer
      mocks.$apollo.mutate.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            answer = resolve
          }),
      )
      wrapper.vm.openMuteAll()
      const giving = wrapper.vm.toggleFloor('bob')
      // The room tells of the floor given, then of another moderator taking it back — both before
      // the answer to giving it arrives.
      await wrapper.setProps({ moderation: { ...moderatedByMe, speakers: ['bob'] } })
      await wrapper.setProps({ moderation: { ...moderatedByMe, speakers: [] } })
      answer({ data: {} })
      await giving
      expect(wrapper.vm.floor).toEqual([])
      expect(wrapper.vm.spared).toEqual(['me'])
    })

    it('frees the tick of whoever another moderator takes the floor back from meanwhile', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('speaker'), person('bob')],
        moderation: { moderators: ['me'], everyone: false, speakers: ['speaker'] },
      })
      wrapper.vm.openMuteAll()
      wrapper.vm.spare('bob', true)
      await wrapper.vm.$nextTick()
      const pick = (userId) => wrapper.find(`[data-test="mute-all-pick-${userId}"]`)
      expect(pick('speaker').attributes('disabled')).toBe('disabled')
      // Taken back from the speaker, and given to Bob, ticked by hand before, by somebody else.
      await wrapper.setProps({
        moderation: { moderators: ['me'], everyone: false, speakers: ['bob'] },
      })
      expect(pick('speaker').attributes('disabled')).toBeUndefined()
      expect(pick('speaker').element.checked).toBe(true)
      expect(wrapper.vm.floor).toEqual(['bob'])
      // Taken back from Bob as well: the tick set by hand stays.
      await wrapper.setProps({ moderation: { moderators: ['me'], everyone: false, speakers: [] } })
      expect(wrapper.vm.floor).toEqual([])
      expect(wrapper.vm.spared).toEqual(['me', 'bob'])
      await wrapper.vm.muteAll()
      expect(sent()).toEqual([
        { mutation: 'muteAllInVideoCall', groupId: 'g1', exceptUserIds: ['me', 'bob'] },
      ])
    })

    it('leaves the floor of the room as it is while not choosing', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      await wrapper.setProps({
        moderation: { moderators: ['me'], everyone: false, speakers: ['bob'] },
      })
      expect(wrapper.vm.floor).toEqual([])
    })

    it('keeps the tick of whoever is given the floor locked until it is taken back', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('bob')],
        moderation: moderatedByMe,
      })
      wrapper.vm.openMuteAll()
      await wrapper.vm.$nextTick()
      const pick = () => wrapper.find('[data-test="mute-all-pick-bob"]')
      expect(pick().attributes('disabled')).toBeUndefined()
      await wrapper.vm.toggleFloor('bob')
      await wrapper.vm.$nextTick()
      expect(pick().attributes('disabled')).toBe('disabled')
      expect(pick().element.checked).toBe(false)
      await wrapper.vm.toggleFloor('bob')
      await wrapper.vm.$nextTick()
      expect(pick().attributes('disabled')).toBeUndefined()
      expect(pick().element.checked).toBe(true)
    })

    it('gives and takes back the floor at once, not only with "mute all"', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('bob')],
        moderation: moderatedByMe,
      })
      wrapper.vm.openMuteAll()
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="mute-all-floor-bob"]').trigger('click')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[0][0].variables).toEqual({
        groupId: 'g1',
        userId: 'bob',
        floor: true,
      })
      expect(wrapper.vm.floor).toEqual(['bob'])
      await wrapper.find('[data-test="mute-all-floor-bob"]').trigger('click')
      await flushPromises()
      expect(mocks.$apollo.mutate.mock.calls[1][0].variables).toEqual({
        groupId: 'g1',
        userId: 'bob',
        floor: false,
      })
      expect(wrapper.vm.floor).toEqual([])
      expect(wrapper.vm.muting).toBe(true)
    })

    it('leaves the floor and the ticks as they were when the server refuses the floor', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('speaker')],
        moderation: { moderators: ['me'], everyone: false, speakers: ['speaker'] },
      })
      wrapper.vm.openMuteAll()
      mocks.$apollo.mutate.mockRejectedValueOnce(new Error('no'))
      await wrapper.vm.toggleFloor('speaker')
      expect(wrapper.vm.floor).toEqual(['speaker'])
      expect(wrapper.vm.spared).toEqual(['me', 'speaker'])
    })

    it('keeps the question open when the server refuses', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      mocks.$apollo.mutate.mockRejectedValueOnce(new Error('no'))
      wrapper.vm.openMuteAll()
      await wrapper.vm.muteAll()
      expect(wrapper.vm.muting).toBe(true)
      expect(wrapper.emitted('switch-off')).toBeUndefined()
    })

    it('spares those with the floor instead of whoever speaks', async () => {
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
      await wrapper.vm.toggleFloor('bob')
      expect(wrapper.vm.spared).toContain('bob')
      expect(wrapper.vm.floor).toEqual(['speaker', 'bob'])
      // Taking it back unticks whoever was ticked only by giving it …
      await wrapper.vm.toggleFloor('bob')
      expect(wrapper.vm.floor).toEqual(['speaker'])
      expect(wrapper.vm.spared).not.toContain('bob')
      // … and leaves a tick that was set before.
      await wrapper.vm.toggleFloor('me')
      await wrapper.vm.toggleFloor('me')
      expect(wrapper.vm.spared).toContain('me')
    })

    it('ticks whoever had the floor as soon as it is taken back', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('speaker')],
        moderation: { moderators: ['me'], everyone: false, speakers: ['speaker'] },
      })
      wrapper.vm.openMuteAll()
      await wrapper.vm.$nextTick()
      const pick = () => wrapper.find('[data-test="mute-all-pick-speaker"]')
      expect(pick().attributes('disabled')).toBe('disabled')
      expect(pick().element.checked).toBe(false)
      await wrapper.vm.toggleFloor('speaker')
      await wrapper.vm.$nextTick()
      expect(pick().attributes('disabled')).toBeUndefined()
      expect(pick().element.checked).toBe(true)
      expect(wrapper.vm.spared).toEqual(['me'])
    })

    it('keeps oneself spared when one had the floor and takes it back', async () => {
      wrapper = Wrapper({
        people: [person('me', { isMe: true }), person('bob')],
        moderation: { moderators: ['me'], everyone: false, speakers: ['me'] },
      })
      wrapper.vm.openMuteAll()
      await wrapper.vm.toggleFloor('me')
      expect(wrapper.vm.spared).toContain('me')
    })
  })

  describe('the moderation as a whole', () => {
    it('lets somebody who may step in take it over', async () => {
      wrapper = Wrapper({ mayTakeOver: true })
      await wrapper.find('[data-test="call-participants-take-over"]').trigger('click')
      await flushPromises()
      expect(sent()).toEqual([{ mutation: 'takeOverVideoCallModeration', groupId: 'g1' }])
    })

    it('lets a moderator let everybody moderate', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      expect(wrapper.vm.mayToggleEveryone).toBe(true)
      const box = wrapper.find('[data-test="call-participants-everyone"] input')
      box.element.checked = true
      await box.trigger('change')
      await flushPromises()
      expect(sent()).toEqual([
        { mutation: 'setVideoCallEveryoneModerates', groupId: 'g1', enabled: true },
      ])
    })

    it('shows the box as it was when the change fails, so a second click asks the same again', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      mocks.$apollo.mutate.mockRejectedValueOnce(new Error('offline'))
      const box = wrapper.find('[data-test="call-participants-everyone"] input')
      box.element.checked = true
      await box.trigger('change')
      await flushPromises()
      expect(box.element.checked).toBe(false)
      box.element.checked = true
      await box.trigger('change')
      await flushPromises()
      expect(sent().map(({ enabled }) => enabled)).toEqual([true, true])
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

    it('keeps its switch as it is while a row is being worked, so the toolbar does not flicker', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      let answer
      mocks.$apollo.mutate.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            answer = resolve
          }),
      )
      const box = () => wrapper.find('[data-test="call-participants-everyone"] input')
      wrapper.vm.setFloor(wrapper.vm.people[1], true)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.busy).toBe(true)
      expect(box().attributes('disabled')).toBeUndefined()
      answer({ data: {} })
      await flushPromises()
      expect(wrapper.vm.busy).toBe(false)
    })

    it('waits with its switch while its own change is on its way', async () => {
      wrapper = Wrapper({ moderation: moderatedByMe })
      let answer
      mocks.$apollo.mutate.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            answer = resolve
          }),
      )
      const box = () => wrapper.find('[data-test="call-participants-everyone"] input')
      box().element.checked = true
      await box().trigger('change')
      expect(box().attributes('disabled')).toBe('disabled')
      answer({ data: {} })
      await flushPromises()
      expect(box().attributes('disabled')).toBeUndefined()
    })

    it('offers nobody else the switch', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.mayToggleEveryone).toBe(false)
      expect(wrapper.find('[data-test="call-participants-everyone"]').exists()).toBe(false)
    })
  })
})
