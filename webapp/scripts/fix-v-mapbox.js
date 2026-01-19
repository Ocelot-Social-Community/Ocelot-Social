#!/usr/bin/env node
/**
 * This script patches v-mapbox to fix the templateRefs issue with Vue 2.6 + @vue/composition-api.
 *
 * The problem: v-mapbox uses `ref(context.refs)` in setup(), but context.refs is empty
 * until the component is mounted in Vue 2.6 with @vue/composition-api.
 *
 * The fix: Replace the setup function to use a reactive getter that accesses $refs at runtime.
 */
const fs = require('fs')
const path = require('path')

const vmapboxFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'v-mapbox',
  'dist',
  'v-mapbox.esm.js',
)

if (fs.existsSync(vmapboxFile)) {
  let content = fs.readFileSync(vmapboxFile, 'utf8')

  // Check if already patched
  if (content.includes('// PATCHED for Vue 2.6')) {
    // eslint-disable-next-line no-console
    console.log('v-mapbox already patched')
    process.exit(0)
  }

  // Find and replace the problematic setup function
  // Original: setup(_, context) { const templateRefs = ref(context.refs); return { templateRefs }; }
  const originalSetup =
    /setup\(_, context\)\s*\{\s*const templateRefs\s*=\s*ref\(context\.refs\);\s*return\s*\{\s*templateRefs\s*\};\s*\}/

  const patchedSetup = `setup(_, context) {
    // PATCHED for Vue 2.6 + @vue/composition-api compatibility
    // Use a computed-like approach that accesses $refs at runtime
    const templateRefs = ref({});
    return { templateRefs };
  }`

  if (originalSetup.test(content)) {
    content = content.replace(originalSetup, patchedSetup)

    // Also patch the $_loadMap method to use this.$refs directly
    content = content.replace(
      /container:\s*this\.templateRefs\.container/g,
      'container: this.$refs.container',
    )

    fs.writeFileSync(vmapboxFile, content)
    // eslint-disable-next-line no-console
    console.log('Patched v-mapbox for Vue 2.6 compatibility')
  } else {
    // eslint-disable-next-line no-console
    console.log('v-mapbox setup pattern not found - may already be compatible or structure changed')
  }
} else {
  // eslint-disable-next-line no-console
  console.log('v-mapbox not installed, skipping patch')
}
