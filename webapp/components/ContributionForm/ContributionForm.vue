<template>
  <div>
    <ds-form
      class="contribution-form"
      ref="contributionForm"
      v-model="formData"
      :schema="formSchema"
      @submit="submit"
    >
      <template #default="{ errors }">
        <base-card>
          <template #heroImage>
            <img
              v-if="formData.image"
              :src="formData.image | proxyApiUrl"
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
              <base-icon name="question-circle" />
            </page-params-link>
          </div>
          <ds-space margin-top="base" />
          <ds-input
            model="title"
            :placeholder="$t('contribution.title')"
            name="title"
            autofocus
            size="large"
          />
          <ds-chip size="base" :color="errors && errors.title && 'danger'">
            {{ formData.title.length }}/{{ formSchema.title.max }}
            <base-icon v-if="errors && errors.title" name="warning" />
          </ds-chip>
          <editor
            :users="users"
            :value="formData.content"
            :hashtags="hashtags"
            @input="updateEditorContent"
          />
          <ds-chip size="base" :color="errors && errors.content && 'danger'">
            {{ contentLength }}
            <base-icon v-if="errors && errors.content" name="warning" />
          </ds-chip>

          <!-- Eventdata -->
          <div v-if="createEvent" class="eventDatas">
            <hr />
            <ds-space margin-top="x-small" />
            <ds-grid>
              <ds-grid-item class="event-grid-item">
                <date-time-picker
                  :form-date="formData.eventStart"
                  :errors="errors"
                  :placeholder-date="$t('post.viewEvent.eventStart')"
                  :placeholder-time="$t('post.viewEvent.eventStartTime')"
                  @change-date="changeEventStart"
                ></date-time-picker>
              </ds-grid-item>
              <ds-grid-item class="event-grid-item">
                <date-time-picker
                  v-if="formData.eventStart"
                  :form-date="formData.eventEnd"
                  :compare-date="formData.eventStart"
                  :errors="errors"
                  :placeholder-date="$t('post.viewEvent.eventEnd')"
                  :placeholder-time="$t('post.viewEvent.eventEndTime')"
                  @change-date="changeEventEnd"
                ></date-time-picker>
              </ds-grid-item>
            </ds-grid>
            <ds-grid class="event-location-grid">
              <ds-grid-item class="event-grid-item">
                <ds-input
                  model="eventVenue"
                  name="eventVenue"
                  :placeholder="$t('post.viewEvent.eventVenue')"
                />
                <div class="chipbox">
                  <ds-chip size="base" :color="errors && errors.eventVenue && 'danger'">
                    {{ formData.eventVenue.length }}/{{ formSchema.eventVenue.max }}
                    <base-icon v-if="errors && errors.eventVenue" name="warning" />
                  </ds-chip>
                </div>
              </ds-grid-item>
              <ds-grid-item v-if="showEventLocationName" class="event-grid-item">
                <ds-input
                  model="eventLocationName"
                  name="eventLocationName"
                  :placeholder="$t('post.viewEvent.eventLocationName')"
                />
                <div class="chipbox">
                  <ds-chip size="base" :color="errors && errors.eventLocationName && 'danger'">
                    {{ formData.eventLocationName.length }}/{{ formSchema.eventLocationName.max }}
                    <base-icon v-if="errors && errors.eventLocationName" name="warning" />
                  </ds-chip>
                </div>
              </ds-grid-item>
            </ds-grid>

            <div>
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
          <ds-space margin-top="x-small" />
          <categories-select
            v-if="categoriesActive"
            model="categoryIds"
            :existingCategoryIds="formData.categoryIds"
          />
          <ds-chip
            v-if="categoriesActive"
            size="base"
            :color="errors && errors.categoryIds && 'danger'"
          >
            {{ formData.categoryIds.length }} / 3
            <base-icon v-if="errors && errors.categoryIds" name="warning" />
          </ds-chip>
          <ds-flex class="buttons-footer" gutter="xxx-small">
            <ds-flex-item width="3.5" class="buttons-footer-helper">
              <!-- eslint-disable vue/no-v-text-v-html-on-component -->
              <!-- TODO => remove v-html! only text ! no html! security first! -->
              <ds-text
                v-if="showGroupHint"
                v-html="$t('contribution.visibleOnlyForMembersOfGroup', { name: groupName })"
              />
              <!-- eslint-enable vue/no-v-text-v-html-on-component -->
            </ds-flex-item>
            <ds-flex-item width="0.15" />
            <ds-flex-item class="action-buttons-group" width="2">
              <base-button data-test="cancel-button" :disabled="loading" @click="$router.back()">
                {{ $t('actions.cancel') }}
              </base-button>
              <base-button type="submit" icon="check" :loading="loading" :disabled="errors" filled>
                {{ $t('actions.save') }}
              </base-button>
            </ds-flex-item>
          </ds-flex>
        </base-card>
      </template>
    </ds-form>
  </div>
</template>
<script>
import gql from 'graphql-tag'
import { mapGetters } from 'vuex'
import Editor from '~/components/Editor/Editor'
import PostMutations from '~/graphql/PostMutations.js'
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import ImageUploader from '~/components/Uploader/ImageUploader'
import links from '~/constants/links.js'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import DateTimePicker from '~/components/_new/features/DateTimePicker/DateTimePicker.vue'

export default {
  components: {
    Editor,
    ImageUploader,
    PageParamsLink,
    CategoriesSelect,
    DateTimePicker,
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
    createEvent: {
      type: Boolean,
      default: false,
    },
  },

  data() {
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
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      links,
      formData: {
        title: title || '',
        content: content || '',
        image: image || null,
        imageAspectRatio,
        imageType,
        imageBlurred,
        categoryIds: categories ? categories.map((category) => category.id) : [],
        eventStart: eventStart || null,
        eventEnd: eventEnd || null,
        eventLocation: eventLocation || '',
        eventLocationName: eventLocationName || '',
        eventVenue: eventVenue || '',
        eventIsOnline: eventIsOnline || false,
      },
      loading: false,
      users: [],
      hashtags: [],
      imageUpload: null,
    }
  },
  async mounted() {
    await import(`vue2-datepicker/locale/${this.currentUser.locale}`)
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    formSchema() {
      return {
        title: { required: true, min: 3, max: 100 },
        content: { required: true },
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
        eventStart: { required: !!this.createEvent },
        eventVenue: {
          required: !!this.createEvent,
          min: 3,
          max: 100,
          validator: (_, value = '') => {
            if (!this.createEvent) return []
            if (!value.trim()) {
              return [new Error(this.$t('common.validations.eventVenueNotEmpty'))]
            }
            if (value.length < 3 || value.length > 100) {
              return [
                new Error(this.$t('common.validations.eventVenueLength', { min: 3, max: 100 })),
              ]
            }
            return []
          },
        },
        eventLocationName: {
          required: !!this.createEvent && !this.formData.eventIsOnline,
          min: 3,
          max: 100,
          validator: (_, value = '') => {
            if (!this.createEvent) return []
            if (this.formData.eventIsOnline) return []
            if (!value.trim()) {
              return [new Error(this.$t('common.validations.eventLocationNameNotEmpty'))]
            }
            if (value.length < 3 || value.length > 100) {
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
    eventInput() {
      if (this.createEvent) {
        return {
          eventStart: new Date(this.formData.eventStart).toISOString(),
          eventVenue: this.formData.eventVenue,
          eventEnd: this.formData.eventEnd ? new Date(this.formData.eventEnd).toISOString() : null,
          eventIsOnline: this.formData.eventIsOnline,
          eventLocationName: !this.formData.eventIsOnline ? this.formData.eventLocationName : null,
        }
      }
      return undefined
    },
    contentLength() {
      return this.$filters.removeHtml(this.formData.content).length
    },
    groupId() {
      return this.group && this.group.id
    },
    showGroupHint() {
      return this.groupId && ['closed', 'hidden'].includes(this.group.groupType)
    },
    groupName() {
      return this.group && this.group.name
    },
    groupCategories() {
      return this.group && this.group.categories
    },
    showEventLocationName() {
      return !this.formData.eventIsOnline
    },
  },
  watch: {
    groupCategories() {
      if (!this.formData.categoryIds.length && this.groupCategories)
        this.formData.categoryIds = this.groupCategories.map((cat) => cat.id)
    },
  },
  methods: {
    submit() {
      let image = null

      const { title, content, categoryIds } = this.formData
      if (this.formData.image) {
        image = {
          sensitive: this.formData.imageBlurred,
        }
        if (this.imageUpload) {
          image.upload = this.imageUpload
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
            postType: !this.createEvent ? 'Article' : 'Event',
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
      this.$refs.contributionForm.update('content', value)
    },
    changeEventIsOnline(event) {
      this.$refs.contributionForm.update('eventIsOnline', this.formData.eventIsOnline)
    },
    changeEventEnd(event) {
      this.$refs.contributionForm.update('eventEnd', event)
    },
    changeEventStart(event) {
      this.$refs.contributionForm.update('eventStart', event)
    },
    addHeroImage(file) {
      this.formData.image = null
      if (file) {
        const reader = new FileReader()
        reader.onload = ({ target }) => {
          this.formData.image = {
            ...this.formData.image,
            url: target.result,
          }
        }
        reader.readAsDataURL(file)
        this.imageUpload = file
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

<style lang="scss">
.eventDatas {
  .chipbox {
    display: flex;
    justify-content: flex-end;

    > .ds-chip {
      margin-top: -10px;
    }
  }
  // style override to handle dynamic inputs
  .event-location-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .event-grid-item {
    // important needed because of component inline style
    grid-row-end: span 3 !important;
  }
  .event-grid-item-z-helper {
    z-index: 20;
  }
  .event-grid-item-margin-helper {
    margin-top: 10px;
  }
  .event-grid-item-font-helper {
    font-size: larger;
  }
}

.contribution-form > .base-card {
  display: flex;
  flex-direction: column;

  > .hero-image {
    position: relative;

    > .image {
      max-height: $size-image-max-height;
    }
  }

  .image.--blur-image {
    filter: blur($blur-radius);
  }

  > .ds-form-item {
    margin: 0;
  }

  > .ds-chip {
    align-self: flex-end;
    margin: $space-xx-small 0 $space-base;
    cursor: default;
  }

  > .select-field {
    align-self: flex-end;
  }

  > .buttons-footer {
    justify-content: flex-end;
    align-self: flex-end;
    width: 100%;
    margin-top: $space-base;

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
      // important needed because of component inline style
      margin-bottom: 6px !important;
    }
  }

  .blur-toggle {
    text-align: right;
    margin-bottom: $space-base;

    > .link {
      display: block;
    }
  }

  @media screen and (max-width: 656px) {
    > .buttons-footer {
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
    > .buttons-footer {
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
    background-color: #faf9fa;
    border-color: #c8c8c8;
    color: #4b4554;
  }
  .mx-datepicker input:hover {
    border-color: #c8c8c8;
  }
  .mx-datepicker input:focus {
    border-color: #17b53f;
    background-color: #fff;
  }
  .mx-datepicker-error {
    border-color: #cf2619;
  }
}
</style>
