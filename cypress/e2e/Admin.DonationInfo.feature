Feature: Admin sets donations info settings
  As an admin
  I want to switch the donation info on and off and like to change to donations goal and progress
  In order to manage the funds

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
    Given the following "donations" are in the database:
      | id | showDonations | goal    | progress   |
      | d1 | x             | 15000.0 | 7000.0     |

  Scenario: The donation info is visible on the index page by default
    When I am logged in as "user"
    And I navigate to page "/"
    Then the donation info is "visible"
    And the donation info contains goal "15,000" and progress "7,000"

  Scenario: Admin changes the donation info to be invisible
    When I am logged in as "admin"
    And I navigate to page "/admin/donations"
    Then I click the checkbox show donations progress bar and save
    And I navigate to page "/"
    Then the donation info is "invisible"
