import { debounce } from 'lodash'
import { checkSlugAvailableQuery } from '~/graphql/User.js'

export default function UniqueSlugForm({ translate, apollo, currentUser }) {
  let pendingCallback = null

  const debouncedSlugCheck = debounce((value, callback) => {
    const variables = { slug: value }
    apollo
      .query({ query: checkSlugAvailableQuery, variables })
      .then((response) => {
        const {
          data: { User },
        } = response
        const existingSlug = User && User[0] && User[0].slug
        const available = !existingSlug || existingSlug === currentUser.slug
        if (!available) {
          callback(new Error(translate('settings.validation.slug.alreadyTaken')))
        } else {
          callback()
        }
      })
      .catch(() => {
        callback()
      })
  }, 500)

  return {
    formSchema: {
      slug: [
        {
          type: 'string',
          required: true,
          pattern: /^[a-z0-9_-]+$/,
          message: translate('settings.validation.slug.regex'),
        },
        {
          asyncValidator(rule, value, callback) {
            // Resolve any pending callback from a previous debounced call
            // that was cancelled, so async-validator doesn't hang
            if (pendingCallback) {
              pendingCallback()
            }
            pendingCallback = callback
            debouncedSlugCheck(value, (error) => {
              pendingCallback = null
              if (error) {
                callback(error)
              } else {
                callback()
              }
            })
          },
        },
      ],
    },
  }
}
