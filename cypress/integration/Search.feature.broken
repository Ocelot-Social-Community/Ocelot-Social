Feature: Search
  As a user
  I would like to be able to search for specific words
  In order to find related content

  Background:
    Given the following "users" are in the database:
      | slug            | email                | password | id              | name            | termsAndConditionsAgreedVersion |
      | narrator        | narrator@example.org | 1234     | narrator        | Nathan Narrator | 0.0.4                           |
      | search-for-me   | u1@example.org       | 1234     | user-for-search | Search for me   | 0.0.4                           |
      | not-to-be-found | u2@example.org       | 1234     | just-an-id      | Not to be found | 0.0.4                           |
    And the following "posts" are in the database:
      | id | title                                         | content                                 |
      | p1 | 101 Essays that will change the way you think | 101 Essays, of course (PR)!             |
      | p2 | No content                                    | will be found in this post, I guarantee |
    And I am logged in as "narrator"
    And I navigate to page "/"

  Scenario: Search for specific words
    When I search for "Essays"
    And I wait for 3000 milliseconds
    Then I should have one item in the select dropdown
    Then I should see the following posts in the select dropdown:
      | title                                         |
      | 101 Essays that will change the way you think |

  Scenario: Press enter opens search page
    When I type "PR" and press Enter
    Then I am on page "/search/search-results"
    And the search parameter equals "?search=PR"
    Then I should see the following posts on the search results page:
      | title                                         |
      | 101 Essays that will change the way you think |

  Scenario: Press escape clears search
    When I type "Ess" and press escape
    Then the search field should clear

  Scenario: Select entry goes to post
    When I search for "Essays"
    And I wait for 3000 milliseconds
    And I select a post entry
    Then I am on page "/post/p1/101-essays-that-will-change-the-way-you-think"

  Scenario: Select dropdown content
    When I search for "Essays"
    Then I should have one item in the select dropdown
    Then I should see posts with the searched-for term in the select dropdown
    And I should not see posts without the searched-for term in the select dropdown

  Scenario: Search for users
    Given I search for "Search"
    Then I should have one item in the select dropdown
    And I should see the following users in the select dropdown:
      | slug            |
      | search-for-me   |
    And I select a user entry
    Then I am on page "/profile/user-for-search/search-for-me"