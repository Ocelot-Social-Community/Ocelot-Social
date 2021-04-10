Feature: Create a post
  As an logged in user
  I would like to see a post
  And to see the whole content of it

  Background:
    Given I have an user account
    And I am logged in
    And I previously created a post

  Scenario: See a post on the landing page
    When I navigate to page "landing"
    Then the post shows up on the landing page at position 1

  Scenario: Navigate to the Post Page
    When I navigate to page "landing"
    And I click on "the first post"
    Then I am on page "post/..."
