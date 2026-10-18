# HTML – Code Guidelines

## We write semantic markup

We avoid using `divs` and `spans` and try to choose more meaningful HTML elements instead. If unsure which element to use [this list by MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element) can be of help.

Why?
- semantic markup is crucial for accessibility
- it makes the code more readable for other developers
- it benefits our SEO

For more background [see this article](https://css-tricks.com/why-how-and-when-to-use-semantic-html-and-aria/).

This doesn’t mean you can’t ever use a `div` – just think twice before you do!

## We write as little HTML as possible – and as much as necessary

HTML is used to _structure content on the page_ and should therefore reflect its complexity. Not more and not less. Most content does not require deep nesting of HTML elements – if you find yourself wrapping `container` around `container` or adding an element just to correctly position another element on the page this calls for the use of CSS instead!

Why?
- deep nesting makes it hard to understand, style and maintain components
- it can lead to performance issues

## A placeholder is an example – or there is none

A form field's placeholder shows an example of a valid value: "e.g. London" for a place, "Femanon Funny" for a name. It never repeats the label shown above the field, and it never replaces a visible label.

Free text gets an "e.g." in front (place, goal, venue), so the example is not mistaken for a value already entered. A value with a format of its own (a name, a slug) is shown as it is, to show that format. A field no example fits leaves the placeholder empty.

Search fields and filters are the exception: there the placeholder is the conventional label of the box.

Why?
- a placeholder repeating the label tells the user nothing new
- a placeholder vanishes as soon as the user types, and its contrast is low – it cannot stand in for a label

## Recommended reads

For a deeper dive into the WHY and HOW have a look at the following resources:

- [HTML: a good basis for accessibility](https://developer.mozilla.org/en-US/docs/Learn/Accessibility/HTML)
- [Why, how, and when to use semantic HTML and ARIA](https://css-tricks.com/why-how-and-when-to-use-semantic-html-and-aria/)
