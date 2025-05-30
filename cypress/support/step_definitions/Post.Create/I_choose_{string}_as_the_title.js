import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose {string} as the title', title => {
  const lastPost = {}
  lastPost.title = title.replace('\n', ' ')
  cy.task('pushValue', { name: 'lastPost', value: lastPost })
  cy.get('input[name="title"]').type(lastPost.title)
})
