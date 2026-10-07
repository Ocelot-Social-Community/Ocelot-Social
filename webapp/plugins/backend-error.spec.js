import Vue from 'vue'

import backendErrorPlugin, {
  backendErrorCode,
  backendErrorMessage,
  logBackendError,
} from './backend-error.js'

const translations = {
  'backendErrors.GROUP_SAVE_SLUG_ALREADY_TAKEN': 'slug taken',
  'backendErrors.GROUP_SAVE_TOO_MANY_CATEGORIES': 'at most {max}',
  'backendErrors.generic.BAD_USER_INPUT': 'generic input',
  'backendErrors.generic.FORBIDDEN': 'generic forbidden',
  'backendErrors.generic.UNAUTHENTICATED': 'generic unauthenticated',
  'backendErrors.generic.DEFAULT': 'generic default',
  'backendErrors.generic.NETWORK_ERROR': 'generic network',
}
const i18n = {
  // Fills `{placeholder}`s from the params, as vue-i18n does.
  $t: jest.fn((key, params = {}) =>
    translations[key].replace(/{(\w+)}/g, (placeholder, name) => params[name] ?? placeholder),
  ),
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
        graphQLError({ code: 'BAD_USER_INPUT', errorCode: 'GROUP_SAVE_SLUG_ALREADY_TAKEN' }),
        i18n,
      ),
    ).toBe('slug taken')
  })

  it('interpolates the params', () => {
    expect(
      backendErrorMessage(
        graphQLError({
          code: 'BAD_USER_INPUT',
          errorCode: 'GROUP_SAVE_TOO_MANY_CATEGORIES',
          params: { max: 3 },
        }),
        i18n,
      ),
    ).toBe('at most 3')
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
    const error = graphQLError({
      code: 'BAD_USER_INPUT',
      errorCode: 'GROUP_SAVE_SLUG_ALREADY_TAKEN',
    })
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
      const cause = graphQLError({
        code: 'BAD_USER_INPUT',
        errorCode: 'GROUP_SAVE_SLUG_ALREADY_TAKEN',
      })
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
  const error = graphQLError({ code: 'BAD_USER_INPUT', errorCode: 'GROUP_SAVE_SLUG_ALREADY_TAKEN' })

  it('is the errorCode of the first GraphQL error', () => {
    expect(backendErrorCode(error)).toBe('GROUP_SAVE_SLUG_ALREADY_TAKEN')
  })

  it('is found on the cause of a wrapping error', () => {
    expect(backendErrorCode(new Error('wrapped', { cause: error }))).toBe(
      'GROUP_SAVE_SLUG_ALREADY_TAKEN',
    )
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

  it('injects $toastBackendError, which shows that message as an error toast', () => {
    backendErrorPlugin()
    const vm = new Vue()
    vm.$t = i18n.$t
    vm.$i18n = i18n.$i18n
    vm.$toast = { error: jest.fn() }
    vm.$toastBackendError(graphQLError({ code: 'FORBIDDEN' }))
    expect(vm.$toast.error).toHaveBeenCalledWith('generic forbidden')
  })
})

describe('the backend error in the console', () => {
  let consoleError

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
    delete process.client
  })

  describe('logBackendError', () => {
    it('logs the errorCode, the error class and the untranslated backend text', () => {
      logBackendError({
        graphQLErrors: [
          {
            message: 'Incorrect email address or password.',
            path: ['login'],
            extensions: { code: 'UNAUTHENTICATED', errorCode: 'LOGIN_CREDENTIALS_INCORRECT' },
          },
        ],
      })
      expect(consoleError).toHaveBeenCalledTimes(1)
      expect(consoleError).toHaveBeenCalledWith(
        '[backend error] LOGIN_CREDENTIALS_INCORRECT / UNAUTHENTICATED: Incorrect email address or password.',
        { path: ['login'] },
      )
    })

    it('logs the params of an error that has some', () => {
      logBackendError(
        graphQLError({
          code: 'BAD_USER_INPUT',
          errorCode: 'GROUP_SAVE_TOO_MANY_CATEGORIES',
          params: { max: 3 },
        }),
      )
      expect(consoleError).toHaveBeenCalledWith(
        '[backend error] GROUP_SAVE_TOO_MANY_CATEGORIES / BAD_USER_INPUT: English text',
        { params: { max: 3 } },
      )
    })

    it('logs an error without any code as such', () => {
      logBackendError({ graphQLErrors: [{ message: 'x' }] })
      expect(consoleError).toHaveBeenCalledWith('[backend error] no code: x', {})
    })

    it('finds the backend error inside a wrapping error', () => {
      logBackendError(new Error('wrapped', { cause: graphQLError({ code: 'FORBIDDEN' }) }))
      expect(consoleError).toHaveBeenCalledWith('[backend error] FORBIDDEN: English text', {})
    })

    it.each([[{ networkError: {}, message: 'down' }], [new Error('Ouch!')], ['plain string']])(
      'stays silent for %p — it carries no backend error',
      (other) => {
        logBackendError(other)
        expect(consoleError).not.toHaveBeenCalled()
      },
    )
  })

  describe('$backendError', () => {
    const component = () => {
      backendErrorPlugin()
      const vm = new Vue()
      vm.$t = i18n.$t
      vm.$i18n = i18n.$i18n
      vm.$toast = { error: jest.fn() }
      return vm
    }

    it('logs the error it turns into a message, in the browser', () => {
      process.client = true
      expect(component().$backendError(graphQLError({ code: 'FORBIDDEN' }))).toBe(
        'generic forbidden',
      )
      expect(consoleError).toHaveBeenCalledWith('[backend error] FORBIDDEN: English text', {})
    })

    it('logs once for $toastBackendError', () => {
      process.client = true
      component().$toastBackendError(graphQLError({ code: 'FORBIDDEN' }))
      expect(consoleError).toHaveBeenCalledTimes(1)
    })

    it('does not log during SSR', () => {
      component().$backendError(graphQLError({ code: 'FORBIDDEN' }))
      expect(consoleError).not.toHaveBeenCalled()
    })
  })
})
