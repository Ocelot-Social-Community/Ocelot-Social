import { config, mount } from '@vue/test-utils'
import Vuex from 'vuex'
import Users from './users.vue'

const localVue = global.localVue
config.stubs['nuxt-link'] = '<span><slot /></span>'

describe('Users', () => {
  let wrapper
  let Wrapper
  let mocks
  let getters

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $apollo: {
        loading: false,
        mutate: jest
          .fn()
          .mockRejectedValue({ message: 'Ouch!' })
          .mockResolvedValue({
            data: {
              switchUserRole: {
                id: 'user',
                email: 'user@example.org',
                name: 'User',
                role: 'moderator',
                slug: 'user',
              },
            },
          }),
      },
      $toast: {
        error: jest.fn(),
        success: jest.fn(),
      },
    }
  })

  describe('mount', () => {
    getters = {
      'auth/isAdmin': () => true,
      'auth/user': () => {
        return { id: 'admin' }
      },
    }

    Wrapper = () => {
      const store = new Vuex.Store({ getters })
      return mount(Users, {
        mocks,
        localVue,
        store,
      })
    }

    it('renders', () => {
      wrapper = Wrapper()
      expect(wrapper.is('div')).toBe(true)
    })

    describe('search', () => {
      let searchAction
      beforeEach(() => {
        searchAction = (wrapper, { query }) => {
          wrapper.find('input').setValue(query)
          wrapper.find('form').trigger('submit')
          return wrapper
        }
      })

      describe('query looks like an email address', () => {
        it('searches users for exact email address', async () => {
          const wrapper = await searchAction(Wrapper(), { query: 'email@example.org' })
          expect(wrapper.vm.email).toEqual('email@example.org')
          expect(wrapper.vm.filter).toBe(null)
        })

        it('email address is case-insensitive', async () => {
          const wrapper = await searchAction(Wrapper(), { query: 'eMaiL@example.org' })
          expect(wrapper.vm.email).toEqual('email@example.org')
          expect(wrapper.vm.filter).toBe(null)
        })
      })

      describe('query is just text', () => {
        it('tries to find matching users by `name`, `slug` or `about`', async () => {
          const wrapper = await searchAction(await Wrapper(), { query: 'Find me' })
          const expected = {
            OR: [
              { name_contains: 'Find me' },
              { slug_contains: 'Find me' },
              { about_contains: 'Find me' },
            ],
          }
          expect(wrapper.vm.email).toBe(null)
          expect(wrapper.vm.filter).toEqual(expected)
        })
      })
    })

    describe('change roles', () => {
      beforeAll(() => {
        wrapper = Wrapper()
        wrapper.setData({
          User: [
            {
              id: 'admin',
              email: 'admin@example.org',
              name: 'Admin',
              role: 'admin',
              slug: 'admin',
            },
            {
              id: 'user',
              email: 'user@example.org',
              name: 'User',
              role: 'user',
              slug: 'user',
            },
          ],
          userRoles: ['user', 'moderator', 'admin'],
        })
      })

      it('cannot change own role', () => {
        const adminRow = wrapper.findAll('tr').at(1)
        expect(adminRow.find('select').exists()).toBe(false)
      })

      it('changes the role of another user', async () => {
        jest.useFakeTimers()

        // console.log(wrapper.html())

        const userRow = wrapper.findAll('tr').at(2)
        await userRow.findAll('option').at(2).setSelected()

        jest.runAllTimers()

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        await mocks.$apollo.mutate
        // await expect(mocks.$apollo.mutate).toHaveBeenCalled()
        await expect(mocks.$toast.success).toHaveBeenCalled()
      })
    })
  })
})
