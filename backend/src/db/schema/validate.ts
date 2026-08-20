import { Ajv } from 'ajv'

import { jsonSchemaFor } from '@db/schema/types'

import type { EntityDefinition } from '@db/schema/types'
import type { ValidateFunction } from 'ajv'

// Write-path validation against the declaration.
//
// This is what replaces neode's Joi validation at the handful of production call sites that
// went through the ORM: `neode.create('EmailAddress', args)` checked the address against the
// model before writing, and `new Validator(neode, model, args)` in resolvers/emails.ts did the
// same without writing. Losing that silently while replacing the ORM would have been the one
// real regression in the exercise.
//
// Validators are compiled once per entity: ajv compiles a schema into a function, and doing
// that per request would cost far more than the check itself (~200 ns for a node).

const ajv = new Ajv({ allErrors: true })
const validators = new Map<string, ValidateFunction>()

const validatorFor = (entity: EntityDefinition): ValidateFunction => {
  const existing = validators.get(entity.label)
  if (existing) {
    return existing
  }
  const compiled = ajv.compile(jsonSchemaFor(entity))
  validators.set(entity.label, compiled)
  return compiled
}

/**
 * Validates the properties of ONE node against its declaration.
 *
 * Returns a message, or null when the value is fine. A message rather than a thrown error,
 * because the callers turn it into different things: a GraphQL `UserInputError` in the
 * resolvers, a report line in the audit.
 *
 * Pass exactly the properties the node will carry. `additionalProperties: false` means a
 * resolver's whole `args` object usually does NOT qualify — it carries arguments that are not
 * node properties (`inviteCode`, `locale`), and handing it in unfiltered would reject a
 * perfectly good write.
 */
export const validateProperties = (entity: EntityDefinition, value: unknown): string | null => {
  const validate = validatorFor(entity)
  if (validate(value)) {
    return null
  }
  return ajv.errorsText(validate.errors, { dataVar: entity.label })
}

const propertyValidators = new Map<string, ValidateFunction>()

/**
 * Validates ONE property against its declaration, without demanding the rest of the node.
 *
 * For the case where a resolver checks an input before it has a node to write — AddEmailAddress
 * validates the address the user typed, while the node it will eventually create also carries
 * a nonce and a timestamp that do not exist yet.
 */
export const validateProperty = (
  entity: EntityDefinition,
  property: string,
  value: unknown,
): string | null => {
  const key = `${entity.label}.${property}`
  let validate = propertyValidators.get(key)
  if (!validate) {
    // Via a Map rather than an index: `property` is a parameter, and indexing an object with
    // one is the pattern the security lint flags.
    const schema = new Map(Object.entries(entity.properties)).get(property)
    if (schema === undefined) {
      throw new Error(`${entity.label} declares no property ${property}`)
    }
    validate = ajv.compile({ ...schema })
    propertyValidators.set(key, validate)
  }
  return validate(value) ? null : ajv.errorsText(validate.errors, { dataVar: key })
}
