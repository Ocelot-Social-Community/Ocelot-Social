import PostMutations from '~/graphql/PostMutations'
import { mapMutations } from 'vuex'

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
        .catch((error) => this.$toast.error(error.message))
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
        .catch((error) => this.$toast.error(error.message))
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
        .catch((error) => this.$toast.error(error.message))
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
        .catch((error) => this.$toast.error(error.message))
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
        .catch((error) => this.$toast.error(error.message))
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
        .catch((error) => this.$toast.error(error.message))
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
        .catch((error) => this.$toast.error(error.message))
    },
    ...mapMutations({
      storePinPost: 'pinnedPosts/pinPost',
      storeUnpinPost: 'pinnedPosts/unpinPost',
    }),
  },
}
