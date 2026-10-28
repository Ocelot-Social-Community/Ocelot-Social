Feature: Block a user
  As a user
  I'd like to have a button to block another user
  To prevent them from interacting with my contributions

  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name           | slug           | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 123      | id-of-peter-pan | Peter Pan      | peter-pan      | 0.0.4                           |
      | user@example.org     | 123      | harassing-user  | Harassing User | harassing-user | 0.0.4                           |
    And the following "posts" are in the database:
      | id         | title                   | slug                    | authorId        |
      | bWBjpkTKZp | previously created post | previously-created-post | id-of-peter-pan |
    And I am logged in as "peter-pan"

  Scenario: Block a user
    When I navigate to page "/profile/harassing-user"
    And I click on "Block user" from the content menu in the user info box
    Then I "should" see "Unblock user" from the content menu in the user info box
    When I navigate to my "Blocked users" settings page
    Then I can see the following table:
      |  | Name           | Slug            |
      |  | Harassing User | harassing-user  |

  Scenario: A user I blocked cannot comment on my posts
    Given "peter-pan" blocks "harassing-user"
    And I am logged in as "harassing-user"
    When I navigate to page "/post/bWBjpkTKZp/previously-created-post"
    Then they should see a text explaining why commenting is not possible
    And they should not see the comment form

  Scenario: Blocking ends following in both directions
    Given "peter-pan" follows "harassing-user"
    And "harassing-user" follows "peter-pan"
    When I navigate to page "/profile/harassing-user"
    And I click on "Block user" from the content menu in the user info box
    Then I should see the "Unblock user" button
    And I should not see the "Follow" button
    And I get removed from his follower collection
    When I am logged in as "harassing-user"
    And I navigate to page "/profile/peter-pan"
    Then I should not see the "Follow" button
    And I get removed from his follower collection

  Scenario: Posts of blocked users are not filtered from search results
    Given "harassing-user" writes the post "You can still see my posts"
    And "peter-pan" blocks "harassing-user"
    When I navigate to page "/"
    And I search for "see"
    Then I should see the following posts in the select dropdown:
      | title                      |
      | You can still see my posts |

  Scenario: Blocked users can still find my posts
    Given "peter-pan" blocks "harassing-user"
    And I am logged in as "harassing-user"
    When I navigate to page "/"
    And I search for "previously created"
    Then I should see the following posts in the select dropdown:
      | title                   |
      | previously created post |

  Scenario: Blocked users do not see in their list who blocked them
    Given "harassing-user" blocks "peter-pan"
    When I navigate to page "/"
    And I navigate to my "Blocked users" settings page
    Then I should see no users in my blocked users list

  Scenario: Blocked users cannot unblock themselves, nor follow
    Given "harassing-user" blocks "peter-pan"
    When I navigate to page "/profile/harassing-user"
    Then I should not see the "Unblock user" button
    And I should not see the "Follow" button
    And I "should not" see "Unblock user" from the content menu in the user info box
