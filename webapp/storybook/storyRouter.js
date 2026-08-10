import VueRouter from 'vue-router'
import Vue from 'vue'
import { action } from '@storybook/addon-actions'

// Inlined from storybook-vue-router@1.0.7 (https://github.com/gerbenmeijer/storybook-vue-router).
// The published package is a prebuilt CJS bundle that requires '@storybook/addon-actions' in a way
// webpack can no longer statically resolve against the v7 package (its peer deps still cap out at
// Storybook 5/6, and it hasn't been updated since 2021) — inlining sidesteps that broken require by
// importing `action` the same way every other story in this project already does successfully.
Vue.use(VueRouter)

const storyRouterDecorator = (links = {}, routerProps = {}) => {
  return (story) => {
    const router = new VueRouter(routerProps)
    if (routerProps.initialEntry) {
      router.replace(routerProps.initialEntry).catch((err) => {
        if (err.name !== 'NavigationDuplicated') throw err
      })
    }

    const getLocation = (location) => {
      if (typeof location === 'object') {
        return location.path ? location.path : `name: ${location.name}`
      }
      return location
    }

    // Resolves the target and decides synchronously, before the (asynchronous) navigation is even
    // kicked off, rather than the original's `afterEach` + shared `replaced` flag — that ran the
    // "was this target handled by `links`?" check only after `push`/`replace` had already logged the
    // generic action, since `afterEach` fires once navigation resolves, well after the synchronous
    // `if (!replaced)` check that immediately followed the (async) call. The suppression never worked.
    const wrapNavigation = (original, actionName) => (location, success, abort) => {
      const resolved = router.resolve(location).route.fullPath
      const linkHandler = links[resolved]
      if (linkHandler) {
        linkHandler(resolved)
      } else {
        action(actionName)(getLocation(location))
      }
      return original(location, success, abort)
    }

    router.push = wrapNavigation(router.push.bind(router), 'PUSH')
    router.replace = wrapNavigation(router.replace.bind(router), 'REPLACE')

    if (routerProps.globalBeforeEach) {
      router.beforeEach(routerProps.globalBeforeEach)
    }

    const WrappedComponent = story()
    return Vue.extend({
      router,
      components: { WrappedComponent },
      template: '<wrapped-component/>',
    })
  }
}

export default storyRouterDecorator
