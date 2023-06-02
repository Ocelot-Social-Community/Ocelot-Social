import { state as defaultState, getters, mutations } from './posts.js'

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
    describe('returns empty array if post type filter', () => {
      it('array is empty', () => {
        state = { filter: { postType_in: [] } }
        expect(getters.filteredPostTypes(state)).toEqual([])
      })

      it('is not set at all', () => {
        state = { filter: { author: { followedBy_some: { id: 7 } } } }
        expect(getters.filteredPostTypes(state)).toEqual([])
      })
    })

    describe('returns post types', () => {
      beforeEach(() => {
        state = { filter: { postType_in: [] } }
      })

      it('"Article" if filter is set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        expect(getters.filteredPostTypes(state)).toEqual(['Article'])
      })

      it('"Article" and "Event" if filters are set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        mutations.TOGGLE_POST_TYPE(state, 'Event')
        expect(getters.filteredPostTypes(state)).toEqual(['Article', 'Event'])
      })
    })
  })

  describe('noneSetInPostTypeFilter', () => {
    beforeEach(() => {
      state = { filter: { postType_in: [] } }
    })

    describe('is "true" if', () => {
      it('array is empty', () => {
        expect(getters.noneSetInPostTypeFilter(state)).toBe(true)
      })
    })

    describe('is "false" if', () => {
      it('"Article" filter is set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        expect(getters.noneSetInPostTypeFilter(state)).toBe(false)
      })

      it('"Event" filter is set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Event')
        expect(getters.noneSetInPostTypeFilter(state)).toBe(false)
      })

      it('"Article" and "Event" filters are set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        mutations.TOGGLE_POST_TYPE(state, 'Event')
        expect(getters.noneSetInPostTypeFilter(state)).toBe(false)
      })
    })
  })

  describe('articleSetInPostTypeFilter', () => {
    beforeEach(() => {
      state = { filter: { postType_in: [] } }
    })

    describe('is "true" if', () => {
      it('"Article" filter is set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        expect(getters.articleSetInPostTypeFilter(state)).toBe(true)
      })

      it('"Article" and "Event" filters are set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        mutations.TOGGLE_POST_TYPE(state, 'Event')
        expect(getters.articleSetInPostTypeFilter(state)).toBe(true)
      })
    })

    describe('is "false" if', () => {
      it('array is empty', () => {
        expect(getters.articleSetInPostTypeFilter(state)).toBe(false)
      })

      it('"Event" filter is set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Event')
        expect(getters.articleSetInPostTypeFilter(state)).toBe(false)
      })
    })
  })

  describe('eventSetInPostTypeFilter', () => {
    beforeEach(() => {
      state = { filter: { postType_in: [] } }
    })

    describe('is "true" if', () => {
      it('"Event" filter is set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Event')
        expect(getters.eventSetInPostTypeFilter(state)).toBe(true)
      })

      it('"Article" and "Event" filters are set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        mutations.TOGGLE_POST_TYPE(state, 'Event')
        expect(getters.eventSetInPostTypeFilter(state)).toBe(true)
      })
    })

    describe('is "false" if', () => {
      it('array is empty', () => {
        expect(getters.eventSetInPostTypeFilter(state)).toBe(false)
      })

      it('"Article" filter is set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        expect(getters.eventSetInPostTypeFilter(state)).toBe(false)
      })
    })
  })

  describe('orderedByCreationDate', () => {
    beforeEach(() => {
      state = { filter: { postType_in: [] } }
    })

    describe('is "true" if', () => {
      it('array is empty', () => {
        expect(getters.orderedByCreationDate(state)).toBe(true)
      })

      it('"Article" filter is set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        expect(getters.orderedByCreationDate(state)).toBe(true)
      })

      it('"Article" and "Event" filters are set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Article')
        mutations.TOGGLE_POST_TYPE(state, 'Event')
        expect(getters.orderedByCreationDate(state)).toBe(true)
      })
    })

    describe('is "false" if', () => {
      it('"Event" filter is set', () => {
        mutations.TOGGLE_POST_TYPE(state, 'Event')
        expect(getters.orderedByCreationDate(state)).toBe(false)
      })
    })
  })

  describe('eventsEnded', () => {
    beforeEach(() => {
      state = defaultState()
    })

    describe('is instance of "Date"', () => {
      it('if set', () => {
        mutations.TOGGLE_EVENTS_ENDED(state, true)
        expect(getters.eventsEnded(state)).toBeInstanceOf(Date)
      })

      it('if unset and set again', () => {
        mutations.TOGGLE_EVENTS_ENDED(state, true)
        mutations.TOGGLE_EVENTS_ENDED(state, false)
        mutations.TOGGLE_EVENTS_ENDED(state, true)
        expect(getters.eventsEnded(state)).toBeInstanceOf(Date)
      })
    })

    describe('is "null")"', () => {
      it('on default', () => {
        expect(getters.eventsEnded(state)).toEqual(null)
      })

      it('if set and unset again', () => {
        mutations.TOGGLE_EVENTS_ENDED(state, true)
        mutations.TOGGLE_EVENTS_ENDED(state, false)
        expect(getters.eventsEnded(state)).toEqual(null)
      })
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

    it('creates post type filter if empty', () => {
      state = { filter: {} }
      expect(testMutation('Event')).toEqual({ postType_in: ['Event'] })
    })

    it('adds post type not present', () => {
      state = { filter: { postType_in: ['Event'] } }
      expect(testMutation('Article')).toEqual({ postType_in: ['Event', 'Article'] })
    })

    it('removes category id if present', () => {
      state = { filter: { postType_in: ['Event', 'Article'] } }
      const result = testMutation('Event')
      expect(result).toEqual({ postType_in: ['Article'] })
    })

    it('removes category filter if empty', () => {
      state = { filter: { postType_in: ['Event'] } }
      expect(testMutation('Event')).toEqual({})
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

  describe('TOGGLE_UNSET_ALL_POST_TYPES_FILTERS', () => {
    beforeEach(() => {
      testMutation = (postType) => {
        mutations.TOGGLE_POST_TYPE(state, postType)
        return getters.filter(state)
      }
      state = defaultState()
    })

    describe('if post type filter is set to', () => {
      describe('"Article"', () => {
        it('unset all post type filters', () => {
          expect(testMutation('Article')).toEqual({ postType_in: ['Article'] })
          mutations.TOGGLE_UNSET_ALL_POST_TYPES_FILTERS(state)
          expect(getters.filter(state)).toEqual({})
        })
      })

      describe('"Event"', () => {
        it('unset all post type filters', () => {
          expect(testMutation('Event')).toEqual({ postType_in: ['Event'] })
          mutations.TOGGLE_UNSET_ALL_POST_TYPES_FILTERS(state)
          expect(getters.filter(state)).toEqual({})
        })
      })

      describe('"Article" and "Event"', () => {
        it('unset all post type filters', () => {
          expect(testMutation('Article')).toEqual({ postType_in: ['Article'] })
          expect(testMutation('Event')).toEqual({ postType_in: ['Article', 'Event'] })
          mutations.TOGGLE_UNSET_ALL_POST_TYPES_FILTERS(state)
          expect(getters.filter(state)).toEqual({})
        })
      })
    })
  })

  describe('TOGGLE_SET_UNSET_POST_TYPE_FILTER', () => {
    beforeEach(() => {
      testMutation = (postType) => {
        mutations.TOGGLE_SET_UNSET_POST_TYPE_FILTER(state, postType)
        return getters.filter(state)
      }
      state = defaultState()
    })

    describe('if post type filter is', () => {
      describe('"All" (empty)', () => {
        describe('toggle sets', () => {
          describe('"All" again', () => {
            it('unset all post type filters', () => {
              expect(testMutation('All')).toEqual({})
            })

            describe('"eventsEnded"', () => {
              it('has "null"', () => {
                expect(testMutation('All')).toEqual({})
                expect(getters.eventsEnded(state)).toEqual(null)
              })
            })
          })

          describe('"Article"', () => {
            it('post type filter is set', () => {
              expect(testMutation('Article')).toEqual({ postType_in: ['Article'] })
            })

            describe('"eventsEnded"', () => {
              it('has "null"', () => {
                expect(testMutation('Article')).toEqual({ postType_in: ['Article'] })
                expect(getters.eventsEnded(state)).toEqual(null)
              })
            })
          })

          describe('"Event"', () => {
            it('post type filter is set', () => {
              expect(testMutation('Event')).toEqual({ postType_in: ['Event'] })
            })

            describe('"eventsEnded"', () => {
              it('has "Date"', () => {
                expect(testMutation('Event')).toEqual({ postType_in: ['Event'] })
                expect(getters.eventsEnded(state)).toBeInstanceOf(Date)
              })
            })
          })
        })
      })

      describe('"Article"', () => {
        beforeEach(() => {
          testMutation('Article')
        })

        describe('toggle sets', () => {
          describe('"All"', () => {
            it('unset all post type filters', () => {
              expect(testMutation('All')).toEqual({})
            })

            describe('"eventsEnded"', () => {
              it('has "null"', () => {
                expect(testMutation('All')).toEqual({})
                expect(getters.eventsEnded(state)).toEqual(null)
              })
            })
          })

          describe('"Article" again', () => {
            it('unset all post type filters', () => {
              expect(testMutation('Article')).toEqual({})
            })

            describe('"eventsEnded"', () => {
              it('has "null"', () => {
                expect(testMutation('Article')).toEqual({})
                expect(getters.eventsEnded(state)).toEqual(null)
              })
            })
          })

          describe('"Event"', () => {
            it('only new post type filter is set', () => {
              expect(testMutation('Event')).toEqual({ postType_in: ['Event'] })
            })

            describe('"eventsEnded"', () => {
              it('has "Date"', () => {
                expect(testMutation('Event')).toEqual({ postType_in: ['Event'] })
                expect(getters.eventsEnded(state)).toBeInstanceOf(Date)
              })
            })
          })
        })
      })

      describe('"Event"', () => {
        beforeEach(() => {
          testMutation('Event')
        })

        describe('toggle sets', () => {
          describe('"All"', () => {
            it('unset all post type filters', () => {
              expect(testMutation('All')).toEqual({})
            })

            describe('"eventsEnded"', () => {
              it('has "null"', () => {
                expect(testMutation('All')).toEqual({})
                expect(getters.eventsEnded(state)).toEqual(null)
              })
            })
          })

          describe('"Article"', () => {
            it('only new post type filter is set', () => {
              expect(testMutation('Article')).toEqual({ postType_in: ['Article'] })
            })

            describe('"eventsEnded"', () => {
              it('has "null"', () => {
                expect(testMutation('Article')).toEqual({ postType_in: ['Article'] })
                expect(getters.eventsEnded(state)).toEqual(null)
              })
            })
          })

          describe('"Event" again', () => {
            it('unset all post type filters', () => {
              expect(testMutation('Event')).toEqual({})
            })

            describe('"eventsEnded"', () => {
              it('has "null"', () => {
                expect(testMutation('Event')).toEqual({})
                expect(getters.eventsEnded(state)).toEqual(null)
              })
            })
          })
        })
      })
    })
  })

  describe('TOGGLE_EVENTS_ENDED', () => {
    beforeEach(() => {
      state = defaultState()
    })

    describe('default', () => {
      it('has "null"', () => {
        expect(getters.eventsEnded(state)).toEqual(null)
      })
    })

    describe('on toggle "true"', () => {
      it('has "Date"', () => {
        mutations.TOGGLE_EVENTS_ENDED(state, true)
        expect(getters.eventsEnded(state)).toBeInstanceOf(Date)
      })
    })

    describe('on toggle "false" after "true"', () => {
      it('has "null"', () => {
        mutations.TOGGLE_EVENTS_ENDED(state, true)
        mutations.TOGGLE_EVENTS_ENDED(state, false)
        expect(getters.eventsEnded(state)).toEqual(null)
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
      state = defaultState()
    })

    describe('default', () => {
      it('has "createdAt_desc"', () => {
        expect(getters.orderBy(state)).toEqual('createdAt_desc')
      })
    })

    describe('on toggle "createdAt_asc"', () => {
      it('has "createdAt_asc"', () => {
        expect(testMutation('createdAt_asc')).toEqual('createdAt_asc')
      })
    })
  })
})
