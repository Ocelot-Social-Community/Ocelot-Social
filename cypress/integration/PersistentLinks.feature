Feature: Persistent Links
  As a user
  I want all links to carry permanent information that identifies the linked resource
  In order to have persistent links even if a part of the URL might change
  |      | Modifiable | Referenceable | Unique | Purpose                       |
  | --   | --         | --            | --     | --                            |
  | ID   | no         | yes           | yes    | Identity, Traceability, Links |
  | Slug | yes        | yes           | yes    | @-Mentions, SEO-friendly URL  |
  | Name | yes        | no            | no     | Search, self-description      |

  Background:
    Given the following "users" are in the database:
      | slug     | email                | password | id         | name            | termsAndConditionsAgreedVersion |
      | thehawk  | hawk@example.org     | abcd     | MHNqce98y1 | Stephen Hawking | 0.0.4                           |
      | narrator | narrator@example.org | 1234     | narrator   | Nathan Narrator | 0.0.4                           |
    And the following "posts" are in the database:
      | id         | title                                         | slug       |
      | bWBjpkTKZp | 101 Essays that will change the way you think | 101-essays |
    And I am logged in as "narrator"

  Scenario Outline: Link with healable information is valid and gets auto-completed
    When I navigate to page "<url>"
    Then I am on page "<redirectUrl>"
    Examples:
      | url                                 | redirectUrl                 | reason                 |
      | /profile/thehawk                    | /profile/MHNqce98y1/thehawk | Identifiable user slug |
      | /post/101-essays                    | /post/bWBjpkTKZp/101-essays | Identifiable post slug |
      | /profile/MHNqce98y1                 | /profile/MHNqce98y1/thehawk | Identifiable user ID   |
      | /post/bWBjpkTKZp                    | /post/bWBjpkTKZp/101-essays | Identifiable post ID   |
      | /profile/MHNqce98y1/stephen-hawking | /profile/MHNqce98y1/thehawk | Identifiable user ID takes precedence over slug |
      | /post/bWBjpkTKZp/the-way-you-think  | /post/bWBjpkTKZp/101-essays | Identifiable post ID takes precedence over slug |      
