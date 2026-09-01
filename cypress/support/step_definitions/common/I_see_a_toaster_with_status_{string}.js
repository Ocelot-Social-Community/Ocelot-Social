import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

const TOAST_CLASS = {
  success: 'iziToast-color-green',
  error: 'iziToast-color-red',
}

// A toast auto-dismisses after TOAST_TIMEOUT (5 s by default, 15 s in the e2e stack), so
// asserting on the live DOM cannot tell "no toast was ever raised" from "the toast came and
// went while an earlier step was still waiting" — both surface as "never found it". That
// ambiguity is what made the policy steps flaky, and it is why the e2e stack had to raise
// TOAST_TIMEOUT in the first place (see docker-compose.test.yml).
//
// So record every toast the moment it enters the document and assert against the record: the
// assertion no longer races the dismissal, and a failure can name the toasts that DID appear
// instead of just reporting an absent element.
const toastLog = []

const capture = (element) => {
  if (!toastLog.includes(element)) toastLog.push(element)
}

// iziToast completes the class list right after inserting the element, so the log keeps
// element references and the colour is read at assertion time rather than at capture time.
const observeToasts = (win) => {
  toastLog.length = 0
  const observer = new win.MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node.nodeType !== win.Node.ELEMENT_NODE) return
        if (node.classList.contains('iziToast')) capture(node)
        node.querySelectorAll('.iziToast').forEach(capture)
      })
    })
  })
  observer.observe(win.document, { childList: true, subtree: true })
}

Cypress.on('window:before:load', observeToasts)

// A page load resets the log via the hook above, which covers every scenario that visits a
// page. This is the belt to that suspenders: without it, a scenario asserting a toast before
// its first visit could be satisfied by the previous scenario's toast.
beforeEach(() => {
  toastLog.length = 0
})

defineStep('I see a toaster with status {string}', (status) => {
  const className = TOAST_CLASS[status]
  if (!className) {
    // The step *is* the assertion: an unknown status (typo in the feature file or an
    // unsupported value) must fail loudly instead of passing with no check at all.
    throw new Error(`Unknown toaster status "${status}"; expected "success" or "error".`)
  }
  cy.wrap(null, { log: false }).should(() => {
    const seen = toastLog.map((element) => element.className)
    expect(
      seen.some((classNames) => classNames.includes(className)),
      `a "${status}" toaster (.${className}) was raised; toasters seen: ${
        seen.join(' | ') || '(none)'
      }`,
    ).to.equal(true)
  })
})
