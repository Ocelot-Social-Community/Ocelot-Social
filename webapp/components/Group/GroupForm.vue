<template>
  <div>
    <form class="group-form" @submit.prevent="onSubmit" novalidate>
      <template>
        <!-- group Name -->
        <ocelot-input
          name="name"
          :label="$t('group.name')"
          model="name"
          autofocus
          :placeholder="`${$t('group.name')} …`"
        />
        <os-badge
          role="status"
          aria-live="polite"
          :variant="formErrors && formErrors.name ? 'danger' : undefined"
        >
          {{ `${formData.name.length} / ${formSchema.name.min}–${formSchema.name.max}` }}
          <os-icon v-if="formErrors && formErrors.name" :icon="icons.warning" />
        </os-badge>

        <!-- group Slug -->
        <ocelot-input
          v-if="update"
          :label="$t('group.labelSlug')"
          model="slug"
          icon="at"
          :placeholder="`${$t('group.labelSlug')} …`"
        ></ocelot-input>

        <div v-if="update" class="ds-mt-small ds-mb-large"></div>

        <!-- groupType -->
        <p class="ds-text select-label">
          {{ $t('group.type') }}
        </p>
        <select
          class="select ds-input appearance--auto"
          name="groupType"
          model="groupType"
          :value="formData.groupType"
          :disabled="update"
          @change="changeGroupType($event)"
        >
          <option v-for="groupType in groupTypeOptions" :key="groupType" :value="groupType">
            {{ $t(`group.typesOptions.${groupType}`) }}
          </option>
        </select>
        <os-badge
          role="status"
          aria-live="polite"
          :variant="
            formErrors && formErrors.groupType && formData.groupType === '' ? 'danger' : undefined
          "
        >
          {{ `${formData.groupType === '' ? 0 : 1} / 1` }}
          <os-icon
            v-if="formErrors && formErrors.groupType && formData.groupType === ''"
            :icon="icons.warning"
          />
        </os-badge>

        <!-- goal -->
        <ocelot-input
          name="about"
          :label="$t('group.goal')"
          v-model="formData.about"
          :placeholder="$t('group.goal') + ' …'"
          rows="3"
        />

        <div class="ds-mt-small ds-mb-large"></div>

        <!-- description -->
        <p class="ds-text select-label">
          {{ $t('group.description') }}
        </p>
        <editor
          name="description"
          model="description"
          :users="null"
          :value="formData.description"
          :hashtags="null"
          @input="updateEditorDescription"
        />
        <os-badge
          role="status"
          aria-live="polite"
          :variant="formErrors && formErrors.description ? 'danger' : undefined"
        >
          {{ `${descriptionLength} / ${formSchema.description.min}` }}
          <os-icon v-if="formErrors && formErrors.description" :icon="icons.warning" />
        </os-badge>

        <!-- actionRadius -->
        <p class="ds-text select-label">
          {{ $t('group.actionRadius') }}
        </p>
        <action-radius-select
          v-model="formData.actionRadius"
          @change.native="changeActionRadius($event)"
        />
        <os-badge
          role="status"
          aria-live="polite"
          :variant="
            formErrors && formErrors.actionRadius && formData.actionRadius === ''
              ? 'danger'
              : undefined
          "
        >
          {{ `${formData.actionRadius === '' ? 0 : 1} / 1` }}
          <os-icon
            v-if="formErrors && formErrors.actionRadius && formData.actionRadius === ''"
            :icon="icons.warning"
          />
        </os-badge>

        <!-- location -->
        <location-select v-model="formData.locationName" />

        <div class="ds-mt-small ds-mb-large"></div>

        <!-- category -->
        <div v-if="categoriesActive">
          <p class="ds-text select-label">
            {{ $t('group.categoriesTitle') }}
          </p>

          <categories-select
            model="categoryIds"
            name="categoryIds"
            :existingCategoryIds="formData.categoryIds"
          />
          <os-badge
            role="status"
            aria-live="polite"
            :variant="formErrors && formErrors.categoryIds ? 'danger' : undefined"
          >
            {{ formData.categoryIds.length }} / 3
            <os-icon v-if="formErrors && formErrors.categoryIds" :icon="icons.warning" />
          </os-badge>
        </div>
        <!-- submit -->
        <div class="buttons ds-mt-large ds-mb-large">
          <os-button as="nuxt-link" to="/groups" variant="default" appearance="filled">
            {{ $t('actions.cancel') }}
          </os-button>
          <os-button
            variant="primary"
            appearance="filled"
            type="submit"
            :disabled="checkFormError(formErrors)"
          >
            <template #icon><os-icon :icon="icons.save" /></template>
            {{ update ? $t('group.update') : $t('group.save') }}
          </os-button>
        </div>
      </template>
    </form>
  </div>
</template>

<script>
import { OsBadge, OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import { CATEGORIES_MIN, CATEGORIES_MAX } from '~/constants/categories.js'
import {
  NAME_LENGTH_MIN,
  NAME_LENGTH_MAX,
  DESCRIPTION_WITHOUT_HTML_LENGTH_MIN,
} from '~/constants/groups.js'
import Editor from '~/components/Editor/Editor'
import ActionRadiusSelect from '~/components/Select/ActionRadiusSelect'
import LocationSelect from '~/components/Select/LocationSelect'
import GetCategories from '~/mixins/getCategoriesMixin.js'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  name: 'GroupForm',
  mixins: [GetCategories, formValidation],
  components: {
    CategoriesSelect,
    Editor,
    ActionRadiusSelect,
    LocationSelect,
    OsBadge,
    OsButton,
    OsIcon,
    OcelotInput,
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
      disabled: false,
      groupTypeOptions: ['public', 'closed', 'hidden'],
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
        groupType: { required: true, min: 1 },
        about: { required: false },
        description: {
          type: 'string',
          required: true,
          min: DESCRIPTION_WITHOUT_HTML_LENGTH_MIN,
          validator: (_, value = '') => {
            if (this.$filters.removeHtml(value).length < this.formSchema.description.min) {
              return [new Error()]
            }
            return []
          },
        },
        actionRadius: { required: true, min: 1 },
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
    descriptionLength() {
      return this.$filters.removeHtml(this.formData.description).length
    },
    sameLocation() {
      const dbLocationName = this.group.locationName || ''
      return dbLocationName === this.formLocationName
    },
    sameCategories() {
      if (this.group.categories.length !== this.formData.categoryIds.length) return false
      const groupCategories = []
      this.group.categories.forEach((categories) => {
        groupCategories.push(categories.id)
        const some = this.formData.categoryIds.some((item) => item === categories.id)
        if (!some) return false
      })

      return true
    },
    disableButtonByUpdate() {
      if (!this.update) return true
      return (
        this.group.name === this.formData.name &&
        this.group.slug === this.formData.slug &&
        this.group.about === this.formData.about &&
        this.group.description === this.formData.description &&
        this.group.actionRadius === this.formData.actionRadius &&
        this.sameLocation &&
        this.sameCategories
      )
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    checkFormError(error) {
      if (!this.update && error && !!error && this.disableButtonByUpdate) return true
      if (this.update && !error && this.disableButtonByUpdate) return true
      return false
    },
    changeGroupType(event) {
      this.updateFormField('groupType', event.target.value)
    },
    changeActionRadius(event) {
      this.updateFormField('actionRadius', event.target.value)
    },
    changeLocation(event) {
      this.formData.locationName = event.target.value
    },
    updateEditorDescription(value) {
      this.updateFormField('description', value)
    },
    onSubmit() {
      this.formSubmit(this.submit)
    },
    submit() {
      const { name, slug, about, description, groupType, actionRadius, categoryIds } = this.formData
      const variables = {
        name,
        slug,
        about,
        description,
        groupType,
        actionRadius,
        locationName: this.formLocationName,
        categoryIds,
      }
      this.update
        ? this.$emit('updateGroup', {
            ...variables,
            id: this.group.id,
          })
        : this.$emit('createGroup', variables)
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

.group-form {
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

  > div:not(.buttons) {
    display: flex;
    flex-direction: column;

    > .os-badge {
      align-self: flex-end;
      margin: $space-xx-small 0 $space-base;
      cursor: default;
    }
  }

  > .select-field {
    align-self: flex-end;
  }

  > .buttons {
    align-self: flex-end;
    margin-top: $space-base;
  }

  > .location-hint {
    margin-top: -$space-base + $space-xxx-small;
  }
}
</style>
