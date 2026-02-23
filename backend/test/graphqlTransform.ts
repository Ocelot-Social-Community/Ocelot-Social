import { parse } from 'graphql'

export default {
  process(sourceText: string) {
    return {
      code: `module.exports = ${JSON.stringify(parse(sourceText))};`,
    }
  },
}
