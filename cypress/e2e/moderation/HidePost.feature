Feature: Hide Posts
  As a moderator
  I would like to be able to hide posts from the public
  to enforce our network's code of conduct and/or legal regulations

  Background:
    Given the following "users" are in the database:
      | slug      | email                 | password | id        | name      | role      | termsAndConditionsAgreedVersion |
      | user      | user@example.org      | abcd     | user      | User-Chad | user      | 0.0.4                           |
      | moderator | moderator@example.org | 1234     | moderator | Mod-Man   | moderator | 0.0.4                           |
    Given the following "posts" are in the database:
      | id | title                       | deleted | disabled |
      | p1 | This post should be visible |         |          |
      | p2 | This post is disabled       |         | x        |
      | p3 | This post is deleted        | x       |          |

  Scenario: Disabled posts don't show up on the newsfeed as user
    When I am logged in as "user"
    And I navigate to page "/"
    Then I should see only 1 posts on the newsfeed
    And the first post on the newsfeed has the title:
      """
      This post should be visible
      """

  Scenario: Disabled posts show up on the newsfeed as moderator
    When I am logged in as "moderator"
    And I navigate to page "/"
    Then I should see only 2 posts on the newsfeed
    And the first post on the newsfeed has the title:
      """
      This post is disabled
      """

  Scenario: Visiting a disabled post's page should return 404
    Given I am logged in as "user"
    Then the page "/post/this-post-is-disabled" returns a 404 error with a message:
      """
      This post could not be found
      """
