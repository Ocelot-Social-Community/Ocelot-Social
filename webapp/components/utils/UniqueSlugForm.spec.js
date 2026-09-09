import UniqueSlugForm from './UniqueSlugForm'
import Schema from 'async-validator'

let translate
let apollo
let currentUser

beforeEach(() => {
  translate = jest.fn(() => 'Validation error')
  apollo = {
    query: jest.fn().mockResolvedValue({ data: { User: [] } }),
  }
  currentUser = null
})

describe('UniqueSlugForm', () => {
  // async-validator resolves with the validated source object (it resolved with `undefined` up to
  // v3), so a passing validation is asserted as "resolves with what went in".
  const validate = (object) => {
    const { formSchema } = UniqueSlugForm({ translate, apollo, currentUser })
    const validator = new Schema(formSchema)
    return validator.validate(object, { suppressWarning: true }).catch(({ errors }) => {
      throw new Error(errors[0].message)
    })
  }

  describe('regex', () => {
    describe('non URL-safe characters, e.g. whitespaces', () => {
      it('rejects', async () => {
        await expect(validate({ slug: 'uh oh' })).rejects.toThrow('Validation error')
      })
    })

    describe('alphanumeric, hyphens or underscores', () => {
      it('validates', async () => {
        await expect(validate({ slug: '_all-right_' })).resolves.toEqual({ slug: '_all-right_' })
      })
    })
  })

  describe('given a currentUser with a slug', () => {
    beforeEach(() => {
      currentUser = { slug: 'current-user' }
    })

    describe('backend returns no user for given slug', () => {
      beforeEach(() => {
        apollo.query.mockResolvedValue({
          data: { User: [] },
        })
      })

      it('validates', async () => {
        await expect(validate({ slug: 'slug' })).resolves.toEqual({ slug: 'slug' })
      })
    })

    describe('backend returns user', () => {
      let slug
      beforeEach(() => {
        slug = 'already-taken'
        apollo.query.mockResolvedValue({
          data: { User: [{ slug: 'already-taken' }] },
        })
      })

      it('rejects', async () => {
        await expect(validate({ slug: 'uh oh' })).rejects.toThrow('Validation error')
      })

      describe('but it is the current user', () => {
        beforeEach(() => {
          currentUser = { slug: 'already-taken' }
        })

        it('validates', async () => {
          await expect(validate({ slug })).resolves.toEqual({ slug })
        })
      })
    })
  })
})
