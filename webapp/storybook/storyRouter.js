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
    router.replace(routerProps.initialEntry ? routerProps.initialEntry : '/')

    const getLocation = (location) => {
      if (typeof location === 'object') {
        return location.path ? location.path : `name: ${location.name}`
      }
      return location
    }

    let replaced

    const originalPush = router.push.bind(router)
    router.push = (location, success, abort) => {
      replaced = false
      originalPush(location, success, abort)
      if (!replaced) {
        action('PUSH')(getLocation(location))
      }
    }

    const originalReplace = router.replace.bind(router)
    router.replace = (location, success, abort) => {
      replaced = false
      originalReplace(location, success, abort)
      if (!replaced) {
        action('REPLACE')(getLocation(location))
      }
    }

    if (routerProps.globalBeforeEach) {
      router.beforeEach(routerProps.globalBeforeEach)
    }

    router.afterEach((to) => {
      for (const link in links) {
        if (to.fullPath === link) {
          links[link](to.fullPath)
          replaced = true
          return
        }
      }
    })

    const WrappedComponent = story()
    return Vue.extend({
      router,
      components: { WrappedComponent },
      template: '<wrapped-component/>',
      beforeDestroy() {
        this.$options.router.afterHooks = []
      },
    })
  }
}

export default storyRouterDecorator
