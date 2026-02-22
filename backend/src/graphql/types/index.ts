import path from 'node:path'

import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'

const typeDefs = loadFilesSync(path.join(__dirname, './**/*.gql'))
export default mergeTypeDefs(typeDefs)
