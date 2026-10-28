Feature: Search
  As a user
  I would like to search from the header
  In order to get to what I look for without leaving the page

  # The results page itself (tabs, pagination, every resource type) is search/Results.feature.
  # This one is the header's dropdown: typing, Enter, Escape and picking an entry.

  Background:
    Given the following "users" are in the database:
      | slug            | email                | password | id              | name            | termsAndConditionsAgreedVersion |
      | narrator        | narrator@example.org | 1234     | narrator        | Nathan Narrator | 0.0.4                           |
      | search-for-me   | u1@example.org       | 1234     | user-for-search | Search for me   | 0.0.4                           |
      | not-to-be-found | u2@example.org       | 1234     | just-an-id      | Not to be found | 0.0.4                           |
    And the following "posts" are in the database:
      | id | title                                         | content                                 | authorId |
      | p1 | 101 Essays that will change the way you think | 101 Essays, of course!                  | narrator |
      | p2 | No content                                    | will be found in this post, I guarantee | narrator |
    And I am logged in as "narrator"
    And I navigate to page "/"

  Scenario: The dropdown lists the posts that contain the words
    When I search for "Essays"
    Then I should see the following posts in the select dropdown:
      | title                                         |
      | 101 Essays that will change the way you think |
    And I should not see "No content" in the select dropdown

  Scenario: Enter opens the results page
    When I type "Essays" and press Enter
    Then I am on page "/search/search-results"
    And the search parameter equals "?search=Essays"
    And I should see the following posts on the search results page:
      | title                                         |
      | 101 Essays that will change the way you think |

  Scenario: Escape clears the search field
    When I type "Ess" and press escape
    Then the search field should clear

  Scenario: Picking a post opens it
    When I search for "Essays"
    And I select a post entry
    Then I am on page "/post/p1/101-essays-that-will-change-the-way-you-think"

  Scenario: Picking a user opens their profile
    When I search for "Search"
    Then I should see the following users in the select dropdown:
      | name          |
      | Search for me |
    And I should not see "Not to be found" in the select dropdown
    When I select a user entry
    Then I am on page "/profile/user-for-search/search-for-me"
