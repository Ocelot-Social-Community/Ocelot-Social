import Vue from 'vue'
import VueIziToast from 'vue-izitoast'

import iziToastPlugin, { toTimeout, DEFAULT_TOAST_TIMEOUT } from './izi-toast.js'

const optionsFor = (context) => {
  const use = jest.spyOn(Vue, 'use').mockImplementation(() => {})
  iziToastPlugin(context)
  const [plugin, options] = use.mock.calls[0]
  use.mockRestore()
  return { plugin, options }
}

describe('izi-toast plugin', () => {
  it('registers vue-izitoast with the app-wide presentation options', () => {
    const { plugin, options } = optionsFor({ $env: {} })
    expect(plugin).toBe(VueIziToast)
    expect(options).toMatchObject({
      position: 'bottomRight',
      transitionIn: 'bounceInLeft',
      layout: 2,
      theme: 'dark',
    })
  })

  describe('timeout', () => {
    // The value reaches the client through nuxt-env, i.e. straight out of the environment as a
    // STRING, and it decides how long a toast stays on screen. Several Cypress steps assert on a
    // toast after a wait, so a value that dismisses instantly or never fails the e2e suite in a way
    // that looks like a broken feature rather than a bad config.
    it.each([
      ['a configured string', '15000', 15000],
      ['a configured number', 15000, 15000],
      ['an unset key', undefined, DEFAULT_TOAST_TIMEOUT],
      ['an empty string', '', DEFAULT_TOAST_TIMEOUT],
      ['a non-numeric value', 'soon', DEFAULT_TOAST_TIMEOUT],
      ['zero', '0', DEFAULT_TOAST_TIMEOUT],
      ['a negative value', '-1', DEFAULT_TOAST_TIMEOUT],
      ['infinity', 'Infinity', DEFAULT_TOAST_TIMEOUT],
      ['negative infinity', '-Infinity', DEFAULT_TOAST_TIMEOUT],
      ['NaN', NaN, DEFAULT_TOAST_TIMEOUT],
      ['null', null, DEFAULT_TOAST_TIMEOUT],
    ])('resolves %s', (_label, value, expected) => {
      expect(toTimeout(value)).toBe(expected)
    })

    it('passes the configured timeout to vue-izitoast', () => {
      const { options } = optionsFor({ $env: { TOAST_TIMEOUT: '15000' } })
      expect(options.timeout).toBe(15000)
    })

    it('falls back when nuxt-env injected no $env at all', () => {
      // Defensive: the plugin must not throw if it somehow runs before nuxt-env's own plugin.
      const { options } = optionsFor({})
      expect(options.timeout).toBe(DEFAULT_TOAST_TIMEOUT)
    })
  })
})
