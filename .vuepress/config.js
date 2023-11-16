import path from 'path'
import fs from 'fs'
import { defineUserConfig } from 'vuepress'
import { defaultTheme } from '@vuepress/theme-default'
import { searchPlugin } from '@vuepress/plugin-search'
import { tocPlugin } from '@vuepress/plugin-toc'

export default defineUserConfig({
  base: '/',
  title: 'Ocelot-Social Documentation',
  description: 'Ocelot-Social Documentation',
  head: [
    ['meta', {name: 'viewport', content: 'width=device-width,initial-scale=1'}],
  ],
  theme: defaultTheme({
    favicon: 'favicon.ico',
    logo: '/logo.svg',
    docsRepo: 'https://github.com/Ocelot-Social-Community/Ocelot-Social',
    docsBranch: 'master',
    docsDir: '.',
    pagePatterns: ['**/*.md', '!.vuepress', '!node_modules', '!backend/node_modules', '!webapp/node_modules', '!deployment/src/old'],
    editLink: true,
    lastUpdated: false,
    contributors: false,
    footerHtml: true,
    sidebar: generateSidebar('../SUMMARY.md'),
    navbar: [
      { text: 'Home', link: '/' },
      {
        text: 'Github',
        link: 'https://github.com/Ocelot-Social-Community/Ocelot-Social'
      },
    ],
    plugins: {
      mdEnhance: {
        tabs: true,
      }
    },
  }),
  plugins: [
    searchPlugin({
    }),
    tocPlugin({
      // options
    }),
  ],
})

function generateSidebar(summaryFileName) {
  const summaryFile = path.resolve(__dirname, summaryFileName)

  try {
    return getSummaryData(summaryFile)
  } catch (err) {
    console.error(`Error generating sidebar from file ${summaryFileName}:`, err)
    process.exit(1)
  }
}

function getSummaryData(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const sidebarStructure = []
  let currentParent = null

  lines.forEach((line, i) => {
    const level = line.search(/\S|$/) / 2
    const match = line.match(/^\s*\*\s*\[([^\]]+)\]\(([^)]+)\)/)

    if (match) {
      const newEntry = { text: match[1], link: `/${match[2]}`, children: [] }
      if (level === 0) {
        sidebarStructure.push(newEntry)
        currentParent = sidebarStructure[sidebarStructure.length - 1]
      } else {
        let parent = currentParent
    
        for (let i = 1; i < level; i++) {
          parent = parent.children[parent.children.length - 1]
        }
    
        parent.children.push(newEntry)
      }
    }
  })

  sidebarStructure.forEach(removeEmptyArrays)
  return sidebarStructure
}

function removeEmptyArrays(item) {
  if (item.children && item.children.length === 0) {
    delete item.children;
  } else if (item.children) {
    item.children.forEach(removeEmptyArrays);
  }
}