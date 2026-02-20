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
      expect(wrapper.findAll('[data-test="follow-btn"]')).toHaveLength(1)
    })

    it('renders button and text when followed', () => {
      propsData.isFollowed = true
      wrapper = Wrapper()
      expect(mocks.$t).toHaveBeenCalledWith('followButton.following')
      expect(wrapper.findAll('[data-test="follow-btn"]')).toHaveLength(1)
    })

    describe('clicking the follow button', () => {
      beforeEach(() => {
        propsData = { followId: 'u1' }
        mocks.$apollo.mutate.mockResolvedValue({
          data: { followUser: { id: 'u1', followedByCurrentUser: true } },
        })
        wrapper = Wrapper()
      })

      it('emits optimistic result', async () => {
        await wrapper.vm.toggle()
        expect(wrapper.emitted('optimistic')[0]).toEqual([{ followedByCurrentUser: true }])
      })

      it('calls followUser mutation', async () => {
        await wrapper.vm.toggle()
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({ variables: { id: 'u1' } }),
        )
      })

      it('emits update with server response', async () => {
        await wrapper.vm.toggle()
        expect(wrapper.emitted('update')[0]).toEqual([{ id: 'u1', followedByCurrentUser: true }])
      })
    })

    describe('clicking the unfollow button', () => {
      beforeEach(() => {
        propsData = { followId: 'u1', isFollowed: true }
        mocks.$apollo.mutate.mockResolvedValue({
          data: { unfollowUser: { id: 'u1', followedByCurrentUser: false } },
        })
        wrapper = Wrapper()
      })

      it('emits optimistic result', async () => {
        await wrapper.vm.toggle()
        expect(wrapper.emitted('optimistic')[0]).toEqual([{ followedByCurrentUser: false }])
      })

      it('calls unfollowUser mutation', async () => {
        await wrapper.vm.toggle()
        expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
          expect.objectContaining({ variables: { id: 'u1' } }),
        )
      })

      it('emits update with server response', async () => {
        await wrapper.vm.toggle()
        expect(wrapper.emitted('update')[0]).toEqual([{ id: 'u1', followedByCurrentUser: false }])
      })
    })
  })
})
