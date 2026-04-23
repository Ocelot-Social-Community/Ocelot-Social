import http from 'node:http'
import type { AddressInfo } from 'node:net'

import createProxy from './proxy'

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => {
      resolve((server.address() as AddressInfo).port)
    })
  })
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    server.close((err) => (err ? reject(err) : resolve()))
  })
}

interface ProxyResponse {
  status: number
  body: string
  headers: http.IncomingHttpHeaders
}

function request(
  port: number,
  options: { method?: string; path?: string; body?: string; headers?: Record<string, string> } = {},
): Promise<ProxyResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        method: options.method ?? 'GET',
        path: options.path ?? '/',
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: res.headers,
          }),
        )
      },
    )
    req.on('error', reject)
    if (options.body !== undefined) req.write(options.body)
    req.end()
  })
}

describe('createProxy', () => {
  let target: http.Server
  let targetPort: number
  let proxy: http.Server
  let proxyPort: number
  let lastRequest: { method?: string; url?: string; headers: http.IncomingHttpHeaders; body: string }
  let nextResponse: { status: number; headers: Record<string, string>; body: string }

  beforeEach(async () => {
    lastRequest = { headers: {}, body: '' }
    nextResponse = { status: 200, headers: { 'content-type': 'text/plain' }, body: 'ok' }

    target = http.createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', () => {
        lastRequest = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        }
        res.writeHead(nextResponse.status, nextResponse.headers)
        res.end(nextResponse.body)
      })
    })
    targetPort = await listen(target)

    proxy = createProxy(new URL(`http://127.0.0.1:${targetPort}`))
    proxyPort = await listen(proxy)
  })

  afterEach(async () => {
    await close(proxy)
    await close(target)
  })

  it('forwards GET requests and returns the target response', async () => {
    nextResponse = { status: 200, headers: { 'x-custom': 'yes' }, body: 'hello' }

    const res = await request(proxyPort, { path: '/some/path' })

    expect(res.status).toBe(200)
    expect(res.body).toBe('hello')
    expect(res.headers['x-custom']).toBe('yes')
    expect(lastRequest.method).toBe('GET')
    expect(lastRequest.url).toBe('/some/path')
  })

  it('forwards the request body and headers', async () => {
    const res = await request(proxyPort, {
      method: 'POST',
      path: '/upload',
      headers: { 'content-type': 'application/json', 'x-forwarded': 'abc' },
      body: JSON.stringify({ hello: 'world' }),
    })

    expect(res.status).toBe(200)
    expect(lastRequest.method).toBe('POST')
    expect(lastRequest.url).toBe('/upload')
    expect(lastRequest.headers['content-type']).toBe('application/json')
    expect(lastRequest.headers['x-forwarded']).toBe('abc')
    expect(lastRequest.body).toBe('{"hello":"world"}')
  })

  it('responds with 500 when the target is unreachable', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const closedTarget = http.createServer()
    const closedPort = await listen(closedTarget)
    await close(closedTarget)

    const brokenProxy = createProxy(new URL(`http://127.0.0.1:${closedPort}`))
    const brokenPort = await listen(brokenProxy)

    try {
      const res = await request(brokenPort, { path: '/gone' })
      expect(res.status).toBe(500)
      expect(res.body).toBe('Proxy error')
      expect(res.headers['content-type']).toBe('text/plain')
      expect(errorSpy).toHaveBeenCalledWith('Proxy request error:', expect.any(Error))
    } finally {
      await close(brokenProxy)
      errorSpy.mockRestore()
    }
  })
})
