Feature: Admin pins a post
  As an admin
  I want to pin a post so that it always appears at the top
  In order to make sure all network users read it
  e.g. notify people about security incidents, maintenance downtimes

  Background:
    Given the following "users" are in the database:
      | slug  | email             | password | id    | name      | role  | termsAndConditionsAgreedVersion |
      | user  | user@example.org  | abcd     | user  | User-Chad | user  | 0.0.4                           |
      | admin | admin@example.org | 1234     | admin | Admin-Man | admin | 0.0.4                           |
    Given the following "posts" are in the database:
      | id | title                       | pinned | createdAt  |
      | p1 | Some other post             |        | 2020-01-21 |
      | p2 | Houston we have a problem   | x      | 2020-01-20 |
      | p3 | Yet another post            |        | 2020-01-19 |

  Scenario: Pinned post always appears on the top of the newsfeed
    When I am logged in as "user"
    And I navigate to page "/"
    Then the first post on the newsfeed has the title:
      """
      Houston we have a problem
      """
    And the post with title "Houston we have a problem" has a ribbon for pinned posts

  Scenario: Ordinary users cannot pin a post
    When I am logged in as "user"
    And I navigate to page "/"
    And I open the content menu of post "Yet another post"
    Then there is no button to pin a post

  Scenario: Admins are allowed to pin a post
    When I am logged in as "admin"
    And I navigate to page "/"
    And I open the content menu of post "Yet another post"
    And I click on "pin post"
    Then I see a toaster with "Post pinned successfully"
    And the first post on the newsfeed has the title:
      """
      Yet another post
      """
    And the post with title "Yet another post" has a ribbon for pinned posts
