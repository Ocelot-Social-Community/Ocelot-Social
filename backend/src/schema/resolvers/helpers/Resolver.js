import log from './databaseLogger'

export const undefinedToNullResolver = (list) => {
  const resolvers = {}
  list.forEach((key) => {
    resolvers[key] = async (parent) => {
      return typeof parent[key] === 'undefined' ? null : parent[key]
    }
  })
  return resolvers
}

export default function Resolver(type, options = {}) {
  const {
    idAttribute = 'id',
    undefinedToNull = [],
    boolean = {},
    count = {},
    hasOne = {},
    hasMany = {},
  } = options

  const _hasResolver = (resolvers, { key, connection }, { returnType }) => {
    return async (parent, params, { driver, cypherParams }, resolveInfo) => {
      if (typeof parent[key] !== 'undefined') return parent[key]
      const id = parent[idAttribute]
      const session = driver.session()
      const readTxResultPromise = session.readTransaction(async (txc) => {
        const cypher = `
        MATCH(:${type} {${idAttribute}: $id})${connection}
        RETURN related {.*} as related
        `
        const result = await txc.run(cypher, { id, cypherParams })
        log(result)
        return result.records.map((r) => r.get('related'))
      })
      try {
        let response = await readTxResultPromise
        if (returnType === 'object') response = response[0] || null
        return response
      } finally {
        await session.close()
      }
    }
  }

  const booleanResolver = (obj) => {
    const resolvers = {}
    for (const [key, condition] of Object.entries(obj)) {
      resolvers[key] = async (parent, params, { cypherParams, driver }, resolveInfo) => {
        if (typeof parent[key] !== 'undefined') return parent[key]
        const id = parent[idAttribute]
        const session = driver.session()
        const readTxResultPromise = session.readTransaction(async (txc) => {
          const nodeCondition = condition.replace('this', 'this {id: $id}')
          const cypher = `${nodeCondition} as ${key}`
          const result = await txc.run(cypher, { id, cypherParams })
          log(result)
          const [response] = result.records.map((r) => r.get(key))
          return response
        })
        try {
          return await readTxResultPromise
        } finally {
          await session.close()
        }
      }
    }
    return resolvers
  }

  const countResolver = (obj) => {
    const resolvers = {}
    for (const [key, connection] of Object.entries(obj)) {
      resolvers[key] = async (parent, params, { driver, cypherParams }, resolveInfo) => {
        if (typeof parent[key] !== 'undefined') return parent[key]
        const session = driver.session()
        const readTxResultPromise = session.readTransaction(async (txc) => {
          const id = parent[idAttribute]
          const cypher = `
            MATCH(u:${type} {${idAttribute}: $id})${connection}
            RETURN COUNT(DISTINCT(related)) as count
          `
          const result = await txc.run(cypher, { id, cypherParams })
          log(result)
          const [response] = result.records.map((r) => r.get('count').toNumber())
          return response
        })
        try {
          return await readTxResultPromise
        } finally {
          await session.close()
        }
      }
    }
    return resolvers
  }

  const hasManyResolver = (obj) => {
    const resolvers = {}
    for (const [key, connection] of Object.entries(obj)) {
      resolvers[key] = _hasResolver(resolvers, { key, connection }, { returnType: 'iterable' })
    }
    return resolvers
  }

  const hasOneResolver = (obj) => {
    const resolvers = {}
    for (const [key, connection] of Object.entries(obj)) {
      resolvers[key] = _hasResolver(resolvers, { key, connection }, { returnType: 'object' })
    }
    return resolvers
  }

  const result = {
    ...undefinedToNullResolver(undefinedToNull),
    ...booleanResolver(boolean),
    ...countResolver(count),
    ...hasOneResolver(hasOne),
    ...hasManyResolver(hasMany),
  }
  return result
}

export const removeUndefinedNullValuesFromObject = (obj) => {
  Object.keys(obj).forEach((key) => {
    if ([undefined, null].includes(obj[key])) {
      delete obj[key]
    }
  })
}

export const convertObjectToCypherMapLiteral = (params, addSpaceInfrontIfMapIsNotEmpty = false) => {
  // I have found no other way yet. maybe "apoc.convert.fromJsonMap(key)" can help, but couldn't get it how, see: https://stackoverflow.com/questions/43217823/neo4j-cypher-inline-conversion-of-string-to-a-map
  // result looks like: '{id: "g0", slug: "yoga"}'
  const paramsEntries = Object.entries(params)
  let mapLiteral = ''
  paramsEntries.forEach((ele, index) => {
    mapLiteral += index === 0 ? '{' : ''
    mapLiteral += `${ele[0]}: "${ele[1]}"`
    mapLiteral += index < paramsEntries.length - 1 ? ', ' : '}'
  })
  mapLiteral = (addSpaceInfrontIfMapIsNotEmpty && mapLiteral.length > 0 ? ' ' : '') + mapLiteral
  return mapLiteral
}
