import { mount } from '@vue/test-utils'
import ObserveButton from './ObserveButton.vue'

const localVue = global.localVue

describe('ObserveButton', () => {
  let mocks

  const Wrapper = (count = 1, postId = '123', isObserved = true) => {
    return mount(ObserveButton, {
      mocks,
      localVue,
      propsData: {
        count,
        postId,
        isObserved,
      },
    })
  }

  let wrapper

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    wrapper = Wrapper()
  })

  it('renders', () => {
    expect(wrapper.element).toMatchSnapshot()
  })

  it('renders unobserved', () => {
    wrapper = Wrapper(1, '123', false)
    expect(wrapper.element).toMatchSnapshot()
  })

  it('emits toggleObservePost when clicked', () => {
    wrapper.find('.base-button').trigger('click')
    expect(wrapper.emitted().toggleObservePost).toBeTruthy()
  })
})
