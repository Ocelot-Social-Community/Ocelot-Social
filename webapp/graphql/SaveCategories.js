import gql from 'graphql-tag'

export default () => {
  return gql`
    mutation ($activeCategories: [String]) {
      saveCategorySettings(activeCategories: $activeCategories)
    }
  `
}
