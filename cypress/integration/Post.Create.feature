Feature: Create a post
  As an logged in user
  I would like to create a post
  To say something to everyone in the community

  Background:
    Given I have an user account
    And I am logged in
    And I navigate to page "landing"

  Scenario: Create a post
    When I click on "create post button"
    Then I am on page "post/create"
    When I choose "My first post" as the title
    And I choose the following text as content:
      """
      Ocelot.social is a free and open-source social network
      for active citizenship.
      """
    And I click on "save button"
    Then I am on page ".../my-first-post"
    And the post was saved successfully
