import { config, mount } from '@vue/test-utils'
import PageFooter from './PageFooter.vue'
import linksDefault from '~/constants/links.js'

const localVue = global.localVue

config.stubs['nuxt-link'] = '<span class="nuxt-link"><slot /></span>'

describe('PageFooter.vue', () => {
  let mocks
  let wrapper

  beforeEach(() => {
    mocks = {
      $t: jest.fn(),
      $env: {
        VERSION: 'v1.0.0',
      },
    }
  })

  describe('mount', () => {
    const Wrapper = () => {
      return mount(PageFooter, { mocks, localVue })
    }

    describe('links.js', () => {
      beforeEach(() => {
        wrapper = Wrapper()
      })

      it('renders four links', () => {
        expect(wrapper.findAll('a')).toHaveLength(4)
      })

      it('renders three nuxt-links', () => {
        expect(wrapper.findAll('.nuxt-link')).toHaveLength(3)
      })

      it('renders version', () => {
        expect(wrapper.find('.ds-footer').text()).toContain('v1.0.0')
      })
    })

    describe('inflexible links', () => {
      beforeEach(() => {
        wrapper = Wrapper()
      })

      it('renders version', () => {
        expect(wrapper.find('a[data-test="version-link"]').exists()).toBeTruthy()
      })
    })

    describe('flexible links not set', () => {
      beforeEach(async () => {
        const links = {
          ...linksDefault,
          ORGANIZATION: { ...linksDefault.ORGANIZATION, externalLink: null },
          IMPRINT: { ...linksDefault.IMPRINT, externalLink: null },
          TERMS_AND_CONDITIONS: { ...linksDefault.TERMS_AND_CONDITIONS, externalLink: null },
          CODE_OF_CONDUCT: { ...linksDefault.CODE_OF_CONDUCT, externalLink: null },
          DATA_PRIVACY: { ...linksDefault.DATA_PRIVACY, externalLink: null },
          FAQ: { ...linksDefault.FAQ, externalLink: null },
        }
        wrapper = Wrapper()
        wrapper.setData({ links })
        await wrapper.vm.$nextTick()
      })

      it('renders ORGANIZATION as nuxt-link', () => {
        expect(wrapper.find('span[data-test="organization-nuxt-link"]').exists()).toBeTruthy()
      })

      it('renders IMPRINT as nuxt-link', () => {
        expect(wrapper.find('span[data-test="imprint-nuxt-link"]').exists()).toBeTruthy()
      })

      it('renders TERMS_AND_CONDITIONS as nuxt-link', () => {
        expect(wrapper.find('span[data-test="terms-and-conditions-nuxt-link"]').exists()).toBeTruthy()
      })

      it('renders CODE_OF_CONDUCT as nuxt-link', () => {
        expect(wrapper.find('span[data-test="code-of-conduct-nuxt-link"]').exists()).toBeTruthy()
      })

      it('renders DATA_PRIVACY as nuxt-link', () => {
        expect(wrapper.find('span[data-test="data-privacy-nuxt-link"]').exists()).toBeTruthy()
      })

      it('renders FAQ as nuxt-link', () => {
        expect(wrapper.find('span[data-test="faq-nuxt-link"]').exists()).toBeTruthy()
      })
    })

    describe('flexible links set', () => {
      beforeEach(async () => {
        const links = {
          ...linksDefault,
          ORGANIZATION: { ...linksDefault.ORGANIZATION, externalLink: 'https://ocelot.social' },
          IMPRINT: { ...linksDefault.IMPRINT, externalLink: 'https://ocelot.social/IMPRINT' },
          TERMS_AND_CONDITIONS: { ...linksDefault.TERMS_AND_CONDITIONS, externalLink: 'https://ocelot.social/TERMS_AND_CONDITIONS' },
          CODE_OF_CONDUCT: { ...linksDefault.CODE_OF_CONDUCT, externalLink: 'https://ocelot.social/CODE_OF_CONDUCT' },
          DATA_PRIVACY: { ...linksDefault.DATA_PRIVACY, externalLink: 'https://ocelot.social/DATA_PRIVACY' },
          FAQ: { ...linksDefault.FAQ, externalLink: 'https://ocelot.social/FAQ' },
        }
        wrapper = Wrapper()
        wrapper.setData({ links })
        await wrapper.vm.$nextTick()
      })

      it('renders ORGANIZATION as "a" tag link', () => {
        expect(wrapper.find(`a[href="https://ocelot.social"]`).exists()).toBeTruthy()
      })

      it('renders IMPRINT as "a" tag link', () => {
        expect(wrapper.find(`a[href="https://ocelot.social/IMPRINT"]`).exists()).toBeTruthy()
      })

      it('renders TERMS_AND_CONDITIONS as "a" tag link', () => {
        expect(
          wrapper.find(`a[href="https://ocelot.social/TERMS_AND_CONDITIONS"]`).exists(),
        ).toBeTruthy()
      })

      it('renders CODE_OF_CONDUCT as "a" tag link', () => {
        expect(
          wrapper.find(`a[href="https://ocelot.social/CODE_OF_CONDUCT"]`).exists(),
        ).toBeTruthy()
      })

      it('renders DATA_PRIVACY as "a" tag link', () => {
        expect(wrapper.find(`a[href="https://ocelot.social/DATA_PRIVACY"]`).exists()).toBeTruthy()
      })

      it('renders FAQ as "a" tag link', () => {
        expect(wrapper.find(`a[href="https://ocelot.social/FAQ"]`).exists()).toBeTruthy()
      })
    })
  })
})
