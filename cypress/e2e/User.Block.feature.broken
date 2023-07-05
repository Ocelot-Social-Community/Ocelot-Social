Feature: User - block an user
  As a user
  I'd like to have a button to block another user
  To prevent him from seeing and interacting with my contributions

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
    When I navigate to page "profile/harassing-user"
    And I click on "Block user" from the content menu in the user info box
    And I "should" see "Unblock user" from the content menu in the user info box
    And I navigate to my "Blocked users" settings page
    Then I can see the following table:
      | Avatar | Name           |
      |        | Harassing User |

  Scenario: Blocked user cannot interact with my contributions
    Given I block the user "Harassing User"
    And I am logged in as "harassing-user"
    And I navigate to page "/post/previously-created-post"
    Then they should see a text explaining why commenting is not possible
    And they should not see the comment form

  Scenario: Block a previously followed user
    Given I follow the user "Harassing User"
    When I navigate to page "/profile/harassing-user"
    And I click on "Block user" from the content menu in the user info box
    And I get removed from his follower collection
    And I "should" see "Unblock user" from the content menu in the user info box

  Scenario: Posts of blocked users are not filtered from search results
    Given "harassing-user" wrote a post "You can still see my posts"
    And I block the user "Harassing User"
    When I search for "see"
    And I wait for 3000 milliseconds
    Then I should see the following posts in the select dropdown:
      | title                      |
      | You can still see my posts |

  Scenario: Blocked users can still see my posts
    When I block the user "Harassing User"
    And I am logged in as "harassing-user"
    And I navigate to page "/"
    And I search for "previously created"
    And I wait for 3000 milliseconds
    Then I should see the following posts in the select dropdown:
      | title                   |
      | previously created post |

  Scenario: Blocked users cannot see they are blocked in their list
    Given a user has blocked me 
    And I navigate to page "/"
    And I navigate to my "Blocked users" settings page
    Then I should see no users in my blocked users list

  Scenario: Blocked users should not see link or button to unblock, only blocking users
    Given a user has blocked me
    When I navigate to page "/profile/harassing-user"
    And I should see the "Follow" button
    And I should not see "Unblock user" button
    And I "should not" see "Unblock user" from the content menu in the user info box
