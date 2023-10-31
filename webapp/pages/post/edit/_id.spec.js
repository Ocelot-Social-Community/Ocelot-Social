import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import _id from './_id.vue'

const localVue = global.localVue

describe('post/_id.vue', () => {
  let wrapper
  let mocks
  let store
  let asyncData
  let error
  let userId
  let authorId

  beforeEach(() => {
    asyncData = false
    error = jest.fn()
  })

  describe('mount', () => {
    const Wrapper = async () => {
      mocks = {
        $t: jest.fn(),
        $i18n: {
          locale: () => 'en',
        },
        apolloProvider: {
          defaultClient: {
            query: jest.fn().mockResolvedValue({
              data: {
                Post: [
                  {
                    author: { id: authorId },
                    postType: ['Article'],
                  },
                ],
              },
            }),
          },
        },
        $env: {
          CATEGORIES_ACTIVE: false,
        },
      }
      store = new Vuex.Store({
        getters: {
          'auth/user': () => {
            return { id: userId }
          },
        },
      })
      if (asyncData) {
        const data = _id.data ? _id.data() : {}
        const aData = await _id.asyncData({
          app: mocks,
          store,
          error,
          params: { id: '123' },
        })
        _id.data = function () {
          return { ...data, ...aData }
        }
      }
      return mount(_id, { store, mocks, localVue })
    }

    it('renders', async () => {
      asyncData = false
      wrapper = await Wrapper()
      expect(wrapper.findAll('.contribution-form')).toHaveLength(1)
    })

    it('renders with asyncData of different users', async () => {
      asyncData = true
      authorId = 'some-author'
      userId = 'some-user'
      wrapper = await Wrapper()
      expect(error).toHaveBeenCalledWith({
        message: 'error-pages.cannot-edit-post',
        statusCode: 403,
      })
    })

    it('renders with asyncData of same user', async () => {
      asyncData = true
      authorId = 'some-author'
      userId = 'some-author'
      wrapper = await Wrapper()
      expect(error).not.toHaveBeenCalled()
    })
  })
})
