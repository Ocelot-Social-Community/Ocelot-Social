import gql from 'graphql-tag'

export const user = gql`
  fragment user on User {
    id
    slug
    name
    avatar {
      url
      w320: transform(width: 320)
      w640: transform(width: 640)
      w1024: transform(width: 1024)
    }
    disabled
    deleted
  }
`
