import { mount } from '@vue/test-utils'

import GroupElevation from './GroupElevation.vue'

const localVue = global.localVue

describe('GroupElevation', () => {
  let mocks

  beforeEach(() => {
    mocks = {
      $t: jest.fn((key) => key),
      $toast: { error: jest.fn() },
      $apollo: { mutate: jest.fn().mockResolvedValue({ data: {} }) },
    }
  })

  const Wrapper = (group) =>
    mount(GroupElevation, {
      localVue,
      mocks,
      propsData: { group },
      stubs: {
        'os-card': { template: '<div><slot /></div>' },
        'os-button': {
          template: '<button :disabled="disabled" v-on="$listeners"><slot /></button>',
          props: ['disabled'],
        },
      },
    })

  const at = (wrapper, testId) => wrapper.find(`[data-test="${testId}"]`)

  it('stays out of the way of somebody acting on their own membership', () => {
    // Nothing to pick up, nothing to say: a member sees no banner at all.
    const wrapper = Wrapper({ id: 'g1', mayElevateInGroup: false, myGroupElevation: null })

    expect(at(wrapper, 'group-elevation').exists()).toBe(false)
  })

  it('says what the viewer is RIGHT NOW, which is not elevated', async () => {
    // Until they ask, they act on their membership — telling a member they are "not acting as
    // a member" was simply wrong, and telling anyone they are elevated before they asked is
    // worse.
    const asMember = Wrapper({
      id: 'g1',
      mayElevateInGroup: true,
      myGroupElevation: null,
      myGroupRole: { name: 'usual', label: null },
    })

    expect(at(asMember, 'elevation-offer').text()).toContain('group.elevation.actingAsMember')

    const asStranger = Wrapper({ id: 'g1', mayElevateInGroup: true, myGroupElevation: null })

    expect(at(asStranger, 'elevation-offer').text()).toContain('group.elevation.actingAsNonMember')
  })

  it('offers the access to somebody who holds network rights here', () => {
    const wrapper = Wrapper({ id: 'g1', mayElevateInGroup: true, myGroupElevation: null })

    expect(at(wrapper, 'elevation-offer').exists()).toBe(true)
    expect(at(wrapper, 'elevation-active').exists()).toBe(false)
  })

  it('waits for nothing when the end of the elevation does not parse', () => {
    // Otherwise it would read as "already past" and tell the page to refetch at once.
    jest.useFakeTimers()
    const wrapper = Wrapper({
      id: 'g1',
      mayElevateInGroup: true,
      myGroupElevation: { expiresAt: 'not a date', reason: 'r', outranksMembers: false },
    })

    jest.runAllTimers()

    expect(wrapper.emitted('changed')).toBeUndefined()
    jest.useRealTimers()
  })

  it('stops the reason at the length the server takes', () => {
    const wrapper = Wrapper({ id: 'g1', mayElevateInGroup: true, myGroupElevation: null })

    expect(at(wrapper, 'elevation-reason').find('input').attributes('maxlength')).toBe('280')
  })

  it('picks the rights up with the reason, and tells the page to refetch', async () => {
    const wrapper = Wrapper({ id: 'g1', mayElevateInGroup: true, myGroupElevation: null })

    await at(wrapper, 'elevation-reason').find('input').setValue('Reviewing a report')
    await at(wrapper, 'elevation-start').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { groupId: 'g1', reason: 'Reviewing a report' },
      }),
    )
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('does not let the rights be picked up without a reason', async () => {
    // The elevation is the record of an intervention; the why is what tells a repair from an
    // abuse later, so the server refuses it without one — and the button says so first.
    const wrapper = Wrapper({ id: 'g1', mayElevateInGroup: true, myGroupElevation: null })

    expect(at(wrapper, 'elevation-start').attributes('disabled')).toBeDefined()
    await at(wrapper, 'elevation-reason').find('input').setValue('   ')
    expect(at(wrapper, 'elevation-start').attributes('disabled')).toBeDefined()
  })

  it('sends the reason trimmed', async () => {
    const wrapper = Wrapper({ id: 'g1', mayElevateInGroup: true, myGroupElevation: null })

    await at(wrapper, 'elevation-reason').find('input').setValue('  Reviewing a report ')
    expect(at(wrapper, 'elevation-start').attributes('disabled')).toBeUndefined()
    await at(wrapper, 'elevation-start').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { groupId: 'g1', reason: 'Reviewing a report' },
      }),
    )
  })

  it('says it is active, until when, and offers to end it', async () => {
    // Visible for as long as it lasts: an elevation one forgets about is the thing this
    // exists to prevent.
    const wrapper = Wrapper({
      id: 'g1',
      mayElevateInGroup: true,
      myGroupElevation: { expiresAt: '2026-10-02T15:30:00.000Z', reason: null },
    })

    expect(at(wrapper, 'elevation-active').exists()).toBe(true)
    expect(at(wrapper, 'elevation-offer').exists()).toBe(false)

    await at(wrapper, 'elevation-end').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { groupId: 'g1' } }),
    )
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('tells the page the moment the window closes, without being asked', async () => {
    // Nothing pushes the expiry to the client, so a card left open keeps offering actions the
    // backend has already stopped allowing. The refetch happens when the hour is up, not when
    // the viewer next clicks something and gets a refusal.
    jest.useFakeTimers()
    try {
      const wrapper = Wrapper({
        id: 'g1',
        mayElevateInGroup: true,
        myGroupElevation: { expiresAt: new Date(Date.now() + 60_000).toISOString(), reason: null },
      })

      expect(wrapper.emitted('changed')).toBeUndefined()

      jest.advanceTimersByTime(60_000)

      expect(wrapper.emitted('changed')).toHaveLength(1)
    } finally {
      jest.useRealTimers()
    }
  })

  it('asks straight away for a window that has already closed', async () => {
    jest.useFakeTimers()
    try {
      const wrapper = Wrapper({
        id: 'g1',
        mayElevateInGroup: true,
        myGroupElevation: { expiresAt: new Date(Date.now() - 1000).toISOString(), reason: null },
      })

      jest.advanceTimersByTime(0)

      expect(wrapper.emitted('changed')).toHaveLength(1)
    } finally {
      jest.useRealTimers()
    }
  })

  it('drops the pending timer when it leaves the page', () => {
    // A timer that outlives the component would emit into nothing — and in a test run, after
    // the environment is gone.
    jest.useFakeTimers()
    try {
      const wrapper = Wrapper({
        id: 'g1',
        mayElevateInGroup: true,
        myGroupElevation: { expiresAt: new Date(Date.now() + 60_000).toISOString(), reason: null },
      })

      wrapper.destroy()
      jest.advanceTimersByTime(60_000)

      expect(wrapper.emitted('changed')).toBeUndefined()
    } finally {
      jest.useRealTimers()
    }
  })

  it('re-arms when a fresh elevation replaces the old one', async () => {
    jest.useFakeTimers()
    try {
      const wrapper = Wrapper({
        id: 'g1',
        mayElevateInGroup: true,
        myGroupElevation: { expiresAt: new Date(Date.now() + 10_000).toISOString(), reason: null },
      })

      await wrapper.setProps({
        group: {
          id: 'g1',
          mayElevateInGroup: true,
          myGroupElevation: {
            expiresAt: new Date(Date.now() + 90_000).toISOString(),
            reason: null,
          },
        },
      })

      jest.advanceTimersByTime(10_000)
      expect(wrapper.emitted('changed')).toBeUndefined()

      jest.advanceTimersByTime(80_000)
      expect(wrapper.emitted('changed')).toHaveLength(1)
    } finally {
      jest.useRealTimers()
    }
  })

  it('reports a refusal instead of pretending it worked', async () => {
    mocks.$apollo.mutate.mockRejectedValueOnce(new Error('You hold nothing here beyond reading!'))
    const wrapper = Wrapper({ id: 'g1', mayElevateInGroup: true, myGroupElevation: null })

    await at(wrapper, 'elevation-reason').find('input').setValue('Reviewing a report')
    await at(wrapper, 'elevation-start').trigger('click')
    await wrapper.vm.$nextTick()

    expect(mocks.$toast.error).toHaveBeenCalledWith('You hold nothing here beyond reading!')
    expect(wrapper.emitted('changed')).toBeUndefined()
  })
})
