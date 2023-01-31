<template>
  <ds-form v-model="form" :schema="formSchema" @submit="submit">
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
        <!-- eslint-disable vue/use-v-on-exact -->
        <ds-select
          id="city"
          model="locationName"
          icon="map-marker"
          :options="cities"
          :label="$t('settings.data.labelCity') + $t('settings.data.labelCityHint')"
          :placeholder="$t('settings.data.labelCity')"
          :loading="loadingGeo"
          @input.native="handleCityInput"
        />
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
import { updateUserMutation } from '~/graphql/User'
import { queryLocations } from '~/graphql/location'

let timeout

export default {
  name: 'NewsFeed',
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
    handleCityInput(value) {
      clearTimeout(timeout)
      timeout = setTimeout(() => this.requestGeoData(value), 500)
    },
    processLocationsResult(places) {
      if (!places.length) {
        return []
      }
      const result = []
      places.forEach((place) => {
        result.push({
          label: place.place_name,
          value: place.place_name,
          id: place.id,
        })
      })

      return result
    },
    async requestGeoData(e) {
      const value = e.target ? e.target.value.trim() : ''
      if (value === '') {
        this.cities = []
        return
      }
      this.loadingGeo = true

      const place = encodeURIComponent(value)
      const lang = this.$i18n.locale()

      const {
        data: { queryLocations: res },
      } = await this.$apollo.query({ query: queryLocations(), variables: { place, lang } })

      this.cities = this.processLocationsResult(res)
      this.loadingGeo = false
    },
  },
}
</script>
