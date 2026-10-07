<template>
  <!-- The edges fade where the list goes on — see scrollMaskStyle.
       mousedown.prevent: pressing the mouse on the list must not take the focus out of the editor,
       which hides the list (Editor.vue, onBlur) before the click on an entry lands. -->
  <ul
    v-show="showSuggestions"
    class="suggestion-list"
    :style="scrollMaskStyle"
    @scroll="updateScrollFades"
    @mousedown.prevent
  >
    <template v-for="(item, index) in filteredItems">
      <li
        v-if="startsRelation(index)"
        :key="`relation-${item.relation}`"
        class="suggestion-list__item hint"
      >
        {{ relationLabels[item.relation] }}
      </li>
      <li
        :key="item.id"
        class="suggestion-list__item"
        :class="{ 'is-selected': navigatedItemIndex === index }"
        @click="selectItem(item)"
      >
        <user-avatar
          v-if="isMention"
          :user="item"
          :link-to-profile="false"
          :show-popover="false"
          show-slug
          name-first
        />
        <template v-else>{{ createItemLabel(item) | truncate(50) }}</template>
      </li>
    </template>
    <template v-if="isHashtag">
      <li v-if="!query && !loading" class="suggestion-list__item hint">
        {{ $t('editor.hashtag.addLetter') }}
      </li>
    </template>
    <template v-else-if="isMention">
      <li v-if="!hasResults && !loading" class="suggestion-list__item hint">
        {{ $t('editor.mention.noUsersFound') }}
      </li>
    </template>
  </ul>
</template>

<script>
import { HASHTAG, MENTION } from '../../constants/editor'
import UserAvatar from '~/components/UserAvatar/UserAvatar'

// How far into the list an edge fades out when there is more to scroll to in that direction.
// The same size InfiniteScrollList (the follower lists) uses.
const SCROLL_FADE_SIZE = 56

export default {
  components: {
    UserAvatar,
  },
  props: {
    suggestionType: String,
    filteredItems: Array,
    // Suggestions are on their way: no "no users found" yet.
    loading: { type: Boolean, default: false },
    query: String,
    navigatedItemIndex: Number,
    selectItem: Function,
  },
  data() {
    return {
      canScrollUp: false,
      canScrollDown: false,
    }
  },
  updated() {
    this.$nextTick(this.updateScrollFades)
  },
  computed: {
    // The technique of InfiniteScrollList: a mask fades the list's own content to transparent at
    // whichever edge still has more to scroll to, and only there — a fade at an edge the list is
    // already scrolled to would promise entries that do not exist. `black` means "fully visible"
    // in a mask, it is not a colour.
    scrollMaskStyle() {
      const top = this.canScrollUp ? `${SCROLL_FADE_SIZE}px` : '0px'
      const bottom = this.canScrollDown ? `${SCROLL_FADE_SIZE}px` : '0px'
      const mask = `linear-gradient(to bottom, transparent, black ${top}, black calc(100% - ${bottom}), transparent)`
      return { maskImage: mask, WebkitMaskImage: mask }
    },
    hasResults() {
      return this.filteredItems.length > 0
    },
    isMention() {
      return this.suggestionType === MENTION
    },
    isHashtag() {
      return this.suggestionType === HASHTAG
    },
    showSuggestions() {
      return this.hasResults || (this.query && !this.loading)
    },
    // Spelled out rather than built from the relation, so the keys stay findable.
    relationLabels() {
      return {
        participant: this.$t('editor.mention.relation.participant'),
        groupMember: this.$t('editor.mention.relation.groupMember'),
        following: this.$t('editor.mention.relation.following'),
        follower: this.$t('editor.mention.relation.follower'),
        other: this.$t('editor.mention.relation.other'),
        usedByMe: this.$t('editor.hashtag.relation.usedByMe'),
        popular: this.$t('editor.hashtag.relation.popular'),
        // The entry that creates the typed tag — an item like the others, see withNewHashtag.
        new: this.$t('editor.hashtag.addHashtag'),
      }
    },
  },
  watch: {
    // The list scrolls; arrow keys must not move the highlight out of sight.
    navigatedItemIndex() {
      this.$nextTick(this.scrollToSelected)
    },
    filteredItems() {
      this.$nextTick(this.scrollToSelected)
    },
  },
  methods: {
    updateScrollFades() {
      const list = this.$el
      this.canScrollUp = list.scrollTop > 0
      // 1px tolerance for sub-pixel scroll position rounding.
      this.canScrollDown = list.scrollTop + list.clientHeight < list.scrollHeight - 1
    },
    // By hand rather than scrollIntoView(), which would also scroll the page when the popup
    // reaches beyond the viewport.
    scrollToSelected() {
      const list = this.$el
      const row = list.querySelector('.is-selected')
      if (!row) return
      // offsetTop counts from the list: it is the row's offsetParent (position: relative).
      const top = row.offsetTop
      const bottom = top + row.offsetHeight
      if (this.navigatedItemIndex === 0) {
        // All the way up, so the heading above the first entry stays readable.
        list.scrollTop = 0
      } else if (top - SCROLL_FADE_SIZE < list.scrollTop) {
        // Clear of the fading edge, not just inside the list: the highlighted entry is the one
        // that must stay readable. The browser clamps at either end of the list.
        list.scrollTop = top - SCROLL_FADE_SIZE
      } else if (bottom + SCROLL_FADE_SIZE > list.scrollTop + list.clientHeight) {
        list.scrollTop = bottom + SCROLL_FADE_SIZE - list.clientHeight
      }
      this.updateScrollFades()
    },
    // Suggestions come grouped by their relation to the writer; the first of each group gets a
    // heading — the same non-selectable "hint" row the hashtag menu always divided itself with.
    startsRelation(index) {
      const { relation } = this.filteredItems[index]
      if (!relation) return false
      return index === 0 || this.filteredItems[index - 1].relation !== relation
    },
    createItemLabel(item) {
      if (this.isMention) {
        return `@${item.slug}`
      } else {
        return `#${item.id}`
      }
    },
  },
}
</script>

<style>
.suggestion-list {
  list-style-type: none;
  padding: 0.2rem;
  border-radius: 5px;
  border: 2px solid var(--color-primary);
  font-size: 0.8rem;
  font-weight: bold;
  /* About six users; the rest is reached by scrolling. Relative for scrollToSelected(). */
  position: relative;
  max-height: min(22rem, 50vh);
  overflow-y: auto;
}

.suggestion-list__item {
  border-radius: 5px;
  padding: 0.2rem 0.5rem;
  margin-bottom: 0.2rem;
  cursor: pointer;

  &:last-child {
    margin-bottom: 0;
  }

  &.is-selected,
  &:hover {
    /*  color-mix, not rgba(): var(--color-neutral-100) is a var() and Sass cannot decompose one. */
    background-color: color-mix(in srgb, var(--color-neutral-100) 30%, transparent);
  }

  &.hint {
    opacity: var(--opacity-soft);
    pointer-events: none;
  }

  /* UserAvatar brings the colors it has on a light card; on the popup's primary background the
     slug (primary on primary) would vanish. */
  .user-avatar .info {
    .slug,
    .name {
      color: inherit;
    }

    .name {
      font-weight: normal;
    }
  }
}
</style>
