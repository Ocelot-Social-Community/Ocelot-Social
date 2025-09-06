import gql from 'graphql-tag'

export const AddPostEmotions = gql`
  mutation ($to: _PostInput!, $data: _EMOTEDInput!) {
    AddPostEmotions(to: $to, data: $data) {
      from {
        id
      }
      to {
        id
      }
      emotion
    }
  }
`
