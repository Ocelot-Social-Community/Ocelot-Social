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
  return lngDetector.detect(removeHtmlTags(text), 1)[0][0]
}

export default {
  Mutation: {
    CreatePost: async (resolve, root, args, context, info) => {
      args.language = await setPostLanguage(args.content)
      return resolve(root, args, context, info)
    },
    UpdatePost: async (resolve, root, args, context, info) => {
      args.language = await setPostLanguage(args.content)
      return resolve(root, args, context, info)
    },
  },
}
