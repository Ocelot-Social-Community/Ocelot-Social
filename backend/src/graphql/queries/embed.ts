import gql from 'graphql-tag'

export const embed = gql`
  query ($url: String!) {
    embed(url: $url) {
      type
      title
      author
      publisher
      date
      description
      url
      image
      audio
      video
      lang
      sources
      html
    }
  }
`
