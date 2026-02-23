import path from 'node:path'

import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'

// eslint-disable-next-line n/no-sync
const typeDefs = loadFilesSync(path.join(__dirname, './**/*.gql'))
export default mergeTypeDefs(typeDefs)
