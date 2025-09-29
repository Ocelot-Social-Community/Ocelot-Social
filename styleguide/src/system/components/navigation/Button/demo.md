## Button types

Use a primary button to draw the users attention to important actions. Use default buttons for less important actions.

A danger button should be used only for destructive actions.

```html
<ds-button>Default</ds-button>
<ds-button primary>Primary</ds-button>
<ds-button secondary>Secondary</ds-button>
<ds-button danger>Danger</ds-button>
```

## Ghost buttons

Use a ghost button for secondary actions.

```html
<ds-button ghost>Default</ds-button>
<ds-button ghost primary>Primary</ds-button>
<ds-button ghost secondary>Secondary</ds-button>
<ds-button ghost danger>Danger</ds-button>
```

## Button sizes

Use different sizes to create hierarchy.

```html
<ds-button size="small">Small</ds-button>
<ds-button>Base</ds-button>
<ds-button size="large">Large</ds-button>
<ds-button size="x-large">very Large</ds-button>
```

## Button full width

```html
<ds-button fullwidth primary>Full Width</ds-button>
```

## Button states

A button can take different states.

```html
<ds-button>Default state</ds-button>
<ds-button disabled>Disabled state</ds-button>
<ds-button hover>Hover state</ds-button>
<ds-button loading>Loading state</ds-button>
```

## Icon buttons

Add an icon to a button to help the user identify the button's action.

```html
<ds-button icon="arrow-left" primary>Click me</ds-button>
<ds-button icon="arrow-right" right>Click me</ds-button>
<ds-button icon="plus" primary></ds-button>
<ds-button icon="plus" ghost></ds-button>
```

## Button as links

Provide a path to the button. You can pass a url string or a Vue router path object.

```html
<ds-button path="/navigation">Click me</ds-button>
<ds-button :path="{ name: 'Navigation' }">Click me</ds-button>
```
