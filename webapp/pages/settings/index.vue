<template>
  <ds-form class="settings-form" v-model="form" :schema="formSchema" @submit="submit">
    <template #default="{ errors }">
      <base-card>
        <h2 class="title">{{ $t('settings.data.name') }}</h2>
        <ds-input
          id="name"
          model="name"
          icon="user"
          :label="$t('settings.data.labelName')"
          :placeholder="$t('settings.data.namePlaceholder')"
        />
        <ds-input id="slug" model="slug" icon="at" :label="$t('settings.data.labelSlug')" />
        <location-select model="locationName"/>
        <!-- eslint-enable vue/use-v-on-exact -->
        <ds-input
          id="about"
          model="about"
          type="textarea"
          rows="3"
          :label="$t('settings.data.labelBio')"
          :placeholder="$t('settings.data.labelBio')"
        />
        <base-button icon="check" :disabled="errors" type="submit" :loading="loadingData" filled>
          {{ $t('actions.save') }}
        </base-button>
      </base-card>
    </template>
  </ds-form>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import UniqueSlugForm from '~/components/utils/UniqueSlugForm'
import LocationSelect from '~/components/Select/LocationSelect'
import { updateUserMutation } from '~/graphql/User'

export default {
  name: 'NewsFeed',
  components: {
    LocationSelect
  },
  data() {
    return {
      cities: [],
      loadingData: false,
      loadingGeo: false,
      formData: {},
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    formSchema() {
      const uniqueSlugForm = UniqueSlugForm({
        apollo: this.$apollo,
        currentUser: this.currentUser,
        translate: this.$t,
      })
      return {
        ...uniqueSlugForm.formSchema,
      }
    },
    form: {
      get: function () {
        const { name, slug, locationName, about } = this.currentUser
        return { name, slug, locationName, about }
      },
      set: function (formData) {
        this.formData = formData
      },
    },
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    async submit() {
      this.loadingData = true
      const { name, slug, about } = this.formData
      let { locationName } = this.formData || this.currentUser
      locationName = locationName && (locationName.label || locationName)
      try {
        await this.$apollo.mutate({
          mutation: updateUserMutation(),
          variables: {
            id: this.currentUser.id,
            name,
            slug,
            locationName,
            about,
          },
          update: (store, { data: { UpdateUser } }) => {
            const { name, slug, locationName, about } = UpdateUser
            this.setCurrentUser({
              ...this.currentUser,
              name,
              slug,
              locationName,
              about,
            })
          },
        })
        this.$toast.success(this.$t('settings.data.success'))
      } catch (err) {
        this.$toast.error(err.message)
      } finally {
        this.loadingData = false
      }
    },
  },
}
</script>

<style lang="scss">
.location-hint {
  margin-top: -$space-x-small - $space-xxx-small - $space-xxx-small;
}
</style>
