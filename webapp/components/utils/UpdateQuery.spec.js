import Vue from 'vue'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { ApolloLink, Observable } from 'apollo-link'
import gql from 'graphql-tag'
import UpdateQuery, { fetchMorePage } from './UpdateQuery'

let $state
let component
let pageKey
let updateQuery
let previousResult
let fetchMoreResult

beforeEach(() => {
  component = {
    hasMore: true,
    pageSize: 1,
  }

  $state = {
    complete: jest.fn(),
    loaded: jest.fn(),
  }
  previousResult = { Post: [{ id: 1, foo: 'bar' }] }
  fetchMoreResult = { Post: [{ id: 2, foo: 'baz' }] }
  updateQuery = () => UpdateQuery(component, { $state, pageKey })
})

describe('UpdateQuery', () => {
  it('throws error because no key is given', () => {
    expect(() => {
      updateQuery()({ Post: [] }, { fetchMoreResult: { Post: [] } })
    }).toThrow(/No key given/)
  })

  describe('with a page key', () => {
    beforeEach(() => (pageKey = 'Post'))

    describe('given two arrays of things', () => {
      it('merges the arrays', () => {
        expect(updateQuery()(previousResult, { fetchMoreResult })).toEqual({
          Post: [
            { id: 1, foo: 'bar' },
            { id: 2, foo: 'baz' },
          ],
        })
      })

      it('does not create duplicates', () => {
        fetchMoreResult = { Post: [{ id: 1, foo: 'baz' }] }
        expect(updateQuery()(previousResult, { fetchMoreResult })).toEqual({
          Post: [{ id: 1, foo: 'bar' }],
        })
      })

      it('does not call $state.complete()', () => {
        updateQuery()(previousResult, { fetchMoreResult })
        expect($state.complete).not.toHaveBeenCalled()
      })

      describe('in case of fewer records than pageSize', () => {
        beforeEach(() => (component.pageSize = 10))
        it('calls $state.complete()', () => {
          updateQuery()(previousResult, { fetchMoreResult })
          expect($state.complete).toHaveBeenCalled()
        })

        it('changes component.hasMore to `false`', () => {
          expect(component.hasMore).toBe(true)
          updateQuery()(previousResult, { fetchMoreResult })
          expect(component.hasMore).toBe(false)
        })
      })
    })

    describe('given one array is undefined', () => {
      describe('does not crash', () => {
        it('neither if the previous data was undefined', () => {
          expect(updateQuery()(undefined, { fetchMoreResult })).toEqual({
            Post: [{ id: 2, foo: 'baz' }],
          })
        })

        it('not if the new data is undefined', () => {
          expect(updateQuery()(previousResult, {})).toEqual({ Post: [{ id: 1, foo: 'bar' }] })
        })
      })
    })
  })
})

describe('fetchMorePage', () => {
  let query

  beforeEach(() => {
    $state = { complete: jest.fn(), loaded: jest.fn() }
  })

  it('asks for the page and merges it into the list under the page key', async () => {
    query = { fetchMore: jest.fn().mockResolvedValue({ data: {} }) }
    await fetchMorePage(component, query, { variables: { offset: 6 }, $state, pageKey: 'Post' })

    const [{ variables, updateQuery }] = query.fetchMore.mock.calls[0]
    expect(variables).toEqual({ offset: 6 })
    expect(updateQuery(previousResult, { fetchMoreResult })).toEqual({
      Post: [
        { id: 1, foo: 'bar' },
        { id: 2, foo: 'baz' },
      ],
    })
  })

  // Against apollo-client itself: the next page is asked for, the list's query is stopped while
  // the answer is on its way (vue-apollo does that when the page is left), then the answer comes.
  describe('when the answer comes after its query was stopped', () => {
    const PAGE = gql`
      query ($offset: Int) {
        Post(offset: $offset) {
          id
        }
      }
    `
    let answer
    let observable

    beforeEach(async () => {
      let pending = 0
      const link = new ApolloLink(
        (operation) =>
          new Observable((observer) => {
            const respond = () => {
              observer.next({
                data: { Post: [{ __typename: 'Post', id: `p${operation.variables.offset}` }] },
              })
              observer.complete()
            }
            // The first page comes at once, the next one when the test says so.
            if (pending++ === 0) respond()
            else answer = respond
          }),
      )
      const client = new ApolloClient({ link, cache: new InMemoryCache() })
      observable = client.watchQuery({ query: PAGE, variables: { offset: 0 } })
      await new Promise((resolve) => {
        const subscription = observable.subscribe(() => resolve())
        observable.stop = () => subscription.unsubscribe()
      })
      component = { hasMore: true, pageSize: 1 }
    })

    const nextPage = (page) =>
      fetchMorePage(page, observable, { variables: { offset: 1 }, $state, pageKey: 'Post' })

    it('makes apollo-client reject, unguarded', async () => {
      const unguarded = observable.fetchMore({
        variables: { offset: 1 },
        updateQuery: UpdateQuery(component, { $state, pageKey: 'Post' }),
      })
      observable.stop()
      answer()

      await expect(unguarded).rejects.toThrow("ObservableQuery with this id doesn't exist")
    })

    it('drops the answer once the page was left', async () => {
      const page = new Vue()
      const loading = nextPage(page)
      page.$destroy()
      observable.stop()
      answer()

      await expect(loading).resolves.toBeUndefined()
    })

    it('still fails while the page is shown', async () => {
      const loading = nextPage(new Vue())
      observable.stop()
      answer()

      await expect(loading).rejects.toThrow("ObservableQuery with this id doesn't exist")
    })
  })
})
