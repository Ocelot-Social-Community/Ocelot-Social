import { mount } from '@vue/test-utils'
import { navigate } from 'vike/client/router'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import IconSVG from './IconSVG.vue'

vi.mock('vike/client/router')
vi.mocked(navigate).mockResolvedValue()

describe('IconSVG', () => {
  const Wrapper = () => {
    return mount(IconSVG, {
      props: {
        icon: '$history',
        color: 'green',
        size: 'large',
      },
    })
  }
  let wrapper: ReturnType<typeof Wrapper>

  beforeEach(() => {
    wrapper = Wrapper()
  })

  it('renders and tests if the custom icons are installed', () => {
    expect(wrapper.element).toMatchSnapshot()
  })

  it('applies class "svg-color"', () => {
    expect(wrapper.find('.svg-color').exists()).toBe(true)
  })

  it.todo('finds "color", "fill" and "stroke" in class', () => {
    // see: https://runthatline.com/test-css-module-classes-in-vue-with-vitest/
    // expect(wrapper.classes()).toContain('color')
    // expect(wrapper.classes()).toContain('fill')
    // expect(wrapper.classes()).toContain('stroke')
  })

  it.todo('sets right "color" in class', () => {
    // expect(wrapper.find('.svg-color').attributes('style')).toContain(
    //   '--ff7c8758-props\\.color: green;',
    // )
  })
})
