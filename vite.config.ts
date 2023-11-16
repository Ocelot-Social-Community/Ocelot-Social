import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import vike from 'vike/plugin'
import { UserConfig } from 'vite'

const config: UserConfig = {
  plugins: [
    vue(),
    process.env.STORYBOOK !== 'true' && vike(), // SSR only when storybook is not running
    vueI18n({
      ssr: true,
    }),
  ],
  ssr: { noExternal: ['vuetify'] },
}

export default config
