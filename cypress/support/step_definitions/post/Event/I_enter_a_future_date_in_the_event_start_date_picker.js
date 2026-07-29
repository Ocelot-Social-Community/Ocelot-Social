import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I enter a future date in the event start date picker', () => {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const formatted = `${day}.${month}.${year} 10:00`
  cy.get('.mx-datepicker').first().find('input').clear().type(formatted).type('{enter}')
})
