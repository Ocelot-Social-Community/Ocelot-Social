<template>
  <os-card as="article" v-if="isUnavailable" class="comment-card">
    <p>
      <os-icon :icon="icons.ban" />
      {{ $t('comment.content.unavailable-placeholder') }}
    </p>
  </os-card>
  <os-card as="article" v-else :class="commentClass" :id="anchor">
    <header class="header">
      <user-teaser :user="comment.author" :date-time="comment.createdAt">
        <template v-if="wasEdited" #dateTime>
          <span>({{ $t('comment.edited') }})</span>
        </template>
      </user-teaser>
      <client-only>
        <content-menu
          v-show="!editingComment"
          placement="bottom-end"
          resource-type="comment"
          :resource="comment"
          :modalsData="menuModalsData"
          :is-owner="user.id === comment.author.id"
          @editComment="editComment(true)"
        />
      </client-only>
    </header>
    <comment-form
      v-if="editingComment"
      :update="true"
      :postId="postId"
      :comment="comment"
      @finishEditing="editComment(false)"
      @updateComment="updateComment"
      @collapse="isCollapsed = true"
    />
    <template v-else>
      <content-viewer :content="commentContent" class="content" />
      <os-button
        v-if="hasLongContent"
        size="sm"
        appearance="ghost"
        variant="primary"
        @click="isCollapsed = !isCollapsed"
      >
        {{ isCollapsed ? $t('comment.show.more') : $t('comment.show.less') }}
      </os-button>
    </template>
    <div class="actions">
      <ocelot-action-button
        :disabled="isAuthor"
        :count="shoutedCount"
        :aria-label="$t('shoutButton.shouted', { count: shoutedCount })"
        :filled="shouted"
        :icon="icons.heartO"
        :loading="shoutLoading"
        class="shout-button"
        @click="toggleShout"
      />
      <os-button
        :title="$t('post.comment.reply')"
        :aria-label="$t('post.comment.reply')"
        class="reply-button"
        variant="primary"
        appearance="outline"
        circle
        size="sm"
        v-scroll-to="'.editor'"
        @click="reply"
      >
        <template #icon>
          <os-icon :icon="icons.levelDown" />
        </template>
      </os-button>
    </div>
  </os-card>
</template>

<script>
import { OsButton, OsCard, OsIcon, OcelotActionButton } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters } from 'vuex'
import { COMMENT_MAX_UNTRUNCATED_LENGTH, COMMENT_TRUNCATE_TO_LENGTH } from '~/constants/comment'
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import ContentMenu from '~/components/ContentMenu/ContentMenu'
import ContentViewer from '~/components/Editor/ContentViewer'
import CommentForm from '~/components/CommentForm/CommentForm'
import CommentMutations from '~/graphql/CommentMutations'
import { useShout } from '~/composables/useShout'
import scrollToAnchor from '~/mixins/scrollToAnchor.js'

export default {
  components: {
    OsButton,
    OsCard,
    OsIcon,
    UserTeaser,
    ContentMenu,
    ContentViewer,
    CommentForm,
    OcelotActionButton,
  },
  mixins: [scrollToAnchor],
  data() {
    const anchor = `commentId-${this.comment.id}`
    const isTarget = this.$route.hash === `#${anchor}`

    return {
      anchor,
      isTarget,
      isCollapsed: !isTarget,
      editingComment: false,
      shoutedCount: this.comment.shoutedCount || 0,
      shouted: this.comment.shoutedByCurrentUser || false,
      shoutLoading: false,
    }
  },
  props: {
    comment: {
      type: Object,
      required: true,
    },
    postId: {
      type: String,
      required: true,
    },
  },
  watch: {
    'comment.shoutedCount'(val) {
      if (!this.shoutLoading) this.shoutedCount = val || 0
    },
    'comment.shoutedByCurrentUser'(val) {
      if (!this.shoutLoading) this.shouted = !!val
    },
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
      isModerator: 'auth/isModerator',
    }),
    hasLongContent() {
      return this.$filters.removeHtml(this.comment.content).length > COMMENT_MAX_UNTRUNCATED_LENGTH
    },
    isAuthor() {
      const { author } = this.comment
      if (!author) return false
      return this.$store.getters['auth/user'].id === author.id
    },
    isUnavailable() {
      return (this.comment.deleted || this.comment.disabled) && !this.isModerator
    },
    wasEdited() {
      return this.comment.createdAt !== this.comment.updatedAt
    },
    commentClass() {
      let commentClass = 'comment-card'

      if (this.comment.deleted || this.comment.disabled) commentClass += ' disabled-content'
      if (this.isTarget) commentClass += ' --target'

      return commentClass
    },
    commentContent() {
      if (this.hasLongContent && this.isCollapsed) {
        return this.$filters.truncate(this.comment.content, COMMENT_TRUNCATE_TO_LENGTH)
      }

      return this.comment.content
    },
    menuModalsData() {
      return {
        delete: {
          titleIdent: 'delete.comment.title',
          messageIdent: 'delete.comment.message',
          messageParams: {
            name: this.$filters.truncate(this.$filters.removeHtml(this.comment.content), 30),
          },
          buttons: {
            confirm: {
              danger: true,
              icon: this.icons.trash,
              textIdent: 'delete.submit',
              callback: this.deleteCommentCallback,
            },
            cancel: {
              icon: this.icons.close,
              textIdent: 'delete.cancel',
              callback: () => {},
            },
          },
        },
      }
    },
  },
  created() {
    this.icons = iconRegistry
    const { toggleShout } = useShout({ apollo: this.$apollo })
    this._toggleShout = toggleShout
  },
  methods: {
    async toggleShout() {
      const newShouted = !this.shouted
      const backup = { shoutedCount: this.shoutedCount, shouted: this.shouted }
      this.shouted = newShouted
      this.shoutedCount += newShouted ? 1 : -1
      this.shoutLoading = true
      const { success } = await this._toggleShout({
        id: this.comment.id,
        type: 'Comment',
        isCurrentlyShouted: !newShouted,
      })
      if (!success) {
        this.shoutedCount = backup.shoutedCount
        this.shouted = backup.shouted
      }
      this.shoutLoading = false
    },
    checkAnchor(anchor) {
      return `#${this.anchor}` === anchor
    },
    reply() {
      const message = { slug: this.comment.author.slug, id: this.comment.author.id }
      this.$emit('reply', message)
    },
    editComment(editing) {
      this.editingComment = editing
      this.$emit('toggleNewCommentForm', !editing)
    },
    updateComment(comment) {
      this.$emit('updateComment', comment)
    },
    async deleteCommentCallback() {
      try {
        const {
          data: { DeleteComment },
        } = await this.$apollo.mutate({
          mutation: CommentMutations().DeleteComment,
          variables: { id: this.comment.id },
        })
        this.$toast.success(this.$t(`delete.comment.success`))
        this.$emit('deleteComment', DeleteComment)
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
  },
}
</script>
<style lang="scss">
.comment-card {
  display: flex;
  flex-direction: column;
  margin-bottom: $space-small;

  &.--target {
    animation: highlight 4s ease;
  }

  > .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: $space-small;
  }
}

@keyframes highlight {
  0% {
    border: $border-size-base solid $color-primary;
  }
  100% {
    border: $border-size-base solid transparent;
  }
}
</style>

<style lang="scss" scoped>
.actions {
  margin-top: $space-x-small;
  display: flex;
  align-items: center;
  justify-content: right;
  gap: calc($space-base * 0.5);
}

.shout-button {
  --circle-button-width: 28px;
}
</style>
