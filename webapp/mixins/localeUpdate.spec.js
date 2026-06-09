import Vue from 'vue'
import Vuex from 'vuex'
import localeUpdate from './localeUpdate.js'

Vue.use(Vuex)

const makeVm = ({
  user = { id: 'u1' },
  mutate = jest.fn().mockResolvedValue(),
  uiLocale = 'en',
} = {}) => {
  const setCurrentUserMutation = jest.fn()
  const store = new Vuex.Store({
    getters: { 'auth/user': () => user },
    mutations: { 'auth/SET_USER': setCurrentUserMutation },
  })
  const successFn = jest.fn()
  const errorFn = jest.fn()
  const vm = new Vue({
    store,
    mixins: [localeUpdate],
    render(h) {
      return h('div')
    },
  }).$mount()
  vm.$apollo = { mutate }
  vm.$i18n = { locale: () => uiLocale }
  vm.$t = (k) => k
  vm.$toast = { success: successFn, error: errorFn }
  return { vm, mutate, setCurrentUserMutation, success: successFn, error: errorFn }
}

describe('localeUpdate mixin', () => {
  it('exposes the auth/user getter as currentUser', () => {
    const { vm } = makeVm({ user: { id: 'u1', name: 'Alice' } })
    expect(vm.currentUser).toEqual({ id: 'u1', name: 'Alice' })
  })

  describe('updateUserLocale', () => {
    it('returns early when there is no current user', async () => {
      const { vm, mutate } = makeVm({ user: null })
      await vm.updateUserLocale()
      expect(mutate).not.toHaveBeenCalled()
    })

    it('returns early when current user has no id', async () => {
      const { vm, mutate } = makeVm({ user: {} })
      await vm.updateUserLocale()
      expect(mutate).not.toHaveBeenCalled()
    })

    it('mutates with id + UI locale (not the stored user locale), runs update() to refresh the store, then toasts success', async () => {
      const mutate = jest.fn().mockImplementation(({ update }) => {
        update(null, { data: { UpdateUser: { locale: 'en' } } })
        return Promise.resolve()
      })
      // Stored user locale ('de') deliberately differs from the active UI locale
      // ('en') so the test fails if the mutation reads from the user instead of $i18n.
      const { vm, success, setCurrentUserMutation } = makeVm({
        user: { id: 'u1', name: 'A', locale: 'de' },
        uiLocale: 'en',
        mutate,
      })
      await vm.updateUserLocale()
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { id: 'u1', locale: 'en' } }),
      )
      // update() must write the locale from the mutation response back into the store.
      expect(setCurrentUserMutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'u1', locale: 'en' }),
      )
      expect(success).toHaveBeenCalledWith('contribution.success')
    })

    it('surfaces errors via toast', async () => {
      const { vm, error } = makeVm({
        mutate: jest.fn().mockRejectedValue(new Error('locale-fail')),
      })
      await vm.updateUserLocale()
      expect(error).toHaveBeenCalledWith('locale-fail')
    })
  })
})
