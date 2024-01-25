import { defineUserConfig } from 'vuepress'
import meta from './config/meta'
import theme from './config/theme'
import plugins from './config/plugins'

export default defineUserConfig({
  pagePatterns: ['**/*.md', '!.vuepress', '!node_modules', '!backend/node_modules', '!webapp/node_modules', '!deployment/src/old'],
  ...meta,
  theme,
  plugins,
})
