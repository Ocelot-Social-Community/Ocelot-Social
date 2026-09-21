<template>
  <div>
    <form class="contribution-form" @submit.prevent="onSubmit" novalidate>
      <template>
        <os-card>
          <template #heroImage>
            <!-- The existing (already saved) image has transformed w320/w640/w1024
                 URLs from the backend — routed through it here via
                 ResponsiveImage, same as the post detail page, rather than a
                 plain <img src> pointing straight at raw storage (unreliable
                 to fetch directly in local dev). A freshly picked, not yet
                 saved file only has a local data: URL (see addHeroImage) and
                 needs neither transforms nor that routing. -->
            <responsive-image
              v-if="formData.image && !formData.imageUpload"
              :image="formData.image"
              sizes="(max-width: 1024px) 640px, 1024px"
              loading="eager"
              :class="['image', formData.imageBlurred && '--blur-image']"
            />
            <img
              v-else-if="formData.image"
              :src="formData.image.url"
              :class="['image', formData.imageBlurred && '--blur-image']"
            />
            <image-uploader
              :hasImage="!!formData.image"
              :class="[formData.imageBlurred && '--blur-image']"
              @addHeroImage="addHeroImage"
              @addImageAspectRatio="addImageAspectRatio"
              @addImageType="addImageType"
            />
          </template>
          <div v-if="formData.image" class="blur-toggle">
            <label for="blur-img">{{ $t('contribution.inappropriatePicture') }}</label>
            <input
              type="checkbox"
              id="blur-img"
              v-model="formData.imageBlurred"
              @change="imageChangedByUser = true"
            />
            <page-params-link class="link" :pageParams="links.FAQ">
              {{ $t('contribution.inappropriatePicture') }}
              <os-icon :icon="icons.questionCircle" />
            </page-params-link>
          </div>
          <div class="ds-mt-base ds-mb-large"></div>
          <ocelot-input
            model="title"
            :label="$t('contribution.title')"
            name="title"
            autofocus
            size="large"
            hide-error
            @blur="dirtyFields.title && touchField('title')"
          />
          <os-validation-hint
            :count="formData.title.length"
            :min="formSchema.title.min"
            :max="formSchema.title.max"
            :variant="visibleErrors && visibleErrors.title ? 'error' : null"
            :text="titleErrorText"
          />
          <p :id="`content-label-${_uid}`" class="ds-text select-label">
            {{ $t('contribution.content') }}
          </p>
          <div :class="{ 'ds-input-has-error': visibleErrors && visibleErrors.content }">
            <editor
              :users="users"
              :value="formData.content"
              :hashtags="hashtags"
              :aria-labelledby="`content-label-${_uid}`"
              @input="updateEditorContent"
              @blur.native.capture="dirtyFields.content && touchField('content')"
            />
          </div>
          <os-validation-hint
            :count="contentLength"
            :variant="visibleErrors && visibleErrors.content ? 'error' : null"
            :text="
              visibleErrors && visibleErrors.content
                ? $t('common.validations.contentNotEmpty')
                : null
            "
          />

          <!-- event data -->
          <div v-if="postType === 'Event'" class="eventData">
            <div class="ds-mt-x-small ds-mb-small"></div>
            <div class="ds-grid event-date-grid">
              <div class="event-grid-item">
                <label for="event-start-input" class="ds-text select-label">
                  {{ $t('post.viewEvent.eventStart') }}
                </label>
                <date-picker
                  name="eventStart"
                  v-model="formData.eventStart"
                  type="datetime"
                  value-type="date"
                  :minute-step="15"
                  format="DD.MM.YYYY HH:mm"
                  :input-attr="{ id: 'event-start-input' }"
                  :class="{ 'mx-datepicker-error': visibleErrors && visibleErrors.eventStart }"
                  :show-second="false"
                  @change="changeEventStart($event)"
                ></date-picker>
                <os-validation-hint
                  v-if="visibleErrors && visibleErrors.eventStart"
                  variant="error"
                  :text="$t('post.viewEvent.eventStartNotEmpty')"
                />
                <os-validation-hint
                  v-else-if="eventStartIsInPast"
                  variant="warning"
                  :text="$t('post.viewEvent.eventStartInPast')"
                />
              </div>
              <div class="event-grid-item">
                <label for="event-end-input" class="ds-text select-label">
                  {{ $t('post.viewEvent.eventEnd') }}
                </label>
                <date-picker
                  v-model="formData.eventEnd"
                  name="eventEnd"
                  type="datetime"
                  value-type="date"
                  :minute-step="15"
                  :seconds-step="0"
                  format="DD.MM.YYYY HH:mm"
                  :input-attr="{ id: 'event-end-input' }"
                  :class="[
                    'event-grid-item-font-helper',
                    { 'mx-datepicker-error': visibleErrors && visibleErrors.eventEnd },
                  ]"
                  :show-second="false"
                  @change="changeEventEnd($event)"
                ></date-picker>
                <os-validation-hint
                  v-if="visibleErrors && visibleErrors.eventEnd"
                  variant="error"
                  :text="$t('post.viewEvent.eventEndBeforeStart')"
                />
              </div>
            </div>
            <ocelot-input
              model="eventVenue"
              name="eventVenue"
              :label="$t('post.viewEvent.eventVenueLabel')"
              :placeholder="$t('post.viewEvent.eventVenue')"
              hide-error
              @blur="dirtyFields.eventVenue && touchField('eventVenue')"
            />
            <os-validation-hint
              :count="formData.eventVenue.length"
              :min="formSchema.eventVenue.min"
              :max="formSchema.eventVenue.max"
              :variant="visibleErrors && visibleErrors.eventVenue ? 'error' : null"
              :text="venueErrorText"
            />
            <div class="event-online-checkbox">
              <input
                type="checkbox"
                id="event-is-online"
                v-model="formData.eventIsOnline"
                model="eventIsOnline"
                name="eventIsOnline"
                class="event-grid-item-font-helper"
                @change="changeEventIsOnline($event)"
              />
              <label for="event-is-online">{{ $t('post.viewEvent.eventIsOnline') }}</label>
            </div>
            <div
              :class="{
                'ds-input-has-error':
                  !locationSelectDisabled && visibleErrors && visibleErrors.eventLocationName,
              }"
            >
              <label for="city" class="ds-text select-label">
                {{ $t('post.viewEvent.eventLocationNameLabel') }}
              </label>
              <location-select
                v-model="formData.eventLocationName"
                types="country,region,postcode,district,place,locality,neighborhood,address,poi"
                :show-previous-location="false"
                :show-label="false"
                :placeholder="$t('post.viewEvent.eventLocationName')"
                :disabled="locationSelectDisabled"
                @input="onEventLocationSelectInput"
              />
              <os-validation-hint
                v-if="!locationSelectDisabled && visibleErrors && visibleErrors.eventLocationName"
                variant="error"
                :text="$t('post.viewEvent.eventLocationRequired')"
              />
            </div>
            <location-picker-map
              v-if="!locationSelectDisabled"
              :location="formData.eventLocationName"
              class="location-picker-map-field"
              @input="onLocationPickerMapInput"
            />
          </div>
          <div class="ds-mt-x-small ds-mb-large"></div>
          <p v-if="categoriesActive" class="ds-text select-label">
            {{ $t('contribution.categoriesTitle') }}
          </p>
          <categories-select
            v-if="categoriesActive"
            model="categoryIds"
            :existingCategoryIds="formData.categoryIds"
          />
          <os-validation-hint
            v-if="categoriesActive"
            :count="formData.categoryIds.length"
            :max="3"
            :variant="visibleErrors && visibleErrors.categoryIds ? 'error' : null"
            :text="
              visibleErrors && visibleErrors.categoryIds
                ? $t('common.validations.categories')
                : null
            "
          />
          <div class="ds-flex ds-flex-gap-xxx-small buttons-footer">
            <div style="flex: 3.5 0 0" class="buttons-footer-helper">
              <!-- TODO => remove v-html! only text ! no html! security first! -->
              <p
                class="ds-text"
                v-if="showGroupHint"
                v-html="$t('contribution.visibleOnlyForMembersOfGroup', { name: groupName })"
              />
            </div>
            <div style="flex: 0.15 0 0"></div>
            <div class="action-buttons-group" style="flex: 2 0 0">
              <os-button
                data-test="cancel-button"
                variant="primary"
                appearance="outline"
                :disabled="loading"
                @click="onCancel"
              >
                {{ $t('actions.cancel') }}
              </os-button>
              <os-button
                variant="primary"
                appearance="filled"
                type="submit"
                :loading="loading"
                :class="{ 'permission-denied': submitVisuallyDenied }"
                :aria-disabled="canSubmit ? undefined : true"
                v-tooltip="{
                  content: submitDeniedHint,
                }"
              >
                <template #icon>
                  <os-icon :icon="icons.check" />
                </template>
                {{ $t('actions.save') }}
              </os-button>
            </div>
          </div>
        </os-card>
      </template>
    </form>
  </div>
</template>
<script>
import { OsButton, OsCard, OsIcon, OsValidationHint } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import gql from 'graphql-tag'
import { mapGetters } from 'vuex'
import Editor from '~/components/Editor/Editor'
import PostMutations from '~/graphql/PostMutations.js'
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import ImageUploader from '~/components/Uploader/ImageUploader'
import links from '~/constants/links.js'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import DatePicker from 'vue2-datepicker'
import 'vue2-datepicker/index.css'
import GetCategories from '~/mixins/getCategoriesMixin.js'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'
import LocationSelect from '~/components/Select/LocationSelect'
import LocationPickerMap from '~/components/Map/LocationPickerMap'
import ResponsiveImage from '~/components/ResponsiveImage/ResponsiveImage.vue'

export default {
  mixins: [GetCategories, formValidation],
  components: {
    CategoriesSelect,
    DatePicker,
    Editor,
    ImageUploader,
    OsButton,
    OsCard,
    OsIcon,
    PageParamsLink,
    OcelotInput,
    LocationSelect,
    LocationPickerMap,
    OsValidationHint,
    ResponsiveImage,
  },
  props: {
    contribution: {
      type: Object,
      default: () => ({}),
    },
    group: {
      type: Object,
      default: () => null,
    },
    postType: {
      type: String,
      default: 'Article',
      validator: (v) => ['Article', 'Event'].includes(v),
    },
    // When provided, the form uses this object as its source of truth (by reference).
    // Lets callers hoist form state so it survives remounts (e.g. type switch).
    externalFormData: {
      type: Object,
      default: null,
    },
    // Where "Cancel" should navigate to — the page the user actually
    // arrived from, captured by the hosting page's own beforeRouteEnter
    // (there isn't just one place this form is reached from, and within
    // /post/create/* switching the article/event type itself does a
    // route navigation, so $router.back() could just undo that switch
    // instead of leaving the flow). Falls back to $router.back() when not
    // provided, e.g. for any other future caller that doesn't wire this up.
    cancelTo: {
      type: String,
      default: null,
    },
  },
  data() {
    const formData = this.externalFormData || this.buildInitialFormData()
    return {
      links,
      formData,
      loading: false,
      users: [],
      hashtags: [],
      // eventLocationName and the hero image are set directly rather than
      // through updateFormField()/$parentForm.update, so dirtyFields has no
      // equivalent for them — same reasoning as GroupForm.vue's own
      // locationChangedByUser (see hasUnsavedChanges below).
      locationChangedByUser: false,
      imageChangedByUser: false,
      // See GroupForm.vue's own ignoreNextLocationInput for the full
      // explanation: LocationSelect resolves an already-saved location into
      // a normalized object right on mount, purely to display it — not a
      // pick the user made. Only relevant when eventLocationName starts out
      // as a plain string with something already in it — an already-
      // resolved { lat, lng, ... } object (the common case once an event has
      // been geocoded once) makes LocationSelect skip that resolve entirely,
      // so there's nothing here to suppress.
      ignoreNextLocationInput:
        typeof formData.eventLocationName === 'string' && !!formData.eventLocationName,
    }
  },
  async mounted() {
    window.addEventListener('beforeunload', this.onBeforeUnload)
    try {
      await import(`vue2-datepicker/locale/${this.currentUser.locale}`)
    } catch {
      await import('vue2-datepicker/locale/en')
    }
  },
  beforeDestroy() {
    window.removeEventListener('beforeunload', this.onBeforeUnload)
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    formSchema() {
      return {
        title: {
          min: 3,
          max: 100,
          validator: (_, value = '') => {
            if (!value.trim()) {
              return [new Error(this.$t('common.validations.titleNotEmpty'))]
            }
            if (value.trim().length < 3 || value.trim().length > 100) {
              return [new Error(this.$t('common.validations.titleLength', { min: 3, max: 100 }))]
            }
            return []
          },
        },
        content: {
          validator: (_, value, callback) => {
            if (!value || this.$filters.removeHtml(value).trim().length === 0) {
              callback(new Error(this.$t('common.validations.contentNotEmpty')))
              return
            }
            callback()
          },
        },
        imageBlurred: { required: false },
        categoryIds: {
          type: 'array',
          required: this.categoriesActive,
          validator: (_, value = []) => {
            if (this.categoriesActive && (value.length === 0 || value.length > 3)) {
              return [new Error(this.$t('common.validations.categories'))]
            }
            return []
          },
        },
        eventStart: {
          validator: (_, value, callback) => {
            if (this.postType === 'Event' && !value) {
              callback(new Error(this.$t('post.viewEvent.eventStartNotEmpty')))
              return
            }
            callback()
          },
        },
        eventEnd: {
          validator: (_, value, callback) => {
            if (this.postType !== 'Event' || !value || !this.formData.eventStart) {
              callback()
              return
            }
            if (new Date(value) <= new Date(this.formData.eventStart)) {
              callback(new Error(this.$t('post.viewEvent.eventEndBeforeStart')))
              return
            }
            callback()
          },
        },
        eventVenue: {
          required: this.postType === 'Event',
          min: 3,
          max: 100,
          validator: (_, value = '') => {
            if (this.postType !== 'Event') return []
            const trimmed = value.trim()
            if (!trimmed) {
              return [new Error(this.$t('common.validations.eventVenueNotEmpty'))]
            }
            if (trimmed.length < 3 || trimmed.length > 100) {
              return [
                new Error(this.$t('common.validations.eventVenueLength', { min: 3, max: 100 })),
              ]
            }
            return []
          },
        },
        eventLocationName: {
          required: this.postType === 'Event' && !this.formData.eventIsOnline,
          validator: (_, value = '') => {
            if (this.postType !== 'Event') return []
            if (this.formData.eventIsOnline) return []
            const name = (typeof value === 'object' ? value?.value : value)?.trim() ?? ''
            if (!name) {
              return [new Error(this.$t('common.validations.eventLocationNameNotEmpty'))]
            }
            if (name.length < 3 || name.length > 100) {
              return [
                new Error(
                  this.$t('common.validations.eventLocationNameLength', { min: 3, max: 100 }),
                ),
              ]
            }
            return []
          },
        },
      }
    },
    eventStartIsInPast() {
      return (
        this.postType === 'Event' &&
        this.formData.eventStart &&
        new Date(this.formData.eventStart) < new Date()
      )
    },
    eventInput() {
      if (this.postType === 'Event') {
        const locationValue = this.formData.eventLocationName
        // LocationSelect and LocationPickerMap both already resolve lat/lng
        // (via reverse/forward geocoding) alongside the label when a search
        // result or map pin is picked — a plain string here means the field
        // still holds unresolved/typed text, no coordinates to send yet.
        const hasCoordinates =
          typeof locationValue === 'object' &&
          locationValue !== null &&
          typeof locationValue.lat === 'number' &&
          typeof locationValue.lng === 'number'
        return {
          eventStart: new Date(this.formData.eventStart).toISOString(),
          eventVenue: this.formData.eventVenue,
          eventEnd: this.formData.eventEnd ? new Date(this.formData.eventEnd).toISOString() : null,
          eventIsOnline: this.formData.eventIsOnline,
          eventLocationName: !this.formData.eventIsOnline
            ? (locationValue?.value ?? locationValue) || null
            : null,
          lat: !this.formData.eventIsOnline && hasCoordinates ? locationValue.lat : null,
          lng: !this.formData.eventIsOnline && hasCoordinates ? locationValue.lng : null,
        }
      }
      return undefined
    },
    contentLength() {
      return this.$filters.removeHtml(this.formData.content).length
    },
    titleErrorText() {
      if (!this.visibleErrors?.title) return null
      return !this.formData.title.trim()
        ? this.$t('common.validations.titleNotEmpty')
        : this.$t('common.validations.titleLength', { min: 3, max: this.formSchema.title.max })
    },
    venueErrorText() {
      if (!this.visibleErrors?.eventVenue) return null
      return !this.formData.eventVenue.trim()
        ? this.$t('common.validations.eventVenueNotEmpty')
        : this.$t('common.validations.eventVenueLength', {
            min: 3,
            max: this.formSchema.eventVenue.max,
          })
    },
    groupId() {
      // formData.groupId (from the create-flow draft) is the authoritative
      // source: it is set synchronously from ?groupId=… while `group` only
      // populates once Apollo resolves. Fall through to `group.id` for the
      // edit flow, which passes group directly without external formData.
      return (this.formData && this.formData.groupId) || (this.group && this.group.id) || null
    },
    showGroupHint() {
      return this.groupId && this.group && ['closed', 'hidden'].includes(this.group.groupType)
    },
    groupName() {
      return this.group && this.group.name
    },
    groupCategories() {
      return this.group && this.group.categories
    },
    locationSelectDisabled() {
      return this.formData.eventIsOnline
    },
    canSubmit() {
      return !!this.contribution.id || this.$can('post.create')
    },
    // Exposed (via $refs) for the page's own beforeRouteLeave guard and the
    // native beforeunload prompt below — same pattern as GroupForm.vue.
    // dirtyFields covers every field wired through updateFormField()/
    // $parentForm.update (title, content, eventVenue, eventIsOnline,
    // eventEnd, eventStart, categoryIds) — eventLocationName and the hero
    // image are tracked separately (see data() above), since they're set
    // directly rather than through updateFormField.
    hasUnsavedChanges() {
      return (
        Object.keys(this.dirtyFields).length > 0 ||
        this.locationChangedByUser ||
        this.imageChangedByUser
      )
    },
    // Same grey-but-still-clickable treatment GroupForm.vue's submit button
    // uses — not an actual :disabled, deliberately: hasUnsavedChanges only
    // tracks whether something was TOUCHED, not whether it truly differs
    // from what's saved, so a gap in that tracking must never make a real
    // save unreachable. Worst case here is an invitingly-styled click that
    // just re-saves the same values — never a blocked one.
    // Deliberately NOT reflected in aria-disabled (see the template) — the
    // button genuinely still works when this is true for the "nothing
    // changed yet" reason, and telling assistive tech it's disabled would
    // be actively wrong, not just cosmetically off.
    submitVisuallyDenied() {
      return !this.canSubmit || (!!this.contribution.id && !this.hasUnsavedChanges)
    },
    submitDeniedHint() {
      if (!this.canSubmit) return this.$t('permissions.deniedHint')
      if (this.contribution.id && !this.hasUnsavedChanges) return this.$t('common.noChangesHint')
      return ''
    },
  },
  watch: {
    groupCategories() {
      if (!this.formData.categoryIds.length && this.groupCategories)
        this.formData.categoryIds = this.groupCategories.map((cat) => cat.id)
    },
    // Re-validate when the schema-shaping inputs change so newly-required
    // fields (e.g. eventStart when switching to "event") surface errors
    // immediately rather than hiding behind a stale "green" state.
    postType() {
      this.touchedFields = {}
      this.submitAttempted = false
      this.$validateForm()
    },
    groupId() {
      this.$validateForm()
    },
    // Lets a hosting page mirror this outside the component instance itself
    // — pages/post/create/_type.vue needs it, since switching the
    // article/event type there does a real route navigation that remounts
    // this whole form (see its own cancelReturnPath/sharedDraftIsDirty
    // comments), wiping dirtyFields/locationChangedByUser/imageChangedByUser
    // (plain instance data) even though externalFormData's actual content
    // survives via its own module-level cache.
    hasUnsavedChanges(value) {
      this.$emit('has-unsaved-changes-change', value)
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    buildInitialFormData() {
      const {
        title,
        content,
        image,
        categories,
        eventStart,
        eventEnd,
        eventLocationName,
        eventVenue,
        eventIsOnline,
        eventLocation,
        lat,
        lng,
      } = this.contribution
      const {
        sensitive: imageBlurred = false,
        aspectRatio: imageAspectRatio = null,
        type: imageType = null,
      } = image || {}
      return {
        title: title || '',
        content: content || '',
        image: image || null,
        imageAspectRatio,
        imageType,
        imageBlurred,
        imageUpload: null,
        categoryIds: categories ? categories.map((category) => category.id) : [],
        eventStart: eventStart ? new Date(eventStart) : null,
        eventEnd: eventEnd ? new Date(eventEnd) : null,
        // A selection object (same { label, value, id, lat, lng } shape
        // LocationSelect/LocationPickerMap produce when the user picks a
        // result), not just the bare name — otherwise LocationPickerMap has
        // no coordinates to show a pin for on an event being edited, even
        // though it was already geocoded once. Falls back to the plain
        // string when there's no saved location (online events) or no
        // coordinates were ever geocoded for it.
        //
        // Prefers the post's own precise lat/lng (the exact point picked)
        // over eventLocation's (the shared Location node's own point, e.g.
        // a building's registered entrance) — using eventLocation's here
        // would re-show the pin at the wrong spot on every edit, snapping it
        // away from where it was actually placed. Falls back to eventLocation
        // only for events saved before Post had its own lat/lng.
        eventLocationName:
          typeof lat === 'number' && typeof lng === 'number'
            ? { label: eventLocationName || '', value: eventLocationName || '', id: null, lat, lng }
            : eventLocation &&
                typeof eventLocation.lat === 'number' &&
                typeof eventLocation.lng === 'number'
              ? {
                  label: eventLocationName || '',
                  value: eventLocationName || '',
                  id: eventLocation.id ?? null,
                  lat: eventLocation.lat,
                  lng: eventLocation.lng,
                }
              : eventLocationName || '',
        eventVenue: eventVenue || '',
        eventIsOnline: eventIsOnline || false,
      }
    },
    onCancel() {
      // beforeRouteLeave (confirmLeaveIfUnsavedChanges, wired up on the
      // hosting page) still intercepts this navigation exactly like any
      // other, so an unsaved-changes prompt still applies here too.
      if (this.cancelTo) {
        this.$router.push(this.cancelTo)
      } else {
        this.$router.back()
      }
    },
    onSubmit() {
      if (!this.canSubmit) {
        this.$toast.error(this.$t('permissions.deniedHint'))
        return
      }
      this.formSubmit(this.submit, () => {
        this.$toast.error(this.$t('common.validations.formHasErrors'))
      })
    },
    submit() {
      let image = null

      const { title, content, categoryIds } = this.formData
      if (this.formData.image) {
        image = {
          sensitive: this.formData.imageBlurred,
        }
        if (this.formData.imageUpload) {
          image.upload = this.formData.imageUpload
          image.aspectRatio = this.formData.imageAspectRatio
          image.type = this.formData.imageType
        }
      }
      this.loading = true

      // Snapshot exactly what's being submitted — submit() to the .then()
      // below is a real network round-trip (not instantaneous), so the user
      // may touch the form again while the mutation is still in flight. The
      // success handler must only clear a field's dirty status if its value
      // still matches what THIS submit actually sent — a bare "clear
      // everything" would wipe out an edit made in that window too, right
      // before navigating away, without ever asking about it. Same fix as
      // GroupForm.vue's own submit(); JSON.stringify sidesteps reference
      // inequality for array/object fields (categoryIds, eventLocationName)
      // that get re-assigned a new-but-equal-content value on every edit.
      const submittedFieldValues = Object.keys(this.dirtyFields).reduce((snapshot, key) => {
        snapshot[key] = JSON.stringify(this.formData[key])
        return snapshot
      }, {})
      const submittedEventLocationName = JSON.stringify(this.formData.eventLocationName)
      // The hero image isn't one field but several (image.url, the raw
      // upload, its aspect ratio/type, the blur toggle) — imageUpload is a
      // raw File, so it's compared by reference (a genuinely new pick is a
      // new File object; the untouched one stays the same reference).
      const submittedImageSnapshot = {
        imageUrl: this.formData.image?.url ?? null,
        imageUpload: this.formData.imageUpload,
        imageAspectRatio: this.formData.imageAspectRatio,
        imageType: this.formData.imageType,
        imageBlurred: this.formData.imageBlurred,
      }
      const imageStillMatchesSubmitted = () =>
        (this.formData.image?.url ?? null) === submittedImageSnapshot.imageUrl &&
        this.formData.imageUpload === submittedImageSnapshot.imageUpload &&
        this.formData.imageAspectRatio === submittedImageSnapshot.imageAspectRatio &&
        this.formData.imageType === submittedImageSnapshot.imageType &&
        this.formData.imageBlurred === submittedImageSnapshot.imageBlurred

      this.$apollo
        .mutate({
          mutation: this.contribution.id ? PostMutations().UpdatePost : PostMutations().CreatePost,
          variables: {
            title,
            content,
            categoryIds,
            id: this.contribution.id || null,
            image,
            groupId: this.groupId,
            postType: this.postType,
            eventInput: this.eventInput,
          },
        })
        .then(({ data }) => {
          this.loading = false
          this.$toast.success(this.$t('contribution.success'))
          const result = data[this.contribution.id ? 'UpdatePost' : 'CreatePost']

          // Clear unsaved-changes tracking before navigating away — this is
          // the very save the leave-confirmation guard (beforeRouteLeave,
          // see confirmLeaveIfUnsavedChanges) would otherwise still see as
          // dirty for the push() below, wrongly asking to confirm discarding
          // what was just saved. Only clears what still matches the
          // snapshot above — see its own comment for why.
          Object.keys(submittedFieldValues).forEach((key) => {
            if (JSON.stringify(this.formData[key]) === submittedFieldValues[key]) {
              this.$delete(this.dirtyFields, key)
            }
          })
          if (JSON.stringify(this.formData.eventLocationName) === submittedEventLocationName) {
            this.locationChangedByUser = false
          }
          if (imageStillMatchesSubmitted()) {
            this.imageChangedByUser = false
          }

          this.$router.push({
            name: 'post-id-slug',
            params: { id: result.id, slug: result.slug },
          })
        })
        .catch((err) => {
          this.$toast.error(err.message)
          this.loading = false
        })
    },
    updateEditorContent(value) {
      this.updateFormField('content', value)
    },
    changeEventIsOnline() {
      this.updateFormField('eventIsOnline', this.formData.eventIsOnline)
    },
    // See ignoreNextLocationInput's own doc comment (data()) — the first
    // input after mount can be LocationSelect normalizing an already-saved
    // plain-string value on its own, not a pick the user made.
    onEventLocationSelectInput() {
      if (this.ignoreNextLocationInput) {
        this.ignoreNextLocationInput = false
      } else {
        this.locationChangedByUser = true
      }
      this.touchField('eventLocationName')
      this.$validateForm()
    },
    onLocationPickerMapInput(location) {
      this.locationChangedByUser = true
      this.formData.eventLocationName = location
      this.touchField('eventLocationName')
      this.$validateForm()
    },
    changeEventEnd(event) {
      this.touchField('eventEnd')
      this.updateFormField('eventEnd', event)
    },
    changeEventStart(event) {
      this.touchField('eventStart')
      this.$set(this.dirtyFields, 'eventStart', true)
      this.$set(this.formData, 'eventStart', event)
      this.$validateForm()
    },
    onBeforeUnload(event) {
      if (!this.hasUnsavedChanges) return
      // Browsers show their own fixed wording here for security reasons —
      // setting returnValue (the legacy way to opt in) is what triggers it;
      // the actual string is ignored by every modern browser.
      event.preventDefault()
      event.returnValue = ''
    },
    addHeroImage(file) {
      this.imageChangedByUser = true
      this.formData.image = null
      this.formData.imageUpload = null
      if (file) {
        const reader = new FileReader()
        reader.onload = ({ target }) => {
          this.formData.image = {
            ...this.formData.image,
            url: target.result,
          }
        }
        reader.readAsDataURL(file)
        this.formData.imageUpload = file
      }
    },
    addImageAspectRatio(aspectRatio) {
      this.imageChangedByUser = true
      this.formData.imageAspectRatio = aspectRatio
    },
    addImageType(imageType) {
      this.imageChangedByUser = true
      this.formData.imageType = imageType
    },
  },
  apollo: {
    User: {
      query() {
        return gql`
          query {
            User(orderBy: slug_asc) {
              id
              slug
            }
          }
        `
      },
      result({ data: { User } }) {
        this.users = User
      },
    },
    Tag: {
      query() {
        return gql`
          query {
            Tag(orderBy: id_asc) {
              id
            }
          }
        `
      },
      result({ data: { Tag } }) {
        this.hashtags = Tag
      },
    },
  },
}
</script>

<style>
/* .ds-text (ds-compat.css) sets its own margin-bottom: var(--font-space-x-large)
   (~16px) as a longhand AFTER its own margin:0 shorthand, so it wins over
   .select-label's margin-bottom: 0 on specificity ties purely by source
   order (ds-compat.css loads after component styles) — the visible gap
   under every .select-label in this form. Scoping with .contribution-form
   bumps specificity so this actually wins, regardless of load order.
   Not all the way to 0 — .select-label's own 4px padding-bottom alone read
   as too tight; this adds another 4px on top of it (~8px total, matching
   --space-x-small). */
.contribution-form .select-label {
  margin-bottom: var(--space-xx-small);
}

/* OcelotInput bundles its own label+input into one .ds-form-item, which the
   rule below (.os-card__content > .ds-form-item) already zeroes the margin
   on. Fields with a bare .select-label instead (date-picker, location-select)
   have no such wrapper, so it's the sibling's own default top margin
   creating the remaining gap — remove it directly. */
.contribution-form .select-label + * {
  margin-top: 0;
}

/* Beginn/Ende (date-picker) and Adresse (location-select) sit right next to
   Titel/Ortsbeschreibung (both OcelotInput, whose bundled .ds-input-label
   gets only its own 4px padding-bottom — see .ds-form-item above), so the
   full extra 4px margin-bottom the shared .select-label rule adds on top of
   its own 4px padding-bottom (8px total, see that rule's own comment) read
   as a visibly bigger gap right where the two patterns sit side by side.
   Dropping it to 0 (matching OcelotInput's 4px exactly) then read as
   visibly tighter instead — these three end up next to a boxed control
   with no validation-hint/description line underneath eating into the
   whitespace the way OcelotInput's own fields have, so the same token
   value doesn't read the same. 2px (--space-xxx-small) splits the
   difference. */
.event-grid-item > .select-label,
.eventData label[for='city'].select-label {
  margin-bottom: var(--space-xxx-small);
}

/* Editor's own margin-top lives on .editor-content (the space between its
   own toolbar and the text area), nested inside the error-state wrapper div
   that's the label's actual sibling here — out of reach of the
   adjacent-sibling rule above, which only touches that wrapper div itself,
   not its descendants. Matched to the label's own gap above the toolbar
   (--space-xx-small padding-bottom + --space-xx-small margin-bottom = 8px)
   rather than 0, so both gaps read the same. */
.contribution-form .select-label + div .editor-content {
  margin-top: var(--space-x-small);
}

/* Same .os-card__content > .ds-form-item margin reset as the rule above it,
   but for form-items nested one level deeper inside .eventData — otherwise
   they keep .ds-form-item's own default margin-bottom, spacing them further
   from their validation-hint than every other field in this form. */
.eventData > .ds-form-item {
  margin-bottom: 0;
}

.eventData {
  .chipbox {
    display: flex;
    justify-content: flex-end;

    > .os-badge {
      margin-top: -10px;
    }
  }
  .event-date-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: auto;
    gap: var(--space-small);
    margin-bottom: var(--space-x-small);
  }

  .event-online-checkbox {
    margin-bottom: var(--space-x-small);
  }

  .location-picker-map-field {
    margin-top: var(--space-small);
    margin-bottom: var(--space-x-small);
  }

  .event-grid-item {
    grid-row-end: span 3;

    > .ds-form-item {
      margin-bottom: 0;
    }
  }
  .event-grid-item-margin-helper {
    margin-top: 10px;
  }
  .event-grid-item-font-helper {
    font-size: larger;
  }
}

.contribution-form > .os-card {
  display: flex;
  flex-direction: column;

  > .os-card__hero-image {
    position: relative;
    max-height: var(--size-image-max-height);
    overflow: hidden;

    > .image {
      width: 100%;
      object-fit: contain;
    }
  }

  .image.--blur-image {
    filter: blur(var(--blur-radius));
  }

  > .os-card__content {
    display: flex;
    flex-direction: column;

    > .ds-form-item {
      margin: 0;
    }

    > .os-badge {
      align-self: flex-end;
      margin: var(--space-xx-small) 0 var(--space-base);
      cursor: default;
    }

    /* Not align-self: flex-end — os-validation-hint switches its OWN inner
       layout depending on whether it has text (flex + justify-between,
       spreading a left-aligned message and a right-aligned count/icon
       badge across the full width) or not (just the badge, flex-end).
       Forcing flex-end here shrinks the whole element to its content's
       width before that inner layout gets a chance to use the space,
       which squashed message + badge into a narrow, centered-looking
       stack instead of message-left/badge-right. Letting it stretch (the
       flex column's own default) gives it the full width to actually do
       that with; the badge-only case still ends up flush right either
       way, since its own inner justify-end doesn't need the full width to
       do that. */
    > .os-validation-hint {
      margin-bottom: var(--space-base);
      cursor: default;
    }

    > .select-field {
      align-self: flex-end;
    }

    > .buttons-footer {
      justify-content: flex-end;
      align-self: flex-end;
      width: 100%;
      margin-top: var(--space-base);

      > .action-buttons-group {
        margin-left: auto;
        display: flex;
        justify-content: flex-end;

        > button {
          margin-left: 1em;
          min-width: fit-content;
        }
      }

      > .buttons-footer-helper {
        margin-right: 16px;
        /*  important needed because of component inline style */
        margin-bottom: 6px !important;
      }
    }
  }

  .blur-toggle {
    text-align: right;
    margin-bottom: var(--space-base);

    > .link {
      display: block;
    }
  }

  @media screen and (max-width: 656px) {
    > .os-card__content > .buttons-footer {
      flex-direction: column;
      margin-top: 5px;

      > .action-buttons-group {
        > button {
          margin-left: 1em;
        }
      }
    }
  }

  @media screen and (max-width: 280px) {
    > .os-card__content > .buttons-footer {
      > .action-buttons-group {
        flex-direction: column;

        > button {
          margin-bottom: 5px;
        }
      }
    }
  }

  .mx-datepicker {
    width: 100%;
  }
  .mx-datepicker input {
    font-size: 1rem;
    height: var(--input-height);
    padding: 8px 8px;
    background-color: var(--background-color-soft);
    border-color: var(--border-color-softer);
    color: var(--text-color-base);
  }
  .mx-datepicker input:hover {
    border-color: var(--border-color-softer);
  }
  .mx-datepicker input:focus {
    border-color: var(--border-color-active);
    background-color: var(--background-color-base);
  }
  .mx-datepicker-error input {
    border-color: var(--color-danger);
  }
}
</style>
