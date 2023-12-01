import { defineUserConfig } from 'vuepress'

export default defineUserConfig({
  title: 'IT4C Frontend Boilerplate Documentation',
  description: 'IT4C Frontend Boilerplate Documentation',
  dest: 'build/docs',
  base: process.env.VUEPRESS_BASE ? `/${process.env.VUEPRESS_BASE}/` : '/',
  pagePatterns: ['**/*.md', '**/LICENSE', '!.vuepress', '!node_modules'],
})
