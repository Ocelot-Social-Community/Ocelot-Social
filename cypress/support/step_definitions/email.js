import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('{string} should receive no chat notification email', (recipientEmailAddress) => {
  const emailTitle = 'Neue Chat-Nachricht | New chat message'
  
  cy.origin(
    Cypress.env('mailserverURL'),
    { args: { recipientEmailAddress, emailTitle } },
    ({ recipientEmailAddress, emailTitle }) => {
      const emailClientList = '.email-list'
      cy.visit('/')
      cy.get(emailClientList).should('be.visible')

      // check the email list for unread emails with the specific title and recipient address
      cy.get(emailClientList).find('li').then(($emails) => {
        if ($emails.length === 0) {
          expect($emails.length).to.equal(0)
          return
        }

        const unreadEmails = $emails.filter((_, email) => {
          const subjectText = Cypress.$(email).find('.title').text().trim()
          const senderEmail = Cypress.$(email).find('.subline-from').text().trim()
          const isUnread = Cypress.$(email).find('.unread-icon').not('.ng-hide').length > 0
          return subjectText.includes(emailTitle) && senderEmail === recipientEmailAddress && isUnread
        })

        expect(unreadEmails.length).to.equal(0)
      })
    },
  )
})
