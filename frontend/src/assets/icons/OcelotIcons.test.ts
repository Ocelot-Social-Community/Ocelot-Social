import { mount } from '@vue/test-utils'
import { navigate } from 'vike/client/router'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VIcon } from 'vuetify/components'

vi.mock('vike/client/router')
vi.mocked(navigate).mockResolvedValue()

describe('Ocelot Icons', () => {
  const Wrapper = () => {
    return mount(VIcon, {
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

  it('renders and tests if the ocelot icon "$history" is installed', () => {
    expect(wrapper.element).toMatchSnapshot()
  })
})
