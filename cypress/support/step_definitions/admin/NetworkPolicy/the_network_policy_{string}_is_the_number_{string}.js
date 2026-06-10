import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Deterministic precondition for an integer policy key: force it to a known
// number via the admin API (the e2e DB is wiped before every scenario, but the
// backend's in-memory policy cache survives). Sibling of the boolean
// "the network policy {string} is {string}" step.
defineStep('the network policy {string} is the number {string}', (key, value) => {
  const numberValue = Number(value)
  // Fail loudly on a non-integer precondition instead of silently sending NaN.
  expect(Number.isInteger(numberValue), 'integer network policy value').to.equal(true)
  cy.authenticateAs({ email: 'admin@example.org', password: '1234' }).then((client) =>
    client
      .request(
        `mutation ($key: PolicyKey!, $value: String!) {
          setPolicy(key: $key, value: $value) {
            key
            value
          }
        }`,
        { key, value: JSON.stringify(numberValue) },
      )
      .then((data) => {
        expect(data.setPolicy.value, `setPolicy("${key}")`).to.equal(JSON.stringify(numberValue))
      }),
  )
})
