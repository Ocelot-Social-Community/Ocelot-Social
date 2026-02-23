import { parse } from 'graphql'

export default {
  process(sourceText: string, sourcePath: string) {
    try {
      return {
        code: `module.exports = ${JSON.stringify(parse(sourceText))};`,
      }
    } catch (error) {
      throw new Error(`Failed to parse ${sourcePath}: ${error instanceof Error ? error.message : error}`)
    }
  },
}
