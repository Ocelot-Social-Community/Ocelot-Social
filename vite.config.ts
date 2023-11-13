import vue from '@vitejs/plugin-vue'
import vike from 'vike/plugin'
import { UserConfig } from 'vite'

const config: UserConfig = {
  plugins: [vue(), vike()],
  ssr: { noExternal: ['vuetify'] }
}

export default config
