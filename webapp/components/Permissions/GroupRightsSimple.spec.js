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

describe('GroupRightsSimple', () => {
  const Wrapper = (propsData = {}) =>
    mount(GroupRightsSimple, {
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

    it('collects the ticks into a draft and writes nothing until it is saved', async () => {
      // One tick here can open a group to the whole network. The component owns no mutation
      // either: the group level writes a group role, the admin level a template role, and only
      // the page knows which — so the save hands over WHAT changed, per role.
      const wrapper = Wrapper()

      await at(wrapper, 'switch-nonmembers-read').setChecked(true)

      expect(wrapper.emitted('save')).toBeUndefined()

      await at(wrapper, 'simple-save').trigger('click')

      expect(wrapper.emitted('save')).toEqual([
        [[{ name: 'none', permissions: ['group.content.read', 'group.read'] }]],
      ])
    })

    it('previews what the draft would make the group, before it is saved', async () => {
      // The whole reason the save exists: the consequence has to be readable while it is still
      // a draft, not discovered after the fact.
      const wrapper = Wrapper({ roles: rolesWith([]) })

      expect(at(wrapper, 'visibility-hidden').exists()).toBe(true)

      await at(wrapper, 'switch-nonmembers-read').setChecked(true)

      expect(at(wrapper, 'visibility-public').exists()).toBe(true)
    })

    it('throws the draft away on cancel', async () => {
      const wrapper = Wrapper({ roles: rolesWith([]) })

      await at(wrapper, 'switch-nonmembers-read').setChecked(true)
      await at(wrapper, 'simple-revert').trigger('click')

      expect(at(wrapper, 'visibility-hidden').exists()).toBe(true)
      expect(at(wrapper, 'simple-save').attributes('disabled')).toBeTruthy()
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
      const wrapper = Wrapper({ roles: rolesWith(['group.join']) })

      expect(at(wrapper, 'admission-option-open').classes()).toContain('admission-option--active')
      expect(at(wrapper, 'admission-option-closed').classes()).not.toContain(
        'admission-option--active',
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
      await at(wrapper, 'simple-save').trigger('click')

      expect(wrapper.emitted('save')).toEqual([
        [[{ name: 'none', permissions: ['group.read', 'group.join'] }]],
      ])
    })

    it('previews the new door before it is saved', async () => {
      const wrapper = Wrapper({ roles: rolesWith([]) })

      await at(wrapper, 'admission-option-onRequest').trigger('click')

      expect(at(wrapper, 'admission-onRequest').exists()).toBe(true)
    })
  })
})
