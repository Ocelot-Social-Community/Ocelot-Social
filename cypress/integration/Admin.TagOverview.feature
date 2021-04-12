Feature: Admin tag overview
  As a database administrator
  I would like to see a overview of all tags and their usage
  In order to be able to decide which tags are popular or not

  Background:
    Given the following "users" are in the database:
      | slug  | email             | password | id    | name      | role  | termsAndConditionsAgreedVersion |
      | admin | admin@example.org | 1234     | admin | Admin-Man | admin | 0.0.4                           |
      | u1    | u1@example.org    | 1234     | u1    | User1     | user  | 0.0.4                           |
      | u2    | u2@example.org    | 1234     | u2    | User2     | user  | 0.0.4                           |
      | u3    | u3@example.org    | 1234     | u3    | User3     | user  | 0.0.4                           |
    And the following "tags" are in the database:
      | id        |
      | Ecology   |
      | Nature    | 
      | Democracy |
    And the following "posts" are in the database:
      | id | title      | authorId | tagIds             |
      | p1 | P1 from U1 | u1       | Nature, Democracy  |
      | p2 | P2 from U2 | u2       | Ecology, Democracy |
      | p3 | P3 from U3 | u3       | Nature, Democracy  |
    And I am logged in as "admin"

  Scenario: See an overview of tags
    When I navigate to page "/admin/hashtags"
    Then I can see the following table:
      | No. | Hashtags   | Users | Posts |
      | 1   | #Democracy | 3     | 3     |
      | 2   | #Nature    | 2     | 2     |
      | 3   | #Ecology   | 1     | 1     |