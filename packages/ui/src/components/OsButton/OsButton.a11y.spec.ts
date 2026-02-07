import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'

import OsButton from './OsButton.vue'

describe('osButton accessibility', () => {
  it('has no accessibility violations with default props', async () => {
    const wrapper = mount(OsButton, {
      slots: { default: 'Click me' },
    })
    const results = await axe(wrapper.element as Element)
    expect(results).toHaveNoViolations()
  })

  it('has no accessibility violations when disabled', async () => {
    const wrapper = mount(OsButton, {
      props: { disabled: true },
      slots: { default: 'Disabled button' },
    })
    const results = await axe(wrapper.element as Element)
    expect(results).toHaveNoViolations()
  })

  it('has no accessibility violations with different variants', async () => {
    const variants = ['primary', 'secondary', 'danger', 'outline', 'ghost'] as const

    for (const variant of variants) {
      const wrapper = mount(OsButton, {
        props: { variant },
        slots: { default: `${variant} button` },
      })
      const results = await axe(wrapper.element as Element)
      expect(results).toHaveNoViolations()
    }
  })

  it('has no accessibility violations with different sizes', async () => {
    const sizes = ['sm', 'md', 'lg'] as const

    for (const size of sizes) {
      const wrapper = mount(OsButton, {
        props: { size },
        slots: { default: `${size} button` },
      })
      const results = await axe(wrapper.element as Element)
      expect(results).toHaveNoViolations()
    }
  })

  it('has no accessibility violations as submit button', async () => {
    const wrapper = mount(OsButton, {
      props: { type: 'submit' },
      slots: { default: 'Submit' },
    })
    const results = await axe(wrapper.element as Element)
    expect(results).toHaveNoViolations()
  })
})
