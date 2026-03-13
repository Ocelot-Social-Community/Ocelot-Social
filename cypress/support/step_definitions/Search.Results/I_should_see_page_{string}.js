import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see page {string}', (page) => {
  cy.get('.pagination-pageCount').first().invoke('text').then((text) => {
    expect(text.replace(/\s+/g, ' ').trim()).to.contain(page)
  })
})
