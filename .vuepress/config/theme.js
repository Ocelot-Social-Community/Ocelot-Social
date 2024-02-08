import path from 'path'
import fs from 'fs'
import { hopeTheme } from 'vuepress-theme-hope'

export default hopeTheme({
  favicon: 'favicon.ico',
    logo: '/logo.svg',
    docsRepo: 'https://github.com/Ocelot-Social-Community/Ocelot-Social',
    docsBranch: 'master',
    docsDir: '.',
    editLink: true,
    lastUpdated: false,
    contributors: false,
    print: false,
    pure: true,
    displayFooter: true,
    footer: 'CC BY busFaktor() e.V. & Authors',
    sidebar: generateSidebar('../../SUMMARY.md'),
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
        imgSize: true
      },
      searchPro: {
        indexContent: true,
        autoSuggestions: true,
        customFields: [
          {
            getter: (page) => page.frontmatter.category,
            formatter: "Category: $content",
          },
          {
            getter: (page) => page.frontmatter.tag,
            formatter: "Tag: $content",
          },
        ],
      }
    }
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

