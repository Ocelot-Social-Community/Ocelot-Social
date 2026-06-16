import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import moderation from './moderation.vue'

const stubs = {
  'nuxt-child': true,
}

const localVue = global.localVue

describe('moderation.vue', () => {
  let mocks

  const Wrapper = ({ isModerator = true, canManageBadges = true } = {}) => {
    mocks = {
      $t: jest.fn((key) => key),
      $can: jest.fn((permission) => canManageBadges && permission === 'badge.manage'),
    }
    const store = new Vuex.Store({
      getters: { 'auth/isModerator': () => isModerator },
    })
    return mount(moderation, { mocks, localVue, store, stubs })
  }

  it('renders', () => {
    expect(Wrapper().element.tagName).toBe('DIV')
  })

  it('shows the reports entry for a content moderator', () => {
    const routes = Wrapper({ isModerator: true }).vm.routes
    expect(routes.map((r) => r.path)).toContain('/moderation')
  })

  it('shows the badges entry for a badge.manage holder', () => {
    const routes = Wrapper({ canManageBadges: true }).vm.routes
    expect(routes.map((r) => r.path)).toContain('/moderation/users')
  })

  it('hides the reports entry without content.moderate', () => {
    const routes = Wrapper({ isModerator: false }).vm.routes
    expect(routes.map((r) => r.path)).not.toContain('/moderation')
  })

  it('hides the badges entry without badge.manage', () => {
    const routes = Wrapper({ canManageBadges: false }).vm.routes
    expect(routes.map((r) => r.path)).not.toContain('/moderation/users')
  })
})
