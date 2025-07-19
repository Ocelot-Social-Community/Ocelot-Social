import http from 'node:http'

const createProxy = ({
  TARGET_HOST,
  TARGET_PORT,
}: {
  TARGET_HOST: string
  TARGET_PORT: number
}) => {
  const proxy = http.createServer((req, res) => {
    const options = {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    }

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers)
      proxyRes.pipe(res) // Pipe the response from the target server back to the client
    })

    req.pipe(proxyReq) // Pipe the client's request body to the target server

    proxyReq.on('error', (err) => {
      console.error('Proxy request error:', err)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Proxy error')
    })
  })
  return proxy
}

export default createProxy
