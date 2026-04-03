export default {
  data() {
    const pointerQuery =
      typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)') : null
    return {
      isTouchDevice: pointerQuery ? pointerQuery.matches : false,
      pointerQuery,
    }
  },
  mounted() {
    if (this.pointerQuery) {
      this.onPointerChange = (e) => {
        this.isTouchDevice = e.matches
      }
      this.pointerQuery.addEventListener('change', this.onPointerChange)
    }
  },
  beforeDestroy() {
    if (this.pointerQuery && this.onPointerChange) {
      this.pointerQuery.removeEventListener('change', this.onPointerChange)
    }
  },
}
