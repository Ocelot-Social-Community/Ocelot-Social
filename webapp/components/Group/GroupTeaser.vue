<template>
  <nuxt-link
    class="group-teaser"
    :to="{ name: 'group-id-slug', params: { id: group.id, slug: group.slug } }"
  >
    <base-card
      :class="{
        'disabled-content': group.disabled,
      }"
    >
      <h2 class="title hyphenate-text">{{ group.name }}</h2>
      <div class="slug-location">
        <!-- group slug -->
        <div>
          <ds-text color="soft">
            <base-icon name="at" />
            {{ group.slug }}
          </ds-text>
        </div>
        <!-- group location -->
        <div class="location-item">
          <ds-text v-if="group && group.location" color="soft">
            <base-icon name="map-marker" />
            {{ group && group.location ? group.location.name : '' }}
          </ds-text>
        </div>
      </div>
      <!-- TODO: replace editor content with tiptap render view -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="content hyphenate-text" v-html="descriptionExcerpt" />
      <footer class="footer">
        <div>
          <!-- group my role in group -->
          <ds-chip v-if="group && group.myRole" color="primary">
            {{ group && group.myRole ? $t('group.roles.' + group.myRole) : '' }}
          </ds-chip>
          <!-- group type -->
          <ds-chip color="primary">
            {{ group && group.groupType ? $t('group.types.' + group.groupType) : '' }}
          </ds-chip>
          <!-- group action radius -->
          <ds-chip color="primary">
            {{ group && group.actionRadius ? $t('group.actionRadii.' + group.actionRadius) : '' }}
          </ds-chip>
        </div>
        <!-- group categories -->
        <div class="categories" v-if="categoriesActive">
          <category
            v-for="category in group.categories"
            :key="category.id"
            v-tooltip="{
              content: $t(`contribution.category.description.${category.slug}`),
              placement: 'bottom-start',
            }"
            :icon="category.icon"
          />
        </div>
        <div v-else class="categories-placeholder"></div>
        <!-- group context menu -->
        <client-only>
          <group-content-menu :usage="'groupTeaser'" :group="group || {}" placement="bottom-end" />
        </client-only>
      </footer>
      <footer class="footer">
        <!-- group goal -->
        <div class="labeled-chip">
          <ds-text class="label-text hyphenate-text" color="soft" size="small">
            {{ $t('group.goal') }}
          </ds-text>
          <div class="chip">
            <ds-chip v-if="group && group.about">{{ group ? group.about : '' }}</ds-chip>
          </div>
        </div>
      </footer>
    </base-card>
  </nuxt-link>
</template>

<script>
import Category from '~/components/Category'
import GroupContentMenu from '~/components/ContentMenu/GroupContentMenu'

export default {
  name: 'GroupTeaser',
  components: {
    Category,
    GroupContentMenu,
  },
  props: {
    group: {
      type: Object,
      required: true,
    },
    width: {
      type: Object,
      default: () => {},
    },
  },
  data() {
    return {
      categoriesActive: this.$env.CATEGORIES_ACTIVE,
    }
  },
  computed: {
    descriptionExcerpt() {
      return this.$filters.removeLinks(this.group.descriptionExcerpt)
    },
  },
}
</script>

<style lang="scss" scoped>
.group-teaser,
.group-teaser:hover,
.group-teaser:active {
  position: relative;
  display: block;
  height: 100%;
  color: $text-color-base;

  > .ribbon {
    position: absolute;
    top: 50%;
    right: -7px;
  }
}

.group-teaser > .base-card {
  display: flex;
  flex-direction: column;
  height: 100%;

  > .title {
    font-size: 32px;
  }

  > .slug-location {
    display: flex;
    margin-bottom: $space-small;

    > .location-item {
      margin-left: $space-small;
    }
  }

  > .content {
    flex-grow: 1;
    margin-bottom: $space-small;
  }

  > .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    > .categories-placeholder {
      flex-grow: 1;
    }

    > .labeled-chip {
      margin-top: $space-xx-small;

      > .chip {
        margin-top: -$space-small + $space-x-small;
      }
    }

    > .content-menu {
      position: relative;
      z-index: $z-index-post-teaser-link;
    }
  }

  .user-teaser {
    margin-bottom: $space-small;
  }
}
</style>
