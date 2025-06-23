import { tokenMap } from '@@/styles/tokens'

const windowSize = {
  width: null,
  height: null,
}

function updateWindowSize() {
  windowSize.width =
    document.documentElement.clientWidth || document.body.clientWidth

  windowSize.height =
    document.documentElement.clientHeight || document.body.clientHeight
}

let init = false

function initListener() {
  if (init) {
    return
  }
  try {
    if (window && typeof window !== 'undefined') {
      window.addEventListener('resize', updateWindowSize)
      updateWindowSize()
    }
    init = true
  } catch (err) {
    init = true
    return false
  }
}

/**
 * @mixin
 */
export default {
  data() {
    return {
      mediaQueryWindowSize: windowSize,
    }
  },
  methods: {
    mediaQuery(arg) {
      initListener()
      if (arg === null || typeof arg !== 'object') {
        return arg
      }
      let result = arg.base
      Object.keys(tokenMap.mediaSize)
        .reverse()
        .some((key) => {
          const width = tokenMap.mediaSize[key].value
          if (width <= this.mediaQueryWindowSize.width && arg[key]) {
            result = arg[key]
            return true
          }
        })
      return result
    },
  },
}
