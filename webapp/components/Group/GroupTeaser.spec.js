import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import { branding } from '@ocelot-social/branding'
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

  beforeEach(() => {
    wrapper = Wrapper()
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
  it('cuts a long description to the branded length and marks the cut', () => {
    const long = `<p>${'word '.repeat(200).trim()}</p>`
    wrapper = Wrapper({ description: long })

    const text = description().text()
    expect(text.length).toBeLessThan(branding.group.descriptionExcerptLength + 20)
    expect(text).toMatch(/…$/)
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
