import gql from 'graphql-tag'

// Not sure if we need this
export const mutedGroups = () => {
  return gql`
    {
      mutedGroups {
        id
        name
        slug
        avatar {
          url
        }
        about
        disabled
        deleted
      }
    }
  `
}

export const muteGroup = () => {
  return gql`
    mutation ($id: ID!) {
      muteGroup(id: $id) {
        id
        name
        isMutedByMe
      }
    }
  `
}

export const unmuteGroup = () => {
  return gql`
    mutation ($id: ID!) {
      unmuteGroup(id: $id) {
        id
        name
        isMutedByMe
      }
    }
  `
}
