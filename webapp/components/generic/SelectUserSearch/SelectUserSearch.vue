<template>
  <ds-select
    class="select-user-search"
    type="search"
    icon="search"
    label-prop="id"
    v-model="query"
    :id="id"
    :icon-right="null"
    :options="users"
    :loading="$apollo.queries.searchUsers.loading"
    :filter="(item) => item"
    :no-options-available="$t('group.addUserNoOptions')"
    :auto-reset-search="true"
    :placeholder="$t('group.addUserPlaceholder')"
    @focus.capture.native="onFocus"
    @input.native="handleInput"
    @keyup.enter.native="onEnter"
    @keyup.delete.native="onDelete"
    @keyup.esc.native="clear"
    @blur.capture.native="onBlur"
    @input.exact="onSelect"
  >
    <template #option="{ option }">
      <p>
        <user-teaser :user="option" :showPopover="false" :linkToProfile="false" />
      </p>
    </template>
  </ds-select>
</template>

<script>
import { isEmpty } from 'lodash'
import { searchUsers } from '~/graphql/Search.js'
import UserTeaser from '~/components/UserTeaser/UserTeaser.vue'

export default {
  name: 'SelectUserSearch',
  components: {
    UserTeaser,
  },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      users: [],
      query: '',
      user: {},
    }
  },
  computed: {
    startSearch() {
      return this.query && this.query.length > 3
    },
  },
  methods: {
    onFocus() {},
    onBlur() {
      this.query = ''
    },
    handleInput(event) {
      this.query = event.target ? event.target.value.trim() : ''
    },
    onDelete(event) {
      const value = event.target ? event.target.value.trim() : ''
      if (isEmpty(value)) {
        this.clear()
      } else {
        this.handleInput(event)
      }
    },
    clear() {
      this.query = ''
      this.user = {}
      this.users = []
    },
    onSelect(item) {
      this.user = item
      this.$emit('select-user', this.user)
    },
    onEnter() {},
  },
  apollo: {
    searchUsers: {
      query() {
        return searchUsers
      },
      variables() {
        return {
          query: this.query,
          firstUsers: 5,
          usersOffset: 0,
        }
      },
      skip() {
        return !this.startSearch
      },
      update({ searchUsers }) {
        this.users = searchUsers.users
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>
