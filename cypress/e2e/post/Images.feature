Feature: Upload/Delete images on posts
  As a user
  I would like to be able to add/delete an image to/from my Post
  So that I can personalize my posts

  Background:
    Given the following "users" are in the database:
      | slug     | email                | password | id             | name            | termsAndConditionsAgreedVersion |
      | narrator | narrator@example.org | 1234     | narrator       | Nathan Narrator | 0.0.4                           |
    And the following "posts" are in the database:
      | authorId | id | title              | content              | 
      | narrator | p1 | Post to be updated | successfully updated |
    And I am logged in as "narrator"
    And I navigate to page "/"

  Scenario: Create a Post with a Teaser Image
    When I click on "create post button"
    Then I wait for 750 milliseconds
    Then I should be able to "add" a teaser image
    And I add all required fields
    And I click on "save button"
    And I wait for 750 milliseconds
    Then I am on page "/post/.*/new-post"
    And I wait for 750 milliseconds
    And the post was saved successfully with the "new" teaser image

  Scenario: Update a Post to add an image
    Given I navigate to page "/post/edit/p1"
    Then I wait for 750 milliseconds
    And I should be able to "change" a teaser image
    And I click on "save button"
    Then I see a toaster with "Saved!"
    And I wait for 750 milliseconds
    And I am on page "/post/.*/post-to-be-updated"
    And I wait for 750 milliseconds
    Then the post was saved successfully with the "updated" teaser image
  
  Scenario: Add image, then add a different image
    When I click on "create post button"
    Then I wait for 750 milliseconds
    Then I should be able to "add" a teaser image
    And I should be able to "change" a teaser image
    And the first image should not be displayed anymore

  Scenario: Add image, then delete it
    When I click on "create post button"
    Then I wait for 750 milliseconds
    Then I should be able to "add" a teaser image
    Then I should be able to "remove" a teaser image
    And I add all required fields
    And I click on "save button"
    And I wait for 750 milliseconds
    Then I am on page "/post/.*/new-post"
    And I wait for 750 milliseconds
    And the "new" post was saved successfully without a teaser image

  Scenario: Delete existing image
    Given I navigate to page "/post/edit/p1"
    Then I wait for 750 milliseconds
    And my post has a teaser image
    Then I should be able to "remove" a teaser image
    And I click on "save button"
    And I wait for 750 milliseconds
    Then I am on page "/post/.*/post-to-be-updated"
    And I wait for 750 milliseconds
    And the "updated" post was saved successfully without a teaser image