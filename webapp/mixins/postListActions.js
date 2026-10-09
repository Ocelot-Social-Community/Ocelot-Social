import PostMutations from '~/graphql/PostMutations'
import { mapMutations } from 'vuex'
import { removePostFromGroupMutation } from '~/graphql/groupRoles.js'

export default {
  methods: {
    removePostFromList(deletedPost, posts) {
      return posts.filter((post) => {
        return post.id !== deletedPost.id
      })
    },
    pinPost(post, refetchPostList = () => {}) {
      this.$apollo
        .mutate({
          mutation: PostMutations().pinPost,
          variables: {
            id: post.id,
          },
        })
        .then(() => {
          this.$toast.success(this.$t('post.menu.pinnedSuccessfully'))
          this.storePinPost()
          refetchPostList()
        })
        .catch((error) => this.$toastBackendError(error))
    },
    unpinPost(post, refetchPostList = () => {}) {
      this.$apollo
        .mutate({
          mutation: PostMutations().unpinPost,
          variables: {
            id: post.id,
          },
        })
        .then(() => {
          this.$toast.success(this.$t('post.menu.unpinnedSuccessfully'))
          this.storeUnpinPost()
          refetchPostList()
        })
        .catch((error) => this.$toastBackendError(error))
    },
    pinGroupPost(post, refetchPostList = () => {}) {
      this.$apollo
        .mutate({
          mutation: PostMutations().pinGroupPost,
          variables: {
            id: post.id,
          },
        })
        .then(() => {
          this.$toast.success(this.$t('post.menu.groupPinnedSuccessfully'))
          // this.storePinGroupPost()
          refetchPostList()
        })
        .catch((error) => this.$toastBackendError(error))
    },
    unpinGroupPost(post, refetchPostList = () => {}) {
      this.$apollo
        .mutate({
          mutation: PostMutations().unpinGroupPost,
          variables: {
            id: post.id,
          },
        })
        .then(() => {
          this.$toast.success(this.$t('post.menu.groupUnpinnedSuccessfully'))
          // this.storeUnpinGroupPost()
          refetchPostList()
        })
        .catch((error) => this.$toastBackendError(error))
    },
    /**
     * Take a post out of a group without deleting it.
     *
     * Confirmed first, because it is not undoable from the list: the post keeps existing with
     * its author, but putting it back would mean the author posting it again.
     */
    removePostFromGroup(post, refetchPostList = () => {}) {
      if (!window.confirm(this.$t('post.menu.removeFromGroupConfirm', { group: post.group?.name })))
        return undefined
      // Returns the chain, unlike its older siblings here: a caller that wants to wait for the
      // list to settle can, and a test can await the error path instead of flushing timers.
      return this.$apollo
        .mutate({
          mutation: removePostFromGroupMutation(),
          variables: { groupId: post.group.id, postId: post.id },
        })
        .then(() => {
          this.$toast.success(this.$t('post.menu.removedFromGroupSuccessfully'))
          refetchPostList()
        })
        .catch((error) => this.$toastBackendError(error))
    },
    pushPost(post, refetchPostList = () => {}) {
      this.$apollo
        .mutate({
          mutation: PostMutations().pushPost,
          variables: {
            id: post.id,
          },
        })
        .then(() => {
          this.$toast.success(this.$t('post.menu.pushedSuccessfully'))
          refetchPostList()
        })
        .catch((error) => this.$toastBackendError(error))
    },
    unpushPost(post, refetchPostList = () => {}) {
      this.$apollo
        .mutate({
          mutation: PostMutations().unpushPost,
          variables: {
            id: post.id,
          },
        })
        .then(() => {
          this.$toast.success(this.$t('post.menu.unpushedSuccessfully'))
          refetchPostList()
        })
        .catch((error) => this.$toastBackendError(error))
    },
    toggleObservePost(postId, value, refetchPostList = () => {}) {
      this.$apollo
        .mutate({
          mutation: PostMutations().toggleObservePost,
          variables: {
            value,
            id: postId,
          },
        })
        .then(() => {
          const message = this.$t(
            `post.menu.${value ? 'observedSuccessfully' : 'unobservedSuccessfully'}`,
          )
          this.$toast.success(message)
          refetchPostList()
        })
        .catch((error) => this.$toastBackendError(error))
    },
    ...mapMutations({
      storePinPost: 'pinnedPosts/pinPost',
      storeUnpinPost: 'pinnedPosts/unpinPost',
    }),
  },
}
