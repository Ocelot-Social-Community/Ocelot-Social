Feature: Report and Moderate
  As a user
  I would like to report content that violates the community guidlines
  So the moderators can take action on it

  As a moderator
  I would like to see all reported content
  So I can look into it and decide what to do

  Background:
    Given the following "users" are in the database:
      | slug      | email                 | password | id            | name                                          | role      | termsAndConditionsAgreedVersion |
      | user      | user@example.org      | abcd     | user          | User-Chad                                     | user      | 0.0.4                           |
      | moderator | moderator@example.org | 1234     | moderator     | Mod-Man                                       | moderator | 0.0.4                           |
      | annoying  | annoying@example.org  | 1234     | annoying-user | I'm gonna mute Moderators and Admins HA HA HA | user      | 0.0.4                           |
    And the following "posts" are in the database:
      | authorId      | id | title                         | content                                              |
      | annoying-user | p1 | The Truth about the Holocaust | It never existed!                                    |
      | annoying-user | p2 | Fake news                     | This content is demonstratably infactual in some way |

  # Scenario Outline: Report a post from various pages
  #   When I am logged in as "user"
  #   And I navigate to page "<Page>" 
  #   And I click on "Report Post" from the content menu of the post
  #   And I confirm the reporting dialog because it is a criminal act under German law:
  #     """
  #     Do you really want to report the contribution "The Truth about the Holocaust"?
  #     """
  #   Then I see a toaster with "Thanks for reporting!"
  #   Examples:
  #     | Page     |
  #     | /        |
  #     | /post/p1 |

  # Scenario: Report user
  #   Given I am logged in as "user"
  #   And I navigate to page "/post/the-truth-about-the-holocaust"
  #   When I click on the author
  #   And I click on "Report User" from the content menu in the user info box
  #   And I confirm the reporting dialog because he is a holocaust denier:
  #     """
  #     Do you really want to report the user "I'm gonna mute Moderators and …"?
  #     """
  #   Then I see a toaster with "Thanks for reporting!"

  Scenario: Review reported content
    Given somebody reported the following posts:
      | submitterEmail           | resourceId | reasonCategory     | reasonDescription |
      | p1.submitter@example.org | p1         | discrimination_etc | Offensive content |
    And I am logged in as "moderator"
    And I navigate to page "/"
    When I click on the avatar menu in the top right corner
    And I click on "Moderation"
    Then I see all the reported posts including the one from above
    And each list item links to the post page

  Scenario: Review reported posts of a user who's muted a moderator
    Given somebody reported the following posts:
      | submitterEmail           | resourceId | reasonCategory | reasonDescription |
      | p2.submitter@example.org | p2         | other          | Offensive content |
    And I am logged in as "moderator"
    And I navigate to page "/"
    And there is an annoying user who has muted me
    When I click on the avatar menu in the top right corner
    And I click on "Moderation"
    Then I see all the reported posts including from the user who muted me
    And I can visit the post page

  # Scenario: Normal user can't see the moderation page
  #   Given I am logged in as "user"
  #   And I navigate to page "/"
  #   When I click on the avatar menu in the top right corner
  #   Then I can't see the moderation menu item
