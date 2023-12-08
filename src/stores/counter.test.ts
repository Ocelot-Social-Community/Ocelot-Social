import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect } from 'vitest'

import { useCounterStore } from './counter'

describe('Counter Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('increment', () => {
    it('increments', () => {
      const counter = useCounterStore()
      expect(counter.count).toBe(0)
      counter.increment()
      expect(counter.count).toBe(1)
    })
  })

  describe('resets', () => {
    it('increments by amount', () => {
      const counter = useCounterStore()
      counter.increment()
      expect(counter.count).toBe(1)
      counter.reset()
      expect(counter.count).toBe(0)
    })
  })
})
