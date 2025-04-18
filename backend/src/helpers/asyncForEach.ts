/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable security/detect-object-injection */
/**
 * Provide a way to iterate for each element in an array while waiting for async functions to finish
 *
 * @param array
 * @param callback
 * @returns {Promise<void>}
 */
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

export default asyncForEach
