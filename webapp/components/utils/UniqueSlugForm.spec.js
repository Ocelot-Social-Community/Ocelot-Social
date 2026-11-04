import UniqueSlugForm from './UniqueSlugForm'
import { getBranding, setBranding } from '@ocelot-social/branding'
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

  describe('length', () => {
    it('rejects a slug shorter than the brand minimum', async () => {
      await expect(validate({ slug: 'ab' })).rejects.toThrow('Validation error')
      expect(translate).toHaveBeenCalledWith('settings.validation.slug.length', {
        min: 3,
        max: 50,
      })
    })

    it('rejects a missing slug with the bounds, not a crash', async () => {
      await expect(validate({})).rejects.toThrow('Validation error')
      expect(translate).toHaveBeenCalledWith('settings.validation.slug.length', {
        min: 3,
        max: 50,
      })
    })

    it('rejects a slug longer than the brand maximum', async () => {
      await expect(validate({ slug: 'a'.repeat(51) })).rejects.toThrow('Validation error')
    })

    it('accepts a slug at either bound', async () => {
      await expect(validate({ slug: 'abc' })).resolves.toEqual({ slug: 'abc' })
      await expect(validate({ slug: 'a'.repeat(50) })).resolves.toEqual({ slug: 'a'.repeat(50) })
    })

    // Like the backend: the slug an account already has is held to the bounds too, so a save
    // brings one that predates them into bounds.
    it('rejects the slug the user already has when it is out of bounds', async () => {
      currentUser = { slug: 'ab' }

      await expect(validate({ slug: 'ab' })).rejects.toThrow('Validation error')
    })

    it('still counts the slug the user already has as available', async () => {
      currentUser = { slug: 'peter' }
      apollo.query.mockResolvedValue({ data: { User: [{ slug: 'peter' }] } })

      await expect(validate({ slug: 'peter' })).resolves.toEqual({ slug: 'peter' })
    })

    describe('with the bounds of a brand', () => {
      let original

      beforeEach(() => {
        original = getBranding()
        setBranding({ ...original, user: { ...original.user, slugLengthMin: 2 } })
      })

      afterEach(() => {
        setBranding(original)
      })

      it('accepts a slug the default minimum would refuse', async () => {
        await expect(validate({ slug: 'ab' })).resolves.toEqual({ slug: 'ab' })
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
