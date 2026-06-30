import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

export const profileUserGroupsQuery = () => {
  return gql`
    ${imageUrls}

    query ProfileUserGroups($id: ID!) {
      User(id: $id) {
        id
        groups {
          id
          name
          slug
          groupType
          myRole
          showOnProfile
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
