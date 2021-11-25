<template>
  <div>
    <ds-input
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
    />
  </div>
</template>

<script>
export default {
  name: 'EditOrganisation',
  // Wolle props: {
  //   item: {
  //     type: Object,
  //     default: () => ({}),
  //   },
  // },
}
</script>
