import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'

import meta from './config/meta'
import theme from './config/theme'

export default defineUserConfig({
  pagePatterns: ['**/*.md', '!.vuepress', '!node_modules', '!backend/node_modules', '!webapp/node_modules', '!deployment/src/old'],
  bundler: viteBundler(),
  ...meta,
  theme,
})
