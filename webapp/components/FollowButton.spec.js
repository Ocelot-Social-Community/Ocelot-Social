import { mount } from '@vue/test-utils'
import FollowButton from './FollowButton.vue'

const localVue = global.localVue

describe('FollowButton.vue', () => {
  let mocks
  let propsData

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $apollo: {
        mutate: jest.fn(),
      },
    }
    propsData = {}
  })

  describe('mount', () => {
    let wrapper
    const Wrapper = () => {
      return mount(FollowButton, { mocks, propsData, localVue })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders button and text', () => {
      expect(mocks.$t).toHaveBeenCalledWith('followButton.follow')
      expect(wrapper.findAll('.base-button')).toHaveLength(1)
    })

    it('renders button and text when followed', () => {
      propsData.isFollowed = true
      wrapper = Wrapper()
      expect(mocks.$t).toHaveBeenCalledWith('followButton.following')
      expect(wrapper.findAll('.base-button')).toHaveLength(1)
    })

    it.skip('toggle the button', async () => {
      wrapper.find('.base-button').trigger('click') // This does not work since @click.prevent is used
      expect(wrapper.vm.isFollowed).toBe(true)
    })
  })
})
