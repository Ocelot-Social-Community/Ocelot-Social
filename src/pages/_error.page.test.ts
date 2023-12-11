import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'

import ErrorPage from './_error.page.vue'

describe('ErrorPage', () => {
  let wrapper: typeof ErrorPage
  const Wrapper = () => {
    return mount(ErrorPage)
  }

  beforeEach(() => {
    wrapper = Wrapper()
  })

  describe('no is404 property set', () => {
    it('renders error 500', () => {
      expect(wrapper.find('h1').text()).toEqual("$t('error.500.h1')")
      expect(wrapper.find('p').text()).toEqual("$t('error.500.text')")
    })
  })

  describe('is404 property is false', () => {
    beforeEach(async () => {
      await wrapper.setProps({
        is404: false,
      })
    })

    it('renders error 500', () => {
      expect(wrapper.find('h1').text()).toEqual("$t('error.500.h1')")
      expect(wrapper.find('p').text()).toEqual("$t('error.500.text')")
    })
  })

  describe('is404 property is true', () => {
    beforeEach(async () => {
      await wrapper.setProps({
        is404: true,
      })
    })

    it('renders error 400', () => {
      expect(wrapper.find('h1').text()).toEqual("$t('error.404.h1')")
      expect(wrapper.find('p').text()).toEqual("$t('error.404.text')")
    })
  })
})
