<template>
  <div>

      <ds-flex :width="{ base: '100%' }" >
        <ds-flex-item :width="{ base: '100%', md: 5 }">
          <ds-flex gutter="base" :width="{ base: '100%', sm: 1 }">
            <ds-flex-item>
              <ds-card :primary="!creatEvent" centered>
                <div>
                  <ds-button v-if="!creatEvent" ghost fullwidth size="x-large" style="background-color: #ff000000; color: whitesmoke">
                    {{ $t('post.createNewPost.title') }}
                  </ds-button>
                  <ds-button  v-else ghost fullwidth size="x-large" @click="creatEvent = !creatEvent">
                    {{ $t('post.createNewPost.title') }}
                  </ds-button>
                </div>
              </ds-card>
            </ds-flex-item>
            <ds-flex-item>
              <ds-card :primary="!!creatEvent" centered>
                <div >
                  <ds-button ghost fullwidth size="x-large" v-if="creatEvent" hover="false" style="background-color: #ff000000; color: whitesmoke">
                    {{ $t('post.createNewEvent.title') }}
                </ds-button>
                  <ds-button ghost fullwidth size="x-large" v-else @click="creatEvent = !creatEvent">
                    {{ $t('post.createNewEvent.title') }}
                </ds-button>
              </div>
              </ds-card>
            </ds-flex-item>
          </ds-flex>
          <div v-if="group" style="font-size: 30px; text-align: center">
            {{ $t('post.createNewPost.forGroup.title', { name: group.name }) }}
          </div>
        </ds-flex-item>
        <ds-flex-item :width="{ base: '100%', md: 1 }">&nbsp;</ds-flex-item>
      </ds-flex>
   
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
