import path from 'node:path'

import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeResolvers } from '@graphql-tools/merge'

// the files must be correctly evaluated in built and dev state - therefore accept both js & ts files
const resolversArray = loadFilesSync(path.join(__dirname, './!(*.spec).(ts|js)'))
export default mergeResolvers(resolversArray)
