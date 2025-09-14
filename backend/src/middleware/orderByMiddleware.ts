/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import cloneDeep from 'lodash/cloneDeep'

const defaultOrderBy = (resolve, root, args, context, resolveInfo) => {
  const copy = cloneDeep(resolveInfo)
  const [fieldNode] = copy.fieldNodes
  if (fieldNode) {
    const orderByArg = fieldNode.arguments.find((arg) => arg.name.value === 'orderBy')

    if (!orderByArg) {
      fieldNode.arguments.push({
        kind: 'Argument',
        name: { kind: 'Name', value: 'orderBy' },
        value: { kind: 'EnumValue', value: 'sortDate_desc' },
      })
    } else if (args.orderBy === undefined) {
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
