<template>
  <base-card class="settings-index-page">
    <h2 class="title">{{ $t('settings.data.name') }}</h2>
    <ds-form v-model="form" :schema="formSchema" @submit="submit">
      <template #default="{ errors }">
        <!-- <ds-input
          id="name"
          model="name"
          icon="user"
          :label="$t('settings.data.labelName')"
          :placeholder="$t('settings.data.namePlaceholder')"
        /> -->
        <!-- <ds-input id="slug" model="slug" icon="at" :label="$t('settings.data.labelSlug')" /> -->
        <!-- eslint-disable vue/use-v-on-exact -->
        <!-- <ds-select
          id="city"
          model="locationName"
          icon="map-marker"
          :options="cities"
          :label="$t('settings.data.labelCity')"
          :placeholder="$t('settings.data.labelCity')"
          :loading="loadingGeo"
          @input.native="handleCityInput"
        /> -->
        <!-- eslint-enable vue/use-v-on-exact -->
        <!-- <ds-input
          id="about"
          model="about"
          type="textarea"
          rows="3"
          :label="$t('settings.data.labelBio')"
          :placeholder="$t('settings.data.labelBio')"
        /> -->
        <profile-core-data :currentUser="currentUser" />
        <base-button icon="check" :disabled="errors" type="submit" :loading="loadingData" filled>
          {{ $t('actions.save') }}
        </base-button>
      </template>
    </ds-form>
  </base-card>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
// Wolle import UniqueSlugForm from '~/components/utils/UniqueSlugForm'
import { updateUserMutation } from '~/graphql/User'
// Wolle import { queryLocations } from '~/graphql/location'
import ProfileCoreData from '~/components/_new/features/ProfileCoreData/ProfileCoreData'
import { formSchemaProfileCoreData } from '~/components/_new/features/ProfileCoreData/ProfileCoreData'

// Wolle let timeout

export default {
  components: {
    ProfileCoreData,
  },
  data() {
    return {
      // Wolle cities: [],
      loadingData: false,
      // loadingGeo: false,
      formData: {},
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    formSchema() {
      // Wolle const uniqueSlugForm = UniqueSlugForm({
      //   apollo: this.$apollo,
      //   currentUser: this.currentUser,
      //   translate: this.$t,
      // })
      // return {
      //   ...uniqueSlugForm.formSchema,
      // }
      return {
        ...formSchemaProfileCoreData(this),
      }
    },
    form: {
      get: function () {
        const { name, slug, locationName, about } = this.currentUser
        return { name, slug, locationName, about }
      },
      set: function (formData) {
        // Wolle
        console.log('formData: ', formData)
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
      // Wolle
      console.log('name: ', name)
      console.log('slug: ', slug)
      console.log('about: ', about)
      let { locationName } = this.formData || this.currentUser
      locationName = locationName && (locationName.label || locationName)
      // Wolle
      console.log('locationName: ', locationName)
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
    // Wolle handleCityInput(value) {
    //   clearTimeout(timeout)
    //   timeout = setTimeout(() => this.requestGeoData(value), 500)
    // },
    // processLocationsResult(places) {
    //   if (!places.length) {
    //     return []
    //   }
    //   const result = []
    //   places.forEach((place) => {
    //     result.push({
    //       label: place.place_name,
    //       value: place.place_name,
    //       id: place.id,
    //     })
    //   })

    //   return result
    // },
    // async requestGeoData(e) {
    //   const value = e.target ? e.target.value.trim() : ''
    //   if (value === '') {
    //     this.cities = []
    //     return
    //   }
    //   this.loadingGeo = true

    //   const place = encodeURIComponent(value)
    //   const lang = this.$i18n.locale()

    //   const {
    //     data: { queryLocations: res },
    //   } = await this.$apollo.query({ query: queryLocations(), variables: { place, lang } })

    //   this.cities = this.processLocationsResult(res)
    //   this.loadingGeo = false
    // },
  },
}
</script>

<style lang="scss">
.settings-index-page {
  .base-button {
    margin-top: $space-small;
  }
}
</style>
