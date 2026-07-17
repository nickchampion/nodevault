export type ChunkOptions = {
  maxChars?: number
  overlapChars?: number
}

const defaultMaxChars = 3500
const defaultOverlapChars = 525

/**
 * Cut the trailing `overlapChars` from a chunk to seed the next one, preferring a
 * whitespace boundary so the overlap starts on a whole word.
 */
const overlapTail = (chunk: string, overlapChars: number): string => {
  if (overlapChars <= 0 || chunk.length <= overlapChars) return ''

  const tail = chunk.slice(-overlapChars)
  const boundary = tail.search(/\s\S/)

  return boundary === -1 ? tail : tail.slice(boundary + 1)
}

/**
 * Hard-split a single block that exceeds `maxChars`, preferring sentence ends and then
 * line breaks near the limit before falling back to a raw cut.
 */
const splitBlock = (block: string, maxChars: number): string[] => {
  const parts: string[] = []
  let remaining = block

  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars)
    const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('.\n'))
    const line = window.lastIndexOf('\n')
    const space = window.lastIndexOf(' ')

    // only take a natural break if it lands in the back half of the window
    const candidates = [sentence + 1, line, space].filter(index => index > maxChars / 2)
    const cut = candidates.length > 0 ? Math.max(...candidates) : maxChars

    parts.push(remaining.slice(0, cut).trim())
    remaining = remaining.slice(cut).trim()
  }

  if (remaining) parts.push(remaining)

  return parts
}

/**
 * Split text into chunks of at most `maxChars` characters, packing whole paragraphs
 * where possible and seeding each chunk with the tail of the previous one so context
 * carries across chunk boundaries.
 */
export const chunkText = (text: string, options: ChunkOptions = {}): string[] => {
  const maxChars = options.maxChars ?? defaultMaxChars
  const overlapChars = options.overlapChars ?? defaultOverlapChars

  const normalised = text.replaceAll('\r\n', '\n').trim()

  if (!normalised) return []

  const blocks = normalised
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .flatMap(block => (block.length > maxChars ? splitBlock(block, maxChars) : [block]))

  const chunks: string[] = []
  let current = ''

  for (const block of blocks) {
    if (current && current.length + block.length + 2 > maxChars) {
      chunks.push(current)
      current = overlapTail(current, overlapChars)
    }

    current = current ? `${current}\n\n${block}` : block

    // the overlap seed plus a large block can overflow — split and flush the excess
    while (current.length > maxChars) {
      const [head, ...rest] = splitBlock(current, maxChars)

      chunks.push(head)
      current = rest.join('\n\n')
    }
  }

  if (current.trim()) chunks.push(current.trim())

  return chunks
}
