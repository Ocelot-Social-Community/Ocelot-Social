## Column Width

All columns share the space in the grid evenly and grow and shrink dynamically.

You can set a minimum width beyond which columns will continue to grow until there is enough space to fit another column of minimum width. (Resize the window to see the effect.)
```
<ds-grid min-column-width="200">
  <ds-grid-item><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item><ds-placeholder>same</ds-placeholder></ds-grid-item>
</ds-grid>
```

## Gaps

You can set a gap which will be applied as a vertical and horizontal space between all grid items. Allowed values are [the common space sizes](/design-tokens/#spaceSize) and `0`. The default is `small`.
```
<ds-grid gap="x-small">
  <ds-grid-item><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item><ds-placeholder>same</ds-placeholder></ds-grid-item>
</ds-grid>
```

## Grid Item Size

Once the grid is defined a grid item can span several columns and/or rows. You can adjust this by setting the column span and/or row span of each item individually. The column span can also be set to `'fullWidth'`.
```
<ds-grid>
  <ds-grid-item column-span="fullWidth"><ds-placeholder>full width</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="6" column-span="2"><ds-placeholder>2 columns, 6 rows</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="8"><ds-placeholder>8 rows</ds-placeholder></ds-grid-item>
  <ds-grid-item><ds-placeholder>default (1 column, 4 rows)</ds-placeholder></ds-grid-item>
</ds-grid>
```

## Row Height

You can set the height of a row – but this is only recommended in combination with setting the grid item property `row-span`! With these values you can fine tune the height of grid items which will always be a multiple of the defined `row-height`.

Low row height leads to a more fine-grained item height:
```
<ds-grid row-height="4">
  <ds-grid-item row-span="10"><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="11"><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="12"><ds-placeholder>same</ds-placeholder></ds-grid-item>
</ds-grid>
```

High row height leads to a rougher item height:
```
<ds-grid row-height="100">
  <ds-grid-item row-span="1"><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="2"><ds-placeholder>same</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="3"><ds-placeholder>same</ds-placeholder></ds-grid-item>
</ds-grid>
```

## Masonry Layout

In a classic masonry layout items usually have the same width but different heights and are sorted from left to right then top to bottom. You can achieve this by calculating and setting the `row-span` programmatically for each grid item, depending on its contents.

Some items may move slightly out of order to make sure existing rows are filled before creating new ones.
```
<ds-grid>
  <ds-grid-item row-span="4"><ds-placeholder>first</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="8"><ds-placeholder>second</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="6"><ds-placeholder>third</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="6"><ds-placeholder>fourth</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="4"><ds-placeholder>fifth</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="8"><ds-placeholder>sixth</ds-placeholder></ds-grid-item>
  <ds-grid-item row-span="4"><ds-placeholder>seventh</ds-placeholder></ds-grid-item>
</ds-grid>
```
