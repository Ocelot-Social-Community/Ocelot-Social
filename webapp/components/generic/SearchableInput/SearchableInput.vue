<template>
  <div class="searchable-input" aria-label="search" role="search">
    <ds-select
      ref="select"
      type="search"
      icon="search"
      v-model="value"
      :id="id"
      label-prop="id"
      :icon-right="null"
      :options="options"
      :loading="loading"
      :filter="(item) => item"
      :no-options-available="emptyText"
      :auto-reset-search="!value"
      :placeholder="$t('search.placeholder')"
      @focus.capture.native="onFocus"
      @input.native="onInput"
      @keyup.enter.native="onEnter"
      @keyup.esc.native="clear"
      @blur.capture.native="onBlur"
      @input.exact="onSelect"
    >
      <template #option="{ option }">
        <search-heading v-if="isFirstOfType(option)" :resource-type="option.__typename" />
        <p
          v-if="option.__typename === 'User'"
          :class="{ 'option-with-heading': isFirstOfType(option) }"
        >
          <user-teaser :user="option" :showPopover="false" />
        </p>
        <p
          v-if="option.__typename === 'Post'"
          :class="{ 'option-with-heading': isFirstOfType(option) }"
        >
          <search-post :option="option" />
        </p>
        <p
          v-if="option.__typename === 'Group'"
          :class="{ 'option-with-heading': isFirstOfType(option) }"
        >
          <search-group :option="option" />
        </p>
        <p
          v-if="option.__typename === 'Tag'"
          :class="{ 'option-with-heading': isFirstOfType(option) }"
        >
          <hc-hashtag :id="option.id" />
        </p>
      </template>
    </ds-select>
    <base-button v-if="isActive" icon="close" circle ghost size="small" @click="clear" />
  </div>
</template>

<script>
import { isEmpty } from 'lodash'
import SearchHeading from '~/components/generic/SearchHeading/SearchHeading.vue'
import SearchPost from '~/components/generic/SearchPost/SearchPost.vue'
import SearchGroup from '~/components/generic/SearchGroup/SearchGroup.vue'
import HcHashtag from '~/components/Hashtag/Hashtag.vue'
import UserTeaser from '~/components/UserTeaser/UserTeaser.vue'

export default {
  name: 'SearchableInput',
  components: {
    SearchHeading,
    SearchGroup,
    SearchPost,
    HcHashtag,
    UserTeaser,
  },
  props: {
    id: { type: String },
    loading: { type: Boolean, default: false },
    options: { type: Array, default: () => [] },
  },
  data() {
    return {
      value: '',
      searchProcess: null,
      delay: 300,
    }
  },
  computed: {
    emptyText() {
      return !this.loading && this.isSearchable()
        ? this.$t('search.failed')
        : this.$t('search.hint')
    },
    isActive() {
      return !isEmpty(this.value)
    },
  },
  methods: {
    isSearchable() {
      return (
        !isEmpty(this.value) &&
        typeof this.value === 'string' &&
        this.value.replace(/\s+/g, '').length >= 3
      )
    },
    isFirstOfType(option) {
      return (
        this.options.findIndex((o) => o === option) ===
        this.options.findIndex((o) => o.__typename === option.__typename)
      )
    },
    onFocus(event) {
      clearTimeout(this.searchProcess)
    },
    onInput(event) {
      clearTimeout(this.searchProcess)
      this.value = event.target ? event.target.value.replace(/\s+/g, ' ').trim() : ''
      if (!this.isSearchable()) {
        this.$emit('clearSearch')
        return
      }
      this.searchProcess = setTimeout(() => {
        this.$emit('query', this.value)
      }, this.delay)
    },
    onEnter(event) {
      this.$router.push({
        path: '/search/search-results',
        query: { search: this.value },
      })
      this.$refs.select.close()
    },
    clear() {
      this.value = ''
      this.$emit('clearSearch')
      clearTimeout(this.searchProcess)
    },
    onBlur(event) {
      clearTimeout(this.searchProcess)
    },
    onSelect(item) {
      this.goToResource(item)
      this.$nextTick(() => {
        this.value = this.$refs.select.$data.searchString
      })
    },
    getRouteName(item) {
      switch (item.__typename) {
        case 'Post':
          return 'post-id-slug'
        case 'User':
          return 'profile-id-slug'
        case 'Group':
          return 'groups-id-slug'
        default:
          return null
      }
    },
    isTag(item) {
      return item.__typename === 'Tag'
    },
    goToResource(item) {
      this.$nextTick(() => {
        if (!this.isTag(item)) {
          this.$router.push({
            name: this.getRouteName(item),
            params: { id: item.id, slug: item.slug },
          })
        } else {
          this.$router.push('?hashtag=' + item.id)
        }
      })
    },
  },
}
</script>

<style lang="scss">
.searchable-input {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  .ds-form-item {
    flex-basis: 100%;
    margin-bottom: 0;
  }

  .ds-select-dropdown {
    max-height: 70vh;
    box-shadow: $box-shadow-x-large;
  }

  .option-with-heading {
    margin-top: $space-x-small;
    padding-top: $space-xx-small;
  }

  .base-button {
    position: absolute;
    right: $space-xx-small;
  }
}
</style>
