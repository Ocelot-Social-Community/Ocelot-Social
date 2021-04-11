Feature: Internationalization
  As a user who is not very fluent in English
  I would like to see the user interface translated to my preferred language
  In order to be able to understand the interface

  Background:
    Given I navigate to page "/login"

  Scenario Outline: I select "<language>" in the language menu and see "<buttonLabel>"
    When I select "<language>" in the language menu
    Then the whole user interface appears in "<language>"
    Then I see a button with the label "<buttonLabel>"

    Examples: Login Button
        | language   | buttonLabel |
        | Français   | Connexion   |
        | Deutsch    | Anmelden    |
        | English    | Login       |

  Scenario: Keep preferred language after refresh
    When I select "Français" in the language menu
    And I refresh the page
    Then the whole user interface appears in "Français"
