import { mount } from '@vue/test-utils'

import GroupRightsSimple from './GroupRightsSimple.vue'

const localVue = global.localVue

const CATALOG = [
  { key: 'group.read' },
  { key: 'group.post.create' },
  { key: 'group.comment.create' },
  { key: 'group.chat.participate' },
  { key: 'group.invite' },
  { key: 'group.content.read' },
  { key: 'group.members.read' },
  { key: 'group.read' },
]

const rolesWith = (nonMember = [], usual = ['group.post.create']) => [
  { name: 'none', permissions: nonMember },
  { name: 'pending', permissions: [] },
  { name: 'usual', permissions: usual },
]

/**
 * Mounted the way a page holds it: every change it reports comes straight back in as the roles
 * it is handed — which is all a page's draft does, as far as this component can tell.
 */
const controlled = (component, options) => {
  const wrapper = mount(component, {
    ...options,
    listeners: {
      change: (name, permissions) =>
        wrapper.setProps({
          roles: wrapper
            .props('roles')
            .map((role) => (role.name === name ? { ...role, permissions } : role)),
        }),
    },
  })
  return wrapper
}

describe('GroupRightsSimple', () => {
  const Wrapper = (propsData = {}) =>
    controlled(GroupRightsSimple, {
      localVue,
      mocks: { $t: (key) => key },
      propsData: { roles: rolesWith(), catalog: CATALOG, caption: 'Resulting:', ...propsData },
    })

  const at = (wrapper, testId) => wrapper.find(`[data-test="${testId}"]`)

  describe('the visibility it reports', () => {
    // The same three answers the backend derives, from the same two rights of the `none` role —
    // and the point of one component is that both screens cannot give different ones.
    it('is hidden while outsiders may not even read the profile', () => {
      const wrapper = Wrapper({ roles: rolesWith([]) })

      expect(at(wrapper, 'visibility-hidden').exists()).toBe(true)
      expect(at(wrapper, 'visibility-title').text()).toBe('group.types.hidden')
      expect(at(wrapper, 'visibility-description').text()).toBe('group.typeDescriptions.hidden')
    })

    it('is closed once the profile is readable but the content is not', () => {
      const wrapper = Wrapper({ roles: rolesWith(['group.read']) })

      expect(at(wrapper, 'visibility-closed').exists()).toBe(true)
    })

    it('is public once the content is readable too', () => {
      const wrapper = Wrapper({ roles: rolesWith(['group.read', 'group.content.read']) })

      expect(at(wrapper, 'visibility-public').exists()).toBe(true)
    })

    it('can be reached by ticking the boxes — every one of them makes it public', () => {
      // The bug this row was added for: `group.read` was on no switch, so whatever an owner
      // ticked the group stayed hidden. Every switch on must be able to mean "public".
      const everything = ['group.read', 'group.content.read', 'group.members.read']
      const wrapper = Wrapper({ roles: rolesWith(everything) })

      expect(at(wrapper, 'visibility-public').exists()).toBe(true)
      expect(at(wrapper, 'switch-nonmembers-profile').element.checked).toBe(true)
    })

    it('shows the caption it was given, because the two levels say different things', () => {
      // "With these rights the group is" on a group, "Groups created from this template are"
      // in the admin area — same derivation, different sentence.
      const wrapper = Wrapper({ caption: 'Groups created from this template are:' })

      expect(wrapper.text()).toContain('Groups created from this template are:')
    })
  })

  describe('the switches', () => {
    it('ticks the ones the roles already hold', () => {
      const wrapper = Wrapper({ roles: rolesWith([], ['group.post.create']) })

      expect(at(wrapper, 'switch-members-post').element.checked).toBe(true)
      expect(at(wrapper, 'switch-members-comment').element.checked).toBe(false)
    })

    it('reports a tick as the role it would leave behind, and writes nothing itself', async () => {
      // The draft is the page's: the matrix under this edits the same roles, and one draft for
      // both is what lets a tick in either show up in the other. The component owns no mutation
      // either — the group level writes a group role, the admin level a template role.
      const wrapper = mount(GroupRightsSimple, {
        localVue,
        mocks: { $t: (key) => key },
        propsData: { roles: rolesWith(), catalog: CATALOG, caption: 'Resulting:' },
      })

      await at(wrapper, 'switch-nonmembers-read').setChecked(true)

      expect(wrapper.emitted('change')).toEqual([['none', ['group.content.read', 'group.read']]])
    })

    it('previews what the draft would make the group, before it is saved', async () => {
      // The whole reason a draft exists: the consequence has to be readable while it is still
      // one, not discovered after the fact.
      const wrapper = Wrapper({ roles: rolesWith([]) })

      expect(at(wrapper, 'visibility-hidden').exists()).toBe(true)

      await at(wrapper, 'switch-nonmembers-read').setChecked(true)

      expect(at(wrapper, 'visibility-public').exists()).toBe(true)
    })

    it('shows the roles it is handed, so a change made elsewhere on the page shows up here', async () => {
      // A tick in the matrix reaches this component the same way: as the roles it is handed.
      const wrapper = Wrapper({ roles: rolesWith([]) })

      await wrapper.setProps({ roles: rolesWith(['group.read']) })

      expect(at(wrapper, 'visibility-closed').exists()).toBe(true)
      expect(at(wrapper, 'switch-nonmembers-profile').element.checked).toBe(true)
    })

    it('locks every row when the page says so, and says why', () => {
      const wrapper = Wrapper({ disabled: true, disabledHint: 'Save first' })

      expect(at(wrapper, 'switch-members-post').element.disabled).toBe(true)
      expect(wrapper.find('.switch label').attributes('title')).toBe('Save first')
    })

    it('locks a single row the viewer may not grant, with that row’s own reason', () => {
      // A closed feature gate or a missing network right blocks one right, not the screen.
      const wrapper = Wrapper({
        grantable: (permission) => permission.key !== 'group.chat.participate',
        hintFor: (permission) =>
          permission.key === 'group.chat.participate' ? 'Chat is switched off' : null,
      })

      expect(at(wrapper, 'switch-members-chat').element.disabled).toBe(true)
      expect(at(wrapper, 'switch-members-post').element.disabled).toBe(false)
    })

    it('locks a row whose role does not exist rather than offering a write that cannot land', () => {
      const wrapper = Wrapper({ roles: [{ name: 'none', permissions: [] }] })

      expect(at(wrapper, 'switch-members-post').element.disabled).toBe(true)
    })
  })

  describe('how somebody gets in', () => {
    // The question that had no control at all: the screen said "nobody can ask to join at the
    // moment" and offered no way to change it. Three states of one question, so a select —
    // two checkboxes would let somebody express "anybody may enter AND must ask".
    it('marks which of the three the group is on, all three readable at once', () => {
      // A row of buttons rather than a dropdown: the options are opposite ends of one scale,
      // and a closed dropdown shows neither of the others next to the one it has.
      const wrapper = Wrapper({ roles: rolesWith(['group.read', 'group.join']) })

      expect(at(wrapper, 'admission-option-open').classes()).toContain('toggle-group__item--active')
      expect(at(wrapper, 'admission-option-closed').classes()).not.toContain(
        'toggle-group__item--active',
      )
      expect(at(wrapper, 'admission-option-open').attributes('aria-checked')).toBe('true')
    })

    it('names the state the non-member role puts the group in', () => {
      expect(at(Wrapper({ roles: rolesWith([]) }), 'admission-closed').exists()).toBe(true)
      expect(at(Wrapper({ roles: rolesWith(['group.join']) }), 'admission-open').exists()).toBe(
        true,
      )
      expect(
        at(Wrapper({ roles: rolesWith(['group.join.request']) }), 'admission-onRequest').exists(),
      ).toBe(true)
    })

    it('changes the door, replacing the other answer rather than adding to it', async () => {
      const wrapper = Wrapper({ roles: rolesWith(['group.read', 'group.join.request']) })

      await at(wrapper, 'admission-option-open').trigger('click')

      expect(wrapper.emitted('change')).toEqual([['none', ['group.read', 'group.join']]])
    })

    it('previews the new door before it is saved', async () => {
      // A group that can be SEEN — on a hidden one there is no door to set (below).
      const wrapper = Wrapper({ roles: rolesWith(['group.read']) })

      await at(wrapper, 'admission-option-onRequest').trigger('click')

      expect(at(wrapper, 'admission-onRequest').exists()).toBe(true)
    })

    it('offers no door at all on a group nobody outside can find', async () => {
      // Entering and asking to enter both begin with finding the group. The backend drops both
      // rights for the same reason, so offering the choice here would promise something the
      // save would silently undo.
      const wrapper = Wrapper({ roles: rolesWith([]) })

      expect(at(wrapper, 'admission-locked').exists()).toBe(true)
      // Only the door it has is shown, and it cannot be changed.
      expect(at(wrapper, 'admission-option-open').exists()).toBe(false)
      expect(at(wrapper, 'admission-option-closed').element.disabled).toBe(true)
      expect(at(wrapper, 'admission-closed').exists()).toBe(true)
    })

    it('offers it again as soon as the group can be seen', async () => {
      const wrapper = Wrapper({ roles: rolesWith([]) })

      await at(wrapper, 'switch-nonmembers-profile').setChecked(true)

      expect(at(wrapper, 'admission-locked').exists()).toBe(false)
      expect(at(wrapper, 'admission-option-open').element.disabled).toBe(false)
    })
  })
})

describe('what it points at', () => {
  const Wrapper = (propsData = {}) =>
    mount(GroupRightsSimple, {
      localVue,
      mocks: { $t: (key) => key },
      propsData: { roles: rolesWith(), catalog: CATALOG, caption: 'Resulting:', ...propsData },
    })

  it('names the role and the rights one sentence stands for', async () => {
    // What makes the matrix below readable: the sentence says "members may write posts", the
    // matrix says `group.post.create` on the `usual` tab, and the hover is what joins the two.
    const wrapper = Wrapper()

    await wrapper.find('[data-test="switch-row-members-post"]').trigger('mouseenter')

    expect(wrapper.emitted('highlight').at(-1)).toEqual([{ usual: ['group.post.create'] }])
  })

  it('carries the implied right along, as the tick itself would', () => {
    const wrapper = Wrapper()

    wrapper.find('[data-test="switch-row-nonmembers-read"]').trigger('mouseenter')

    const [marked] = wrapper.emitted('highlight').at(-1)
    expect(marked.none.sort()).toEqual(['group.content.read', 'group.read'])
  })

  it('points at both join rights from any of the three door buttons', async () => {
    // Picking a state rewrites the PAIR, so "nobody may ask" is as much about `group.join` as
    // "anybody may walk in" is.
    const wrapper = Wrapper({ roles: rolesWith(['group.read']) })

    await wrapper.find('[data-test="admission-option-closed"]').trigger('mouseenter')

    const [marked] = wrapper.emitted('highlight').at(-1)
    expect(marked.none.sort()).toEqual(['group.join', 'group.join.request'])
  })

  it('points at the applicant role from the door, which decides whether there are any', async () => {
    const wrapper = Wrapper({ roles: rolesWith(['group.read']) })

    await wrapper.find('[data-test="admission-option-onRequest"]').trigger('mouseenter')

    const [marked] = wrapper.emitted('highlight').at(-1)
    expect(marked.pending).toEqual([])
  })

  it('points from a LOCKED sentence too, so a blocked right can still be found', async () => {
    // The handler sits on the row rather than on the input: a right one may not grant is the
    // one a reader most needs to locate in the matrix.
    const wrapper = Wrapper({ disabled: true })

    await wrapper.find('[data-test="switch-row-members-post"]').trigger('mouseenter')

    expect(wrapper.emitted('highlight').at(-1)).toEqual([{ usual: ['group.post.create'] }])
  })

  it('stops pointing when the cursor leaves', async () => {
    const wrapper = Wrapper()

    await wrapper.find('[data-test="switch-row-members-post"]').trigger('mouseenter')
    await wrapper.find('[data-test="switch-row-members-post"]').trigger('mouseleave')

    expect(wrapper.emitted('highlight').at(-1)).toEqual([null])
  })
})

describe('what a click would do', () => {
  // Hovering anything that changes rights — a sentence, a door, a template, a matrix row — shows
  // what clicking it would do to every sentence and both states, before anything changes.
  const Wrapper = (propsData = {}) =>
    mount(GroupRightsSimple, {
      localVue,
      mocks: { $t: (key) => key },
      propsData: {
        roles: rolesWith(['group.read', 'group.join.request']),
        catalog: [...CATALOG, { key: 'group.join' }, { key: 'group.join.request' }],
        caption: 'Resulting:',
        ...propsData,
      },
    })

  const row = (wrapper, id) => wrapper.find(`[data-test="switch-row-${id}"]`)

  it('shows nothing while nothing is under the cursor', () => {
    const wrapper = Wrapper()

    expect(wrapper.findAll('[class*="switch--will-"]')).toHaveLength(0)
    expect(wrapper.findAll('.state--changes')).toHaveLength(0)
  })

  it('marks a sentence the preview ticks green and one it unticks red', () => {
    const wrapper = Wrapper({
      preview: rolesWith(['group.read', 'group.join.request'], ['group.comment.create']),
    })

    expect(row(wrapper, 'members-comment').classes()).toContain('switch--will-added')
    expect(row(wrapper, 'members-post').classes()).toContain('switch--will-removed')
    expect(row(wrapper, 'members-chat').classes()).toEqual(['switch'])
  })

  it('says what a state would become', () => {
    const wrapper = Wrapper({ preview: rolesWith(['group.read', 'group.content.read']) })

    expect(wrapper.find('[data-test="visibility-closed"]').classes()).toContain('state--changes')
    expect(wrapper.find('[data-test="visibility-next"]').text()).toContain('group.types.public')
    expect(wrapper.find('[data-test="admission-next"]').text()).toContain(
      'group.admission.closed.title',
    )
  })

  it('shows the door opening the applicant sentence up, or closing it, as it would', async () => {
    // Not a tick: the door decides whether the applicant sentence can be answered at all.
    const wrapper = Wrapper()

    await wrapper.find('[data-test="admission-option-open"]').trigger('mouseenter')

    expect(row(wrapper, 'applicants-read').classes()).toContain('switch--will-disabled')
    expect(wrapper.find('[data-test="admission-next"]').text()).toContain(
      'group.admission.open.title',
    )

    await wrapper.find('[data-test="admission-option-open"]').trigger('mouseleave')
    await wrapper.setProps({ roles: rolesWith(['group.read', 'group.join']) })
    await wrapper.find('[data-test="admission-option-onRequest"]').trigger('mouseenter')

    expect(row(wrapper, 'applicants-read').classes()).toContain('switch--will-enabled')
  })

  it('shows nothing for the door the group already has', async () => {
    const wrapper = Wrapper()

    await wrapper.find('[data-test="admission-option-onRequest"]').trigger('mouseenter')

    expect(wrapper.findAll('[class*="switch--will-"]')).toHaveLength(0)
  })

  it('shows a sentence ticking what the coupling would tick along with it', async () => {
    const wrapper = Wrapper({ roles: rolesWith([]) })

    await row(wrapper, 'nonmembers-read').trigger('mouseenter')

    expect(row(wrapper, 'nonmembers-read').classes()).toContain('switch--will-added')
    expect(row(wrapper, 'nonmembers-profile').classes()).toContain('switch--will-added')
    expect(wrapper.find('[data-test="visibility-next"]').text()).toContain('group.types.public')

    await row(wrapper, 'nonmembers-read').trigger('mouseleave')

    expect(wrapper.findAll('[class*="switch--will-"]')).toHaveLength(0)
  })

  it('previews nothing from a sentence that cannot be clicked', async () => {
    const wrapper = Wrapper({ disabled: true })

    await row(wrapper, 'members-post').trigger('mouseenter')

    expect(wrapper.findAll('[class*="switch--will-"]')).toHaveLength(0)
  })

  it('marks the heading of a role whose change no sentence names', () => {
    const wrapper = Wrapper({
      preview: [...rolesWith(['group.read', 'group.join.request'])].map((role) =>
        role.name === 'usual' ? { ...role, permissions: [...role.permissions, 'group.pin'] } : role,
      ),
    })

    expect(wrapper.find('[data-test="switch-group-members"]').classes()).toContain(
      'switch-group--changes',
    )
    expect(wrapper.find('[data-test="switch-group-outsiders"]').classes()).not.toContain(
      'switch-group--changes',
    )
  })
})

describe('a sentence with nothing to decide', () => {
  const Wrapper = (propsData = {}) =>
    controlled(GroupRightsSimple, {
      localVue,
      mocks: { $t: (key) => key },
      propsData: {
        roles: rolesWith(),
        catalog: [...CATALOG, { key: 'group.join' }, { key: 'group.join.request' }],
        caption: 'Resulting:',
        ...propsData,
      },
    })

  it('greys the applicant row while nobody can ask to join', () => {
    // An open door and a shut one both produce no applicants, so "waiting applicants may read
    // the posts" is a question about nobody.
    const wrapper = Wrapper({ roles: rolesWith(['group.read', 'group.join']) })

    expect(wrapper.find('[data-test="switch-applicants-read"]').attributes('disabled')).toBe(
      'disabled',
    )
    expect(wrapper.find('[data-test="switch-row-applicants-read"]').text()).toContain(
      'group.rights.simple.applicants-read',
    )
  })

  it('leaves it editable where somebody can ask', () => {
    const wrapper = Wrapper({ roles: rolesWith(['group.read', 'group.join.request']) })

    expect(
      wrapper.find('[data-test="switch-applicants-read"]').attributes('disabled'),
    ).toBeUndefined()
  })

  it('follows the DRAFT, so picking a door greys it straight away', async () => {
    // The two controls sit side by side. A consequence that waits for a save is worse than
    // none: the screen would show a door nobody can queue at and a question about the queue.
    const wrapper = Wrapper({ roles: rolesWith(['group.read', 'group.join.request']) })

    await wrapper.find('[data-test="admission-option-open"]').trigger('click')

    expect(wrapper.find('[data-test="switch-applicants-read"]').attributes('disabled')).toBe(
      'disabled',
    )
  })

  it('says why, rather than greying it silently', () => {
    const wrapper = Wrapper({ roles: rolesWith(['group.read', 'group.join']) })

    expect(wrapper.find('[data-test="switch-row-applicants-read"] label').attributes('title')).toBe(
      'group.rights.pendingBlocked',
    )
  })
})
