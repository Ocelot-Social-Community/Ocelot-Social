import type { Preview } from "@storybook/vue3";
import vuetify from '../renderer/vuetify'
import { withVuetifyTheme } from './withVuetifyTheme.decorator';
// .storybook/preview.js

import { setup } from '@storybook/vue3';

setup((app) => {
  // Registers your app's plugins into Storybook
  app.use(vuetify);
});

export const decorators = [withVuetifyTheme];

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'paintbrush',
      // Array of plain string values or MenuItem shape
      items: [
        { value: 'light', title: 'Light', left: '🌞' },
        { value: 'dark', title: 'Dark', left: '🌛' },
      ],
      // Change title based on selected value
      dynamicTitle: true,
    },
  },
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
