<template>
  <nuxt-link
    class="group-teaser"
    :to="{ name: 'groups-id-slug', params: { id: group.id, slug: group.slug } }"
    @click.native.capture="guardNavigation"
  >
    <os-card
      :class="{
        'disabled-content': group.disabled,
      }"
    >
      <h2 class="title hyphenate-text">{{ group.name }}</h2>
      <div class="slug-location">
        <!-- group slug -->
        <div>
          <p class="ds-text ds-text-soft">
            {{ `&${group.slug}` }}
          </p>
        </div>
        <!-- group location -->
        <div class="location-item">
          <p class="ds-text ds-text-soft" v-if="group && group.location">
            <os-icon :icon="icons.mapMarker" />
            {{ group && group.location ? group.location.name : '' }}
          </p>
        </div>
      </div>
      <!-- TODO: replace editor content with tiptap render view -->
      <div class="content hyphenate-text">
        <!-- A fixed number of lines rather than the character-cut descriptionExcerpt:
             equally long excerpts render at wildly different heights depending on
             whether they start with a heading and a list or with a paragraph, and in
             a grid of cards that difference is what makes the rows ragged. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
          class="teaser-clamp"
          :style="{ '--group-teaser-lines': teaserLines }"
          v-html="descriptionWithoutLinks"
        />
      </div>
      <footer class="footer">
        <div>
          <!-- group my role in group -->
          <os-badge v-if="group && group.myRole" variant="primary">
            {{ group && group.myRole ? $t('group.roles.' + group.myRole) : '' }}
          </os-badge>
          <!-- group type -->
          <os-badge variant="primary">
            {{ group && group.groupType ? $t('group.types.' + group.groupType) : '' }}
          </os-badge>
          <!-- group action radius -->
          <os-badge variant="primary">
            {{ group && group.actionRadius ? $t('group.actionRadii.' + group.actionRadius) : '' }}
          </os-badge>
        </div>
        <!-- group categories -->
        <div
          class="categories"
          v-if="categoriesActive && group.categories && group.categories.length > 0"
        >
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
          <p class="ds-text ds-text-soft ds-text-size-small label-text hyphenate-text">
            {{ $t('group.goal') }}
          </p>
          <div class="chip">
            <os-badge v-if="group && group.about">{{ group.about }}</os-badge>
          </div>
        </div>
      </footer>
    </os-card>
  </nuxt-link>
</template>

<script>
import { OsBadge, OsCard, OsIcon } from '@ocelot-social/ui'
import { branding } from '@ocelot-social/branding'
import { iconRegistry } from '~/utils/iconRegistry'
import Category from '~/components/Category'
import GroupContentMenu from '~/components/ContentMenu/GroupContentMenu'
import GetCategories from '~/mixins/getCategoriesMixin.js'

export default {
  name: 'GroupTeaser',
  mixins: [GetCategories],
  components: {
    Category,
    GroupContentMenu,
    OsBadge,
    OsCard,
    OsIcon,
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
  created() {
    this.icons = iconRegistry
  },
  methods: {
    guardNavigation(event) {
      if (event.target.closest('.content-menu')) {
        event.preventDefault()
      }
    },
  },
  computed: {
    // removeLinks stays: the whole card is a <nuxt-link>, and an <a> inside an <a> is
    // invalid HTML. Only the anchors go — their text is kept.
    descriptionWithoutLinks() {
      return this.$filters.removeLinks(this.group.description)
    },
    teaserLines() {
      return String(branding.group.teaserDescriptionLines)
    },
  },
}
</script>

<style scoped>
.group-teaser,
.group-teaser:hover,
.group-teaser:active {
  position: relative;
  display: block;
  height: 100%;
  color: var(--text-color-base);

  > .ribbon {
    position: absolute;
    top: 50%;
    right: -7px;
  }
}

.group-teaser > .os-card {
  display: flex;
  flex-direction: column;
  height: 100%;

  > .title {
    font-size: 32px;
  }

  > .slug-location {
    display: flex;
    margin-bottom: var(--space-small);

    > .location-item {
      margin-left: var(--space-small);
    }
  }

  > .content {
    flex-grow: 1;
    margin-bottom: var(--space-small);
  }

  /* A fixed height, not a cap: the card has no "show more", so every teaser reserves
     the same space and the grid rows line up. A short description simply leaves the
     lower part empty — where the fade then has nothing to act on. */
  .teaser-clamp {
    height: calc(var(--group-teaser-lines) * var(--line-height-base) * 1em);
    overflow: hidden;
    mask-image: linear-gradient(to bottom, black calc(100% - 1.5em), transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 1.5em), transparent 100%);
  }

  > .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    > .categories-placeholder {
      flex-grow: 1;
    }

    > .labeled-chip {
      margin-top: var(--space-xx-small);

      > .chip {
        margin-top: calc(-1 * var(--space-small) + var(--space-x-small));
      }
    }

    > .content-menu {
      position: relative;
    }
  }

  .user-avatar {
    margin-bottom: var(--space-small);
  }
}
</style>
