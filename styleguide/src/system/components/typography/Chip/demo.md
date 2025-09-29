## Chip colors

Use different colors to emphasize or provide meaning.

```
<ds-chip>Medium</ds-chip>
<ds-chip color="inverse">Inverse</ds-chip>
<ds-chip color="primary">Primary</ds-chip>
<ds-chip color="success">Success</ds-chip>
<ds-chip color="warning">Warning</ds-chip>
<ds-chip color="danger">Danger</ds-chip>
```

## Chip sizes

Use different sizes to create hierarchy (defaults to `base`).

```
<ds-chip size="small">Small</ds-chip>
<ds-chip size="base">Base</ds-chip>
<ds-chip size="large">Large</ds-chip>
```

## Deletable

A chip can be deletable.

```
<template>
  <div>
    <ds-chip
      v-for="(tag, index) in tags"
      @remove="removeTag(index)"
      removable
      :key="index"
      :color="tag.color">
      {{ tag.label }}
    </ds-chip>
  </div>
</template>
<script>
  export default {
    data() {
      return {
        tags: [
        {label: 'Dog'},
        {label: 'Cat'},
        {label: 'Duck'},
        {label: 'Mouse', color: "primary"},
        {label: 'Bird', color: "primary"},
        {label: 'Elephant', color: "primary"},
        ],
      }
    },
    methods: {
      removeTag (index) {
        this.tags.splice(index, 1)
      }
    }
  }
</script>
```
