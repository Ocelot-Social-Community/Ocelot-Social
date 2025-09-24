import gql from 'graphql-tag'
import { imageUrls } from './imageUrls'

export const user = gql`
  ${imageUrls}
  fragment user on User {
    id
    slug
    name
    avatar {
      ...imageUrls
    }
    disabled
    deleted
  }
`
