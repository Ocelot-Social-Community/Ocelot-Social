import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I upload the file {string} in the chat', (filename) => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-svg-button', { timeout: 10000 })
    .filter(':has(#vac-icon-paperclip)')
    .click()

  cy.get('vue-advanced-chat')
    .shadow()
    .find('input[type="file"]', { timeout: 5000 })
    .selectFile(`cypress/fixtures/${filename}`, { force: true })

  // Wait for file preview and click send
  cy.get('vue-advanced-chat')
    .shadow()
    .find('.vac-icon-send, .vac-svg-button:has(#vac-icon-send)', { timeout: 10000 })
    .click()
})
