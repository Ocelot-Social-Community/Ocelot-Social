import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import DataDownload from './data-download.vue'

const localVue = global.localVue

describe('data-download.vue', () => {
  let wrapper
  let mocks
  let store

  beforeEach(() => {
    mocks = {
      $t: jest.fn((v) => v),
      $toast: { error: jest.fn(), success: jest.fn() },
    }
    store = new Vuex.Store({
      getters: {
        'auth/user': () => ({ id: 'u1', name: 'TestUser' }),
      },
    })
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(DataDownload, {
        mocks,
        localVue,
        store,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.classes('os-card')).toBe(true)
    })

    describe('jsonData computed', () => {
      it('returns stringified userData', () => {
        wrapper.setData({ userData: { name: 'Test' } })
        expect(wrapper.vm.jsonData).toEqual({
          data: JSON.stringify({ name: 'Test' }, null, 2),
          type: 'json',
        })
      })
    })

    describe('onClick', () => {
      it('creates a download link and clicks it', () => {
        const mockUrl = 'blob:test'
        window.URL.createObjectURL = jest.fn().mockReturnValue(mockUrl)
        const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {})
        const clickSpy = jest.fn()
        jest.spyOn(document, 'createElement').mockReturnValue({
          href: '',
          setAttribute: jest.fn(),
          click: clickSpy,
        })

        wrapper.vm.onClick({ data: '{"test": true}', type: 'json' })

        expect(window.URL.createObjectURL).toHaveBeenCalled()
        expect(clickSpy).toHaveBeenCalled()

        appendSpy.mockRestore()
        document.createElement.mockRestore()
      })
    })

    describe('apollo queryUserData config', () => {
      it('query returns a function result', () => {
        const apolloConfig = wrapper.vm.$options.apollo.queryUserData
        const queryFn = apolloConfig.query.bind(wrapper.vm)
        expect(queryFn()).toBeDefined()
      })

      it('variables returns user id', () => {
        const apolloConfig = wrapper.vm.$options.apollo.queryUserData
        const variablesFn = apolloConfig.variables.bind(wrapper.vm)
        expect(variablesFn()).toEqual({ id: 'u1' })
      })
    })

    describe('apollo queryUserData update', () => {
      it('sets userData and loading', () => {
        const apolloConfig = wrapper.vm.$options.apollo.queryUserData
        const update = apolloConfig.update.bind(wrapper.vm)

        update({
          userData: {
            user: { id: 'u1' },
            posts: [
              { id: 'p1', author: { id: 'u1' }, image: { url: 'img.jpg' }, title: 'My Post' },
              { id: 'p2', author: { id: 'u2' }, image: { url: 'other.jpg' }, title: 'Other Post' },
              { id: 'p3', author: { id: 'u1' }, image: null, title: 'No Image' },
            ],
          },
        })

        expect(wrapper.vm.loading).toBe(false)
        expect(wrapper.vm.imageList).toHaveLength(1)
        expect(wrapper.vm.imageList[0]).toEqual({
          key: 'p1',
          url: 'img.jpg',
          title: 'My Post',
        })
      })

      it('handles empty userData', () => {
        const apolloConfig = wrapper.vm.$options.apollo.queryUserData
        const update = apolloConfig.update.bind(wrapper.vm)

        const result = update({ userData: {} })
        expect(result).toBeNull()
        expect(wrapper.vm.loading).toBe(false)
      })

      it('handles userData with empty userId', () => {
        const apolloConfig = wrapper.vm.$options.apollo.queryUserData
        const update = apolloConfig.update.bind(wrapper.vm)

        const result = update({ userData: { user: { id: '' }, posts: [] } })
        expect(result).toBeNull()
      })
    })
  })
})
