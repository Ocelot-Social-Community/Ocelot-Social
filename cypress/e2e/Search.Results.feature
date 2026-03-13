Feature: Search Results Page
  As a user
  I would like to see search results for posts, users, groups, and hashtags
  In order to find specific content on the platform

  Background:
    Given the following "users" are in the database:
      | slug     | email                | password | id       | name           | termsAndConditionsAgreedVersion |
      | narrator | narrator@example.org | 1234     | narrator | Nathan Narrator | 0.0.4                           |
      | jenny    | jenny@example.org    | 1234     | jenny-id | Jenny Rostock   | 0.0.4                           |
      | finduser | finduser@example.org | 1234     | finduser | Find me user    | 0.0.4                           |
    And the following "tags" are in the database:
      | id          |
      | find-me-tag |
    And the following "posts" are in the database:
      | id | title            | content                   | authorId | tagIds      |
      | p1 | Find me post one | This is the first result  | narrator | find-me-tag |
      | p2 | Find me post two | This is the second result | narrator | find-me-tag |
    And the following "groups" are in the database:
      | id      | name              | slug              | about               | description                                                                                                            | ownerId  |
      | group-1 | Discoverable club | discoverable-club | A group to be found | This is a detailed description for the test group so it has enough characters to pass the minimum length of one hundred | narrator |
    And I am logged in as "narrator"

  Scenario: Post results are displayed
    When I navigate to page "/search/search-results?search=Find"
    Then I should see the "Post" tab as active
    And I should see 2 post results

  Scenario: User results are displayed
    When I navigate to page "/search/search-results?search=Jenny"
    Then I should see the "User" tab as active
    And I should see 1 user results

  Scenario: Group results are displayed
    When I navigate to page "/search/search-results?search=Discoverable club"
    Then I should see the "Group" tab as active
    And I should see 1 group results

  Scenario: Hashtag results are displayed
    When I navigate to page "/search/search-results?search=find-me-tag"
    Then I should see the "Hashtag" tab as active
    And I should see 1 hashtag results

  Scenario: Switching tabs hides previous results
    When I navigate to page "/search/search-results?search=Find"
    And I click on the "User" tab
    Then I should not see post results

  Scenario: Pagination for many posts
    Given the following "posts" are in the database:
      | id  | title             | content        | authorId |
      | p3  | Find me post 3    | Some content 3 | narrator |
      | p4  | Find me post 4    | Some content 4 | narrator |
      | p5  | Find me post 5    | Some content 5 | narrator |
      | p6  | Find me post 6    | Some content 6 | narrator |
      | p7  | Find me post 7    | Some content 7 | narrator |
      | p8  | Find me post 8    | Some content 8 | narrator |
      | p9  | Find me post 9    | Some content 9 | narrator |
      | p10 | Find me post 10   | Some content 10 | narrator |
      | p11 | Find me post 11   | Some content 11 | narrator |
      | p12 | Find me post 12   | Some content 12 | narrator |
      | p13 | Find me post 13   | Some content 13 | narrator |
    When I navigate to page "/search/search-results?search=Find"
    Then I should see pagination buttons
    And I should see page "Page 1 / 2"
    When I click on the next page button
    Then I should see page "Page 2 / 2"
