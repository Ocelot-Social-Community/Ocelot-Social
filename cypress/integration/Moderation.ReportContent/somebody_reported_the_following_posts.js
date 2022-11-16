import { Given } from "cypress-cucumber-preprocessor/steps";
import { gql } from '../../../backend/src/helpers/jest'

Given('somebody reported the following posts:', table => {
  table.hashes().forEach(({ submitterEmail, resourceId, reasonCategory, reasonDescription }) => {
    const submitter = {
      email: submitterEmail,
      password: '1234'
    }
    cy.factory()
      .build('user', {}, submitter)
      .authenticateAs(submitter)
      .mutate(gql`mutation($resourceId: ID!, $reasonCategory: ReasonCategory!, $reasonDescription: String!) {
        fileReport(resourceId: $resourceId, reasonCategory: $reasonCategory, reasonDescription: $reasonDescription) {
          reportId
        }
      }`, {
        resourceId,
        reasonCategory,
        reasonDescription
      })
  })
})