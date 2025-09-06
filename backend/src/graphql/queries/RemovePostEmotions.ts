import gql from 'graphql-tag'

export const RemovePostEmotions = gql`
  mutation ($to: _PostInput!, $data: _EMOTEDInput!) {
    RemovePostEmotions(to: $to, data: $data) {
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
