<template>
  <div>
    <!-- Wolle <ds-input
      id="editName"
      model="organisationName"
      type="text"
      :placeholder="$t('settings.XXX.placeholder')"
    />
    <ds-input
      id="editSlug"
      model="organisationSlug"
      type="text"
      :placeholder="$t('settings.XXX.placeholder')"
    /> -->
    <profile-core-data :org="org" />
  </div>
</template>

<script>
import ProfileCoreData from '~/components/_new/features/ProfileCoreData/ProfileCoreData'

export default {
  name: 'EditOrganisation',
  // Wolle props: {
  //   item: {
  //     type: Object,
  //     default: () => ({}),
  //   },
  // },
  Components: {
    ProfileCoreData,
  },
  props: {
    org: { type: Object, required: true },
  },
}
</script>
