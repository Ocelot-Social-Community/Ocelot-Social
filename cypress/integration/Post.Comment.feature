Feature: Comments on post
  As a user
  I want to comment and see comments on contributions of others
  To be able to express my thoughts and emotions about these, discuss, and add give further information.

  Background:
    Given I have an user account
    And I am logged in
    And the following "posts" are in the database:
      | id         | title                                         | slug       | authorId        |
      | bWBjpkTKZp | 101 Essays that will change the way you think | 101-essays | id-of-peter-pan |
    And the following "comments" are in the database:
      | postId     | content                | authorId        |
      | bWBjpkTKZp | @peter-pan reply to me | id-of-peter-pan |

  Scenario: Comment creation
    Given I navigate to page "post/bWBjpkTKZp/101-essays"
    And I comment the following:
    """
    Ocelot.social rocks
    """
    And I click on "comment button"
    Then my comment should be successfully created
    And I should see my comment
    And the editor should be cleared

  Scenario: View medium length comments
    Given I navigate to page "post/bWBjpkTKZp/101-essays"
    And I type in a comment with 305 characters
    And I click on "comment button"
    Then my comment should be successfully created
    And I should see the entirety of my comment
    And the editor should be cleared

  Scenario: View long comments
    Given I navigate to page "post/bWBjpkTKZp/101-essays"
    And I type in a comment with 1205 characters
    And I click on "comment button"
    Then my comment should be successfully created
    And I should see an abbreviated version of my comment
    And the editor should be cleared

  Scenario: Direct reply to Comment
    Given I navigate to page "post/bWBjpkTKZp/101-essays"
    And I click on "reply button"
    Then it should create a mention in the CommentForm
