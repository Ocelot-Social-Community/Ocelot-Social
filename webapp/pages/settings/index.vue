<template>
  <form class="settings-form" @submit.prevent="onSubmit" novalidate>
    <os-card>
      <h2 class="title">{{ $t('settings.data.name') }}</h2>
      <ocelot-input
        id="name"
        model="name"
        icon="user"
        :label="
          $env.ASK_FOR_REAL_NAME
            ? $t('settings.data.realNamePlease')
            : $t('settings.data.labelName')
        "
        :placeholder="$t('settings.data.namePlaceholder')"
      />
      <ocelot-input id="slug" model="slug" icon="at" :label="$t('settings.data.labelSlug')" />
      <location-select
        class="location-selet"
        v-model="formData.locationName"
        :canBeCleared="!$env.REQUIRE_LOCATION"
      />
      <!-- eslint-enable vue/use-v-on-exact -->
      <ocelot-input
        id="about"
        model="about"
        type="textarea"
        rows="3"
        :label="$t('settings.data.labelBio')"
        :placeholder="$t('settings.data.labelBio')"
      />
      <os-button
        variant="primary"
        appearance="filled"
        type="submit"
        :disabled="!!formErrors"
        :loading="loadingData"
      >
        <template #icon><os-icon :icon="icons.check" /></template>
        {{ $t('actions.save') }}
      </os-button>
    </os-card>
  </form>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters, mapMutations } from 'vuex'
import UniqueSlugForm from '~/components/utils/UniqueSlugForm'
import LocationSelect from '~/components/Select/LocationSelect'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'
import { updateUserMutation } from '~/graphql/User'
import scrollToContent from './scroll-to-content.js'
import formValidation from '~/mixins/formValidation'

export default {
  mixins: [scrollToContent, formValidation],
  name: 'Settings',
  components: {
    OsButton,
    OsCard,
    OsIcon,
    LocationSelect,
    OcelotInput,
  },
  data() {
    return {
      cities: [],
      loadingData: false,
      loadingGeo: false,
      formData: {
        name: '',
        slug: '',
        about: '',
        locationName: '',
      },
    }
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    this.formData.name = this.currentUser.name
    this.formData.slug = this.currentUser.slug
    this.formData.about = this.currentUser.about
    this.formData.locationName = this.currentUser.locationName || ''
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
        locationName: { required: this.$env.REQUIRE_LOCATION },
        name: { required: true, min: 3 },
        ...uniqueSlugForm.formSchema,
      }
    },
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    onSubmit() {
      this.formSubmit(this.submit)
    },
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
            this.setCurrentUser({
              ...this.currentUser,
              ...UpdateUser,
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

.location-selet {
  margin-bottom: $space-small;
}
</style>
