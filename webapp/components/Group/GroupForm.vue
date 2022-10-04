<template>
  <div>
    <ds-form
      class="group-form"
      ref="groupForm"
      v-model="formData"
      :schema="formSchema"
      @submit="submit"
    >
      <!-- "errors" is only working if you use a submit event on the form -->
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
          <ds-text align="right">
            <ds-chip size="base" :color="errors && errors.name && 'danger'">
              {{ `${formData.name.length} / ${formSchema.name.max}` }}
              <base-icon v-if="errors && errors.name" name="warning" />
            </ds-chip>
          </ds-text>

          <!-- Group Slug -->
          <ds-space margin-top="large">
            <ds-input
              v-if="update"
              :label="$t('group.labelSlug')"
              model="slug"
              icon="at"
              :placeholder="`${$t('group.labelSlug')} …`"
            ></ds-input>
          </ds-space>

          <!-- groupType -->
          <ds-space margin-top="large">
            <ds-text class="select-label">
              {{ $t('group.type') }}
            </ds-text>
            {{ formData.groupType }}
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
            <ds-text align="right">
              <ds-chip size="base" :color="formData.groupType === '' ? 'danger' : 'medium'">
                <base-icon v-if="formData.groupType === ''" name="warning" />
              </ds-chip>
            </ds-text>
          </ds-space>

          <!-- goal -->
          <ds-space margin-top="large">
            <ds-input
              :label="$t('group.goal')"
              v-model="formData.goal"
              :placeholder="$t('group.goal') + ' …'"
              name="goal"
              rows="3"
            />
          </ds-space>

          <!-- description -->
          <ds-space margin-top="large">
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
            <ds-text align="right">
              <ds-chip size="base" :color="errors && errors.description && 'danger'">
                {{ `${descriptionLength} / ${formSchema.description.min}` }}
                <base-icon v-if="errors && errors.description" name="warning" />
              </ds-chip>
            </ds-text>
          </ds-space>

          <!-- actionRadius -->
          <ds-space margin-top="large">
            <ds-text class="select-label">
              {{ $t('group.actionRadius') }}
            </ds-text>
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
            <ds-text align="right">
              <ds-chip size="base" :color="formData.actionRadius === '' ? 'danger' : 'medium'">
                <base-icon v-if="formData.actionRadius === ''" name="warning" />
              </ds-chip>
            </ds-text>
          </ds-space>

          <!-- location -->
          <ds-space margin-top="large">
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
          </ds-space>

          <!-- category -->
          <ds-space margin-top="large">
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
          </ds-space>
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
    const { name, slug, groupType, goal, description, actionRadius, locationName, categories } =
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
        goal: goal || '',
        description: description || '',
        locationName: locationName || '',
        actionRadius: actionRadius || '',
        categoryIds: categories ? categories.map((category) => category.id) : [],
      },
      formSchema: {
        name: { required: true, min: NAME_LENGTH_MIN, max: NAME_LENGTH_MAX },
        slug: { required: false, min: NAME_LENGTH_MIN },
        groupType: { required: true },
        goal: { required: false },
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
      const { name, goal, description, groupType, actionRadius, locationName, categoryIds } =
        this.formData
      const variables = {
        name,
        goal,
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

ds-chip {
  position: absolute;
  right: 0px;
}
</style>
