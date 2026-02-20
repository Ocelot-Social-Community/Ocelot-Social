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
          <ds-input
            model="title"
            :placeholder="$t('contribution.title')"
            name="title"
            autofocus
            size="large"
          />
          <os-badge :variant="errors && errors.title ? 'danger' : undefined">
            {{ formData.title.length }}/{{ formSchema.title.max }}
            <os-icon v-if="errors && errors.title" :icon="icons.warning" />
          </os-badge>
          <editor
            :users="users"
            :value="formData.content"
            :hashtags="hashtags"
            @input="updateEditorContent"
          />
          <os-badge :variant="errors && errors.content ? 'danger' : undefined">
            {{ contentLength }}
            <os-icon v-if="errors && errors.content" :icon="icons.warning" />
          </os-badge>

          <!-- Eventdata -->
          <div v-if="createEvent" class="eventDatas">
            <hr />
            <div class="ds-mt-x-small ds-mb-large"></div>
            <div class="ds-grid event-date-grid">
              <div class="event-grid-item">
                <!-- <label>Beginn</label> -->
                <div class="event-grid-item-z-helper">
                  <date-picker
                    name="eventStart"
                    v-model="formData.eventStart"
                    type="datetime"
                    value-type="format"
                    :minute-step="15"
                    Xformat="DD-MM-YYYY HH:mm"
                    class="event-grid-item-z-helper"
                    :placeholder="$t('post.viewEvent.eventStart')"
                    :disabled-date="notBeforeToday"
                    :disabled-time="notBeforeNow"
                    :show-second="false"
                    @change="changeEventStart($event)"
                  ></date-picker>
                </div>
                <div
                  v-if="errors && errors.eventStart"
                  class="chipbox event-grid-item-margin-helper"
                >
                  <os-badge :variant="errors && errors.eventStart ? 'danger' : undefined">
                    <os-icon :icon="icons.warning" />
                  </os-badge>
                </div>
              </div>
              <div class="event-grid-item">
                <!-- <label>Ende (optional)</label> -->

                <date-picker
                  v-model="formData.eventEnd"
                  name="eventEnd"
                  type="datetime"
                  value-type="format"
                  :minute-step="15"
                  :seconds-step="0"
                  Xformat="DD-MM-YYYY HH:mm"
                  :placeholder="$t('post.viewEvent.eventEnd')"
                  class="event-grid-item-font-helper"
                  :disabled-date="notBeforeEventDay"
                  :disabled-time="notBeforeEvent"
                  :show-second="false"
                  @change="changeEventEnd($event)"
                ></date-picker>
              </div>
            </div>
            <div class="ds-grid event-location-grid">
              <div class="event-grid-item">
                <ds-input
                  model="eventVenue"
                  name="eventVenue"
                  :placeholder="$t('post.viewEvent.eventVenue')"
                />
                <div class="chipbox">
                  <os-badge :variant="errors && errors.eventVenue ? 'danger' : undefined">
                    {{ formData.eventVenue.length }}/{{ formSchema.eventVenue.max }}
                    <os-icon v-if="errors && errors.eventVenue" :icon="icons.warning" />
                  </os-badge>
                </div>
              </div>
              <div v-if="showEventLocationName" class="event-grid-item">
                <ds-input
                  model="eventLocationName"
                  name="eventLocationName"
                  :placeholder="$t('post.viewEvent.eventLocationName')"
                />
                <div class="chipbox">
                  <os-badge :variant="errors && errors.eventLocationName ? 'danger' : undefined">
                    {{ formData.eventLocationName.length }}/{{ formSchema.eventLocationName.max }}
                    <os-icon v-if="errors && errors.eventLocationName" :icon="icons.warning" />
                  </os-badge>
                </div>
              </div>
            </div>

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
          <div class="ds-mt-x-small ds-mb-large"></div>
          <categories-select
            v-if="categoriesActive"
            model="categoryIds"
            :existingCategoryIds="formData.categoryIds"
          />
          <os-badge
            v-if="categoriesActive"
            size="base"
            :variant="errors && errors.categoryIds ? 'danger' : undefined"
          >
            {{ formData.categoryIds.length }} / 3
            <os-icon v-if="errors && errors.categoryIds" :icon="icons.warning" />
          </os-badge>
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
                :disabled="!!errors"
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
    </ds-form>
  </div>
</template>
<script>
import { OsBadge, OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
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
import 'vue2-datepicker/scss/index.scss'
import GetCategories from '~/mixins/getCategoriesMixin.js'

export default {
  mixins: [GetCategories],
  components: {
    CategoriesSelect,
    DatePicker,
    Editor,
    ImageUploader,
    OsBadge,
    OsButton,
    OsCard,
    OsIcon,
    PageParamsLink,
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
  created() {
    this.icons = iconRegistry
  },
  methods: {
    notBeforeToday(date) {
      return date < new Date().setHours(0, 0, 0, 0)
    },
    notBeforeNow(date) {
      return date < new Date()
    },
    notBeforeEventDay(date) {
      return date < new Date(this.formData.eventStart).setHours(0, 0, 0, 0)
    },
    notBeforeEvent(date) {
      return date <= new Date(this.formData.eventStart)
    },
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

    > .os-badge {
      margin-top: -10px;
    }
  }
  .event-date-grid,
  .event-location-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: auto;
    gap: $space-small;
  }

  .event-grid-item {
    grid-row-end: span 3;
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

.contribution-form > .os-card {
  display: flex;
  flex-direction: column;

  > .os-card__hero-image {
    position: relative;
    max-height: $size-image-max-height;
    overflow: hidden;

    > .image {
      width: 100%;
      object-fit: contain;
    }
  }

  .image.--blur-image {
    filter: blur($blur-radius);
  }

  > .os-card__content {
    display: flex;
    flex-direction: column;

    > .ds-form-item {
      margin: 0;
    }

    > .os-badge {
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
  }

  .blur-toggle {
    text-align: right;
    margin-bottom: $space-base;

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
