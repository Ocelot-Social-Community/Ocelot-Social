export default function (options = {}) {
  const { queryId, querySlug, path, message = 'Page not found.' } = options
  return {
    asyncData: async (context) => {
      const {
        params: { id, slug },
        redirect,
        error,
        app: { apolloProvider },
      } = context
      const idOrSlug = id || slug

      if (idOrSlug) {
        const variables = { idOrSlug }
        const client = apolloProvider.defaultClient
        // Re-encode segments so resources whose slug contains a reserved
        // character (e.g. "foo/bar") redirect to a routable URL.
        const canonical = (r) =>
          `/${path}/${encodeURIComponent(r.id)}/${encodeURIComponent(r.slug)}`

        let response
        let resource
        response = await client.query({ query: queryId, variables })
        resource = response.data[Object.keys(response.data)[0]][0]
        if (resource && resource.slug === slug) return // all good
        if (resource && resource.slug !== slug) {
          return redirect(canonical(resource))
        }

        response = await client.query({ query: querySlug, variables })
        resource = response.data[Object.keys(response.data)[0]][0]
        if (resource) return redirect(canonical(resource))
      }

      return error({ statusCode: 404, key: message })
    },
  }
}
