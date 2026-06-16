import { mount } from '@vue/test-utils'
import moderation from './moderation.vue'

const stubs = {
  'nuxt-child': true,
}

const localVue = global.localVue

describe('moderation.vue', () => {
  let mocks

  // `can` maps a permission key → boolean. `route`/`router` only needed by the
  // redirect tests.
  const Wrapper = ({ can = () => true, route, router } = {}) => {
    mocks = {
      $t: jest.fn((key) => key),
      $can: jest.fn(can),
      ...(route ? { $route: route } : {}),
      ...(router ? { $router: router } : {}),
    }
    return mount(moderation, { mocks, localVue, stubs })
  }

  it('renders', () => {
    expect(Wrapper().element.tagName).toBe('DIV')
  })

  it('shows reports and users for a full moderator', () => {
    const paths = Wrapper().vm.accessibleRoutes.map((r) => r.path)
    expect(paths).toEqual(['/moderation', '/moderation/users'])
  })

  it('shows only users for a badge-only moderator (no content.moderate)', () => {
    const paths = Wrapper({ can: (p) => p === 'badge.manage' }).vm.accessibleRoutes.map(
      (r) => r.path,
    )
    expect(paths).toEqual(['/moderation/users'])
  })

  it('redirects from the inaccessible reports landing to the first accessible page', () => {
    const replace = jest.fn(() => Promise.resolve())
    Wrapper({
      can: (p) => p === 'user.delete.any',
      route: { path: '/moderation' },
      router: { replace },
    })
    expect(replace).toHaveBeenCalledWith('/moderation/users')
  })

  it('does not redirect during server-side rendering', () => {
    const replace = jest.fn()
    const original = process.server
    process.server = true
    try {
      Wrapper({
        can: (p) => p === 'user.delete.any',
        route: { path: '/moderation' },
        router: { replace },
      })
    } finally {
      process.server = original
    }
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows the error (and no menu) when no sub-page is accessible', () => {
    // e.g. a post.pin-only holder: in the moderation group, but no moderation PAGE.
    const wrapper = Wrapper({ can: () => false })
    expect(wrapper.vm.areaHasNoAccessibleRoute).toBe(true)
    expect(wrapper.vm.accessibleRoutes).toEqual([])
    expect(wrapper.text()).toContain('site.error-occurred')
  })
})
