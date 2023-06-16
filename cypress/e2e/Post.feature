Feature: See a post
  As an logged in user
  I would like to see a post
  And to see the whole content of it

  Background:
    Given the following "users" are in the database:
      | slug     | email                | password | id             | name            | termsAndConditionsAgreedVersion |
      | peter-pan| peter@pan.com        | abcd     | id-of-peter-pan| Peter Pan       | 0.0.4                           |
      | narrator | narrator@example.org | 1234     | narrator       | Nathan Narrator | 0.0.4                           |
    And the following "posts" are in the database:
      | id         | title                   | slug                    | authorId        | content           |
      | aBcDeFgHiJ | previously created post | previously-created-post | id-of-peter-pan | with some content |
    And I am logged in as "narrator"

  Scenario: See a post on the newsfeed
    When I navigate to page "/"
    Then the post shows up on the newsfeed at position 1

  Scenario: Navigate to the Post Page
    When I navigate to page "/"
    And I click on "the first post"
    Then I am on page "/post/.*"
