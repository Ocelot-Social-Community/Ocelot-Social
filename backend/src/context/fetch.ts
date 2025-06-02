import request from 'request'

export const fetch = (url: string) => {
  // eslint-disable-next-line promise/avoid-new
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    request(url, function (error, response, body) {
      if (error) {
        reject(error)
      } else {
        resolve(JSON.parse(body)) // eslint-disable-line @typescript-eslint/no-unsafe-argument
      }
    })
  })
}
export type Fetch = typeof fetch
