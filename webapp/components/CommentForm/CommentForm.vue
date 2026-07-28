<template>
  <form @submit.prevent="handleSubmit" class="comment-form" novalidate>
    <os-card>
      <hc-editor ref="editor" :users="users" :value="form.content" @input="updateEditorContent" />
      <div class="buttons">
        <os-button
          variant="primary"
          appearance="outline"
          :disabled="disabled && !update"
          @click="handleCancel"
          data-test="cancel-button"
        >
          {{ $t('actions.cancel') }}
        </os-button>
        <os-button
          variant="primary"
          appearance="filled"
          type="submit"
          :loading="loading"
          :disabled="disabled"
        >
          <template #icon>
            <os-icon :icon="icons.comment" />
          </template>
          {{ $t('post.comment.submit') }}
        </os-button>
      </div>
    </os-card>
  </form>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import HcEditor from '~/components/Editor/Editor'
import { branding } from '@ocelot-social/branding'
import { minimisedUserQuery } from '~/graphql/User'
import CommentMutations from '~/graphql/CommentMutations'

export default {
  components: {
    OsButton,
    OsCard,
    OsIcon,
    HcEditor,
  },
  props: {
    update: { type: Boolean, default: () => false },
    post: { type: Object, default: () => {} },
    comment: {
      type: Object,
      default: () => {},
    },
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    // Creating a comment is gated by comment.create; editing an existing one is not
    // (that path is author-gated). Consumers normally hide the create form entirely
    // when this is true (see the post page); this guards handleSubmit as a defence-in-
    // depth safety net so a stray ungated render can't silently no-op a submit.
    cannotComment() {
      return !this.update && !this.$can('comment.create')
    },
  },
  data() {
    return {
      disabled: true,
      loading: false,
      form: {
        content: !this.update || !this.comment.content ? '' : this.comment.content,
      },
      users: [],
    }
  },
  methods: {
    reply(message) {
      this.$refs.editor.insertReply(message)
    },
    updateEditorContent(value) {
      const sanitizedContent = this.$filters.removeHtml(value, false)
      if (!this.update) {
        this.disabled = sanitizedContent.length < branding.comment.minLength
      } else {
        this.disabled =
          value === this.comment.content || sanitizedContent.length < branding.comment.minLength
      }
      this.form.content = value
    },
    clear() {
      this.$refs.editor.clear()
    },
    closeEditWindow() {
      this.$emit('finishEditing')
    },
    handleCancel() {
      if (!this.update) {
        this.clear()
      } else {
        this.closeEditWindow()
      }
    },
    async handleSubmit() {
      // The submit button is grayed but stays clickable (so the tooltip works); give
      // feedback instead of a silent no-op when the viewer lacks comment.create.
      if (this.cannotComment) {
        this.$toast.error(this.$t('permissions.deniedHint'))
        return
      }
      const mutateParams = !this.update
        ? {
            mutation: CommentMutations().CreateComment,
            variables: {
              postId: this.post.id,
              content: this.form.content,
            },
          }
        : {
            mutation: CommentMutations().UpdateComment,
            variables: {
              id: this.comment.id,
              content: this.form.content,
            },
          }

      this.loading = true
      this.disabled = true
      try {
        const res = await this.$apollo.mutate(mutateParams)
        if (!this.update) {
          const {
            data: { CreateComment },
          } = res
          this.$emit('createComment', CreateComment)
          this.clear()
          this.$toast.success(this.$t('post.comment.submitted'))
        } else {
          const {
            data: { UpdateComment },
          } = res
          this.$emit('updateComment', UpdateComment)
          this.$emit('collapse')
          this.$toast.success(this.$t('post.comment.updated'))
          this.closeEditWindow()
        }
      } catch (err) {
        this.$toast.error(err.message)
        this.disabled = false
      } finally {
        this.loading = false
      }
    },
  },
  apollo: {
    User: {
      query() {
        return minimisedUserQuery()
      },
      update({ User }) {
        this.users = User
      },
    },
  },
}
</script>

<style lang="scss">
.comment-form {
  .editor {
    margin-bottom: $space-small;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;

    > button {
      margin-left: $space-x-small;
    }
  }
}
</style>
