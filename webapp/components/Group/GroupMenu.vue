<template>
  <dropdown class="group-menu" :placement="placement" offset="5">
    <template #default="{ toggleMenu }">
      <slot name="button" :toggleMenu="toggleMenu">
        <base-button
          data-test="group-menu-button"
          icon="ellipsis-v"
          size="large"
          circle
          ghost
          @click.prevent="toggleMenu()"
        />
      </slot>
    </template>
    <template #popover="{ toggleMenu }">
      <div class="group-menu-popover">
        <ds-menu :routes="routes">
          <template #menuitem="item">
            {{item.parents}}
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
  name: 'ContentMenu',
  components: {
    Dropdown,
  },
  props: {
    placement: { type: String, default: 'bottom-end' },
    resource: { type: Object, required: true },
    isOwner: { type: String, default: null },
    resourceType: {
      type: String,
      required: true,
      validator: (value) => {
        return value.match(/(group)/)
      },
    },
  },
  computed: {
    routes() {
      const routes = []

      if (this.resourceType === 'group') {
        if (this.isOwner === 'owner') {
          routes.push({
            label: $t('admin.settings.name'),
            path: `/group/edit/${this.resource.id}`,
            icon: 'edit',
          })
        }
        if (this.isOwner === 'usual') {
          routes.push({
            label: $t('group.unfollowing'),
            callback: () => {
              // this.$emit('join-group', this.resource)
            },
            icon: 'minus',
          })
        }
        if (this.isOwner === 'pending') {
          routes.push({
            label: $t('group.unfollowing'),
            callback: () => {
              // this.removePending(this.resource)
            },
            icon: 'minus',
          })
        }
        if (this.isOwner === null) {
          routes.push({
            label: $t('group.follow'),
            callback: () => {
                this.$emit('joinGroup', this.resource)
            },
            icon: 'plus',
          })
        }
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
