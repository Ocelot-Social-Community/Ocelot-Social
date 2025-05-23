import { mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapGetters({
      categories: 'categories/categories',
      isInizialized: 'categories/isInizialized',
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
