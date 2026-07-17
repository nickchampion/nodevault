import { shaHmacHash, base64Encode } from './security.js'

describe.skip('Security Tests', () => {
  test('Hash payload', () => {
    const secret = ''
    const body = ''
    const hash = shaHmacHash(body, secret, 'sha256', true)

    console.log(base64Encode(hash))
    console.log(hash)
  })
})
