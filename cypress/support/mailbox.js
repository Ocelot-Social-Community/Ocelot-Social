// The mails the e2e backend sent, read from maildev's REST API (the `mailserver` service of
// docker-compose.test.yml). Mail goes out after the mutation has answered — the notification
// middleware does not wait for it — so every read here polls.
//
// MAIL_TIMEOUT: how long to wait for an expected mail.
// MAIL_SETTLE: how long the mailbox has to stay unchanged before a scenario may conclude that a
// mail did NOT come. Only ever used after a mail the same action sent HAS come, so the action is
// known to be through; this covers the sends that left alongside it.

const MAILDEV_URL = Cypress.expose('MAILDEV_URL')
const MAIL_TIMEOUT = Number(Cypress.expose('MAIL_TIMEOUT'))
const MAIL_SETTLE = Number(Cypress.expose('MAIL_SETTLE'))
const POLL_INTERVAL = 250

const allMails = () =>
  cy.request({ url: `${MAILDEV_URL}/api/email`, log: false }).its('body', { log: false })

const isTo = (mail, address) => mail.to.some((recipient) => recipient.address === address)

const summary = (mails) =>
  mails.length
    ? mails.map((mail) => `${mail.to.map((to) => to.address).join(', ')}: ${mail.subject}`).join('\n')
    : '(empty)'

export const clearMailbox = () =>
  cy.request({ method: 'DELETE', url: `${MAILDEV_URL}/api/email/all`, log: false })

// The mails to `address` whose subject contains `subject`, as soon as there is one.
export const waitForMails = (address, subject, startedAt = Date.now()) =>
  allMails().then((mails) => {
    const found = mails.filter((mail) => isTo(mail, address) && mail.subject.includes(subject))
    if (found.length) {
      return found
    }
    if (Date.now() - startedAt > MAIL_TIMEOUT) {
      throw new Error(
        `No e-mail to ${address} with "${subject}" in its subject within ${MAIL_TIMEOUT} ms. ` +
          `The mailbox holds:\n${summary(mails)}`,
      )
    }
    cy.wait(POLL_INTERVAL, { log: false })
    return waitForMails(address, subject, startedAt)
  })

// All mails, once their number has not changed for MAIL_SETTLE ms.
export const settledMails = (previousCount = -1, stableSince = Date.now()) =>
  allMails().then((mails) => {
    if (mails.length !== previousCount) {
      cy.wait(POLL_INTERVAL, { log: false })
      return settledMails(mails.length, Date.now())
    }
    if (Date.now() - stableSince >= MAIL_SETTLE) {
      return mails
    }
    cy.wait(POLL_INTERVAL, { log: false })
    return settledMails(previousCount, stableSince)
  })

export const mailsTo = (mails, address) => mails.filter((mail) => isTo(mail, address))

export { summary as mailboxSummary }
