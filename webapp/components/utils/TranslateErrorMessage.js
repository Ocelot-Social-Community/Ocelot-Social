export default (message, mapping, translate) => {
  let translatedMessage = null
  for (const [pattern, ident] of Object.entries(mapping)) {
    if (message.includes(pattern)) {
      translatedMessage = translate(ident)
    }
  }
  if (!translatedMessage) {
    translatedMessage = message
  }
  return translatedMessage
}
