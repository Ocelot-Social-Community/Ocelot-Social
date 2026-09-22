<template>
  <div>
    <form class="settings-form" @submit.prevent="onSubmit" novalidate>
      <os-card>
        <h2 class="title">{{ $t('settings.data.name') }}</h2>
        <ocelot-input
          id="name"
          model="name"
          icon="user"
          hide-error
          :label="
            $policy.get('askForRealName') === true
              ? $t('settings.data.realNamePlease')
              : $t('settings.data.labelName')
          "
          :placeholder="$t('settings.data.namePlaceholder')"
          @blur="dirtyFields.name && touchField('name')"
        />
        <os-validation-hint
          :count="formData.name.length"
          :min="branding.user.nameLengthMin"
          :max="branding.user.nameLengthMax"
          :variant="visibleErrors && visibleErrors.name ? 'error' : null"
          :text="nameErrorText"
        />
        <ocelot-input
          id="slug"
          model="slug"
          icon="at"
          hide-error
          :label="$t('settings.data.labelSlug')"
          @blur="dirtyFields.slug && touchField('slug')"
        />
        <os-validation-hint
          :variant="visibleErrors && visibleErrors.slug ? 'error' : null"
          :text="visibleErrors && visibleErrors.slug"
        />
        <location-select
          class="location-selet"
          :value="formData.locationName"
          :types="userLocationTypes"
          :canBeCleared="$policy.get('requireLocation') !== true"
          @input="onLocationSelectInput"
        />
        <p
          v-if="previousLocationName"
          class="ds-text ds-text-soft ds-text-size-small previous-location-hint"
        >
          {{ $t('common.previousLocation', { location: previousLocationName }) }}
        </p>
        <location-picker-map
          :location="formData.locationName"
          precision="resolved"
          :types="userLocationTypes"
          marker-color-token="--color-map-marker-current-user"
          @input="onLocationPickerMapInput"
        />
        <ocelot-input
          id="about"
          model="about"
          type="textarea"
          rows="3"
          :label="$t('settings.data.labelBio')"
          :placeholder="$t('settings.data.labelBio')"
        />
        <div class="buttons">
          <os-button
            type="button"
            data-test="reset-button"
            variant="primary"
            appearance="outline"
            :disabled="!hasUnsavedChanges()"
            @click="resetForm"
          >
            {{ $t('actions.reset') }}
          </os-button>
          <os-button
            variant="primary"
            appearance="filled"
            type="submit"
            :loading="loadingData"
            :class="{ 'permission-denied': submitVisuallyDenied }"
            v-tooltip="{
              content: submitDeniedHint,
            }"
          >
            <template #icon><os-icon :icon="icons.check" /></template>
            {{ $t('actions.save') }}
          </os-button>
        </div>
      </os-card>
    </form>
    <confirm-modal
      v-if="showLeaveConfirmModal"
      :modalData="leaveConfirmModalData"
      @close="showLeaveConfirmModal = false"
    />
  </div>
</template>

<script>
import { OsButton, OsCard, OsIcon, OsValidationHint } from '@ocelot-social/ui'
import { branding } from '@ocelot-social/branding'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters, mapMutations } from 'vuex'
import UniqueSlugForm from '~/components/utils/UniqueSlugForm'
import LocationSelect from '~/components/Select/LocationSelect'
import LocationPickerMap from '~/components/Map/LocationPickerMap'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import { updateUserMutation } from '~/graphql/User'
import scrollToContent from './scroll-to-content.js'
import formValidation from '~/mixins/formValidation'
import confirmLeaveIfUnsavedChanges from '~/mixins/confirmLeaveIfUnsavedChanges'

// Same coarse precision as GroupForm.vue's own location — deliberately as
// imprecise as a group's, not an event's exact pin (see the backend's
// NEIGHBORHOOD_REVERSE_GEOCODE_TYPES doc comment for the full reasoning).
// Shared between the search box and the map below.
const USER_LOCATION_TYPES = 'neighborhood,locality,place,region,country'

export default {
  mixins: [scrollToContent, formValidation, confirmLeaveIfUnsavedChanges],
  name: 'Settings',
  components: {
    OsButton,
    OsCard,
    OsIcon,
    OsValidationHint,
    LocationSelect,
    LocationPickerMap,
    OcelotInput,
    ConfirmModal,
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
      // Exposed for the template (category/name-length hint below) — bare
      // module-scope reads don't resolve there, unlike in the script.
      branding,
      // Same tracking GroupForm.vue uses for its own location field — see
      // its doc comments for the full reasoning. Populated for real once
      // currentUser is read in mounted() below.
      locationChangedByUser: false,
      ignoreNextLocationInput: false,
      savedLocationName: '',
      // The actual value (not just its display string, see savedLocationName
      // above) resetForm() below restores — starts as the same bare string
      // formData.locationName does, but gets upgraded to the full resolved
      // { label, value, lat, lng, ... } object as soon as one becomes
      // available (LocationSelect's own mount-time auto-resolve, or a
      // genuine pick that gets saved), so a reset can put it straight back
      // without a fresh geocode round-trip — which would otherwise leave the
      // map pin missing for a moment (no lat/lng on a bare string) until
      // the resolve came back.
      savedLocationValue: '',
    }
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    // The || '' fallbacks matter here in a way they didn't before: this used
    // to only ever feed OcelotInput's own v-model, but formData.name is now
    // also read by OsValidationHint's :count="formData.name.length" below —
    // an undefined currentUser.name (e.g. still loading) would throw there
    // instead of just rendering an empty field.
    this.formData.name = this.currentUser.name || ''
    this.formData.slug = this.currentUser.slug || ''
    this.formData.about = this.currentUser.about || ''
    this.formData.locationName = this.currentUser.locationName || ''
    this.savedLocationName = this.currentUser.locationName || ''
    this.savedLocationValue = this.currentUser.locationName || ''
    // See GroupForm.vue's own ignoreNextLocationInput doc comment: the
    // auto-resolve only ever fires once, and only when there was already a
    // saved locationName to resolve.
    this.ignoreNextLocationInput = !!this.currentUser.locationName
    window.addEventListener('beforeunload', this.onBeforeUnload)
  },
  beforeDestroy() {
    window.removeEventListener('beforeunload', this.onBeforeUnload)
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    userLocationTypes() {
      return USER_LOCATION_TYPES
    },
    formSchema() {
      const uniqueSlugForm = UniqueSlugForm({
        apollo: this.$apollo,
        currentUser: this.currentUser,
        translate: this.$t,
      })
      return {
        locationName: { required: this.$policy.get('requireLocation') === true },
        name: {
          required: true,
          min: branding.user.nameLengthMin,
          max: branding.user.nameLengthMax,
        },
        ...uniqueSlugForm.formSchema,
      }
    },
    // LocationSelect and LocationPickerMap both already resolve lat/lng
    // (via forward/reverse geocoding) alongside the label when a search
    // result or map pin is picked — a plain string here means the field
    // still holds unresolved/typed text, no coordinates to send yet.
    formLocationName() {
      const isNestedValue =
        typeof this.formData.locationName === 'object' &&
        typeof this.formData.locationName.value === 'string'
      const isDirectString = typeof this.formData.locationName === 'string'
      return isNestedValue
        ? this.formData.locationName.value
        : isDirectString
          ? this.formData.locationName
          : ''
    },
    formLocationCoordinates() {
      const locationValue = this.formData.locationName
      const hasCoordinates =
        typeof locationValue === 'object' &&
        locationValue !== null &&
        typeof locationValue.lat === 'number' &&
        typeof locationValue.lng === 'number'
      return hasCoordinates ? { lat: locationValue.lat, lng: locationValue.lng } : null
    },
    nameErrorText() {
      if (!this.visibleErrors?.name) return null
      return !this.formData.name.trim()
        ? this.$t('settings.validation.nameNotEmpty')
        : this.$t('common.validations.nameLength', {
            min: this.formSchema.name.min,
            max: this.formSchema.name.max,
          })
    },
    // The previously saved location — shown as a small note next to the
    // field, but only once the user has actually changed it to something
    // else (so opening the page without touching the location shows
    // nothing — locationChangedByUser guards against LocationSelect's own
    // mount-time auto-resolve of the saved value otherwise counting as a
    // change; see its own doc comment above).
    previousLocationName() {
      if (!this.locationChangedByUser) return null
      const original = this.savedLocationName
      if (!original || original === this.formLocationName) return null
      return original
    },
    // Same grey-but-still-clickable treatment GroupForm.vue's/
    // ContributionForm.vue's submit buttons use — not an actual :disabled,
    // deliberately: hasUnsavedChanges() only tracks whether something was
    // TOUCHED, not whether it truly differs from what's saved, so a gap in
    // that tracking must never make a real save unreachable. Unlike those
    // two forms there's no permission gate on editing your own profile, so
    // (unlike them) there's no meaningful aria-disabled case here either —
    // this button is never genuinely unable to submit, only "nothing to
    // submit yet".
    submitVisuallyDenied() {
      return !this.hasUnsavedChanges()
    },
    submitDeniedHint() {
      if (!this.hasUnsavedChanges()) return this.$t('common.noChangesHint')
      return ''
    },
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    // A method, not a computed — confirmLeaveIfUnsavedChanges (see its own
    // doc comment) calls this exact name as a function on the page itself.
    // Unlike GroupForm.vue/ContributionForm.vue, there's no separate child
    // form component to delegate to here — this page IS the form.
    hasUnsavedChanges() {
      return Object.keys(this.dirtyFields).length > 0 || this.locationChangedByUser
    },
    onBeforeUnload(event) {
      if (!this.hasUnsavedChanges()) return
      // Browsers show their own fixed wording here for security reasons —
      // setting returnValue (the legacy way to opt in) is what triggers it;
      // the actual string is ignored by every modern browser.
      event.preventDefault()
      event.returnValue = ''
    },
    onLocationPickerMapInput(location) {
      this.locationChangedByUser = true
      this.formData.locationName = location
    },
    onLocationSelectInput(location) {
      // See ignoreNextLocationInput's own doc comment (data()) — the first
      // input after mount is LocationSelect normalizing the already-saved
      // value on its own, not a pick the user made.
      if (this.ignoreNextLocationInput) {
        this.ignoreNextLocationInput = false
        // The bare string savedLocationValue started as (see its own doc
        // comment) just became the real resolved object — capture it so a
        // later reset can restore it directly, pin and all.
        this.savedLocationValue = location
      } else {
        this.locationChangedByUser = true
      }
      this.formData.locationName = location
    },
    // Reverts the form back to the last actually saved values — the
    // reverse of submit()'s own success handler below, without a server
    // round-trip since nothing needs re-fetching (currentUser already
    // holds them). Same field defaults as mounted() (see its own comment).
    resetForm() {
      this.formData.name = this.currentUser.name || ''
      this.formData.slug = this.currentUser.slug || ''
      this.formData.about = this.currentUser.about || ''
      // savedLocationValue (not currentUser.locationName directly) — see
      // its own doc comment: restoring the already-resolved object instead
      // of a bare string keeps the map pin (which needs lat/lng) showing
      // immediately, without a fresh geocode round-trip re-fetching what's
      // already known.
      this.formData.locationName = this.savedLocationValue
      // Only relevant if savedLocationValue is still a bare string (e.g.
      // resetting in the brief window before the mount-time auto-resolve
      // above has completed) — an already-resolved object short-circuits
      // LocationSelect's own value watcher before it gets anywhere near
      // emitting an echo (see its own early-return for that shape).
      this.ignoreNextLocationInput = !!this.currentUser.locationName
      this.locationChangedByUser = false
      this.dirtyFields = {}
      this.touchedFields = {}
      this.submitAttempted = false
      this.$validateForm()
    },
    onSubmit() {
      this.formSubmit(this.submit, () => {
        this.$toast.error(this.$t('common.validations.formHasErrors'))
      })
    },
    async submit() {
      this.loadingData = true
      const { name, slug, about } = this.formData

      // Snapshot exactly what's being submitted — submit() to the mutation's
      // resolution is a real network round-trip (not instantaneous), so the
      // user may touch the form again while it's still in flight. Only clear
      // a field's dirty status below if its value still matches what THIS
      // submit actually sent — same fix as GroupForm.vue's/
      // ContributionForm.vue's own submit(), see their comments for the full
      // reasoning.
      const submittedFieldValues = Object.keys(this.dirtyFields).reduce((snapshot, key) => {
        snapshot[key] = JSON.stringify(this.formData[key])
        return snapshot
      }, {})
      const submittedLocationName = this.formLocationName
      // The full value (see savedLocationValue's own doc comment), snapshot
      // the same way and for the same reason as submittedLocationName.
      const submittedLocationValue = this.formData.locationName

      try {
        await this.$apollo.mutate({
          mutation: updateUserMutation(),
          variables: {
            id: this.currentUser.id,
            name,
            slug,
            locationName: this.formLocationName,
            lat: this.formLocationCoordinates?.lat ?? null,
            lng: this.formLocationCoordinates?.lng ?? null,
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
        Object.keys(submittedFieldValues).forEach((key) => {
          if (JSON.stringify(this.formData[key]) === submittedFieldValues[key]) {
            this.$delete(this.dirtyFields, key)
          }
        })
        if (this.formLocationName === submittedLocationName) {
          this.savedLocationName = submittedLocationName
          this.savedLocationValue = submittedLocationValue
          this.locationChangedByUser = false
        }
      } catch (err) {
        this.$toast.error(err.message)
      } finally {
        this.loadingData = false
      }
    },
  },
}
</script>

<style>
/* Same field-to-field spacing GroupForm.vue's own form uses. OsCard only
   wraps its default slot in a .os-card__content div when a heroImage slot
   is ALSO given (see OsCard.vue) — this page has none, so its fields land
   directly inside .os-card itself, one level up from where ContributionForm
   (which does use heroImage) targets the equivalent rule. */
.settings-form > .os-card {
  display: flex;
  flex-direction: column;

  > .title {
    margin: 0 0 var(--space-large) 0;
  }

  /* OcelotInput bundles its own label+input into one .ds-form-item, which
     otherwise keeps its own default margin-bottom — zeroed here the same
     way GroupForm.vue/ContributionForm.vue do, so the gap to the next
     field comes only from the .os-validation-hint rule below (or, for
     fields with none, this element's own margin-bottom set explicitly
     further down). */
  > .ds-form-item {
    margin: 0;
  }

  > .os-validation-hint {
    margin-bottom: var(--space-base);
    cursor: default;
  }

  /* The slug field's own hint (unlike name's) renders NOTHING when there's
     no error — OsValidationHint returns null with no text/count/variant to
     show (see its own source) — so the rule above never applies there and
     the field needs its own gap to the next one (the location label)
     instead. */
  > .ds-form-item:has(#slug) {
    margin-bottom: var(--space-base);
  }

  > .location-selet {
    margin-bottom: var(--space-small);
  }

  /* Flex siblings' margins don't collapse the way block ones do — without
     this, .location-selet's own margin-bottom above and this element's own
     margin-top would both apply and stack, on top of the hint's already
     wanting to sit close to the field it's about. Zeroing .location-selet's
     margin-bottom here lets this element's own (smaller) margin-top govern
     the gap instead, only when the hint actually renders. */
  > .location-selet:has(+ .previous-location-hint) {
    margin-bottom: 0;
  }

  /* Tight to the field it's a note about, same as a validation hint would
     be — overrides .ds-text's own sizeable default margin-bottom (1em),
     which would otherwise push the map down further than intended. */
  > .previous-location-hint {
    margin-top: var(--space-xxx-small);
    margin-bottom: var(--space-x-small);
  }

  /* No margin-top of its own — whatever precedes it (.location-selet
     directly, or .previous-location-hint when shown) already provides the
     lead-in gap via its own margin-bottom; adding one here would stack on
     top of that, the same double-margin problem as above. */
  > .location-picker-map {
    margin-bottom: var(--space-base);
  }

  > .buttons {
    align-self: flex-end;
    margin-top: var(--space-base);
    display: flex;
    gap: var(--space-small);
  }
}
</style>
