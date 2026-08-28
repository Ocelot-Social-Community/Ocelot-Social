import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import { branding, brandingDefaults, setBranding } from '@ocelot-social/branding'
import GroupTeaser from './GroupTeaser.vue'
import Filters from '~/plugins/vue-filters'

const localVue = global.localVue

// GroupTeaser pulls in getCategoriesMixin, whose created() dispatches categories/init.
const store = new Vuex.Store({
  getters: {
    'categories/categories': () => [],
    'categories/isInitialized': () => true,
  },
  actions: {
    'categories/init': jest.fn(),
  },
})

const group = {
  id: 'g1',
  name: 'Yoga Practice',
  slug: 'yoga-practice',
  groupType: 'public',
  actionRadius: 'regional',
  about: 'Yoga',
  description:
    '<p>Read the <a href="https://ocelot.social">handbook</a> and the <a href="https://example.org">FAQ</a> before joining.</p>',
  categories: [],
}

describe('GroupTeaser', () => {
  let wrapper

  const Wrapper = (overrides = {}) => {
    return mount(GroupTeaser, {
      localVue,
      store,
      propsData: { group: { ...group, ...overrides } },
      mocks: {
        $t: jest.fn((key) => key),
        $filters: Filters({ app: {} }).$filters,
      },
      stubs: {
        'nuxt-link': true,
        'client-only': true,
        'group-content-menu': true,
      },
    })
  }

  const description = () => wrapper.find('.content')
  const renderedDescription = (text) => Wrapper({ description: text }).find('.content').text()

  const longDescription = `<p>${'word '.repeat(200).trim()}</p>`

  beforeEach(() => {
    wrapper = Wrapper()
  })

  afterEach(() => {
    setBranding(undefined) // the brand config lives on globalThis — reset it
  })

  it('renders the group name', () => {
    expect(wrapper.find('.title').text()).toBe('Yoga Practice')
  })

  // The whole card is a <nuxt-link>; an <a> nested in an <a> is invalid HTML, so the
  // anchors have to go here — unlike on the group page, where they must stay.
  it('strips the links out of the description', () => {
    expect(description().findAll('a')).toHaveLength(0)
  })

  it('keeps the link texts and everything between two links', () => {
    expect(description().text()).toBe('Read the handbook and the FAQ before joining.')
  })

  // The cut used to be made by the backend and stored as descriptionExcerpt. It now
  // happens here, with the same function at the same branded length.
  it('cuts a long description and marks the cut', () => {
    wrapper = Wrapper({ description: longDescription })

    const text = description().text()
    expect(text.length).toBeLessThan(branding.group.descriptionExcerptLength + 20)
    expect(text).toMatch(/…$/)
  })

  // Pins the length to BRANDING rather than to a constant that happens to equal the
  // default. Asserted by moving the brand's limit and watching the cut move with it:
  // a hardcoded 250 in the component produces the identical string both times, and
  // the inequality is what catches that. Checking that `truncate` was *called* with
  // the right number would only restate the implementation.
  it('cuts where the brand says, not at a fixed length', () => {
    const atDefault = renderedDescription(longDescription)

    setBranding({
      ...brandingDefaults,
      group: { ...brandingDefaults.group, descriptionExcerptLength: 40 },
    })
    const atForty = renderedDescription(longDescription)

    expect(atForty).not.toBe(atDefault)
    expect(atDefault.length).toBeGreaterThan(200)
    expect(atForty.length).toBeLessThan(50)
  })

  it('leaves a description shorter than the limit untouched', () => {
    wrapper = Wrapper({ description: '<p>Short and sweet.</p>' })

    expect(description().text()).toBe('Short and sweet.')
  })

  it('renders nothing for a group without a description', () => {
    wrapper = Wrapper({ description: null })

    expect(description().text()).toBe('')
  })
})
