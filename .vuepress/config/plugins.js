import { searchProPlugin } from 'vuepress-plugin-search-pro'

export default [
  searchProPlugin({
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
  }),
]