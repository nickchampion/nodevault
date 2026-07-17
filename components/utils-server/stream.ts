export const streamToString = (stream: NodeJS.ReadableStream, encoding: 'utf8' | 'base64'): Promise<string> => {
  const chunks: Buffer<any>[] = []

  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)))
    stream.on('error', err => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString(encoding)))
  })
}
