// eslint-disable-next-line import-x/no-unassigned-import
import '@fontsource-variable/inter'

// eslint-disable-next-line import-x/no-unassigned-import, import-x/no-relative-parent-imports
import '../src/styles/index.css'
// eslint-disable-next-line import-x/no-unassigned-import
import './storybook.css'

export const parameters = {
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/i,
    },
  },
}
