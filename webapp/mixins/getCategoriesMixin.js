import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      categories: 'categories/categories',
      isInitialized: 'categories/isInitialized',
      categoriesActive: 'categories/categoriesActive',
    }),
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
