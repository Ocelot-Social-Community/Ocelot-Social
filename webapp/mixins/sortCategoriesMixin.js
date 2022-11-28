export default {
  methods: {
    sortCategories(categories, locales) {
      const misc = categories.find((cat) => cat.slug === 'miscellaneous')
      const sortedCategories = categories
        .filter((cat) => cat.slug !== misc.slug)
        .sort((a, b) => {
          if (
            locales(`contribution.category.name.${a.slug}`) <
            locales(`contribution.category.name.${b.slug}`)
          )
            return -1
          if (
            locales(`contribution.category.name.${a.slug}`) >
            locales(`contribution.category.name.${b.slug}`)
          )
            return 1
          return 0
        })
      if (misc) sortedCategories.push(misc)
      return sortedCategories
    },
  },
}
