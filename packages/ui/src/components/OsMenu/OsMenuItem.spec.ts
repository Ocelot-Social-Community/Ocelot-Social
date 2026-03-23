/**
 * OsMenuItem unit tests are colocated in OsMenu.spec.ts
 * since OsMenuItem requires OsMenu as a parent provider.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsMenuItem from './OsMenuItem.vue'

const parentMenu = {
  linkTag: 'a',
  urlParser: (route: Record<string, unknown>) => (route.path as string) || '/',
  nameParser: (route: Record<string, unknown>) => (route.name as string) || '',
  matcher: () => false,
  isExact: (url: string) => url === '/',
  handleNavigate: () => {},
}

describe('keyboard accessibility', () => {
  it('renders as a focusable link element', () => {
    const wrapper = mount(OsMenuItem, {
      props: { route: { name: 'Test', path: '/test' } },
      global: { provide: { $parentMenu: parentMenu } },
    })
    const link = wrapper.find('.os-menu-item-link')

    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('/test')
  })
})
