import LanguageDetect from 'languagedetect'
import { removeHtmlTags } from '../helpers/cleanHtml'

const setPostLanguage = (text, defaultLanguage) => {
  const lngDetector = new LanguageDetect()
  lngDetector.setLanguageType('iso2')
  let languages = lngDetector.detect(removeHtmlTags(text), 1)
  if (!(Array.isArray(languages) && languages.length > 0)) {
    languages = [[defaultLanguage, 1.0]]
  }
  return languages[0][0]
}

export default {
  Mutation: {
    CreatePost: async (resolve, root, args, context, info) => {
      args.language = await setPostLanguage(args.content, context.user.locale)
      return resolve(root, args, context, info)
    },
    UpdatePost: async (resolve, root, args, context, info) => {
      args.language = await setPostLanguage(args.content, context.user.locale)
      return resolve(root, args, context, info)
    },
  },
}
