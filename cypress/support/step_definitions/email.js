import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

const emailClientList = '.email-list'


defineStep('the mailserver inbox is empty', () => {
  cy.request('DELETE', 'localhost:1080/email/all')
    .its('status')
    .should('equal', 200)
})

defineStep('{string} should receive {string} chat notification email referencing {string}', (recipientName, emailCount, senderName) => {
  cy.request('GET', 'http://localhost:1080/email').then(
    (response) => {
      expect(response.status).to.eq(200)
      cy.log(response.body)
      console.log
      expect(response.body).to.have.length(emailCount)
      const email = response.body[0]
      expect(email.read).to.be.false
      expect(email.subject).to.eq('ocelot.social  – Notification: New chat message')
      const assertedString = `Hello ${recipientName}`
      expect(email.text.toLowerCase()).to.include(assertedString.toLowerCase())
      expect(email.text).to.include(`from ${senderName}`)
      expect(email.html).to.include('/chat')
    }
  )
})

defineStep('{string} should receive no chat notification email', (recipientEmailAddress) => {
  const emailTitle = 'Neue Chat-Nachricht | New chat message'
  
  cy.origin(
    Cypress.env('mailserverURL'),
    { args: { emailClientList, emailTitle, recipientEmailAddress } },
    ({ emailClientList, emailTitle, recipientEmailAddress }) => {
      cy.visit('/')
      cy.get(emailClientList).should('be.visible')

      //----
      cy.get(emailClientList).then(($list) => {
        // Check if the list has child elements
        // const hasEmails = $list.children('li').length > 0

        if ($list.children('li').length > 0) {
          cy.get(emailClientList).find('li').then(($emails) => {
            const unreadEmails = $emails.filter((_, email) => {
              const subjectText = Cypress.$(email).find('.title').text().trim()
              const senderEmail = Cypress.$(email).find('.subline-from').text().trim()
              const isUnread = Cypress.$(email).find('.unread-icon').not('.ng-hide').length > 0
              return subjectText.includes(emailTitle) && senderEmail === recipientEmailAddress && isUnread
            })

            expect(unreadEmails.length).to.equal(0)
          })
        }
      })
    },
  )
})
