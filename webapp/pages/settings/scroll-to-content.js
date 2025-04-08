export default {
  mounted() {
    if (document.documentElement.clientWidth < 600) {
      document.getElementById('settings-content').scrollIntoView({
        behavior: 'smooth',
      })
    }
  },
}
