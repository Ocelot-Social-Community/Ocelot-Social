import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'
import { location } from './fragments/location'

export const profileUserGroupsQuery = (i18n) => {
  const lang = i18n ? i18n.locale().toUpperCase() : 'EN'
  return gql`
    ${imageUrls}
    ${location('Group', lang)}

    query ProfileUserGroups($id: ID!, $first: Int, $offset: Int, $nameFilter: String) {
      User(id: $id) {
        id
        groups(first: $first, offset: $offset, nameFilter: $nameFilter) {
          id
          name
          slug
          about
          groupType
          actionRadius
          membersCount
          postsCount
          myRole
          showOnProfile
          ...locationOnGroup
          avatar {
            ...imageUrls
          }
        }
      }
    }
  `
}

export const setGroupMembershipVisibilityMutation = () => {
  return gql`
    mutation SetGroupMembershipVisibility($groupId: ID!, $showOnProfile: Boolean!) {
      setGroupMembershipVisibility(groupId: $groupId, showOnProfile: $showOnProfile) {
        role
        showOnProfile
      }
    }
  `
}

export const groupMembershipVisibilityChangedSubscription = () => {
  return gql`
    subscription GroupMembershipVisibilityChanged($userId: ID!) {
      groupMembershipVisibilityChanged(userId: $userId) {
        userId
      }
    }
  `
}
