<template>
  <div>
    <!-- <filter-menu-section :title="$t('filter-menu.languages')" class="languages-filter">
    <template>
      <labeled-button
        class="filter-languages"
        :filled="!filteredLanguageCodes.length"
        :label="$t('filter-menu.all')"
        icon="check"
        @click="resetLanguages"
      />
    </template>
    <template #filter-list>
      <li v-for="language in locales" :key="language.code" class="item">
        <base-button
          :filled="filteredLanguageCodes.includes(language.code)"
          circle
          @click="toggleLanguage(language.code)"
        >
          {{ language.code.toUpperCase() }}
        </base-button>
      </li>
    </template>
  </filter-menu-section> -->
  </div>
</template>

<script>
// import { mapGetters, mapMutations } from 'vuex'
// import orderBy from 'lodash/orderBy'
// import locales from '~/locales'
// import FilterMenuSection from '~/components/FilterMenu/FilterMenuSection'
// import LabeledButton from '~/components/_new/generic/LabeledButton/LabeledButton'

// export default {
//   components: {
//     FilterMenuSection,
//     LabeledButton,
//   },
//   computed: {
//     ...mapGetters({
//       filteredLanguageCodes: 'posts/filteredLanguageCodes',
//     }),
//   },
//   methods: {
//     ...mapMutations({
//       resetLanguages: 'posts/RESET_LANGUAGES',
//       toggleLanguage: 'posts/TOGGLE_LANGUAGE',
//     }),
//   },
//   data() {
//     return {
//       locales: orderBy(locales, 'name'),
//     }
//   },
// }
</script>
