module.exports = function (api) {
  api.cache(true)

  const presets = ['@babel/preset-env']
  const plugins = [
    [
      'component',
      {
        styleLibraryName: 'theme-chalk',
      },
    ],
  ]

  if (process.env.NODE_ENV === 'test') {
    plugins.push('require-context-hook')
  }

  return {
    presets,
    plugins,
  }
}
