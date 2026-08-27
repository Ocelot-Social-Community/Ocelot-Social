import { ISO_DATE_TIME } from '@db/schema/entities/patterns'

// The two edge properties several relationships share.
//
// Here rather than in one of the modules that uses them: `createdAt` is spread into edges in
// four of the nine files, and whichever of them owned it would have the other three importing
// sideways from a sibling for no reason.

export const createdAt = { type: 'string', pattern: ISO_DATE_TIME } as const

export const timestamps = {
  createdAt,
  updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
} as const
