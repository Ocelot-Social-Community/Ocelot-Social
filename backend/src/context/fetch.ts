import request from 'request'

export const fetch = (url: string) => {
  // eslint-disable-next-line promise/avoid-new
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    request(url, function (error, response, body) {
      if (error) {
        reject(error)
      } else {
        const response = JSON.parse(body) // eslint-disable-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument
        // console.log(url)
        // console.log(JSON.stringify(response, null, 2))
        resolve(response)
      }
    })
  })
}
export type Fetch = typeof fetch
