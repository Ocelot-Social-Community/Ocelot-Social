<template>
  <dropdown class="content-menu" :placement="placement" offset="5">
    <template #default="{ toggleMenu }">
      <slot name="button" :toggleMenu="toggleMenu">
        <base-button
          data-test="content-menu-button"
          icon="ellipsis-v"
          size="small"
          circle
          @click.prevent="toggleMenu()"
        />
      </slot>
    </template>
    <template #popover="{ toggleMenu }">
      <div class="content-menu-popover">
        <ds-menu :routes="routes">
          <template #menuitem="item">
            <ds-menu-item
              :route="item.route"
              :parents="item.parents"
              @click.stop.prevent="openItem(item.route, toggleMenu)"
            >
              <base-icon :name="item.route.icon" />
              {{ item.route.label }}
            </ds-menu-item>
          </template>
        </ds-menu>
      </div>
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'
import PinnedPostsMixin from '~/mixins/pinnedPosts'

export default {
  name: 'ContentMenu',
  components: {
    Dropdown,
  },
  mixins: [PinnedPostsMixin],
  props: {
    placement: { type: String, default: 'top-end' },
    resource: { type: Object, required: true },
    isOwner: { type: Boolean, default: false },
    resourceType: {
      type: String,
      required: true,
      validator: (value) => {
        return value.match(/(contribution|comment|organization|user)/)
      },
    },
    modalsData: {
      type: Object,
      required: false,
      default: () => {
        return {}
      },
    },
  },
  computed: {
    routes() {
      const routes = []

      if (this.resourceType === 'contribution') {
        if (this.isOwner) {
          routes.push({
            label: this.$t(`post.menu.edit`),
            name: 'post-edit-id',
            params: {
              id: this.resource.id,
            },
            icon: 'edit',
          })
          routes.push({
            label: this.$t(`post.menu.delete`),
            callback: () => {
              this.openModal('confirm', 'delete')
            },
            icon: 'trash',
          })
        }

        if (this.isAdmin && (!this.resource.group || this.resource.group.groupType === 'public')) {
          if (!this.resource.pinnedBy && this.canBePinned) {
            routes.push({
              label: this.$t(`post.menu.pin`),
              callback: () => {
                this.$emit('pinPost', this.resource)
              },
              icon: 'link',
            })
          } else {
            if (this.resource.pinnedBy) {
              routes.push({
                label: this.$t(`post.menu.unpin`),
                callback: () => {
                  this.$emit('unpinPost', this.resource)
                },
                icon: 'unlink',
              })
            }
          }
        }

        if (this.isAdmin) {
          routes.push({
            label: this.$t(`post.menu.push`),
            callback: () => {
              this.$emit('pushPost', this.resource)
            },
            icon: 'link',
          })
        }

        if (this.isAdmin && this.resource.sortDate !== this.resource.createdAt) {
          routes.push({
            label: this.$t(`post.menu.unpush`),
            callback: () => {
              this.$emit('unpushPost', this.resource)
            },
            icon: 'link',
          })
        }

        if (this.resource.isObservedByMe) {
          routes.push({
            label: this.$t(`post.menu.unobserve`),
            callback: () => {
              this.$emit('toggleObservePost', this.resource.id, false)
            },
            icon: 'bell-slashed',
          })
        } else {
          routes.push({
            label: this.$t(`post.menu.observe`),
            callback: () => {
              this.$emit('toggleObservePost', this.resource.id, true)
            },
            icon: 'bell',
          })
        }
      }

      if (this.isOwner && this.resourceType === 'comment') {
        routes.push({
          label: this.$t(`comment.menu.edit`),
          callback: () => {
            this.$emit('editComment')
          },
          icon: 'edit',
        })
        routes.push({
          label: this.$t(`comment.menu.delete`),
          callback: () => {
            this.openModal('confirm', 'delete')
          },
          icon: 'trash',
        })
      }

      if (!this.isOwner) {
        routes.push({
          label: this.$t(`report.${this.resourceType}.title`),
          callback: () => {
            this.openModal('report')
          },
          icon: 'flag',
        })
      }

      if (!this.isOwner && this.isModerator) {
        if (!this.resource.disabled) {
          routes.push({
            label: this.$t(`disable.${this.resourceType}.title`),
            callback: () => {
              this.openModal('disable')
            },
            icon: 'eye-slash',
          })
        } else {
          routes.push({
            label: this.$t(`release.${this.resourceType}.title`),
            callback: () => {
              this.openModal('release')
            },
            icon: 'eye',
          })
        }
      }

      if (this.resourceType === 'user') {
        if (this.isOwner) {
          routes.push({
            label: this.$t(`settings.name`),
            path: '/settings',
            icon: 'edit',
          })
        } else {
          if (this.resource.isMuted) {
            routes.push({
              label: this.$t(`settings.muted-users.unmute`),
              callback: () => {
                this.$emit('unmute', this.resource)
              },
              icon: 'microphone',
            })
          } else {
            routes.push({
              label: this.$t(`settings.muted-users.mute`),
              callback: () => {
                this.$emit('mute', this.resource)
              },
              icon: 'microphone-slash',
            })
          }
          if (this.resource.isBlocked) {
            routes.push({
              label: this.$t(`settings.blocked-users.unblock`),
              callback: () => {
                this.$emit('unblock', this.resource)
              },
              icon: 'user-plus',
            })
          } else {
            routes.push({
              label: this.$t(`settings.blocked-users.block`),
              callback: () => {
                this.$emit('block', this.resource)
              },
              icon: 'user-times',
            })
          }
          if (this.isAdmin === true) {
            routes.push({
              label: this.$t(`settings.deleteUserAccount.name`),
              callback: () => {
                this.$emit('delete', this.resource)
              },
              icon: 'trash',
            })
          }
        }
      }

      if (
        this.resourceType === 'contribution' &&
        this.resource.group &&
        (this.resource.group.myRole === 'owner' || this.resource.group.myRole === 'admin') &&
        (this.canBeGroupPinned || this.resource.groupPinned)
      ) {
        routes.push({
          label: this.resource.groupPinned
            ? this.$t(`post.menu.groupUnpin`)
            : this.$t(`post.menu.groupPin`),
          callback: () => {
            this.$emit(this.resource.groupPinned ? 'unpinGroupPost' : 'pinGroupPost', this.resource)
          },
          icon: this.resource.groupPinned ? 'unlink' : 'link',
        })
      }

      return routes
    },
    isModerator() {
      return this.$store.getters['auth/isModerator']
    },
    isAdmin() {
      return this.$store.getters['auth/isAdmin']
    },
    canBePinned() {
      return (
        this.maxPinnedPosts === 1 ||
        (this.maxPinnedPosts > 1 && this.currentlyPinnedPosts < this.maxPinnedPosts)
      )
    },
    canBeGroupPinned() {
      const maxGroupPinnedPosts = this.$env.MAX_GROUP_PINNED_POSTS
      return (
        maxGroupPinnedPosts === 1 ||
        (maxGroupPinnedPosts > 1 &&
          this.resource.group &&
          this.resource.group.currentlyPinnedPostsCount < maxGroupPinnedPosts)
      )
    },
  },
  methods: {
    openItem(route, toggleMenu) {
      if (route.callback) {
        route.callback()
      } else {
        this.$router.push(route)
      }
      toggleMenu()
    },
    openModal(dialog, modalDataName = null) {
      this.$store.commit('modal/SET_OPEN', {
        name: dialog,
        data: {
          type: this.resourceType,
          resource: this.resource,
          modalData: modalDataName ? this.modalsData[modalDataName] : {},
        },
      })
    },
  },
}
</script>

<style lang="scss">
.content-menu-popover {
  nav {
    margin-top: -$space-xx-small;
    margin-bottom: -$space-xx-small;
    margin-left: -$space-x-small;
    margin-right: -$space-x-small;
  }
}
</style>
