import http from 'node:http'

const createProxy = (target: URL) => {
  const proxy = http.createServer((req, res) => {
    const options = {
      hostname: target.hostname,
      port: target.port,
      path: req.url,
      method: req.method,
      headers: req.headers,
    }

    const proxyReq = http.request(options, (proxyRes) => {
      // `statusCode` is typed `number | undefined` because IncomingMessage doubles as the SERVER
      // request shape, where there is no status line. On a client response the parser has already
      // read one — a response without it never reaches this callback, it fails as a parse error and
      // arrives on 'error' below. So the fallback is for the type, not for a case that occurs.
      /* v8 ignore next -- unreachable: a parsed client response always carries a status code */
      res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers)
      proxyRes.pipe(res) // Pipe the response from the target server back to the client
    })

    req.pipe(proxyReq) // Pipe the client's request body to the target server

    proxyReq.on('error', (err) => {
      /* eslint-disable-next-line no-console */
      console.error('Proxy request error:', err)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Proxy error')
    })
  })
  return proxy
}

export default createProxy
