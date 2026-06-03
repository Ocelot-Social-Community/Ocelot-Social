import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Deterministic precondition: force a policy key to a known value via the admin
// API. The e2e DB is wiped before every scenario, but the backend's in-memory
// policy cache survives the wipe — so we set the value explicitly rather than
// relying on whatever a previous scenario left behind. Reused (as When/Then too)
// to drive a live change from a side channel while a client stays open.
defineStep('the network policy {string} is {string}', (key, value) => {
  const booleanValue = value === 'true'
  cy.authenticateAs({ email: 'admin@example.org', password: '1234' }).then((client) =>
    client.request(
      `mutation ($key: String!, $value: String!) {
        setPolicy(key: $key, value: $value) {
          key
          value
        }
      }`,
      { key, value: JSON.stringify(booleanValue) },
    ),
  )
})
