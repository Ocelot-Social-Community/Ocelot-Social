export default {
  methods: {
    sortCategories(categories) {
      const miscSlug = 'miscellaneous'
      const misc = categories.find((cat) => cat.slug === miscSlug)
      const sortedCategories = categories
        .filter((cat) => cat.slug !== miscSlug)
        .sort((a, b) => {
          if (
            this.$t(`contribution.category.name.${a.slug}`) <
            this.$t(`contribution.category.name.${b.slug}`)
          )
            return -1
          if (
            this.$t(`contribution.category.name.${a.slug}`) >
            this.$t(`contribution.category.name.${b.slug}`)
          )
            return 1
          return 0
        })
      if (misc) sortedCategories.push(misc)
      return sortedCategories
    },
  },
}
