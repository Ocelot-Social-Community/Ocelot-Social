import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import OsMenu from './OsMenu.vue'
import OsMenuItem from './OsMenuItem.vue'

const routes = [
  { name: 'Home', path: '/' },
  { name: 'Settings', path: '/settings' },
  { name: 'Profile', path: '/profile' },
]

const nestedRoutes = [
  { name: 'Home', path: '/' },
  {
    name: 'Posts',
    path: '/posts',
    children: [
      { name: 'All', path: '/posts/all' },
      { name: 'Drafts', path: '/posts/drafts' },
    ],
  },
]

describe('osMenu', () => {
  it('renders a nav element with os-menu class', () => {
    const wrapper = mount(OsMenu, { props: { routes } })

    expect(wrapper.find('nav.os-menu').exists()).toBe(true)
  })

  it('renders a ul.os-menu-list', () => {
    const wrapper = mount(OsMenu, { props: { routes } })

    expect(wrapper.find('ul.os-menu-list').exists()).toBe(true)
  })

  it('renders menu items for each route', () => {
    const wrapper = mount(OsMenu, { props: { routes } })
    const items = wrapper.findAll('.os-menu-item')

    expect(items).toHaveLength(3)
  })

  it('uses default linkTag "a"', () => {
    const wrapper = mount(OsMenu, { props: { routes } })
    const links = wrapper.findAll('.os-menu-item-link')

    expect(links[0].element.tagName).toBe('A')
  })

  it('passes custom linkTag to items', () => {
    const wrapper = mount(OsMenu, {
      props: { routes, linkTag: 'button' },
    })
    const links = wrapper.findAll('.os-menu-item-link')

    expect(links[0].element.tagName).toBe('BUTTON')
  })

  it('applies custom nameParser', () => {
    const wrapper = mount(OsMenu, {
      props: {
        routes: [{ name: 'test', path: '/test' }],
        nameParser: () => 'Custom Name',
      },
    })

    expect(wrapper.find('.os-menu-item-link').text()).toBe('Custom Name')
  })

  it('applies matcher for active state', () => {
    const wrapper = mount(OsMenu, {
      props: {
        routes,
        matcher: (_url: string, route: Record<string, unknown>) => route.path === '/settings',
      },
    })
    const items = wrapper.findAll('.os-menu-item-link')
    const settingsLink = items[1]

    expect(settingsLink.classes()).toContain('os-menu-item--active')
  })

  it('renders menuitem scoped slot', () => {
    const wrapper = mount(OsMenu, {
      props: { routes },
      slots: {
        menuitem: `<template #menuitem="{ route, name }">
          <li class="custom-item">{{ name }}</li>
        </template>`,
      },
    })

    expect(wrapper.findAll('.custom-item')).toHaveLength(3)
  })

  it('emits navigate on item click', async () => {
    const wrapper = mount(OsMenu, { props: { routes } })

    await wrapper.find('.os-menu-item-link').trigger('click')

    expect(wrapper.emitted('navigate')).toBe(true)
  })
})

describe('osMenuItem', () => {
  const parentMenu = {
    linkTag: 'a',
    urlParser: (route: Record<string, unknown>) => (route.path as string) || '/',
    nameParser: (route: Record<string, unknown>) => (route.name as string) || '',
    matcher: () => false,
    isExact: (url: string) => url === '/',
    handleNavigate: () => {},
  }

  it('renders an li with os-menu-item class', () => {
    const wrapper = mount(OsMenuItem, {
      props: { route: routes[0] },
      global: { provide: { $parentMenu: parentMenu } },
    })

    expect(wrapper.find('li.os-menu-item').exists()).toBe(true)
  })

  it('renders link with correct href', () => {
    const wrapper = mount(OsMenuItem, {
      props: { route: { name: 'Test', path: '/test' } },
      global: { provide: { $parentMenu: parentMenu } },
    })

    expect(wrapper.find('.os-menu-item-link').attributes('href')).toBe('/test')
  })

  it('displays route name', () => {
    const wrapper = mount(OsMenuItem, {
      props: { route: { name: 'My Item', path: '/item' } },
      global: { provide: { $parentMenu: parentMenu } },
    })

    expect(wrapper.find('.os-menu-item-link').text()).toBe('My Item')
  })

  it('applies level class based on parents', () => {
    const wrapper = mount(OsMenuItem, {
      props: {
        route: { name: 'Child', path: '/child' },
        parents: [{ name: 'Parent', path: '/parent' }],
      },
      global: { provide: { $parentMenu: parentMenu } },
    })

    expect(wrapper.find('.os-menu-item').classes()).toContain('os-menu-item-level-1')
  })

  it('emits click with route on click', async () => {
    const route = { name: 'Test', path: '/test' }
    const wrapper = mount(OsMenuItem, {
      props: { route },
      global: { provide: { $parentMenu: parentMenu } },
    })

    await wrapper.find('.os-menu-item-link').trigger('click')

    const clicks = wrapper.emitted('click')
    expect(clicks).toBeTruthy()
    expect(clicks?.[0]?.[1]).toStrictEqual(route)
  })

  it('renders submenu for routes with children', () => {
    const wrapper = mount(OsMenuItem, {
      props: { route: nestedRoutes[1] },
      global: { provide: { $parentMenu: parentMenu } },
    })

    expect(wrapper.find('.os-menu-item-submenu').exists()).toBe(true)
    expect(wrapper.findAll('.os-menu-item-submenu .os-menu-item')).toHaveLength(2)
  })

  it('renders default slot content', () => {
    const wrapper = mount(OsMenuItem, {
      props: { route: { name: 'Test', path: '/test' } },
      global: { provide: { $parentMenu: parentMenu } },
      slots: { default: '<strong>Custom</strong>' },
    })

    expect(wrapper.find('.os-menu-item-link strong').text()).toBe('Custom')
  })

  it('adds active class when matcher returns true', () => {
    const activeMenu = {
      ...parentMenu,
      matcher: () => true,
    }
    const wrapper = mount(OsMenuItem, {
      props: { route: { name: 'Test', path: '/test' } },
      global: { provide: { $parentMenu: activeMenu } },
    })

    expect(wrapper.find('.os-menu-item-link').classes()).toContain('os-menu-item--active')
  })
})
