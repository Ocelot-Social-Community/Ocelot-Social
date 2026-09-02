import path from 'node:path'

import { loadFiles } from '@graphql-tools/load-files'
import { mergeResolvers } from '@graphql-tools/merge'

// The async loader, and top-level await to keep the module's shape. `loadFilesSync` reaches the
// resolver modules through `require()`, which cannot load ESM — under ESM it fails with "Cannot
// require() ES Module … synchronously". `loadFiles` uses dynamic import instead. Top-level await
// is what lets this stay a plain default export rather than a promise every consumer has to
// unwrap; it is available because this package is ESM (and would be the one thing that stops
// `require(esm)` from working, which nothing here does).
// the files must be correctly evaluated in built and dev state - therefore accept both js & ts files
const resolversArray = await loadFiles(path.join(import.meta.dirname, './!(*.spec|index).(ts|js)'))
export default mergeResolvers(resolversArray)
