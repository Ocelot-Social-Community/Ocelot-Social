import LanguageDetect from 'languagedetect'

const setPostLanguage = (text) => {
  const lngDetector = new LanguageDetect()
  lngDetector.setLanguageType('iso2')
  const result = lngDetector.detect(text, 2)
  return result[0][0]
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
