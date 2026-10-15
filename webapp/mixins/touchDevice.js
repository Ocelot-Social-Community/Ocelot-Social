export default {
  data() {
    // The server cannot know the pointer of the browser, so the first render assumes none is coarse
    // on both sides — otherwise the client renders different markup than the server sent and fails
    // to hydrate. The real value follows once mounted.
    return {
      isTouchDevice: false,
    }
  },
  mounted() {
    this.pointerQuery = window.matchMedia('(pointer: coarse)')
    this.isTouchDevice = this.pointerQuery.matches
    this.onPointerChange = (e) => {
      this.isTouchDevice = e.matches
    }
    this.pointerQuery.addEventListener('change', this.onPointerChange)
  },
  beforeDestroy() {
    if (this.pointerQuery) {
      this.pointerQuery.removeEventListener('change', this.onPointerChange)
    }
  },
}
