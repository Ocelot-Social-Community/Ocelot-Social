export default {
  methods: {
    sortCategories(categories, locales) {
      const miscSlug = 'miscellaneous'
      const misc = categories.find((cat) => cat.slug === miscSlug)
      const sortedCategories = categories
        .filter((cat) => cat.slug !== miscSlug)
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
