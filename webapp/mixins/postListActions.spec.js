import Vue from 'vue'
import postListActions from './postListActions.js'

// postListActions is a mixin whose methods rely on `this.$apollo`, `this.$t`,
// `this.$toast`, and Vuex-mapped mutations. Mount it on a tiny no-template
// Vue instance so we don't need a full SFC. Apollo and the store are stubbed
// per test.

const makeVm = ({ mutate = jest.fn().mockResolvedValue(), toast = {} } = {}) => {
  const storePinPost = jest.fn()
  const storeUnpinPost = jest.fn()
  const successFn = toast.success ?? jest.fn()
  const errorFn = toast.error ?? jest.fn()
  const vm = new Vue({
    mixins: [postListActions],
    render(h) {
      return h('div')
    },
  }).$mount()
  vm.$apollo = { mutate }
  vm.$toast = { success: successFn, error: errorFn }
  vm.$t = (k) => k
  // Override mapped mutations with spies that don't need a real store.
  vm.storePinPost = storePinPost
  vm.storeUnpinPost = storeUnpinPost
  return { vm, mutate, success: successFn, error: errorFn, storePinPost, storeUnpinPost }
}

describe('postListActions mixin', () => {
  describe('removePostFromList', () => {
    it('filters out the deleted post by id', () => {
      const { vm } = makeVm()
      const posts = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]
      const result = vm.removePostFromList({ id: 'p2' }, posts)
      expect(result).toEqual([{ id: 'p1' }, { id: 'p3' }])
    })

    it('returns the same list when the id is not present', () => {
      const { vm } = makeVm()
      const posts = [{ id: 'p1' }]
      expect(vm.removePostFromList({ id: 'pX' }, posts)).toEqual(posts)
    })
  })

  // pinPost / unpinPost / pinGroupPost / unpinGroupPost / pushPost / unpushPost /
  // toggleObservePost all share the same shape: mutate → toast.success →
  // refetchPostList. Drive them through a parametric table to keep the spec tight.
  describe.each([
    ['pinPost', 'post.menu.pinnedSuccessfully', { storeAssert: 'storePinPost' }],
    ['unpinPost', 'post.menu.unpinnedSuccessfully', { storeAssert: 'storeUnpinPost' }],
    ['pinGroupPost', 'post.menu.groupPinnedSuccessfully', {}],
    ['unpinGroupPost', 'post.menu.groupUnpinnedSuccessfully', {}],
    ['pushPost', 'post.menu.pushedSuccessfully', {}],
    ['unpushPost', 'post.menu.unpushedSuccessfully', {}],
  ])('%s', (method, successKey, opts) => {
    it('calls mutate, toasts success, refetches and (if applicable) updates the store', async () => {
      const { vm, mutate, success, ...spies } = makeVm()
      const refetch = jest.fn()
      vm[method]({ id: 'p1' }, refetch)
      await vm.$nextTick()
      await Promise.resolve()
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { id: 'p1' } }),
      )
      expect(success).toHaveBeenCalledWith(successKey)
      expect(refetch).toHaveBeenCalled()
      if (opts.storeAssert) {
        expect(spies[opts.storeAssert]).toHaveBeenCalled()
      }
    })

    it('toasts an error message when mutate rejects', async () => {
      const { vm, error } = makeVm({
        mutate: jest.fn().mockRejectedValue(new Error('boom')),
      })
      vm[method]({ id: 'p1' })
      await Promise.resolve()
      await Promise.resolve()
      expect(error).toHaveBeenCalledWith('boom')
    })

    it('defaults the refetch callback to a no-op (does not crash without one)', () => {
      const { vm } = makeVm()
      expect(() => vm[method]({ id: 'p1' })).not.toThrow()
    })
  })

  describe('toggleObservePost', () => {
    it('toggles observe with value=true and toasts the observed message', async () => {
      const { vm, mutate, success } = makeVm()
      const refetch = jest.fn()
      vm.toggleObservePost('p1', true, refetch)
      await Promise.resolve()
      await Promise.resolve()
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { value: true, id: 'p1' } }),
      )
      expect(success).toHaveBeenCalledWith('post.menu.observedSuccessfully')
      expect(refetch).toHaveBeenCalled()
    })

    it('toggles observe with value=false and toasts the unobserved message', async () => {
      const { vm, mutate, success } = makeVm()
      vm.toggleObservePost('p1', false)
      await Promise.resolve()
      await Promise.resolve()
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { value: false, id: 'p1' } }),
      )
      expect(success).toHaveBeenCalledWith('post.menu.unobservedSuccessfully')
    })

    it('toasts an error message when mutate rejects', async () => {
      const { vm, error } = makeVm({
        mutate: jest.fn().mockRejectedValue(new Error('observe-fail')),
      })
      vm.toggleObservePost('p1', true)
      await Promise.resolve()
      await Promise.resolve()
      expect(error).toHaveBeenCalledWith('observe-fail')
    })
  })
})
