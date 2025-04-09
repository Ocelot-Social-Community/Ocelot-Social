import path from 'node:path'

import { mergeTypes, fileLoader } from 'merge-graphql-schemas'

const typeDefs = fileLoader(path.join(__dirname, './**/*.gql'))
export default mergeTypes(typeDefs, { all: true })
