<template>
  <div>
    <ds-space margin="small">
      <ds-grid>
        <ds-grid-item>
          <ds-heading tag="h1">
            {{ creatEvent ? $t('post.createNewEvent.title') : $t('post.createNewPost.title') }}
          </ds-heading>
          <ds-heading v-if="group" tag="h2">
            {{ $t('post.createNewPost.forGroup.title', { name: group.name }) }}
          </ds-heading>
        </ds-grid-item>
        <ds-grid-item>
          <ds-button size="x-large" @click="creatEvent = !creatEvent">
            {{ creatEvent ? $t('post.name') : $t('post.event') }}
          </ds-button>
        </ds-grid-item>
      </ds-grid>
    </ds-space>
    <ds-space margin="large" />
    <ds-flex :width="{ base: '100%' }" gutter="base">
      <ds-flex-item :width="{ base: '100%', md: 5 }">
        <contribution-form :group="group" :creatEvent="creatEvent" />
      </ds-flex-item>
      <ds-flex-item :width="{ base: '100%', md: 1 }">&nbsp;</ds-flex-item>
    </ds-flex>
  </div>
</template>

<script>
import { groupQuery } from '~/graphql/groups'
import ContributionForm from '~/components/ContributionForm/ContributionForm'

export default {
  components: {
    ContributionForm,
  },
  data() {
    const { groupId = null } = this.$route.query
    return {
      groupId,
      creatEvent: false,
    }
  },
  computed: {
    group() {
      return this.Group && this.Group[0] ? this.Group[0] : null
    },
  },
  apollo: {
    Group: {
      query() {
        return groupQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.groupId,
          // followedByCount: this.followedByCount,
          // followingCount: this.followingCount,
        }
      },
      skip() {
        return !this.groupId
      },
      error(error) {
        this.$toast.error(error.message)
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>
