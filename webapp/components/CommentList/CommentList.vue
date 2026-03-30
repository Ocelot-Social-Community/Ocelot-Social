<template>
  <div id="comments" class="comment-list">
    <h3 class="title">
      <os-counter-icon :icon="icons.comments" :count="commentsCount" />
      {{ $t('common.comment', null, 0) }}
    </h3>
    <div v-if="post.comments" class="comments">
      <comment-card
        v-for="comment in post.comments"
        :key="comment.id"
        :comment="comment"
        :postId="post.id"
        @deleteComment="updateCommentList"
        @updateComment="updateCommentList"
        @toggleNewCommentForm="toggleNewCommentForm"
        @reply="reply"
      />
    </div>
  </div>
</template>
<script>
import { OsCounterIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import CommentCard from '~/components/CommentCard/CommentCard'
import scrollToAnchor from '~/mixins/scrollToAnchor'

export default {
  mixins: [scrollToAnchor],
  components: {
    OsCounterIcon,
    CommentCard,
  },
  props: {
    post: {
      type: Object,
      required: true,
    },
  },
  computed: {
    commentsCount() {
      return (
        (this.post &&
          this.post.comments &&
          this.post.comments.filter((comment) => !comment.deleted && !comment.disabled).length) ||
        0
      )
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    reply(message) {
      this.$emit('reply', message)
    },
    checkAnchor(anchor) {
      return anchor === '#comments'
    },
    updateCommentList(updatedComment) {
      this.post.comments = this.post.comments.map((comment) => {
        return comment.id === updatedComment.id ? updatedComment : comment
      })
    },
    toggleNewCommentForm(showNewCommentForm) {
      this.$emit('toggleNewCommentForm', showNewCommentForm)
    },
  },
}
</script>

<style lang="scss">
.comment-list {
  > .title {
    margin-top: 0;

    > .os-counter-icon {
      margin-right: $space-small;
    }
  }
}
</style>
