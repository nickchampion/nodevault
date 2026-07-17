import type { Readable } from 'node:stream'

export const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const buf = new Array<Uint8Array>()

    stream.on('data', chunk => buf.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(buf)))
    stream.on('error', err => reject(`error converting stream - ${err}`))
  })
}
