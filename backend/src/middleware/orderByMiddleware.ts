/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import cloneDeep from 'lodash/cloneDeep.js'

import type { IMiddlewareResolver } from 'graphql-middleware/types'

const defaultOrderBy: IMiddlewareResolver = (resolve, root, args, context, resolveInfo) => {
  const copy = cloneDeep(resolveInfo)
  const [fieldNode] = copy.fieldNodes
  // GraphQL always resolves a field with at least one FieldNode, so the guard is here for the
  // TYPE (destructuring widens to `FieldNode | undefined`), not for a case that occurs.
  /* v8 ignore next -- unreachable: fieldNodes is never empty for a resolved field */
  if (fieldNode) {
    // @ts-expect-error cloneDeep returns mutable copy, but TS sees readonly type
    const orderByArg = fieldNode.arguments.find((arg) => arg.name.value === 'orderBy')

    if (!orderByArg) {
      // @ts-expect-error cloneDeep returns mutable copy, but TS sees readonly type
      fieldNode.arguments.push({
        kind: 'Argument',
        name: { kind: 'Name', value: 'orderBy' },
        value: { kind: 'EnumValue', value: 'sortDate_desc' },
      })
    } else if (args.orderBy === undefined) {
      // @ts-expect-error cloneDeep returns mutable copy, but TS sees readonly type
      orderByArg.value = { kind: 'EnumValue', value: 'sortDate_desc' }
    }
  }
  return resolve(root, args, context, copy)
}

export default {
  Query: {
    Post: defaultOrderBy,
  },
}
