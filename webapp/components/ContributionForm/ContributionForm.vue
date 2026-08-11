<template>
  <div>
    <form class="contribution-form" @submit.prevent="onSubmit" novalidate>
      <template>
        <os-card>
          <template #heroImage>
            <img
              v-if="formData.image"
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
            <input type="checkbox" id="blur-img" v-model="formData.imageBlurred" />
            <page-params-link class="link" :pageParams="links.FAQ">
              {{ $t('contribution.inappropriatePicture') }}
              <os-icon :icon="icons.questionCircle" />
            </page-params-link>
          </div>
          <div class="ds-mt-base ds-mb-large"></div>
          <ocelot-input
            model="title"
            :placeholder="$t('contribution.title')"
            name="title"
            autofocus
            size="large"
            hide-error
            @blur="dirtyFields.title && touchField('title')"
          />
          <os-validation-hint
            :count="formData.title.length"
            :max="formSchema.title.max"
            :variant="visibleErrors && visibleErrors.title ? 'error' : null"
            :text="titleErrorText"
          />
          <div :class="{ 'ds-input-has-error': visibleErrors && visibleErrors.content }">
            <editor
              :users="users"
              :value="formData.content"
              :hashtags="hashtags"
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
            <hr />
            <div class="ds-mt-x-small ds-mb-large"></div>
            <div class="ds-grid event-date-grid">
              <div class="event-grid-item">
                <!-- <label>Begin</label> -->
                <date-picker
                  name="eventStart"
                  v-model="formData.eventStart"
                  type="datetime"
                  value-type="date"
                  :minute-step="15"
                  format="DD.MM.YYYY HH:mm"
                  :placeholder="$t('post.viewEvent.eventStart')"
                  :class="{ 'mx-datepicker-error': visibleErrors && visibleErrors.eventStart }"
                  :show-second="false"
                  @change="changeEventStart($event)"
                ></date-picker>
              </div>
              <div class="event-grid-item">
                <!-- <label>End (optional)</label> -->
                <date-picker
                  v-model="formData.eventEnd"
                  name="eventEnd"
                  type="datetime"
                  value-type="date"
                  :minute-step="15"
                  :seconds-step="0"
                  format="DD.MM.YYYY HH:mm"
                  :placeholder="$t('post.viewEvent.eventEnd')"
                  :class="[
                    'event-grid-item-font-helper',
                    { 'mx-datepicker-error': visibleErrors && visibleErrors.eventEnd },
                  ]"
                  :show-second="false"
                  @change="changeEventEnd($event)"
                ></date-picker>
              </div>
            </div>
            <div class="event-date-hints-zone">
              <div class="event-date-hint-cell">
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
              <div class="event-date-hint-cell">
                <os-validation-hint
                  v-if="visibleErrors && visibleErrors.eventEnd"
                  variant="error"
                  :text="$t('post.viewEvent.eventEndBeforeStart')"
                />
              </div>
            </div>
            <div class="ds-grid event-location-grid">
              <div class="event-grid-item">
                <ocelot-input
                  model="eventVenue"
                  name="eventVenue"
                  :placeholder="$t('post.viewEvent.eventVenue')"
                  hide-error
                  @blur="dirtyFields.eventVenue && touchField('eventVenue')"
                />
                <os-validation-hint
                  :count="formData.eventVenue.length"
                  :max="formSchema.eventVenue.max"
                  :variant="visibleErrors && visibleErrors.eventVenue ? 'error' : null"
                  :text="venueErrorText"
                />
              </div>
              <div class="event-grid-item">
                <div
                  :class="{
                    'ds-input-has-error':
                      !locationSelectDisabled && visibleErrors && visibleErrors.eventLocationName,
                  }"
                >
                  <location-select
                    v-model="formData.eventLocationName"
                    types="country,region,postcode,district,place,locality,neighborhood,address,poi"
                    :show-previous-location="false"
                    :show-label="false"
                    :placeholder="$t('post.viewEvent.eventLocationName')"
                    :disabled="locationSelectDisabled"
                    @input="
                      touchField('eventLocationName')
                      $validateForm()
                    "
                  />
                  <os-validation-hint
                    v-if="
                      !locationSelectDisabled && visibleErrors && visibleErrors.eventLocationName
                    "
                    variant="error"
                    :text="$t('post.viewEvent.eventLocationRequired')"
                  />
                </div>
                <event-location-map
                  v-if="!locationSelectDisabled"
                  :location="formData.eventLocationName"
                  class="event-location-map-field"
                  @input="onEventLocationMapInput"
                />
                <div class="event-online-checkbox">
                  <input
                    type="checkbox"
                    v-model="formData.eventIsOnline"
                    model="eventIsOnline"
                    name="eventIsOnline"
                    class="event-grid-item-font-helper"
                    @change="changeEventIsOnline($event)"
                  />
                  {{ $t('post.viewEvent.eventIsOnline') }}
                </div>
              </div>
            </div>
          </div>
          <div class="ds-mt-x-small ds-mb-large"></div>
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
                @click="$router.back()"
              >
                {{ $t('actions.cancel') }}
              </os-button>
              <os-button
                variant="primary"
                appearance="filled"
                type="submit"
                :loading="loading"
                :class="{ 'permission-denied': !contribution.id && !$can('post.create') }"
                :aria-disabled="!contribution.id && !$can('post.create')"
                v-tooltip="{
                  content:
                    !contribution.id && !$can('post.create') ? $t('permissions.deniedHint') : '',
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
import EventLocationMap from '~/components/Map/EventLocationMap'

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
    EventLocationMap,
    OsValidationHint,
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
  },
  data() {
    return {
      links,
      formData: this.externalFormData || this.buildInitialFormData(),
      loading: false,
      users: [],
      hashtags: [],
    }
  },
  async mounted() {
    try {
      await import(`vue2-datepicker/locale/${this.currentUser.locale}`)
    } catch {
      await import('vue2-datepicker/locale/en')
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    formSchema() {
      return {
        title: {
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
        return {
          eventStart: new Date(this.formData.eventStart).toISOString(),
          eventVenue: this.formData.eventVenue,
          eventEnd: this.formData.eventEnd ? new Date(this.formData.eventEnd).toISOString() : null,
          eventIsOnline: this.formData.eventIsOnline,
          eventLocationName: !this.formData.eventIsOnline
            ? (this.formData.eventLocationName?.value ?? this.formData.eventLocationName) || null
            : null,
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
        eventLocation: eventLocation || '',
        eventLocationName: eventLocationName || '',
        eventVenue: eventVenue || '',
        eventIsOnline: eventIsOnline || false,
      }
    },
    onSubmit() {
      if (!this.contribution.id && !this.$can('post.create')) {
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
    onEventLocationMapInput(location) {
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
      this.$set(this.formData, 'eventStart', event)
      this.$validateForm()
    },
    addHeroImage(file) {
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
      this.formData.imageAspectRatio = aspectRatio
    },
    addImageType(imageType) {
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
.eventData {
  .event-date-hints-zone {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-small);
    margin-bottom: var(--space-x-small);
  }

  .chipbox {
    display: flex;
    justify-content: flex-end;

    > .os-badge {
      margin-top: -10px;
    }
  }
  .event-date-grid,
  .event-location-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: auto;
    gap: var(--space-small);
  }

  .event-online-checkbox {
    margin-top: var(--space-x-small);
  }

  .event-location-map-field {
    margin-top: var(--space-x-small);
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

    > .os-validation-hint {
      align-self: flex-end;
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
    height: calc(1.625rem + 18px);
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
