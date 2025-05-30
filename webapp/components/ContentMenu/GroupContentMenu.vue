<template>
  <dropdown class="group-content-menu" :placement="placement" offset="5">
    <template #default="{ toggleMenu }">
      <slot name="button" :toggleMenu="toggleMenu">
        <base-button
          icon="ellipsis-v"
          size="small"
          circle
          @click.prevent="toggleMenu()"
          data-test="group-menu-button"
        />
      </slot>
    </template>
    <template #popover="{ toggleMenu }">
      <div class="group-menu-popover">
        <ds-menu :routes="routes">
          <template #menuitem="item">
            {{ item.parents }}
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

export default {
  name: 'GroupContentMenu',
  components: {
    Dropdown,
  },
  props: {
    usage: {
      type: String,
      required: true,
      validator: (value) => {
        return value.match(/(groupTeaser|groupProfile)/)
      },
    },
    group: { type: Object, required: true },
    placement: { type: String, default: 'bottom-end' },
  },
  computed: {
    routes() {
      const routes = []

      if (this.usage !== 'groupProfile') {
        routes.push({
          label: this.$t('group.contentMenu.visitGroupPage'),
          icon: 'home',
          path: `/groups/${this.group.id}`,
          params: { id: this.group.id, slug: this.group.slug },
        })
      }

      if (this.usage === 'groupProfile') {
        if (this.group.isMutedByMe) {
          routes.push({
            label: this.$t('group.contentMenu.unmuteGroup'),
            icon: 'volume-up',
            callback: () => {
              this.$emit('unmute', this.group.id)
            },
          })
        } else {
          routes.push({
            label: this.$t('group.contentMenu.muteGroup'),
            icon: 'volume-off',
            callback: () => {
              this.$emit('mute', this.group.id)
            },
          })
        }
      }

      if (this.group.myRole === 'owner') {
        routes.push({
          label: this.$t('admin.settings.name'),
          path: `/groups/edit/${this.group.id}`,
          icon: 'edit',
        })
        routes.push({
          label: this.$t('group.contentMenu.inviteLinks'),
          path: `/groups/edit/${this.group.id}/invites`,
          icon: 'link',
        })
      }

      return routes
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
  },
}
</script>

<style lang="scss">
.group-menu-popover {
  nav {
    margin-top: -$space-xx-small;
    margin-bottom: -$space-xx-small;
    margin-left: -$space-x-small;
    margin-right: -$space-x-small;
  }
}
</style>
