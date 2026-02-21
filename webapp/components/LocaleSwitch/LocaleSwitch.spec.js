import { mount } from '@vue/test-utils'

import LocaleSwitch from './LocaleSwitch.vue'
import Vuex from 'vuex'

const localVue = global.localVue

const stubs = {
  'client-only': { template: '<div><slot /></div>' },
}

describe('LocaleSwitch.vue', () => {
  let wrapper, mocks, computed, getters

  beforeEach(() => {
    mocks = {
      $i18n: {
        locale: () => 'en',
        set: jest.fn((locale) => locale),
      },
      $t: jest.fn(),
      $toast: {
        success: jest.fn((a) => a),
        error: jest.fn((a) => a),
      },
      setPlaceholderText: jest.fn(),
      $apollo: {
        mutate: jest
          .fn()
          .mockResolvedValueOnce({
            data: {
              UpdateUser: {
                locale: 'de',
              },
            },
          })
          .mockRejectedValueOnce({
            message: 'Please log in!',
          }),
      },
    }
    computed = {
      current: () => {
        return { code: 'en' }
      },
      routes: () => {
        return [
          {
            name: 'English',
            path: 'en',
          },
          {
            name: 'Deutsch',
            path: 'de',
          },
        ]
      },
    }
    getters = {
      'auth/user': () => {
        return { id: 'u35' }
      },
    }
  })

  const Wrapper = () => {
    const store = new Vuex.Store({
      getters,
    })
    return mount(LocaleSwitch, { mocks, localVue, computed, store, stubs })
  }

  describe('with current user', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.changeLanguage('de', jest.fn())
    })

    it("sets a user's locale", () => {
      expect(mocks.$i18n.set).toHaveBeenCalledWith('de')
    })

    it("updates the user's locale in the database", () => {
      expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
    })
  })

  describe('when apollo mutation fails', () => {
    beforeEach(async () => {
      wrapper = Wrapper()
      // First call succeeds (consumes mockResolvedValueOnce)
      await wrapper.vm.changeLanguage('de', jest.fn())
      // Second call fails (consumes mockRejectedValueOnce)
      await wrapper.vm.changeLanguage('en', jest.fn())
    })

    it('shows an error toast', () => {
      expect(mocks.$toast.error).toHaveBeenCalledWith('Please log in!')
    })
  })

  describe('no current user', () => {
    beforeEach(() => {
      getters = {
        'auth/user': () => {
          return null
        },
      }
      wrapper = Wrapper()
      wrapper.vm.changeLanguage('de', jest.fn())
    })

    it('does not send a UpdateUser mutation', () => {
      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
    })
  })
})
