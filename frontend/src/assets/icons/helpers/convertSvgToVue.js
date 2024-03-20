// usage:
// put source files in folder 'svgs'
// folder 'svgComponents' have to exist
// call script with command 'node convertSvgToVue.js'
// delete source files or whole folder
// run 'lint --fix' afterwards

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, parse } from 'path'

const inputDir = '../svgs'
const outputDir = '../svgComponents'

readdirSync(inputDir).forEach((file) => {
  const filePath = join(inputDir, file)
  const fileName = parse(file).name
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const content = readFileSync(filePath, 'utf8')
  const vueComponent = `<!-- eslint-disable vue/multi-word-component-names -->\n<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->\n<template>\n${content}\n</template>\n\n<script lang="ts">\nimport { defineComponent } from 'vue';\n\nexport default defineComponent({});\n</script>\n`

  const outputFilePath = join(outputDir, `${fileName}.vue`)
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(outputFilePath, vueComponent)
})
