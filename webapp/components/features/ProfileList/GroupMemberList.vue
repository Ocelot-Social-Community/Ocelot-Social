<template>
  <os-card v-if="hasGroups || myProfile" class="group-member-list">
    <h5 class="title spacer-x-small">{{ $t('profile.groups.title') }}</h5>

    <template v-if="hasGroups">
      <div v-for="type in groupTypes" :key="type">
        <template v-if="groupsByType[type] && groupsByType[type].length">
          <p class="type-label">{{ $t(`profile.groups.${type}`) }}</p>
          <ul class="group-list">
            <li v-for="group in groupsByType[type]" :key="group.id" class="group-item">
              <nuxt-link
                class="group-item__link"
                :to="{ name: 'groups-id-slug', params: { id: group.id, slug: group.slug } }"
              >
                <profile-avatar :profile="group" size="small" class="group-item__avatar" />
                <div class="group-item__info">
                  <span class="group-item__name">{{ group.name }}</span>
                  <span class="group-item__slug ds-text-soft">&amp;{{ group.slug }}</span>
                </div>
              </nuxt-link>
              <button
                v-if="myProfile"
                class="group-item__visibility-btn"
                :title="
                  group.showOnProfile
                    ? $t('group.contentMenu.hideFromProfile')
                    : $t('group.contentMenu.showOnProfile')
                "
                @click.prevent="toggleVisibility(group)"
              >
                <os-icon :icon="group.showOnProfile ? icons.eye : icons.eyeSlash" />
              </button>
            </li>
          </ul>
        </template>
      </div>
    </template>

    <p v-else class="nobody-message">{{ $t('profile.groups.nobody') }}</p>
  </os-card>
</template>

<script>
import { OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import { profileUserGroupsQuery, setGroupMembershipVisibilityMutation } from '~/graphql/UserGroups'

const GROUP_TYPES = ['public', 'closed', 'hidden']

export default {
  name: 'GroupMemberList',
  components: {
    OsCard,
    OsIcon,
    ProfileAvatar,
  },
  props: {
    userId: { type: String, required: true },
    myProfile: { type: Boolean, default: false },
  },
  data() {
    return {
      groups: [],
      groupTypes: GROUP_TYPES,
    }
  },
  created() {
    this.icons = iconRegistry
  },
  computed: {
    hasGroups() {
      return this.groups && this.groups.length > 0
    },
    groupsByType() {
      return GROUP_TYPES.reduce((acc, type) => {
        acc[type] = (this.groups || []).filter((g) => g.groupType === type)
        return acc
      }, {})
    },
  },
  methods: {
    async toggleVisibility(group) {
      const newValue = !group.showOnProfile
      try {
        await this.$apollo.mutate({
          mutation: setGroupMembershipVisibilityMutation(),
          variables: { groupId: group.id, showOnProfile: newValue },
        })
        group.showOnProfile = newValue
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
  apollo: {
    groups: {
      query() {
        return profileUserGroupsQuery()
      },
      variables() {
        return { id: this.userId }
      },
      update({ User }) {
        return (User && User[0] && User[0].groups) || []
      },
      fetchPolicy: 'cache-and-network',
    },
  },
}
</script>

<style lang="scss" scoped>
.group-member-list {
  display: flex;
  flex-direction: column;

  > .title {
    color: $text-color-soft;
    font-size: $font-size-base;
  }

  > :nth-child(n):not(:last-child) {
    margin-bottom: $space-small;
  }

  .type-label {
    font-size: $font-size-small;
    color: $text-color-soft;
    margin-bottom: $space-xx-small;
  }

  .group-list {
    list-style: none;
    padding: 0;
    margin: 0 0 $space-x-small 0;
  }

  .group-item {
    display: flex;
    align-items: center;
    padding: $space-xx-small;
    border-radius: $border-radius-base;

    &:hover {
      background-color: $background-color-primary-inverse;
    }

    &__link {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      color: $text-color-base;
      text-decoration: none;
      gap: $space-x-small;
    }

    &__avatar {
      flex-shrink: 0;
    }

    &__info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &__name {
      font-size: $font-size-base;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__slug {
      font-size: $font-size-small;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__visibility-btn {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      color: $text-color-soft;
      padding: $space-xx-small;
      border-radius: $border-radius-base;

      &:hover {
        color: $text-color-base;
      }
    }
  }

  .nobody-message {
    text-align: center;
    color: $text-color-soft;
  }
}
</style>
