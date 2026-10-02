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

    it('reports which ROLE and which RIGHT changed, so the page can save it', () => {
      // The component owns no mutation: the group level writes a group role, the admin level a
      // template role, and only the page knows which.
      const wrapper = Wrapper()

      at(wrapper, 'switch-nonmembers-read').setChecked(true)

      expect(wrapper.emitted('toggle')).toEqual([['none', 'group.content.read', true]])
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

  describe('the applicant rights', () => {
    it('says so when nobody can become an applicant at all', () => {
      // Nothing grants `group.join.request`, so the `pending` role is never held and every
      // right on it is inert. Said rather than hidden: enabling the request is one tick away.
      const wrapper = Wrapper()

      expect(at(wrapper, 'no-applicants-note').exists()).toBe(true)
    })

    it('stays quiet once some role may ask to join', () => {
      const wrapper = Wrapper({
        roles: [
          { name: 'none', permissions: ['group.join.request'] },
          { name: 'pending', permissions: [] },
          { name: 'usual', permissions: [] },
        ],
      })

      expect(at(wrapper, 'no-applicants-note').exists()).toBe(false)
    })
  })
})
