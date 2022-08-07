<template>
  <div class="group-teaser">
    Group Teaser

    <ds-grid-item :row-span="2" column-span="fullWidth">
      <ds-space centered>
        <nuxt-link :to="{ name: 'group-create' }">
          <base-button
            v-tooltip="{
              content: $t('group.newGroup'),
              placement: 'left',
              delay: { show: 500 },
            }"
            :path="{ name: 'group-create' }"
            class="profile-post-add-button"
            icon="plus"
            circle
            filled
          />
        </nuxt-link>
      </ds-space>
    </ds-grid-item>
  </div>
</template>
