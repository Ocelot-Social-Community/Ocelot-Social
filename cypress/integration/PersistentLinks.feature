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
    Given I have an user account
    And I am logged in
    And the following "users" are in the database:
      | id         | name            | slug    |
      | MHNqce98y1 | Stephen Hawking | thehawk |
    And the following "posts" are in the database:
      | id         | title                                         | slug       |
      | bWBjpkTKZp | 101 Essays that will change the way you think | 101-essays |

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
