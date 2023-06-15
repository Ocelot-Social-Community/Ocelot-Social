import path from 'path'
import { fileLoader, mergeResolvers } from 'merge-graphql-schemas'

// the files must be correctly evaluated in built and dev state - therefore accept both js & ts files
const resolversArray = fileLoader(path.join(__dirname, './!(*.spec).(ts|js)'))
export default mergeResolvers(resolversArray)
