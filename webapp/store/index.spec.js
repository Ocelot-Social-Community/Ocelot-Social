import { state, mutations, actions } from './index.js'

describe('root store', () => {
  it('exports an empty state factory', () => {
    expect(state()).toEqual({})
  })

  it('exports no mutations', () => {
    expect(mutations).toEqual({})
  })

  describe('nuxtServerInit', () => {
    it('dispatches auth/init', async () => {
      const dispatch = jest.fn().mockResolvedValue()
      await actions.nuxtServerInit({ dispatch })
      expect(dispatch).toHaveBeenCalledWith('auth/init')
    })
  })
})
