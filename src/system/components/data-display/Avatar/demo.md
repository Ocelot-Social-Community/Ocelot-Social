## Basic usage

```html
<ds-avatar 
  name="Hans Alba"
  image="https://s3.amazonaws.com/uifaces/faces/twitter/lisovsky/128.jpg" />
```

## Sizes

```html
<ds-avatar :is-online="true" size="small" name="Hans Peter"></ds-avatar>
<ds-avatar :is-online="true" size="base" name="Hans Peter"></ds-avatar>
<ds-avatar :is-online="true" size="large" name="Hans Peter"></ds-avatar>
<ds-avatar :is-online="true" size="x-large" name="Hans Peter"></ds-avatar>
<ds-avatar :is-online="true" size="x-large"></ds-avatar>
<ds-avatar :is-online="true" size="large"></ds-avatar>
<ds-avatar :is-online="true" size="base"></ds-avatar>
<ds-avatar :is-online="true" size="small"></ds-avatar>
```

## Broken Image

```html
<ds-avatar 
  name="Peter Sommerfield"
  image="http://not-valid-image-link.org/image-does-not-exist.jpg" 
/>
```

## Anonymus

```html
<ds-avatar 
  image="http://not-valid-image-link##.org/image-does-not-exist.jpg" 
/>
```

## Online Status

```html
<ds-avatar 
  name="Hans Alba"
  image="https://s3.amazonaws.com/uifaces/faces/twitter/lisovsky/128.jpg"
  :is-online="true" 
/>
```
