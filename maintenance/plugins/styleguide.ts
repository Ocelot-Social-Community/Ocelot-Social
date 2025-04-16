import Styleguide from '@human-connection/styleguide'
import '@human-connection/styleguide/dist/system.css'

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.use(Styleguide)
})
