import { Given } from "cypress-cucumber-preprocessor/steps";
import 'cypress-network-idle';

Given('somebody reported the following posts:', table => {
  const reportIdRegex = /^[0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12}$/
  cy.intercept({
    method: 'POST',
    url: '/',
    hostname: 'localhost',
  }).as('postToLocalhost')

  table.hashes().forEach(({ submitterEmail, resourceId, reasonCategory, reasonDescription }) => {
    const submitter = {
      email: submitterEmail,
      password: '1234'
    }
    cy.factory()
      .build('user', {}, submitter)
      .authenticateAs(submitter)
      .mutate(`mutation($resourceId: ID!, $reasonCategory: ReasonCategory!, $reasonDescription: String!) {
        fileReport(resourceId: $resourceId, reasonCategory: $reasonCategory, reasonDescription: $reasonDescription) {
          reportId
        }
      }`, {
        resourceId,
        reasonCategory,
        reasonDescription
      })
      cy.wait(['@postToLocalhost']).then((interception) => {
        cy.wrap(interception.response.statusCode).should('eq', 200)
      })
      cy.wait(['@postToLocalhost']).then((interception) => {
        cy.wrap(interception.response.statusCode).should('eq', 200)
        cy.wrap(interception.response.body)
          .should('have.nested.property', 'data.fileReport.reportId')
          .and('match', reportIdRegex)
      })
      cy.waitForNetworkIdle(2000)
  })
})