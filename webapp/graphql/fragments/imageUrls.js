import gql from 'graphql-tag'

export const imageUrls = gql`
  fragment imageUrls on Image {
    url
    w320: transform(width: 320)
    w640: transform(width: 640)
    w1024: transform(width: 1024)
  }
`
