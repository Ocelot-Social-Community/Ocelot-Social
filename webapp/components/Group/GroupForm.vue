<template>
  <div>
    <ds-form
      class="group-form"
      ref="groupForm"
      v-model="formData"
      :schema="formSchema"
      @submit="submit"
    >
      <template #default="{ errors }">
        <base-card>
          <!-- Group Name -->
          <ds-input
            :label="$t('group.name')"
            model="name"
            name="name"
            autofocus
            :placeholder="`${$t('group.name')} …`"
          />
            <ds-chip size="base" :color="errors && errors.name && 'danger'">
              {{ `${formData.name.length} / ${formSchema.name.min}–${formSchema.name.max}` }}
              <base-icon v-if="errors && errors.name" name="warning" />
            </ds-chip>
      
          <!-- Group Slug -->
            <ds-input
              v-if="update"
              :label="$t('group.labelSlug')"
              model="slug"
              icon="at"
              :placeholder="`${$t('group.labelSlug')} …`"
            ></ds-input>

          <!-- groupType -->
            <ds-text class="select-label">
              {{ $t('group.type') }}
            </ds-text>
            <!-- TODO: change it has to be implemented later -->
            <!-- TODO: move 'ds-select' from styleguide to main code and implement missen translation etc. functionality -->
            <select
              class="select ds-input appearance--auto"
              :value="formData.groupType"
              :disabled="update"
              model="groupType"
              name="groupType"
              @change="changeGroupType($event)"
            >
              <option v-for="groupType in groupTypeOptions" :key="groupType" :value="groupType">
                {{ $t(`group.types.${groupType}`) }}
              </option>
            </select>
            <ds-chip v-if="formData.groupType === ''" size="base" :color="formData.groupType === '' ? 'danger' : 'medium'">
              <base-icon v-if="formData.groupType === ''" name="warning" />
            </ds-chip>
      

          <!-- goal -->
            <ds-input
              :label="$t('group.goal')"
              v-model="formData.about"
              :placeholder="$t('group.goal') + ' …'"
              name="about"
              rows="3"
            />

            <ds-space margin-top="small" />

            <!-- description -->
            <ds-text class="select-label">
              {{ $t('group.description') }}
            </ds-text>
            <editor
              :users="null"
              :value="formData.description"
              :hashtags="null"
              model="description"
              name="description"
              @input="updateEditorDescription"
            />
            <ds-chip size="base" :color="errors && errors.description && 'danger'">
              {{ `${descriptionLength} / ${formSchema.description.min}` }}
              <base-icon v-if="errors && errors.description" name="warning" />
            </ds-chip>

          <!-- actionRadius -->
            <ds-text class="select-label">
              {{ $t('group.actionRadius') }}
            </ds-text>
            <!-- TODO: change it has to be implemented later -->
            <!-- TODO: move 'ds-select' from styleguide to main code and implement missen translation etc. functionality -->
            <select
              class="select ds-input appearance--auto"
              :options="actionRadiusOptions"
              :value="formData.actionRadius"
              @change="changeActionRadius($event)"
            >
              <option
                v-for="actionRadius in actionRadiusOptions"
                :key="actionRadius"
                :value="actionRadius"
                model="actionRadius"
                name="actionRadius"
              >
                {{ $t(`group.actionRadii.${actionRadius}`) }}
              </option>
            </select>
            <ds-chip v-if="formData.actionRadius === ''" size="base" :color="formData.actionRadius === '' ? 'danger' : 'medium'">
              <base-icon v-if="formData.actionRadius === ''" name="warning" />
            </ds-chip>

          <!-- location -->
            <ds-select
              id="city"
              :label="$t('settings.data.labelCity')"
              v-model="formData.locationName"
              :options="cities"
              icon="map-marker"
              :icon-right="null"
              :placeholder="$t('settings.data.labelCity') + ' …'"
              :loading="loadingGeo"
              @input.native="handleCityInput"
            />
            <base-button
              v-if="formData.locationName !== ''"
              icon="close"
              ghost
              size="small"
              @click="formData.locationName = ''"
              style="position: relative; display: inline-block; right: -93%; top: -45px"
            ></base-button>


            <ds-space margin-top="small" />

            <!-- category -->
            <categories-select
              v-if="categoriesActive"
              model="categoryIds"
              name="categoryIds"
              :existingCategoryIds="formData.categoryIds"
            />
            <ds-text align="right">
              <ds-chip
                v-if="categoriesActive"
                size="base"
                :color="errors && errors.categoryIds && 'danger'"
              >
                {{ formData.categoryIds.length }} / 3
                <base-icon v-if="errors && errors.categoryIds" name="warning" />
              </ds-chip>
            </ds-text>

            <!-- Submit -->
          <ds-space margin-top="large">
            <nuxt-link to="/my-groups">
              <ds-button>{{ $t('actions.cancel') }}</ds-button>
            </nuxt-link>
            <ds-button type="submit" icon="save" primary :disabled="errors" fill>
              {{ update ? $t('group.update') : $t('group.save') }}
            </ds-button>
          </ds-space>
        </base-card>
      </template>
    </ds-form>
  </div>
</template>

<script>
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import { CATEGORIES_MIN, CATEGORIES_MAX } from '~/constants/categories.js'
import {
  NAME_LENGTH_MIN,
  NAME_LENGTH_MAX,
  DESCRIPTION_WITHOUT_HTML_LENGTH_MIN,
} from '~/constants/groups.js'
import Editor from '~/components/Editor/Editor'
import { queryLocations } from '~/graphql/location'

let timeout

export default {
  name: 'GroupForm',
  components: {
    CategoriesSelect,
    Editor,
  },
  props: {
    update: {
      type: Boolean,
      required: false,
      default: false,
    },
    group: {
      type: Object,
      required: false,
      default: () => ({}),
    },
  },
  data() {
    const { name, slug, groupType, about, description, actionRadius, locationName, categories } =
      this.group
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
      disabled: false,
      descriptionMin: 50,
      groupTypeOptions: ['public', 'closed', 'hidden'],
      actionRadiusOptions: ['regional', 'national', 'continental', 'global'],
      loadingGeo: false,
      cities: [],
      formData: {
        name: name || '',
        slug: slug || '',
        groupType: groupType || '',
        about: about || '',
        description: description || '',
        locationName: locationName || '',
        actionRadius: actionRadius || '',
        categoryIds: categories ? categories.map((category) => category.id) : [],
      },
      formSchema: {
        name: { required: true, min: NAME_LENGTH_MIN, max: NAME_LENGTH_MAX },
        slug: { required: false, min: NAME_LENGTH_MIN },
        groupType: { required: true },
        about: { required: false },
        description: { required: true, min: DESCRIPTION_WITHOUT_HTML_LENGTH_MIN },
        actionRadius: { required: true },
        locationName: { required: false },
        categoryIds: {
          type: 'array',
          required: this.categoriesActive,
          validator: (_, value = []) => {
            if (
              this.categoriesActive &&
              (value.length < CATEGORIES_MIN || value.length > CATEGORIES_MAX)
            ) {
              return [new Error(this.$t('common.validations.categories'))]
            }
            return []
          },
        },
      },
    }
  },
  computed: {
    descriptionLength() {
      return this.$filters.removeHtml(this.formData.description).length
    },
  },
  methods: {
    changeGroupType(e) {
      this.formData.groupType = e.target.value
    },
    changeActionRadius(e) {
      this.formData.actionRadius = e.target.value
    },
    updateEditorDescription(value) {
      this.$refs.groupForm.update('description', value)
    },
    submit() {
      const { name, about, description, groupType, actionRadius, locationName, categoryIds } =
        this.formData
      const variables = {
        name,
        about,
        description,
        groupType,
        actionRadius,
        locationName: locationName.label ? locationName.label : '',
        categoryIds,
      }
      this.update
        ? this.$emit('updateGroup', {
            ...variables,
            id: this.group.id,
          })
        : this.$emit('createGroup', variables)
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

<style lang="scss">
.appearance--auto {
  -webkit-appearance: auto;
  -moz-appearance: auto;
  appearance: auto;
}
.select-label {
  margin-bottom: 0;
  padding-bottom: 4px;
    color: #70677e;
    font-size: 1rem;
}

.textarea-label {
  padding-bottom: 14px;
}

.group-form > .base-card {
  display: flex;
  flex-direction: column;

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

  > .buttons {
    align-self: flex-end;
    margin-top: $space-base;
  }

}
</style>
