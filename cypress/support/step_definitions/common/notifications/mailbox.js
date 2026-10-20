import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import {
  clearMailbox,
  mailboxSummary,
  mailsTo,
  settledMails,
  waitForMails,
} from '../../../mailbox'
import './../../../factories'

const emailOf = (slug) =>
  cy
    .fixtures()
    .then((fixtures) =>
      fixtures.cypher(
        `MATCH (:User {slug: $slug})-[:PRIMARY_EMAIL]->(email:EmailAddress)
         RETURN email.email AS email`,
        { slug },
      ),
    )
    .then((result) => {
      expect(result.records, `the e-mail address of "${slug}"`).to.have.length(1)
      return result.records[0].get('email')
    })

defineStep('the mailbox is empty', () => {
  clearMailbox()
})

// The mails to `address` with `subject` in their subject, counted only once the first has arrived
// and the mailbox has settled after it — so a duplicate sent a moment later is counted too.
const settledMailsTo = (address, subject) =>
  waitForMails(address, subject).then(() =>
    settledMails().then((mails) => ({
      mails,
      matching: mailsTo(mails, address).filter((mail) => mail.subject.includes(subject)),
    })),
  )

defineStep('{string} receives an e-mail {string}', (slug, subject) => {
  emailOf(slug)
    .then((address) => settledMailsTo(address, subject))
    .then(({ mails, matching }) => {
      expect(
        matching,
        `e-mails to "${slug}" with "${subject}" — the mailbox holds:\n${mailboxSummary(mails)}`,
      ).to.have.length(1)
      cy.wrap(matching[0], { log: false }).as('receivedMail')
    })
})

// Tells mails apart that share a subject, as chat messages do: by who they name.
defineStep('that e-mail names {string}', (name) => {
  cy.get('@receivedMail').then((mail) => {
    const text = new DOMParser().parseFromString(mail.html, 'text/html').body.textContent
    expect(text, `the e-mail "${mail.subject}"`).to.contain(name)
  })
})

// The steps below only after a mail the same action sent has arrived: see MAIL_SETTLE in
// cypress/support/mailbox.js.
defineStep('{string} receives no e-mail {string}', (slug, subject) => {
  emailOf(slug).then((address) =>
    settledMails().then((mails) => {
      expect(
        mailsTo(mails, address).filter((mail) => mail.subject.includes(subject)),
        `e-mails to "${slug}" with "${subject}" — the mailbox holds:\n${mailboxSummary(mails)}`,
      ).to.have.length(0)
    }),
  )
})

defineStep('{string} receives no e-mail', (slug) => {
  emailOf(slug).then((address) =>
    settledMails().then((mails) => {
      expect(
        mailsTo(mails, address),
        `e-mails to "${slug}" — the mailbox holds:\n${mailboxSummary(mails)}`,
      ).to.have.length(0)
    }),
  )
})

// Follows the link like a mail client would, minus the host: the backend writes its own
// CLIENT_URI into the mail (http://webapp:3000 inside the compose network).
defineStep('I follow the link {string} in that e-mail', (linkText) => {
  cy.get('@receivedMail').then((mail) => {
    const links = [
      ...new DOMParser().parseFromString(mail.html, 'text/html').querySelectorAll('a'),
    ].filter((a) => a.textContent.trim() === linkText)
    expect(links, `the link "${linkText}" in the e-mail "${mail.subject}"`).to.have.length(1)
    const url = new URL(links[0].getAttribute('href'))
    cy.visit(`${url.pathname}${url.search}${url.hash}`)
  })
})
