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

  it('picks the rights up with the reason, and tells the page to refetch', async () => {
    const wrapper = Wrapper({ id: 'g1', mayElevateInGroup: true, myGroupElevation: null })

    await at(wrapper, 'elevation-reason').setValue('Reviewing a report')
    await at(wrapper, 'elevation-start').trigger('click')

    expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { groupId: 'g1', reason: 'Reviewing a report' },
      }),
    )
    expect(wrapper.emitted('changed')).toHaveLength(1)
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

  it('reports a refusal instead of pretending it worked', async () => {
    mocks.$apollo.mutate.mockRejectedValueOnce(new Error('You hold nothing here beyond reading!'))
    const wrapper = Wrapper({ id: 'g1', mayElevateInGroup: true, myGroupElevation: null })

    await at(wrapper, 'elevation-start').trigger('click')
    await wrapper.vm.$nextTick()

    expect(mocks.$toast.error).toHaveBeenCalledWith('You hold nothing here beyond reading!')
    expect(wrapper.emitted('changed')).toBeUndefined()
  })
})
