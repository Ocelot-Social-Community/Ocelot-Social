import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      categories: 'categories/categories',
      isInitialized: 'categories/isInitialized',
    }),
    // Whether the categories feature is enabled — read straight from the network
    // policy (single source of truth, admin-toggleable at runtime), consistent
    // with how other policy flags (e.g. apiKeysEnabled) are gated.
    categoriesActive() {
      return !!this.$policy.get('categoriesActive')
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
