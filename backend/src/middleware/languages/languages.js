import LanguageDetect from 'languagedetect'
import sanitizeHtml from 'sanitize-html'

const removeHtmlTags = (input) => {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  })
}

const setPostLanguage = (text) => {
  const lngDetector = new LanguageDetect()
  lngDetector.setLanguageType('iso2')
  const result = lngDetector.detect(removeHtmlTags(text), 2)
  return {
    language: result[0][0],
    languageScore: result[0][1],
    secondaryLanguage: result[1][0],
    secondaryLanguageScore: result[1][1],
  }
}

export default {
  Mutation: {
    CreatePost: async (resolve, root, args, context, info) => {
      const languages = await setPostLanguage(args.content)
      args = {
        ...args,
        ...languages,
      }
      return resolve(root, args, context, info)
    },
    UpdatePost: async (resolve, root, args, context, info) => {
      const languages = await setPostLanguage(args.content)
      args = {
        ...args,
        ...languages,
      }
      return resolve(root, args, context, info)
    },
  },
}
