<template>
  <transition name="fade" appear>
    <div>
      <ds-space margin="small">
        <ds-heading tag="h1">{{ heading }}</ds-heading>
        <ds-heading v-if="post && post.group" tag="h2">
          {{ $t('post.viewPost.forGroup.title', { name: post.group.name }) }}
        </ds-heading>
      </ds-space>
      <ds-space margin="large" />
      <ds-flex gutter="small">
        <ds-flex-item :width="{ base: '100%', sm: 2, md: 2, lg: 1 }">
          <base-card
            v-if="post && ready"
            :lang="post.language"
            :class="{
              'post-page': true,
              'disabled-content': post.disabled,
              '--blur-image': blurred,
            }"
            :style="heroImageStyle"
          >
            <template #heroImage v-if="post.image">
              <img :src="post.image | proxyApiUrl" class="image" />
              <aside v-show="post.image && post.image.sensitive" class="blur-toggle">
                <img v-show="blurred" :src="post.image | proxyApiUrl" class="preview" />
                <base-button
                  :icon="blurred ? 'eye' : 'eye-slash'"
                  filled
                  circle
                  @click="blurred = !blurred"
                />
              </aside>
            </template>
            <section class="menu">
              <user-teaser :user="post.author" :group="post.group" wide :date-time="post.createdAt">
                <template #dateTime>
                  <ds-text v-if="post.createdAt !== post.updatedAt">
                    ({{ $t('post.edited') }})
                  </ds-text>
                </template>
              </user-teaser>
              <client-only>
                <content-menu
                  placement="bottom-end"
                  resource-type="contribution"
                  :resource="post"
                  :modalsData="menuModalsData"
                  :is-owner="isAuthor"
                  @pinPost="pinPost"
                  @unpinPost="unpinPost"
                  @pushPost="pushPost"
                  @unpushPost="unpushPost"
                  @toggleObservePost="toggleObservePost"
                />
              </client-only>
            </section>
            <ds-space margin-bottom="small" />
            <h2 class="title hyphenate-text">{{ post.title }}</h2>
            <!-- event data -->
            <ds-space
              v-if="post && post.postType[0] === 'Event'"
              margin-bottom="small"
              style="padding: 10px"
            >
              <location-teaser
                class="event-info"
                :venue="post.eventVenue"
                :locationName="post.eventLocationName"
                :isOnline="post.eventIsOnline"
              />
              <date-time-range
                class="event-info"
                :startDate="post.eventStart"
                :endDate="post.eventEnd"
              />
            </ds-space>
            <ds-space margin-bottom="small" />
            <!-- content -->
            <content-viewer class="content hyphenate-text" :content="post.content" />
            <!-- categories -->
            <div v-if="categoriesActive && post.categories.length > 0" class="categories">
              <ds-space margin="xx-large" />
              <ds-space margin="xx-small" />
              <hc-category
                v-for="category in sortCategories(post.categories)"
                :key="category.id"
                :icon="category.icon"
                :name="$t(`contribution.category.name.${category.slug}`)"
                v-tooltip="{
                  content: $t(`contribution.category.description.${category.slug}`),
                  placement: 'bottom-start',
                }"
              />
            </div>
            <ds-space margin-bottom="small" />
            <!-- Tags -->
            <div v-if="post.tags && post.tags.length" class="tags">
              <ds-space margin="xx-small" />
              <hc-hashtag v-for="tag in sortedTags" :key="tag.id" :id="tag.id" />
            </div>
            <div class="actions">
              <!-- Shout Button -->
              <shout-button
                :disabled="isAuthor"
                :count="post.shoutedCount"
                :is-shouted="post.shoutedByCurrentUser"
                :node-id="post.id"
                node-type="Post"
              />
              <!-- Follow Button -->
              <observe-button
                :is-observed="post.isObservedByMe"
                :count="post.observingUsersCount"
                :post-id="post.id"
                @toggleObservePost="toggleObservePost"
              />
            </div>
            <!-- Comments -->
            <ds-section>
              <comment-list
                :post="post"
                @toggleNewCommentForm="toggleNewCommentForm"
                @reply="reply"
              />
              <ds-space margin-bottom="large" />
              <comment-form
                v-if="showNewCommentForm && !isBlocked && canCommentPost"
                ref="commentForm"
                :post="post"
                @createComment="createComment"
              />
              <ds-placeholder v-if="isBlocked">
                {{ $t('settings.blocked-users.explanation.commenting-disabled') }}
                <br />
                {{ $t('settings.blocked-users.explanation.commenting-explanation') }}
                <page-params-link :pageParams="links.FAQ">
                  {{ $t('site.faq') }}
                </page-params-link>
              </ds-placeholder>
            </ds-section>
          </base-card>
        </ds-flex-item>
        <ds-flex-item :width="{ base: '200px' }">
          <ds-menu :routes="routes" class="post-side-navigation" />
        </ds-flex-item>
      </ds-flex>
    </div>
  </transition>
</template>

<script>
import ContentViewer from '~/components/Editor/ContentViewer'
import HcCategory from '~/components/Category'
import HcHashtag from '~/components/Hashtag/Hashtag'
import CommentForm from '~/components/CommentForm/CommentForm'
import CommentList from '~/components/CommentList/CommentList'
import ContentMenu from '~/components/ContentMenu/ContentMenu'
import DateTimeRange from '~/components/DateTimeRange/DateTimeRange'
import UserTeaser from '~/components/UserTeaser/UserTeaser'
import ShoutButton from '~/components/ShoutButton.vue'
import ObserveButton from '~/components/ObserveButton.vue'
import LocationTeaser from '~/components/LocationTeaser/LocationTeaser'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import {
  postMenuModalsData,
  deletePostMutation,
  sortTagsAlphabetically,
} from '~/components/utils/PostHelpers'
import PostQuery from '~/graphql/PostQuery'
import { groupQuery } from '~/graphql/groups'
import PostMutations from '~/graphql/PostMutations'
import links from '~/constants/links.js'
import GetCategories from '~/mixins/getCategoriesMixin.js'
import postListActions from '~/mixins/postListActions'
import SortCategories from '~/mixins/sortCategoriesMixin.js'

export default {
  name: 'PostSlug',
  transition: {
    name: 'slide-up',
    mode: 'out-in',
  },
  components: {
    ContentMenu,
    CommentForm,
    CommentList,
    ContentViewer,
    DateTimeRange,
    HcCategory,
    HcHashtag,
    ShoutButton,
    ObserveButton,
    LocationTeaser,
    PageParamsLink,
    UserTeaser,
  },
  mixins: [GetCategories, postListActions, SortCategories],
  head() {
    return {
      title: this.title,
    }
  },
  data() {
    return {
      links,
      post: null,
      ready: false,
      title: 'loading',
      showNewCommentForm: true,
      blurred: false,
      blocked: null,
      postAuthor: null,
      group: null,
    }
  },
  mounted() {
    setTimeout(() => {
      // NOTE: quick fix for jumping flexbox implementation
      // will be fixed in a future update of the styleguide
      this.ready = true
    }, 50)
  },
  computed: {
    routes() {
      const { slug, id } = this.$route.params
      return [
        {
          name:
            this.post?.postType[0] === 'Event'
              ? this.$t('post.viewEvent.title')
              : this.$t('post.viewPost.title'),
          path: `/post/${id}/${slug}`,
          children: [
            {
              name: this.$t('common.comment', null, 2),
              path: `/post/${id}/${slug}#comments`,
            },
            // TODO implement
            /* {
                name: this.$t('common.letsTalk'),
                path: `/post/${id}/${slug}#lets-talk`
                }, */
            // TODO implement
            /* {
                name: this.$t('common.versus'),
                path: `/post/${id}/${slug}#versus`
                } */
          ],
        },
      ]
    },
    heading() {
      if (this.post?.postType[0] === 'Event') return this.$t('post.viewEvent.title')
      return this.$t('post.viewPost.title')
    },
    menuModalsData() {
      return postMenuModalsData(
        // "this.post" may not always be defined at the beginning …
        this.post ? this.$filters.truncate(this.post.title, 30) : '',
        this.deletePostCallback,
      )
    },
    isBlocked() {
      const { author } = this.post
      if (!author) return false
      return author.blocked
    },
    isAuthor() {
      const { author } = this.post
      if (!author) return false
      return this.$store.getters['auth/user'].id === author.id
    },
    sortedTags() {
      return sortTagsAlphabetically(this.post.tags)
    },
    heroImageStyle() {
      /*  Return false when image property is not present or is not a number
          so no unnecessary css variables are set.
        */

      if (!this.post.image || typeof this.post.image.aspectRatio !== 'number') return false
      /*  Return the aspect ratio as a css variable. Later to be used when calculating
          the height with respect to the width.
        */
      return {
        '--hero-image-aspect-ratio': 1.0 / this.post.image.aspectRatio,
      }
    },
    canCommentPost() {
      return (
        !this.post.group || (this.group && ['usual', 'admin', 'owner'].includes(this.group.myRole))
      )
    },
  },
  methods: {
    reply(message) {
      this.$refs.commentForm && this.$refs.commentForm.reply(message)
    },
    async deletePostCallback() {
      try {
        await this.$apollo.mutate(deletePostMutation(this.post.id))
        this.$toast.success(this.$t('delete.contribution.success'))
        this.$router.history.push('/') // Redirect to index (main) page
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
    async createComment(comment) {
      this.post.comments.push(comment)
      this.post.isObservedByMe = comment.isPostObservedByMe
      this.post.observingUsersCount = comment.postObservingUsersCount
    },
    toggleObservePost(postId, value) {
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
          this.$apollo.queries.Post.refetch()
        })
        .catch((error) => this.$toast.error(error.message))
    },
    toggleNewCommentForm(showNewCommentForm) {
      this.showNewCommentForm = showNewCommentForm
    },
  },
  apollo: {
    Post: {
      query() {
        return PostQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.$route.params.id,
        }
      },
      update({ Post }) {
        this.post = Post[0] || {}
        this.title = this.post.title
        const { image } = this.post
        this.postAuthor = this.post.author
        this.blurred = image && image.sensitive
      },
      fetchPolicy: 'cache-and-network',
    },
    Group: {
      query() {
        return groupQuery(this.$i18n)
      },
      variables() {
        return {
          id: this.post && this.post.group ? this.post.group.id : null,
        }
      },
      update({ Group }) {
        this.group = Group[0]
      },
      skip() {
        return !(this.post && this.post.group)
      },
    },
  },
}
</script>

<style lang="scss">
.post-side-navigation {
  position: sticky;
  top: 65px;
  z-index: 2;
}
.post-page {
  > .hero-image {
    position: relative;
    /*  The padding top makes sure the correct height is set (according to the
        hero image aspect ratio) before the hero image loads so
        the autoscroll works correctly when following a comment link.
      */

    padding-top: calc(var(--hero-image-aspect-ratio) * (100% + 48px));
    /*  Letting the image fill the container, since the container
        is the one determining height
      */
    > .image {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }
  }

  > .menu {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &.--blur-image > .hero-image > .image {
    filter: blur($blur-radius);
  }

  .blur-toggle {
    position: absolute;
    bottom: 0;
    right: 0;

    display: flex;
    align-items: center;

    height: 80px;
    padding: 12px;

    .preview {
      height: 100%;
      margin-right: 12px;
    }
  }

  .comments {
    margin-top: $space-small;

    .ProseMirror {
      min-height: 0px;
    }
  }
}
</style>

<style lang="scss" scoped>
.actions {
  display: flex;
  align-items: center;
  justify-content: right;
  gap: $space-small;
  margin-top: $space-small;
  margin-bottom: calc($space-base * 2);
}
</style>
