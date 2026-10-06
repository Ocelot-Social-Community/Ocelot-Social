import Vue from 'vue'

import backendErrorPlugin, { backendErrorCode, backendErrorMessage } from './backend-error.js'

const translations = {
  'backendErrors.GROUP_SLUG_TAKEN': 'slug taken',
  'backendErrors.GROUP_TOO_MANY_CATEGORIES': 'at most {max}',
  'backendErrors.generic.BAD_USER_INPUT': 'generic input',
  'backendErrors.generic.FORBIDDEN': 'generic forbidden',
  'backendErrors.generic.UNAUTHENTICATED': 'generic unauthenticated',
  'backendErrors.generic.DEFAULT': 'generic default',
  'backendErrors.generic.NETWORK_ERROR': 'generic network',
}
const i18n = {
  $t: jest.fn((key, params) => `${translations[key]}${params ? ` ${JSON.stringify(params)}` : ''}`),
  $i18n: { keyExists: (key) => key in translations },
}

const graphQLError = (extensions) => ({
  message: 'GraphQL error: English text',
  graphQLErrors: [{ message: 'English text', extensions }],
})

describe('backendErrorMessage', () => {
  it('translates the errorCode', () => {
    expect(
      backendErrorMessage(
        graphQLError({ code: 'BAD_USER_INPUT', errorCode: 'GROUP_SLUG_TAKEN' }),
        i18n,
      ),
    ).toBe('slug taken')
  })

  it('interpolates the params', () => {
    expect(
      backendErrorMessage(
        graphQLError({
          code: 'BAD_USER_INPUT',
          errorCode: 'GROUP_TOO_MANY_CATEGORIES',
          params: { max: 3 },
        }),
        i18n,
      ),
    ).toBe('at most {max} {"max":3}')
  })

  it.each([
    ['BAD_USER_INPUT', 'generic input'],
    ['FORBIDDEN', 'generic forbidden'],
    ['UNAUTHENTICATED', 'generic unauthenticated'],
    ['INTERNAL_SERVER_ERROR', 'generic default'],
    ['GRAPHQL_VALIDATION_FAILED', 'generic default'],
    [undefined, 'generic default'],
  ])('falls back to the generic message for class %s', (code, expected) => {
    expect(backendErrorMessage(graphQLError({ code }), i18n)).toBe(expected)
  })

  it('falls back to the generic message for an errorCode without translation', () => {
    expect(
      backendErrorMessage(graphQLError({ code: 'FORBIDDEN', errorCode: 'UNKNOWN_CODE' }), i18n),
    ).toBe('generic forbidden')
  })

  it('copes with a GraphQL error without extensions', () => {
    expect(backendErrorMessage({ graphQLErrors: [{ message: 'x' }] }, i18n)).toBe('generic default')
  })

  it('shows the generic message for a network error', () => {
    expect(
      backendErrorMessage({ message: 'Network error: Failed to fetch', networkError: {} }, i18n),
    ).toBe('generic network')
  })

  it('keeps the message of an error that never came from the backend', () => {
    expect(backendErrorMessage(new Error('Ouch!'), i18n)).toBe('Ouch!')
  })

  it('keeps the message when no translations are available', () => {
    const error = graphQLError({ code: 'BAD_USER_INPUT', errorCode: 'GROUP_SLUG_TAKEN' })
    expect(backendErrorMessage(error, { $t: jest.fn() })).toBe('GraphQL error: English text')
    expect(backendErrorMessage({ networkError: {}, message: 'down' }, { $t: jest.fn() })).toBe(
      'down',
    )
  })

  it('stringifies anything that is not an error object', () => {
    expect(backendErrorMessage('plain string', i18n)).toBe('plain string')
  })

  describe('given an error that wraps the Apollo error as its cause', () => {
    // What store/auth.js throws from login(): `new Error(String(err), { cause: err })`.
    const wrapped = (cause) => new Error('Error: GraphQL error: English text', { cause })

    it('translates the errorCode of the cause', () => {
      const cause = graphQLError({ code: 'BAD_USER_INPUT', errorCode: 'GROUP_SLUG_TAKEN' })
      expect(backendErrorMessage(wrapped(cause), i18n)).toBe('slug taken')
    })

    it('finds it however deep it sits', () => {
      const cause = graphQLError({ code: 'FORBIDDEN' })
      expect(backendErrorMessage(wrapped(wrapped(cause)), i18n)).toBe('generic forbidden')
    })

    it('shows the generic message for a wrapped network error', () => {
      expect(backendErrorMessage(wrapped({ networkError: {} }), i18n)).toBe('generic network')
    })

    it('keeps the message of the OUTER error when no cause came from the backend', () => {
      expect(backendErrorMessage(wrapped(new Error('inner')), i18n)).toBe(
        'Error: GraphQL error: English text',
      )
    })
  })
})

describe('backendErrorCode', () => {
  const error = graphQLError({ code: 'BAD_USER_INPUT', errorCode: 'GROUP_SLUG_TAKEN' })

  it('is the errorCode of the first GraphQL error', () => {
    expect(backendErrorCode(error)).toBe('GROUP_SLUG_TAKEN')
  })

  it('is found on the cause of a wrapping error', () => {
    expect(backendErrorCode(new Error('wrapped', { cause: error }))).toBe('GROUP_SLUG_TAKEN')
  })

  it.each([[new Error('Ouch!')], [graphQLError({ code: 'FORBIDDEN' })], [undefined], [null]])(
    'is null for %p',
    (other) => {
      expect(backendErrorCode(other)).toBeNull()
    },
  )
})

describe('backend-error plugin', () => {
  it('injects $backendError, bound to the component', () => {
    backendErrorPlugin()
    const vm = new Vue()
    vm.$t = i18n.$t
    vm.$i18n = i18n.$i18n
    expect(vm.$backendError(graphQLError({ code: 'FORBIDDEN' }))).toBe('generic forbidden')
  })
})
