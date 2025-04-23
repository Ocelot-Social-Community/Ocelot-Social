export default {
  mounted() {
    if (document.documentElement.clientWidth >= 600) return

    const content = document.getElementById('settings-content')

    if (!content) return

    content.scrollIntoView({
      behavior: 'smooth',
    })
  },
}
