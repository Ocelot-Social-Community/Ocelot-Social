import { camelCase } from 'change-case'
import { tokenMap } from '@@/styles/tokens'

const getSpace = (space: string | undefined) => {
  if (!space) return 0

  const spaceName = camelCase(space)
  return tokenMap.spaceSize[spaceName] ? tokenMap.spaceSize[spaceName].value : 0
}

export { getSpace }
