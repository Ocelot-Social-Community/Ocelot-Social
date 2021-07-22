Feature: User profile - name, description and location
  As a user
  I would like to change my name, add a description and a location
  So others can see my name, get some info about me and my location

  Background:
    Given the following "users" are in the database:
      | email                | password | id              | name      | slug      | termsAndConditionsAgreedVersion |
      | peterpan@example.org | 123      | id-of-peter-pan | Peter Pan | peter-pan | 0.0.4                           |
    And I am logged in as "peter-pan"
    And I navigate to page "settings"

  Scenario: Change username
    When I save "Hansi" as my new name
    Then I can see my new name "Hansi" when I click on my profile picture in the top right
    When I refresh the page
    Then I can see my new name "Hansi" when I click on my profile picture in the top right

  Scenario Outline: I set my location to "<location>"
    When I save "<location>" as my location
    And I navigate to page "/profile/peter-pan"
    Then they can see "<location>" in the info box below my avatar
    Examples: Location
        | location      | type    |
        | Paris         | City    |
        | Saxony-Anhalt | Region  |
        | Germany       | Country |

  Scenario: Display a description on profile page
    Given I have the following self-description:
    """
    Ich lebe fettlos, fleischlos, fischlos dahin, fühle mich aber ganz wohl dabei
    """
    When I navigate to page "/profile/peter-pan"
    Then they can see the following text in the info box below my avatar:
    """
    Ich lebe fettlos, fleischlos, fischlos dahin, fühle mich aber ganz wohl dabei
    """
