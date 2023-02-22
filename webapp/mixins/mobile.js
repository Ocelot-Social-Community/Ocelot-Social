export default (mobileWidth = null) => {
  return {
    data() {
      return {
        windowWidth: null,
        maxMobileWidth: mobileWidth || 810, // greater counts as desktop
      }
    },
    computed: {
      isMobile() {
        if (!this.windowWidth) return false
        return this.windowWidth <= this.maxMobileWidth
      },
    },
    mounted() {
      this.windowWidth = window.innerWidth
      window.addEventListener('resize', () => {
        this.windowWidth = window.innerWidth
      })
    },
  }
}
