import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      categories: 'categories/categories',
      isInitialized: 'categories/isInitialized',
    }),
    // Whether the categories feature is usable. The network policy is the
    // single source of truth for the toggle (admin-controlled at runtime), but
    // we also require at least one category to exist — otherwise the feature
    // would surface unfillable "category required" fields and empty selectors
    // when the DB has no categories. Restores the previous `!!categories.length`
    // safety net on top of the policy flag.
    categoriesActive() {
      return !!this.$policy.get('categoriesActive') && this.categories?.length > 0
    },
  },
  methods: {
    ...mapActions({
      storeInit: 'categories/init',
    }),
  },
  async created() {
    if (!this.storeIsInizialized) await this.storeInit()
  },
}
