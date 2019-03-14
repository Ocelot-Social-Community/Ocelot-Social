## Basic usage

```html
<ds-avatar 
  name="Hans Alba"
  image="https://s3.amazonaws.com/uifaces/faces/twitter/lisovsky/128.jpg" />
```

## Size

```html
<ds-avatar 
  name="Hans"
  image="https://s3.amazonaws.com/uifaces/faces/twitter/lisovsky/128.jpg"
  size="60px" 
/>
```

## Broken Image

```html
<ds-avatar 
  name="Peter Sommerfield"
  image="http://not-valid-image-link.org/image-does-not-exist.jpg" 
/>
```

## Anonymous

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
