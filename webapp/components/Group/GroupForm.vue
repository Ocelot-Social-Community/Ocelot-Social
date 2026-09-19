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
          hide-error
          @blur="dirtyFields.name && touchField('name')"
        />
        <os-validation-hint
          :count="formData.name.length"
          :min="formSchema.name.min"
          :max="formSchema.name.max"
          :variant="visibleErrors && visibleErrors.name ? 'error' : null"
          :text="nameErrorText"
        />

        <!-- group Slug -->
        <ocelot-input
          v-if="update"
          :label="$t('group.labelSlug')"
          model="slug"
          prefix="&amp;"
          hide-error
          @blur="dirtyFields.slug && touchField('slug')"
        ></ocelot-input>
        <os-validation-hint
          v-if="update"
          :variant="visibleErrors && visibleErrors.slug ? 'error' : null"
          :text="visibleErrors && visibleErrors.slug"
        />

        <div v-if="update" class="ds-mb-base"></div>

        <!-- groupType -->
        <p class="ds-text select-label">
          {{ $t('group.type') }}
        </p>
        <div
          class="select-wrap"
          :class="{
            'ds-input-has-error':
              visibleErrors && visibleErrors.groupType && formData.groupType === '',
          }"
        >
          <select
            class="select ds-input appearance--auto"
            name="groupType"
            model="groupType"
            :value="formData.groupType"
            :disabled="update && (!group || group.myRole !== 'owner')"
            @change="changeGroupType($event)"
            @blur="touchField('groupType')"
          >
            <option
              v-for="groupType in groupTypeOptions"
              :key="groupType"
              :value="groupType"
              :disabled="groupType !== group.groupType && !$can(`group.create_${groupType}`)"
            >
              {{ $t(`group.typesOptions.${groupType}`) }}
            </option>
          </select>
        </div>
        <os-validation-hint
          v-if="visibleErrors && visibleErrors.groupType && formData.groupType === ''"
          variant="error"
          :text="$t('group.validations.groupTypeRequired')"
        />

        <!-- showMembers -->
        <div class="show-members-control">
          <input
            id="show-members"
            type="checkbox"
            :checked="effectiveShowMembers"
            :disabled="formData.groupType !== 'closed'"
            @change="updateFormField('showMembers', $event.target.checked)"
          />
          <label for="show-members" :class="{ 'is-disabled': formData.groupType !== 'closed' }">
            {{ $t('group.showMembers') }}
          </label>
        </div>

        <!-- goal -->
        <ocelot-input name="about" :label="$t('group.goal')" v-model="formData.about" rows="3" />

        <div class="ds-mb-base"></div>

        <!-- description -->
        <p class="ds-text select-label">
          {{ $t('group.description') }}
        </p>
        <div :class="{ 'ds-input-has-error': visibleErrors && visibleErrors.description }">
          <editor
            name="description"
            model="description"
            :users="null"
            :value="formData.description"
            :hashtags="null"
            @input="updateEditorDescription"
            @blur.native.capture="dirtyFields.description && touchField('description')"
          />
        </div>
        <os-validation-hint
          :count="descriptionLength"
          :variant="visibleErrors && visibleErrors.description ? 'error' : null"
          :text="visibleErrors && visibleErrors.description"
        />

        <!-- actionRadius -->
        <p class="ds-text select-label">
          {{ $t('group.actionRadius') }}
        </p>
        <div
          class="select-wrap action-radius-wrap"
          :class="{
            'ds-input-has-error':
              visibleErrors && visibleErrors.actionRadius && formData.actionRadius === '',
          }"
        >
          <action-radius-select
            v-model="formData.actionRadius"
            @change.native="changeActionRadius($event)"
            @blur.native="touchField('actionRadius')"
          />
        </div>
        <os-validation-hint
          v-if="visibleErrors && visibleErrors.actionRadius && formData.actionRadius === ''"
          variant="error"
          :text="$t('group.validations.actionRadiusRequired')"
        />

        <!-- location -->
        <location-select
          :value="formData.locationName"
          :types="groupLocationTypes"
          :show-previous-location="false"
          @input="onLocationSelectInput"
        />
        <p
          v-if="previousLocationName"
          class="ds-text ds-text-soft ds-text-size-small previous-location-hint"
        >
          {{ $t('group.previousLocation', { location: previousLocationName }) }}
        </p>
        <location-picker-map
          :location="formData.locationName"
          precision="resolved"
          :types="groupLocationTypes"
          marker-color-token="--color-map-marker-group"
          @input="onLocationPickerMapInput"
        />

        <div class="ds-mb-base"></div>

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
          <os-validation-hint
            :count="formData.categoryIds.length"
            :max="3"
            :variant="visibleErrors && visibleErrors.categoryIds ? 'error' : null"
            :text="visibleErrors && visibleErrors.categoryIds"
          />
        </div>
        <!-- submit -->
        <div class="buttons ds-mt-large ds-mb-large">
          <os-button as="nuxt-link" to="/groups" variant="primary" appearance="outline">
            {{ $t('actions.cancel') }}
          </os-button>
          <os-button
            variant="primary"
            appearance="filled"
            type="submit"
            :loading="loading"
            :disabled="loading"
            :class="{ 'permission-denied': submitVisuallyDenied }"
            :aria-disabled="submitVisuallyDenied"
            v-tooltip="{
              content: submitDeniedHint,
            }"
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
import { OsButton, OsIcon, OsValidationHint } from '@ocelot-social/ui'
import { branding } from '@ocelot-social/branding'
import { iconRegistry } from '~/utils/iconRegistry'
import CategoriesSelect from '~/components/CategoriesSelect/CategoriesSelect'
import Editor from '~/components/Editor/Editor'
import ActionRadiusSelect from '~/components/Select/ActionRadiusSelect'
import LocationSelect from '~/components/Select/LocationSelect'
import LocationPickerMap from '~/components/Map/LocationPickerMap'
import GetCategories from '~/mixins/getCategoriesMixin.js'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

// Shared by both the location-select text search and the location-picker-map
// below it, so a group's location can land on a city district — deliberately
// coarser than an event's exact pin, but not so coarse it only ever offers a
// city as a whole. Both 'neighborhood' and 'locality' are listed since which
// one Mapbox actually uses for a given city's districts varies: German
// Stadtteile (Hamburg's Ottensen, Berlin's Kreuzberg) come back under
// 'locality', not 'neighborhood', verified directly against the API.
const GROUP_LOCATION_TYPES = 'neighborhood,locality,place,region,country'

export default {
  name: 'GroupForm',
  mixins: [GetCategories, formValidation],
  components: {
    CategoriesSelect,
    Editor,
    ActionRadiusSelect,
    LocationSelect,
    LocationPickerMap,
    OsButton,
    OsIcon,
    OsValidationHint,
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
    const {
      name,
      slug,
      groupType,
      about,
      description,
      actionRadius,
      locationName,
      categories,
      showMembers,
    } = this.group
    const initialCategoryIds = categories ? categories.map((category) => category.id) : []
    return {
      disabled: false,
      loading: false,
      groupTypeOptions: ['public', 'closed', 'hidden'],
      loadingGeo: false,
      cities: [],
      // Whether the location has actually been changed by the user (map
      // drag/click, or picking/typing a new one in the search box) — as
      // opposed to LocationSelect's own auto-resolve of the group's already-
      // saved locationName into a normalized object right on mount (e.g.
      // "Hamburg" -> "Hamburg, Germany"). Without this, previousLocationName
      // below would compare that normalized text against the raw saved
      // string and show the hint immediately, even though nothing was
      // actually picked yet.
      locationChangedByUser: false,
      // The auto-resolve above only ever fires once, and only when there
      // was already a saved locationName to resolve — with nothing saved,
      // every location-select input from the very start is a genuine pick.
      ignoreNextLocationInput: !!locationName,
      // The location as of the last successful save — starts as the
      // group's own saved value, and is refreshed to match whatever was
      // just saved after each further save (see submit()'s done callback).
      // Read instead of this.group.locationName directly in
      // previousLocationName below because the group prop itself doesn't
      // necessarily update after a save (no refetch/navigation happens —
      // the user just stays on the same edit form), so without this the
      // hint would keep comparing against the value from when the form was
      // first opened and never clear once saved.
      savedLocationName: locationName || '',
      formData: {
        name: name || '',
        slug: slug || '',
        groupType: groupType || '',
        about: about || '',
        description: description || '',
        locationName: locationName || '',
        actionRadius: actionRadius || '',
        categoryIds: [...initialCategoryIds],
        showMembers: showMembers ?? false,
      },
      formSchema: {
        name: {
          required: true,
          min: branding.group.nameLengthMin,
          max: branding.group.nameLengthMax,
        },
        slug: {
          type: 'string',
          // Only rendered/editable in update mode (see the template's
          // v-if="update") — on create, formData.slug stays empty and the
          // backend derives a fresh one from the name instead, so it must
          // stay optional there or an untouched create form could never
          // be submitted.
          required: this.update,
          min: branding.group.nameLengthMin,
          validator: (_, value = '') => {
            if (!this.update) return []
            if (!value.trim()) {
              return [new Error(this.$t('group.validations.slugNotEmpty'))]
            }
            // Mirrors the backend's own slug pattern (db/schema/entities/patterns.ts'
            // SLUG) — without this, an invalid value typed here only surfaces as a
            // generic save failure after the round trip to the server.
            if (!/^[a-z0-9_-]+$/.test(value)) {
              return [new Error(this.$t('group.validations.slugInvalidCharacters'))]
            }
            return []
          },
        },
        groupType: { required: true, min: 1 },
        about: { required: false },
        description: {
          type: 'string',
          required: true,
          min: branding.group.descriptionMinLength,
          validator: (_, value = '') => {
            const plainText = this.$filters.removeHtml(value)
            if (plainText.length < this.formSchema.description.min) {
              // Same empty-vs-too-short distinction as nameErrorText: someone who
              // typed a few characters did enter a description, so telling them
              // to "enter a description" (descriptionNotEmpty) would be wrong —
              // only a genuinely empty field gets that message.
              // A bare new Error() (no message) leaves formErrors.description as
              // '' — falsy, so a plain `visibleErrors && visibleErrors.description`
              // check (the validation hint's :text binding) never actually fires.
              return [
                new Error(
                  plainText.trim()
                    ? this.$t('group.validations.descriptionLength', {
                        min: this.formSchema.description.min,
                      })
                    : this.$t('group.validations.descriptionNotEmpty'),
                ),
              ]
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
              (value.length < branding.category.min || value.length > branding.category.max)
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
    groupLocationTypes() {
      return GROUP_LOCATION_TYPES
    },
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
    // LocationSelect and LocationPickerMap both already resolve lat/lng
    // (via forward/reverse geocoding) alongside the label when a search
    // result or map pin is picked — a plain string here means the field
    // still holds unresolved/typed text, no coordinates to send yet.
    formLocationCoordinates() {
      const locationValue = this.formData.locationName
      const hasCoordinates =
        typeof locationValue === 'object' &&
        locationValue !== null &&
        typeof locationValue.lat === 'number' &&
        typeof locationValue.lng === 'number'
      return hasCoordinates ? { lat: locationValue.lat, lng: locationValue.lng } : null
    },
    // The group's originally saved location — shown as a small note next to
    // the field while editing, but only once the user has actually changed
    // it to something else (so opening the form without touching the
    // location shows nothing — locationChangedByUser guards against
    // LocationSelect's own mount-time auto-resolve of the saved value
    // otherwise counting as a change; see its own doc comment above).
    // Meaningless on create, where nothing was ever saved yet —
    // LocationSelect's own built-in "previous value" caption is turned off
    // entirely for that same reason (see template); it only ever echoed the
    // CURRENT value, not a genuine prior one.
    previousLocationName() {
      if (!this.update || !this.locationChangedByUser) return null
      const original = this.savedLocationName
      if (!original || original === this.formLocationName) return null
      return original
    },
    descriptionLength() {
      return this.$filters.removeHtml(this.formData.description).length
    },
    nameErrorText() {
      if (!this.visibleErrors?.name) return null
      return !this.formData.name.trim()
        ? this.$t('group.validations.nameNotEmpty')
        : this.$t('group.validations.nameLength', {
            min: this.formSchema.name.min,
            max: this.formSchema.name.max,
          })
    },
    // Flat per-type create rights (mirrors the backend group.create_* shield): the
    // "create group" entry point is open if the user may create at least one type, and
    // the submit gate keys off the currently selected type.
    canCreateAnyGroup() {
      return this.groupTypeOptions.some((type) => this.$can(`group.create_${type}`))
    },
    // Switching an existing group TO hidden additionally needs
    // group.create_hidden (the privacy-raising transition); editing an
    // already-hidden group is fine. Mirrors onSubmit's own guard below —
    // shared so the visually-denied button state can't drift out of sync
    // with what onSubmit actually blocks (it used to: canCreateSelectedGroup
    // short-circuited to true for every edit, so this specific denial left
    // the submit button looking fully enabled while clicking it silently
    // did nothing).
    canSubmitHiddenTransition() {
      if (this.formData.groupType !== 'hidden' || this.group.groupType === 'hidden') return true
      return this.$can('group.create_hidden')
    },
    canCreateSelectedGroup() {
      if (this.update) return this.canSubmitHiddenTransition
      // No type chosen yet (e.g. the form was just opened) — checking
      // `group.create_` (an empty suffix, matching no real permission)
      // would wrongly flag "denied" for someone who can create every
      // type, just hasn't picked one. Fall back to "can create at least
      // one type" until they do.
      if (!this.formData.groupType) return this.canCreateAnyGroup
      return this.$can(`group.create_${this.formData.groupType}`) && this.canSubmitHiddenTransition
    },
    effectiveShowMembers() {
      if (this.formData.groupType === 'public') return true
      if (this.formData.groupType === 'hidden') return false
      return this.formData.showMembers
    },
    // Exposed (via $refs) for the page component's own beforeRouteLeave
    // guard, and used below for the native beforeunload prompt. dirtyFields
    // covers every field wired through updateFormField()/$parentForm.update
    // (name, slug, groupType, about, description, actionRadius, showMembers,
    // categoryIds) — locationChangedByUser covers the location field
    // separately, since it's set directly rather than through
    // updateFormField (see onLocationSelectInput/onLocationPickerMapInput;
    // it already excludes LocationSelect's own mount-time auto-resolve of
    // an already-saved value, which dirtyFields has no equivalent for).
    hasUnsavedChanges() {
      return Object.keys(this.dirtyFields).length > 0 || this.locationChangedByUser
    },
    // Same grey-but-still-clickable treatment the submit button already
    // uses for a missing permission (see canCreateSelectedGroup) — not an
    // actual :disabled, deliberately: hasUnsavedChanges only tracks whether
    // something was TOUCHED, not whether it truly differs from what's
    // saved, so a gap in that tracking (a future field that forgets to wire
    // itself up, the way the location and showMembers ones once did) must
    // never make a real save unreachable. Worst case here is an invitingly-
    // styled click that just re-saves the same values — never a blocked one.
    submitVisuallyDenied() {
      return !this.canCreateSelectedGroup || (this.update && !this.hasUnsavedChanges)
    },
    submitDeniedHint() {
      if (!this.canCreateSelectedGroup) return this.$t('permissions.deniedHint')
      if (this.update && !this.hasUnsavedChanges) return this.$t('group.noChangesHint')
      return ''
    },
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    window.addEventListener('beforeunload', this.onBeforeUnload)
  },
  beforeDestroy() {
    window.removeEventListener('beforeunload', this.onBeforeUnload)
  },
  methods: {
    onBeforeUnload(event) {
      if (!this.hasUnsavedChanges) return
      // Browsers show their own fixed wording here for security reasons —
      // setting returnValue (the legacy way to opt in) is what triggers it;
      // the actual string is ignored by every modern browser.
      event.preventDefault()
      event.returnValue = ''
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
      } else {
        this.locationChangedByUser = true
      }
      this.formData.locationName = location
    },
    updateEditorDescription(value) {
      this.updateFormField('description', value)
    },
    onSubmit() {
      // Block creating a group of a type the user may not create (the button is grayed;
      // this also guards keyboard Enter and direct navigation to the form). Only once a
      // type is actually chosen — same fix as canCreateSelectedGroup: checking
      // `$can('group.create_')` (empty suffix) for an untouched, still-empty groupType
      // is never true for anyone, so this used to silently block every submit attempt
      // on a fresh form (no validation, no toast, nothing) even for an admin who can
      // create every type. Submitting with no type chosen should fall through to
      // formSubmit() instead, so the schema's own "groupType is required" catches it
      // and shows the usual error + toast like any other invalid field.
      if (
        !this.update &&
        this.formData.groupType &&
        !this.$can(`group.create_${this.formData.groupType}`)
      )
        return
      // Switching an existing group TO hidden additionally needs group.create_hidden
      // (the privacy-raising transition) — see canSubmitHiddenTransition, shared with
      // the visually-denied button state so the two can't drift apart again.
      if (!this.canSubmitHiddenTransition) return
      this.formSubmit(this.submit, () => {
        this.$toast.error(this.$t('common.validations.formHasErrors'))
      })
    },
    submit() {
      this.loading = true
      const { name, slug, about, description, groupType, actionRadius, categoryIds } = this.formData
      const variables = {
        name,
        slug,
        groupType,
        about,
        description,
        actionRadius,
        locationName: this.formLocationName,
        lat: this.formLocationCoordinates?.lat ?? null,
        lng: this.formLocationCoordinates?.lng ?? null,
        categoryIds,
        showMembers: this.effectiveShowMembers,
      }
      // Snapshot exactly what's being submitted — submit() to done() is a
      // real network round-trip (not instantaneous), so the user may touch
      // the form again while the mutation is still in flight. done(true)
      // below must only clear a field if its value still matches what THIS
      // submit actually sent — a bare key snapshot isn't enough: if an
      // already-dirty field (e.g. "name", already in dirtyFields at submit
      // time) gets edited AGAIN before done() runs, its key was already
      // "part of this submit" even though the newer value never got sent,
      // so it must stay dirty rather than being wiped out alongside the
      // fields that really were saved. JSON.stringify sidesteps reference
      // inequality for array/object fields (e.g. categoryIds) that get
      // re-assigned a new-but-equal-content array on every edit.
      const submittedFieldValues = Object.keys(this.dirtyFields).reduce((snapshot, key) => {
        snapshot[key] = JSON.stringify(this.formData[key])
        return snapshot
      }, {})
      const submittedLocationName = this.formLocationName
      // pages/groups/edit/_id/index.vue calls this with `true` once the
      // mutation actually succeeds (nothing on failure) — the edit form
      // stays open afterwards rather than navigating away, so without this
      // the previous-location hint above would keep comparing against the
      // value from when the form was first opened and never clear once the
      // new one is actually saved.
      const done = (success) => {
        this.loading = false
        if (success) {
          // Only clear fields whose current value still matches the
          // snapshot — see the comment above. Anything changed again since
          // (whether newly dirtied or re-edited) stays dirty.
          Object.keys(submittedFieldValues).forEach((key) => {
            if (JSON.stringify(this.formData[key]) === submittedFieldValues[key]) {
              this.$delete(this.dirtyFields, key)
            }
          })
          if (this.formLocationName === submittedLocationName) {
            this.savedLocationName = submittedLocationName
            this.locationChangedByUser = false
          }
        }
      }
      this.update
        ? this.$emit('updateGroup', { ...variables, id: this.group.id }, done)
        : this.$emit('createGroup', variables, done)
    },
  },
}
</script>

<style>
.appearance--auto {
  -webkit-appearance: auto;
  -moz-appearance: auto;
  appearance: auto;
}

.select-label {
  margin-bottom: 0;
  padding-bottom: 4px;
  color: var(--color-neutral-40);
  font-size: 1rem;
}

.textarea-label {
  padding-bottom: 14px;
}

/* Editor's own margin-top lives on .editor-content (the space between its
   own toolbar and the text area) — same override ContributionForm.vue
   uses for its own description-style editor field, matched to the
   label's own gap above the toolbar rather than the component's larger
   default. */
.group-form .select-label + div .editor-content {
  margin-top: var(--space-x-small);
}

.group-form {
  display: flex;
  flex-direction: column;

  > .show-members-control {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-x-small);
    margin-top: var(--space-x-small);
    margin-bottom: var(--space-base);

    label.is-disabled {
      opacity: 0.5;
    }
  }

  > .ds-form-item {
    margin: 0;
  }

  /* Same zeroed margin as .ds-form-item above (OcelotInput's own root) —
     without it, the groupType/actionRadius selects sat noticeably further
     from their validation hint below than name/description do, since
     those two are the only fields wrapped in an extra div (for the
     ds-input-has-error red border; see the template) and that div had no
     margin reset of its own. */
  > .select-wrap {
    margin: 0;
  }

  /* Unlike groupType's select-wrap (whose next sibling is the checkbox and
     stays deliberately tight, handled above), actionRadius's next sibling
     is the next field group (location) and should keep the same
     space-base gap every other field-to-field transition uses — there is
     no explicit spacer div for it any more (see template). */
  > .action-radius-wrap {
    margin-bottom: var(--space-base);
  }

  /* ...unless the hint is actually showing: then the tight field+hint gap
     (the hint's own 4px top margin) is what should apply here instead, and
     the space-base gap to the next field comes from the hint's own
     margin-bottom below. Without this, the two would add up and push the
     hint away from its select. */
  > .action-radius-wrap:has(+ .os-validation-hint) {
    margin-bottom: 0;
  }

  > .os-validation-hint {
    margin-bottom: var(--space-base);
    cursor: default;
  }

  /* .show-members-control's own margin-top (8px, above) assumes it's
     sitting right after the groupType select directly. When the select's
     validation hint is showing instead (error state), that hint's own
     margin-bottom (16px, from the rule above — meant for the general case
     of one field's hint to the next field) adds to those 8px instead of
     collapsing with them (flex containers never collapse sibling
     margins), pulling the checkbox noticeably further down than in the
     no-error case. Cancel just the hint's margin here so the gap stays
     the same small size either way. */
  > .os-validation-hint + .show-members-control {
    margin-top: calc(var(--space-x-small) - var(--space-base));
  }

  /* Same double-margin problem as above, one field over: the slug field's
     own space-base spacer div (see template) assumes it sits right after
     the input — when the slug hint renders between them instead (error
     state), its own margin-bottom already provides that gap, so the
     spacer's identical margin would otherwise just add another one on
     top. */
  > .os-validation-hint + .ds-mb-base {
    margin-bottom: 0;
  }

  /* :not(.os-validation-hint) — without it, this ALSO matches
     os-validation-hint's own root div directly (it's a bare <div> too,
     for the fields not wrapped in an extra one, e.g. name/description):
     matches both this selector and the .os-validation-hint rule above at
     equal specificity for shared properties, but this one is MORE
     specific overall (div + two :not()s beats a single class), so ITS
     flex-direction: column silently won over the component's own default
     row layout — stacking the message and the count/icon badge instead of
     spreading them left/right across the row. Not something
     ContributionForm.vue hits: its fields sit inside plain-block
     os-card__content, not a div matched by a rule like this one. */
  > div:not(.buttons):not(.show-members-control):not(.os-validation-hint) {
    display: flex;
    flex-direction: column;

    > .os-validation-hint {
      margin-bottom: var(--space-base);
      cursor: default;
    }
  }

  > .select-field {
    align-self: flex-end;
  }

  /* Tight to the field it's a note about, same as a validation hint would
     be — overrides .ds-text's own sizeable default margin-bottom (1em),
     which would otherwise push the map down further than intended. */
  > .previous-location-hint {
    margin-top: var(--space-xxx-small);
    margin-bottom: var(--space-x-small);
  }

  /* Tight coupling to the location field it belongs to — same value
     ContributionForm.vue uses for its own LocationSelect+LocationPickerMap
     pairing. The following ds-mb-base spacer (see template) still provides
     the usual gap from here to the next field group. Also the gap used when
     .previous-location-hint (above) isn't rendered, so the map still sits
     close to location-select either way. */
  > .location-picker-map {
    margin-top: var(--space-small);
  }

  > .buttons {
    align-self: flex-end;
    margin-top: var(--space-base);
    display: flex;
    gap: var(--space-small);
  }

  > .location-hint {
    margin-top: calc(-1 * var(--space-base) + var(--space-xxx-small));
  }
}
</style>
