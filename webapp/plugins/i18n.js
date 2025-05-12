import Vue from 'vue'
import vuexI18n from 'vuex-i18n/dist/vuex-i18n.umd.js'
import { isEmpty, find } from 'lodash'
import locales from '~/locales'
import htmlTranslations from '~/locales/html/'

const registerTranslation = ({ Vue, locale }) => {
  const translation = require(`~/locales/${locale}.json`)
  translation.html = htmlTranslations[locale]
  Vue.i18n.add(locale, translation)
}

/**
 * TODO: Refactor and simplify browser detection
 * and implement the user preference logic
 */
export default ({ app, req, cookie, store }) => {
  const debug = app.$env && app.$env.NODE_ENV !== 'production'
  const key = 'locale'

  const changeHandler = async (mutation) => {
    if (process.server) return

    const localeInStore = mutation.payload.locale
    let cookieExists = true
    let localeInCookies = await app.$cookies.get(key)
    if (!localeInCookies) {
      cookieExists = false
      localeInCookies = navigator.language.split('-')[0] // get browser language
    }
    const isLocaleStoreSameAsCookies = localeInStore === localeInCookies

    // cookie has to be set, otherwise Cypress test does not work
    if (cookieExists && isLocaleStoreSameAsCookies) {
      return
    }

    const expires = new Date()
    expires.setDate(expires.getDate() + app.$env && app.$env.COOKIE_EXPIRE_TIME)
    app.$cookies.set(key, localeInStore, {
      expires,
      // maxAge: app.$env.COOKIE_EXPIRE_TIME * 60 * 60 * 24, // days to seconds
      sameSite: 'lax', // for the meaning see https://www.thinktecture.com/de/identity/samesite/samesite-in-a-nutshell/
    })
    if (!app.$i18n.localeExists(localeInStore)) {
      import(`~/locales/${localeInStore}.json`).then((res) => {
        app.$i18n.add(localeInStore, res.default)
      })
    }

    /*
    const user = store.getters['auth/user']
    const token = store.getters['auth/token']
    // persist language if it differs from last value
    if (user && user._id && token) {
      // TODO: SAVE LOCALE
      // store.dispatch('usersettings/patch', {
      //   uiLanguage: localeInStore
      // }, { root: true })
    }
    */
  }

  Vue.use(vuexI18n.plugin, store, {
    onTranslationNotFound:
      debug &&
      function (locale, key) {
        /* eslint-disable-next-line no-console */
        console.warn(`vuex-i18n :: Key '${key}' not found for locale '${locale}'`)
      },
  })

  let userLocale = app.$env.LANGUAGE_DEFAULT
  const localeCookie = app.$cookies.get(key)

  if (!isEmpty(localeCookie)) {
    userLocale = localeCookie
  } else {
    try {
      userLocale = (
        process.browser
          ? navigator.language || navigator.userLanguage
          : req.headers['accept-language'].split(',')[0]
      ).substr(0, 2)
    } catch (err) {}
  }

  const availableLocales = locales.filter((lang) => !!lang.enabled)
  const locale = find(availableLocales, ['code', userLocale])
    ? userLocale
    : app.$env.LANGUAGE_DEFAULT

  // register locales
  registerTranslation({ Vue, locale: app.$env.LANGUAGE_FALLBACK })
  if (locale !== app.$env.LANGUAGE_FALLBACK) {
    registerTranslation({ Vue, locale })
  }

  // Set the start locale to use
  Vue.i18n.set(locale)
  Vue.i18n.fallback(app.$env.LANGUAGE_FALLBACK)

  if (process.browser) {
    store.subscribe((mutation) => {
      if (mutation.type === 'i18n/SET_LOCALE') {
        changeHandler(mutation)
      }
    })
  }

  app.$i18n = Vue.i18n

  return store
}
