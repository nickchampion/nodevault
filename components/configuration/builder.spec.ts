import { base64Decode, base64Encode, encrypt, decrypt } from '@platform/components.utils.server'

describe.skip('Encrypt value for configuration', () => {
  it('Encrypt', () => {
    console.log('DEV', encrypt('', '', ''))
    console.log('PROD', encrypt('', '', ''))
  })

  it('Decrypt', () => {
    console.log('DEV/UAT', decrypt('', '', ''))
    console.log('PROD', decrypt('', '', ''))
  })

  it('Encode', () => {
    console.log('ENCODE', base64Encode(''))
  })

  it('Decode', () => {
    console.log('DECODE', base64Decode(''))
  })
})
