import { h } from 'vue'

import StoryWrapper, { DEFAULT_THEME } from './StoryWrapper.vue'

export const withVuetifyTheme = (storyFn, context) => {
  // Pull our global theme variable, fallback to DEFAULT_THEME
  const themeName = context.globals.theme || DEFAULT_THEME
  const story = storyFn()

  return () => {
    return h(
      StoryWrapper,
      { themeName }, // Props for StoryWrapper
      {
        // Puts your story into StoryWrapper's "story" slot with your story args
        story: () => h(story, { ...context.args }),
      },
    )
  }
}
