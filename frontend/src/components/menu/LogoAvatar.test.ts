import { mount } from '@vue/test-utils'
import { beforeEach, expect, describe, it } from 'vitest'

import LogoAvatar from './LogoAvatar.vue'

describe('LogoAvatar', () => {
  const Wrapper = () => {
    return mount(LogoAvatar)
  }
  let wrapper: ReturnType<typeof Wrapper>

  beforeEach(() => {
    wrapper = Wrapper()
  })

  it('renders', () => {
    expect(wrapper.element).toMatchSnapshot()
  })
})
