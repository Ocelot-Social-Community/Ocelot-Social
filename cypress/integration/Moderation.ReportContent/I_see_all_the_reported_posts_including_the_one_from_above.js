import { Then } from "cypress-cucumber-preprocessor/steps";

Then('I see all the reported posts including the one from above', () => {
  cy.intercept({
    method: 'POST',
    url: '/api',
    hostname: 'localhost',
  }).as('postToApi')

  cy.wait(['@postToApi']).then((interception) => {
    console.log('Cypress interception:', interception)
    cy.wrap(interception.response.statusCode).should('eq', 200)
    cy.wrap(interception.request.body)
      .should('have.property', 'query', `query ($orderBy: ReportOrdering, $first: Int, $offset: Int, $reviewed: Boolean, $closed: Boolean) {
  reports(orderBy: $orderBy, first: $first, offset: $offset, reviewed: $reviewed, closed: $closed) {
    id
    createdAt
    updatedAt
    closed
    reviewed {
      createdAt
      updatedAt
      disable
      moderator {
        id
        slug
        name
        __typename
      }
      __typename
    }
    resource {
      __typename
      ... on User {
        id
        slug
        name
        disabled
        deleted
        __typename
      }
      ... on Comment {
        id
        contentExcerpt
        disabled
        deleted
        author {
          id
          slug
          name
          disabled
          deleted
          __typename
        }
        post {
          id
          slug
          title
          disabled
          deleted
          __typename
        }
        __typename
      }
      ... on Post {
        id
        slug
        title
        disabled
        deleted
        author {
          id
          slug
          name
          disabled
          deleted
          __typename
        }
        __typename
      }
    }
    filed {
      submitter {
        id
        slug
        name
        disabled
        deleted
        __typename
      }
      createdAt
      reasonCategory
      reasonDescription
      __typename
    }
    __typename
  }
}
`
    )
    cy.wrap(interception.response.body)
      .should('have.nested.property', 'data.reports.0')
      // .and('not.be', null)
  })

  cy.get('table tbody').within(() => {
    cy.contains('tr', 'The Truth about the Holocaust')
  })
})
