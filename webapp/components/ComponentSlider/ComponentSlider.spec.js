import { mount } from '@vue/test-utils'
import ComponentSlider from './ComponentSlider.vue'

const localVue = global.localVue

describe('ComponentSlider.vue', () => {
  let wrapper
  let mocks
  let propsData

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
    }
    propsData = {
      sliderData: {
        sliderIndex: 0,
        sliderSelectorCallback: jest.fn().mockResolvedValue(true),
        sliders: [
          {
            validated: true,
            button: {
              icon: 'smile',
              callback: jest.fn().mockResolvedValue(true),
              sliderCallback: jest.fn().mockResolvedValue(true),
            },
          },
          {
            validated: true,
            button: {
              icon: 'smile',
              callback: jest.fn().mockResolvedValue(true),
              sliderCallback: jest.fn().mockResolvedValue(true),
            },
          },
        ],
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(ComponentSlider, {
        mocks,
        localVue,
        propsData,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.is('div')).toBe(true)
    })

    it('click on next Button', async () => {
      await wrapper.find('.base-button[data-test="next-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect(propsData.sliderData.sliderSelectorCallback).toHaveBeenCalled()
    })
  })
})
