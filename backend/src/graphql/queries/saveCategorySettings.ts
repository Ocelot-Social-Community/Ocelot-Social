import gql from 'graphql-tag'

export const saveCategorySettings = gql`
  mutation ($activeCategories: [String]) {
    saveCategorySettings(activeCategories: $activeCategories)
  }
`
