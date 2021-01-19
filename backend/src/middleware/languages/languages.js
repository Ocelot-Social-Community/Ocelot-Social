import LanguageDetect from 'languagedetect'

const setPostLanguage = (text) => {
  console.log(text)
  const lngDetector = new LanguageDetect()
  lngDetector.setLanguageType('iso2')
  const result = lngDetector.detect(text, 2)
  console.log(result)
  return result[0][0]
}

export default {
  Mutation: {
    CreatePost: async (resolve, root, args, context, info) => {
      console.log('CreatePost, language', args)
      args.language = await setPostLanguage(args.content)
      return resolve(root, args, context, info)
    },
    UpdatePost: async (resolve, root, args, context, info) => {
      args.language = await setPostLanguage(args.content)
      return resolve(root, args, context, info)
    },
  },
}
