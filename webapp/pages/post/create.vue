<template>
  <div>
    <ds-flex :width="{ base: '100%' }">
      <ds-flex-item :width="{ base: '100%' }">
        <ds-flex gutter="base" :width="{ base: '100%', sm: 1 }">
          <ds-flex-item>
            <ds-card class="create-form-btn" :primary="!createEvent" centered>
              <div>
                <ds-button
                  v-if="!createEvent"
                  ghost
                  fullwidth
                  size="x-large"
                  class="inactive-tab-button"
                >
                  {{ $t('post.createNewPost.title') }}
                </ds-button>
                <ds-button v-else ghost fullwidth size="x-large" @click="switchPostType()">
                  {{ $t('post.createNewPost.title') }}
                </ds-button>
              </div>
            </ds-card>
          </ds-flex-item>
          <ds-flex-item>
            <ds-card class="create-form-btn" :primary="!!createEvent" centered>
              <div>
                <ds-button
                  ghost
                  fullwidth
                  size="x-large"
                  v-if="createEvent"
                  hover
                  class="inactive-tab-button"
                >
                  {{ $t('post.createNewEvent.title') }}
                </ds-button>
                <ds-button ghost fullwidth size="x-large" v-else @click="switchPostType()">
                  {{ $t('post.createNewEvent.title') }}
                </ds-button>
              </div>
            </ds-card>
          </ds-flex-item>
        </ds-flex>
        <div v-if="group" class="group-create-title">
          {{ $t('post.createNewPost.forGroup.title', { name: group.name }) }}
        </div>
      </ds-flex-item>
    </ds-flex>

    <ds-flex :width="{ base: '100%' }" gutter="base">
      <ds-flex-item :width="{ base: '100%' }">
        <contribution-form :group="group" :createEvent="createEvent" />
      </ds-flex-item>
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
      createEvent: false,
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
  methods: {
    switchPostType() {
      this.createEvent = !this.createEvent
    },
  },
}
</script>
<style lang="scss">
.inactive-tab-button {
  background-color: #ff000000 !important;
  color: 'whitesmoke' !important;
}
.group-create-title {
  font-size: 30px;
  text-align: center;
}

// copy hover effect from ghost button to use for ds-card
.create-form-btn:not(.ds-card-primary):hover {
  background-color: #faf9fa;
}
.create-form-btn .ds-button-ghost:hover {
  background-color: transparent;
}
</style>
