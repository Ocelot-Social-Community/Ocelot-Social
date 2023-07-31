import { getters, mutations } from './posts.js'

let state
let testMutation

describe('getters', () => {
  describe('isActive', () => {
    it('returns true if filter differs from default setting', () => {
      state = { filter: {} }
      expect(getters.isActive(state)).toEqual(false)
      state = { filter: { categories_some: { id_in: [24] } } }
      expect(getters.isActive(state)).toEqual(true)
    })
  })

  describe('filteredCategoryIds', () => {
    it('returns category ids if filter is set', () => {
      state = { filter: { categories_some: { id_in: [24] } } }
      expect(getters.filteredCategoryIds(state)).toEqual([24])
    })

    it('returns empty array if category filter is not set', () => {
      state = { filter: { author: { followedBy_some: { id: 7 } } } }
      expect(getters.filteredCategoryIds(state)).toEqual([])
    })
  })

  describe('filteredPostTypes', () => {
    it('returns post types if filter is set', () => {
      state = { filter: { postType_in: ['Article', 'Event'] } }
      expect(getters.filteredPostTypes(state)).toEqual(['Article', 'Event'])
    })

    it('returns empty array if post type filter is not set', () => {
      state = { filter: { author: { followedBy_some: { id: 7 } } } }
      expect(getters.filteredPostTypes(state)).toEqual([])
    })
  })

  describe('filteredLanguageCodes', () => {
    it('returns category ids if filter is set', () => {
      state = { filter: { language_in: ['en', 'de', 'pt'] } }
      expect(getters.filteredLanguageCodes(state)).toEqual(['en', 'de', 'pt'])
    })

    it('returns empty array if language filter is not set', () => {
      state = { filter: { author: { followedBy_some: { id: 7 } } } }
      expect(getters.filteredLanguageCodes(state)).toEqual([])
    })
  })

  describe('filter', () => {
    it('returns filter', () => {
      state = { filter: { author: { followedBy_some: { id: 7 } } } }
      expect(getters.filter(state)).toEqual({ author: { followedBy_some: { id: 7 } } })
    })
  })

  describe('filteredByUsersFollowed', () => {
    it('returns true if filter is set', () => {
      state = { filter: { author: { followedBy_some: { id: 7 } } } }
      expect(getters.filteredByUsersFollowed(state)).toBe(true)
    })

    it('returns false if filter is not set', () => {
      state = { filter: { categories_some: { id_in: [23] } } }
      expect(getters.filteredByUsersFollowed(state)).toBe(false)
    })
  })

  describe('filteredByPostsInMyGroups', () => {
    it('returns true if filter is set', () => {
      state = { filter: { postsInMyGroups: true } }
      expect(getters.filteredByPostsInMyGroups(state)).toBe(true)
    })

    it('returns false if filter is not set', () => {
      state = { filter: { categories_some: { id_in: [23] } } }
      expect(getters.filteredByUsersFollowed(state)).toBe(false)
    })
  })

  describe('filteredByEmotions', () => {
    it('returns an emotions array if filter is set', () => {
      state = { filter: { emotions_some: { emotion_in: ['sad'] } } }
      expect(getters.filteredByEmotions(state)).toEqual(['sad'])
    })

    it('returns an emotions array even when other filters are set', () => {
      state = {
        filter: { emotions_some: { emotion_in: ['sad'] }, categories_some: { id_in: [23] } },
      }
      expect(getters.filteredByEmotions(state)).toEqual(['sad'])
    })

    it('returns empty array if filter is not set', () => {
      state = { filter: {} }
      expect(getters.filteredByEmotions(state)).toEqual([])
    })

    it('returns empty array if another filter is set, but not emotions', () => {
      state = { filter: { categories_some: { id_in: [23] } } }
      expect(getters.filteredByEmotions(state)).toEqual([])
    })
  })

  describe('orderBy', () => {
    it('returns value for graphql query', () => {
      state = {
        order: 'createdAt_desc',
      }
      expect(getters.orderBy(state)).toEqual('createdAt_desc')
    })
  })
})

describe('mutations', () => {
  describe('RESET_LANGUAGES', () => {
    it('resets the languages filter', () => {
      state = {
        filter: {
          author: { followedBy_some: { id: 7 } },
          language_in: ['nl'],
        },
      }
      mutations.RESET_LANGUAGES(state)
      expect(getters.filter(state)).toEqual({ author: { followedBy_some: { id: 7 } } })
    })
  })

  describe('RESET_CATEGORIES', () => {
    beforeEach(() => {
      testMutation = (categoryId) => {
        mutations.RESET_CATEGORIES(state, categoryId)
        return getters.filter(state)
      }
    })
    it('resets the categories filter', () => {
      state = {
        filter: {
          author: { followedBy_some: { id: 7 } },
          categories_some: { id_in: [23] },
        },
      }
      expect(testMutation(23)).toEqual({ author: { followedBy_some: { id: 7 } } })
    })
  })

  describe('RESET_FOLLOWERS_FILTER', () => {
    beforeEach(() => {
      testMutation = () => {
        mutations.RESET_FOLLOWERS_FILTER(state)
        return getters.filter(state)
      }
    })

    it('resets the categories filter', () => {
      state = {
        filter: {
          author: { followedBy_some: { id: 4711 } },
          postsInMyGroups: true,
        },
      }
      expect(testMutation()).toEqual({})
    })
  })

  describe('TOGGLE_LANGUAGE', () => {
    beforeEach(() => {
      testMutation = (languageCode) => {
        mutations.TOGGLE_LANGUAGE(state, languageCode)
        return getters.filter(state)
      }
    })

    it('creates category filter if empty', () => {
      state = { filter: {} }
      expect(testMutation('de')).toEqual({ language_in: ['de'] })
    })

    it('adds language code to existing filter', () => {
      state = { filter: { language_in: ['de'] } }
      expect(testMutation('en')).toEqual({ language_in: ['de', 'en'] })
    })

    it('removes category id if present', () => {
      state = { filter: { language_in: ['de', 'en'] } }
      expect(testMutation('de')).toEqual({ language_in: ['en'] })
    })

    it('removes language filter if empty', () => {
      state = { filter: { language_in: ['de'] } }
      expect(testMutation('de')).toEqual({})
    })

    it('does not get in the way of other filters', () => {
      state = {
        filter: {
          author: { followedBy_some: { id: 7 } },
          language_in: ['de'],
        },
      }
      expect(testMutation('de')).toEqual({ author: { followedBy_some: { id: 7 } } })
    })
  })

  describe('TOGGLE_CATEGORY', () => {
    beforeEach(() => {
      testMutation = (categoryId) => {
        mutations.TOGGLE_CATEGORY(state, categoryId)
        return getters.filter(state)
      }
    })

    it('creates category filter if empty', () => {
      state = { filter: {} }
      expect(testMutation(23)).toEqual({ categories_some: { id_in: [23] } })
    })

    it('adds category id not present', () => {
      state = { filter: { categories_some: { id_in: [24] } } }
      expect(testMutation(23)).toEqual({ categories_some: { id_in: [24, 23] } })
    })

    it('removes category id if present', () => {
      state = { filter: { categories_some: { id_in: [23, 24] } } }
      const result = testMutation(23)
      expect(result).toEqual({ categories_some: { id_in: [24] } })
    })

    it('removes category filter if empty', () => {
      state = { filter: { categories_some: { id_in: [23] } } }
      expect(testMutation(23)).toEqual({})
    })

    it('does not get in the way of other filters', () => {
      state = {
        filter: {
          author: { followedBy_some: { id: 7 } },
          categories_some: { id_in: [23] },
        },
      }
      expect(testMutation(23)).toEqual({ author: { followedBy_some: { id: 7 } } })
    })
  })

  describe('TOGGLE_POST_TYPE', () => {
    beforeEach(() => {
      testMutation = (postType) => {
        mutations.TOGGLE_POST_TYPE(state, postType)
        return getters.filter(state)
      }
    })

    it('creates post type filter if empty, sets event start filter and event start order', () => {
      state = { filter: {} }
      expect(testMutation('Event')).toEqual({
        postType_in: ['Event'],
        eventStart_gte: expect.any(Date),
      })
      expect(getters.orderBy(state)).toEqual('eventStart_asc')
    })

    it('changes post type if present, resets filter event start and order', () => {
      state = {
        filter: {
          postType_in: ['Event'],
          eventStart_gte: new Date(),
        },
        order: 'eventStart_asc',
      }
      expect(testMutation('Article')).toEqual({ postType_in: ['Article'] })
      expect(getters.orderBy(state)).toEqual('createdAt_desc')
    })

    it('removes post type filter if same post type is present and sets order', () => {
      state = {
        filter: {
          postType_in: ['Event'],
          eventStart_gte: new Date(),
        },
        order: 'eventStart_asc',
      }
      expect(testMutation('Event')).toEqual({})
      expect(getters.orderBy(state)).toEqual('createdAt_desc')
    })

    it('removes post type filter if called with null', () => {
      state = {
        filter: {
          postType_in: ['Event'],
          eventStart_gte: new Date(),
        },
        order: 'eventStart_asc',
      }
      expect(testMutation(null)).toEqual({})
      expect(getters.orderBy(state)).toEqual('createdAt_desc')
    })

    it('does not get in the way of other filters', () => {
      state = {
        filter: {
          author: { followedBy_some: { id: 7 } },
          postType_in: ['Event'],
        },
      }
      expect(testMutation('Event')).toEqual({ author: { followedBy_some: { id: 7 } } })
    })
  })

  describe('RESET_POST_TYPE', () => {
    beforeEach(() => {
      testMutation = () => {
        mutations.RESET_POST_TYPE(state)
        return getters.filter(state)
      }
    })

    it('resets the post type filter, event start and order', () => {
      state = {
        filter: {
          postType_in: ['Event'],
          eventStart_gte: new Date(),
        },
        order: 'eventStart_asc',
      }
      expect(testMutation()).toEqual({})
      expect(getters.orderBy(state)).toEqual('createdAt_desc')
    })
  })

  describe('TOGGLE_EVENTS_ENDED', () => {
    beforeEach(() => {
      testMutation = (postType) => {
        mutations.TOGGLE_EVENTS_ENDED(state, postType)
        return getters.filter(state)
      }
    })

    it('does not set events ended when post type is not Event', () => {
      state = {
        filter: {},
      }
      expect(testMutation()).toEqual({})
    })

    it('sets events ended when post type is Event', () => {
      state = {
        filter: {
          postType_in: ['Event'],
        },
      }
      expect(testMutation()).toEqual({
        postType_in: ['Event'],
        eventStart_gte: expect.any(Date),
      })
    })

    it('unsets events ended when set', () => {
      state = {
        filter: {
          postType_in: ['Event'],
          eventStart_gte: new Date(),
        },
      }
      expect(testMutation()).toEqual({
        postType_in: ['Event'],
      })
    })
  })

  describe('TOGGLE_FILTER_BY_FOLLOWED', () => {
    beforeEach(() => {
      testMutation = (userId) => {
        mutations.TOGGLE_FILTER_BY_FOLLOWED(state, userId)
        return getters.filter(state)
      }
    })

    describe('given empty filter', () => {
      beforeEach(() => {
        state = { filter: {} }
      })

      it('attaches the id of the current user to the filter object', () => {
        expect(testMutation(4711)).toEqual({ author: { followedBy_some: { id: 4711 } } })
      })
    })

    describe('already filtered', () => {
      beforeEach(() => {
        state = { filter: { author: { followedBy_some: { id: 4711 } } } }
      })

      it('remove the id of the current user from the filter object', () => {
        expect(testMutation(4711)).toEqual({})
      })
    })
  })

  describe('TOGGLE_FILTER_BY_MY_GROUPS', () => {
    beforeEach(() => {
      testMutation = () => {
        mutations.TOGGLE_FILTER_BY_MY_GROUPS(state)
        return getters.filter(state)
      }
    })

    describe('given empty filter', () => {
      beforeEach(() => {
        state = { filter: {} }
      })

      it('sets postsInMyGroups filter to true', () => {
        expect(testMutation()).toEqual({ postsInMyGroups: true })
      })
    })

    describe('already filtered', () => {
      beforeEach(() => {
        state = { filter: { postsInMyGroups: true } }
      })

      it('removes postsInMyGroups filter', () => {
        expect(testMutation()).toEqual({})
      })
    })
  })

  describe('TOGGLE_ORDER', () => {
    beforeEach(() => {
      testMutation = (key) => {
        mutations.TOGGLE_ORDER(state, key)
        return getters.orderBy(state)
      }
    })

    it('switches the currently selected order', () => {
      state = {
        // does not matter
      }
      expect(testMutation('createdAt_asc')).toEqual('createdAt_asc')
    })
  })
})
