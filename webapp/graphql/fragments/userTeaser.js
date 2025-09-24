import gql from 'graphql-tag'
import badges from './badges'
import location from './location'

export const userTeaser = (lang) => gql`
  ${badges}
  ${location('User', lang)}

  fragment userTeaser on User {
    followedByCount
    contributionsCount
    commentedCount
    ...badges
    ...location
  }
`
