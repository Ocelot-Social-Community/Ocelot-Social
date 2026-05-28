// Unit tests for the methods/computed properties of pages/groups/index.vue —
// faster than mount-driven tests and lets us exercise the pagination /
// tab-switching branches that the existing render spec leaves untouched.
import Groups from './index.vue'

const { methods, computed } = Groups
const apollo = Groups.apollo

describe('pages/groups/index.vue — methods', () => {
  describe('handleTab', () => {
    it('does nothing when the tab does not change', () => {
      const refetch = jest.fn()
      const ctx = {
        tabActive: 'myGroups',
        activePage: 4,
        groupFilter: { isMember: true },
        $apollo: { queries: { Group: { refetch } } },
      }
      methods.handleTab.call(ctx, 'myGroups')
      expect(refetch).not.toHaveBeenCalled()
      expect(ctx.activePage).toBe(4)
    })

    it('switches to allGroups, clears the filter and resets pagination', () => {
      const refetch = jest.fn()
      const ctx = {
        tabActive: 'myGroups',
        activePage: 2,
        groupFilter: { isMember: true },
        $apollo: { queries: { Group: { refetch } } },
      }
      methods.handleTab.call(ctx, 'allGroups')
      expect(ctx.tabActive).toBe('allGroups')
      expect(ctx.activePage).toBe(0)
      expect(ctx.groupFilter).toEqual({})
      expect(refetch).toHaveBeenCalled()
    })

    it('switches back to myGroups and restores the isMember filter', () => {
      const refetch = jest.fn()
      const ctx = {
        tabActive: 'allGroups',
        activePage: 3,
        groupFilter: {},
        $apollo: { queries: { Group: { refetch } } },
      }
      methods.handleTab.call(ctx, 'myGroups')
      expect(ctx.groupFilter).toEqual({ isMember: true })
      expect(refetch).toHaveBeenCalled()
    })
  })

  describe('previousResults', () => {
    it('decrements activePage and refetches', () => {
      const refetch = jest.fn()
      const ctx = { activePage: 3, $apollo: { queries: { Group: { refetch } } } }
      methods.previousResults.call(ctx)
      expect(ctx.activePage).toBe(2)
      expect(refetch).toHaveBeenCalled()
    })
  })

  describe('nextResults', () => {
    it('increments activePage and refetches', () => {
      const refetch = jest.fn()
      const ctx = { activePage: 0, $apollo: { queries: { Group: { refetch } } } }
      methods.nextResults.call(ctx)
      expect(ctx.activePage).toBe(1)
      expect(refetch).toHaveBeenCalled()
    })
  })
})

describe('pages/groups/index.vue — computed', () => {
  describe('tabOptions', () => {
    it('builds 2 tabs with their counts and disabled state', () => {
      const ctx = {
        myGroupsCount: 0,
        allGroupsCount: 7,
        $t: (k) => k,
      }
      const result = computed.tabOptions.call(ctx)
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ type: 'myGroups', count: 0, disabled: true })
      expect(result[1]).toMatchObject({ type: 'allGroups', count: 7, disabled: false })
    })
  })

  describe('activeTab', () => {
    it('returns the tabOption matching tabActive', () => {
      const ctx = {
        tabActive: 'allGroups',
        tabOptions: [
          { type: 'myGroups', count: 1 },
          { type: 'allGroups', count: 5 },
        ],
      }
      expect(computed.activeTab.call(ctx)).toEqual({ type: 'allGroups', count: 5 })
    })
  })

  describe('showPagination', () => {
    it('is true when there are more results than fit on one page', () => {
      const ctx = { activeTab: { count: 12 }, pageSize: 6 }
      expect(computed.showPagination.call(ctx)).toBe(true)
    })

    it('is false when the count fits on a single page', () => {
      const ctx = { activeTab: { count: 4 }, pageSize: 6 }
      expect(computed.showPagination.call(ctx)).toBe(false)
    })
  })

  describe('hasNext', () => {
    it('is true while there are more pages to walk through', () => {
      const ctx = { activePage: 0, pageSize: 6, activeTab: { count: 18 } }
      expect(computed.hasNext.call(ctx)).toBe(true)
    })

    it('is false once we passed the last page', () => {
      const ctx = { activePage: 2, pageSize: 6, activeTab: { count: 12 } }
      expect(computed.hasNext.call(ctx)).toBe(false)
    })
  })

  describe('hasPrevious', () => {
    it('is false on the first page', () => {
      expect(computed.hasPrevious.call({ activePage: 0 })).toBe(false)
    })
    it('is true on any subsequent page', () => {
      expect(computed.hasPrevious.call({ activePage: 1 })).toBe(true)
    })
  })

  describe('pagination', () => {
    it('returns { first, offset } derived from pageSize × activePage', () => {
      expect(computed.pagination.call({ pageSize: 6, activePage: 3 })).toEqual({
        first: 6,
        offset: 18,
      })
      expect(computed.pagination.call({ pageSize: 6, activePage: 0 })).toEqual({
        first: 6,
        offset: 0,
      })
    })
  })

  describe('myGroups', () => {
    it('returns the Group list when populated', () => {
      expect(computed.myGroups.call({ Group: [{ id: 'g1' }] })).toEqual([{ id: 'g1' }])
    })

    it('returns [] when Group is null/undefined', () => {
      expect(computed.myGroups.call({ Group: null })).toEqual([])
    })
  })
})

describe('pages/groups/index.vue — apollo definitions', () => {
  describe('Group query', () => {
    it('combines groupFilter with pagination as variables', () => {
      const ctx = {
        groupFilter: { isMember: true },
        pagination: { first: 6, offset: 12 },
      }
      const variables = apollo.Group.variables.call(ctx)
      expect(variables).toEqual({ isMember: true, first: 6, offset: 12 })
    })

    it('error handler clears the list and toasts the message', () => {
      const ctx = { Group: [{ id: 'g1' }], $toast: { error: jest.fn() } }
      apollo.Group.error.call(ctx, new Error('boom'))
      expect(ctx.Group).toEqual([])
      expect(ctx.$toast.error).toHaveBeenCalledWith('boom')
    })

    it('query() is callable and returns a document', () => {
      expect(apollo.Group.query.call({ $i18n: { locale: () => 'en' } })).toBeDefined()
    })
  })

  describe('MyGroupsCount query', () => {
    it('variables always include isMember=true', () => {
      expect(apollo.MyGroupsCount.variables.call({})).toEqual({ isMember: true })
    })

    it('update writes the count into myGroupsCount', () => {
      const ctx = { myGroupsCount: 0 }
      apollo.MyGroupsCount.update.call(ctx, { GroupCount: 9 })
      expect(ctx.myGroupsCount).toBe(9)
    })
  })

  describe('AllGroupsCount query', () => {
    it('update writes the count into allGroupsCount', () => {
      const ctx = { allGroupsCount: 0 }
      apollo.AllGroupsCount.update.call(ctx, { GroupCount: 22 })
      expect(ctx.allGroupsCount).toBe(22)
    })
  })
})
