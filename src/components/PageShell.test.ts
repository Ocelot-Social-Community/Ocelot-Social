import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import PageShell from './PageShell.vue'

describe('PageShell', () => {
  const wrapper = mount(PageShell, {
    slots: {
      default: 'Page Content',
    },
  })

  it('renders', () => {
    expect(wrapper.element).toMatchSnapshot()
  })
})
