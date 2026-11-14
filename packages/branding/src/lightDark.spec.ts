import assert from 'node:assert/strict'
import { test } from 'node:test'

import { darkOf, lightDarkAt, lightOf } from '../dist/lightDark.js'

test('lightOf keeps the light half of light-dark(), commas inside it included', () => {
  assert.equal(lightOf('light-dark(rgb(1, 2, 3), rgb(4, 5, 6))'), 'rgb(1, 2, 3)')
  assert.equal(
    lightOf('0 1px light-dark(red, blue), 0 2px light-dark(#fff, #000)'),
    '0 1px red, 0 2px #fff',
  )
  assert.equal(lightOf('light-dark(var(--a, red), rgb(1, 2, 3))'), 'var(--a, red)')
  assert.equal(lightOf('rgb(1, 2, 3)'), 'rgb(1, 2, 3)')
  assert.equal(lightOf('var(--x)'), 'var(--x)')
})

test('lightOf reduces a nested light-dark() all the way', () => {
  assert.equal(lightOf('light-dark(light-dark(a, b), c)'), 'a')
})

test('a light-dark() that is not exactly two non-empty arguments is left alone', () => {
  assert.equal(lightOf('light-dark(red'), 'light-dark(red')
  assert.equal(lightOf('light-dark(red)'), 'light-dark(red)')
  assert.equal(lightOf('light-dark(red, blue'), 'light-dark(red, blue')
  assert.equal(lightOf('light-dark(, blue)'), 'light-dark(, blue)')
  assert.equal(lightOf('light-dark(red, )'), 'light-dark(red, )')
  assert.equal(lightOf('light-dark(red, blue, green)'), 'light-dark(red, blue, green)')
  assert.equal(
    lightOf('light-dark(rgb(1, 2, 3), blue, green)'),
    'light-dark(rgb(1, 2, 3), blue, green)',
  )
})

test('light-dark( inside a quoted string is a name, not a function', () => {
  assert.equal(lightDarkAt(`'light-dark(', sans-serif`), -1)
  assert.equal(lightDarkAt(`"a \\" light-dark(" light-dark(red, blue)`), 19)
  assert.equal(lightOf(`'light-dark(', sans-serif`), `'light-dark(', sans-serif`)
  assert.equal(lightOf('light-dark("a,b", c)'), '"a,b"')
})

test('darkOf keeps the dark half, commas inside it included', () => {
  assert.equal(darkOf('light-dark(#fff, #000)'), '#000')
  assert.equal(darkOf('light-dark(rgb(1, 2, 3), rgb(4, 5, 6))'), 'rgb(4, 5, 6)')
  assert.equal(
    darkOf('0 1px light-dark(red, blue), 0 2px light-dark(#fff, #000)'),
    '0 1px blue, 0 2px #000',
  )
  assert.equal(darkOf('light-dark(red, light-dark(a, b))'), 'b')
  assert.equal(darkOf('var(--x)'), 'var(--x)')
})

test('darkOf leaves a light-dark() that is not exactly two non-empty arguments alone', () => {
  assert.equal(darkOf('light-dark(red'), 'light-dark(red')
  assert.equal(darkOf('light-dark(red, )'), 'light-dark(red, )')
  assert.equal(darkOf('light-dark(red, blue, green)'), 'light-dark(red, blue, green)')
})
