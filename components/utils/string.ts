/**
 * Removes the specified character from beginning and end of the string
 * @param str
 * @param char
 * @returns
 */
export const trim = (str: string, char: string) => {
  let index = 0
  let index_ = str.length - 1

  while (str[index] === char) index++
  while (str[index_] === char) index_--
  return str.slice(index, index_ + 1)
}

export const simpleHash = (string_: string): string => {
  let hash = 0

  for (let index = 0; index < string_.length; index++) {
    const char = string_.charCodeAt(index)

    hash = ((hash << 5) - hash) + char
    hash &= hash
  }

  return Math.abs(hash).toString(36)
}

export const serializeValue = <T>(value: T): string => {
  if (value === null || value === undefined) return 'null'

  if (typeof value === 'string') return value

  if (typeof value === 'number') return value.toString()

  if (typeof value === 'boolean') return value.toString()

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[${value.map(serializeValue).join(',')}]`
    }

    const entries: string[] = []

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        entries.push(`${key}:${serializeValue(value[key])}`)
      }
    }

    return `{${entries.join(',')}}`
  }

  return String(value)
}

export const normalisePostcode = (postcode?: string | null): string | null => {
  if (!postcode) return null

  const cleaned = postcode.toUpperCase().replaceAll(/[^A-Z0-9]/g, '')

  if (cleaned.length < 5 || cleaned.length > 7) return null

  const ukPostcodeRegex = /^(GIR0AA|[A-Z]{1,2}\d[A-Z\d]?\d[ABD-HJLNP-UW-Z]{2})$/

  if (!ukPostcodeRegex.test(cleaned)) return null

  const outward = cleaned.slice(0, -3)
  const inward = cleaned.slice(-3)

  return `${outward} ${inward}`
}

/**
 * Trims the specified character from the end of the string
 * @param str
 * @param char
 * @returns
 */
export const trimEnd = (str: string, char: string) => {
  let index = str.length - 1

  while (str[index] === char) index--
  return str.slice(0, index + 1)
}

export const obfuscateBetweenIndexes = (string_: string, start: number, end: number): string | null => {
  // Ensure start and end are within the string bounds and start is less than end
  if (start < 0 || end > string_.length || start >= end) {
    return null
  }

  // Get the parts of the string before, within, and after the indexes
  const before = string_.slice(0, start)
  const obfuscated = '*'.repeat(end - start)
  const after = string_.slice(end)

  return before + obfuscated + after
}

/**
 * Trims the specified character from the end of the string
 * @param str
 * @param char
 * @returns
 */
export const trimStart = (str: string, char: string) => {
  let index = 0

  while (str[index] === char) index++
  return str.slice(index)
}

export const titleCaseFirst = (input: string) => {
  return input.charAt(0).toUpperCase() + input.slice(1)
}

export const titleCase = (input: string) => {
  const output = input.toLowerCase().split(' ')

  for (let index = 0; index < output.length; index++) {
    output[index] = output[index].charAt(0).toUpperCase() + output[index].slice(1)
  }
  return output.join(' ')
}

export const format = (key: string, arguments_: string | string[]) => {
  if (typeof arguments_ === 'string') {
    return key.replaceAll('{0}', arguments_)
  }

  arguments_.forEach((arrayItem, index) => {
    key = key.replace(`{${index}}`, arrayItem)
  })

  return key
}

export const invariantCultureCompare = (string1: string, string2: string): boolean => {
  return string1?.trim()?.toLowerCase() === string2?.trim()?.toLowerCase()
}

export const toAlphaNumeric = (input: string, replacement = '-'): string => {
  return input ? input.trim().replaceAll(/[\W]+/g, replacement) : ''
}

export const splitByCamelCase = (input: string, replacement = ' ') => {
  return input.replaceAll(/([A-Z])/g, `${replacement}$1`)
}

export const camelToSnakeCase = (string_: string): string => string_.replaceAll(/[A-Z0-9]/g, (letter: string) => `_${letter.toLowerCase()}`)
export const snakeToCamelCase = (string_: string): string => {
  return string_.replaceAll(/([-_][a-z0-9])/gi, ($1: string) => {
    return $1.toUpperCase().replace('-', '').replace('_', '')
  })
}

export const tryParseInt = (string_: string, defaultValue = 0): number => {
  try {
    return Number.parseInt(string_)
  } catch {
    return defaultValue
  }
}

export const tryParseFloat = (string_: string, defaultValue = 0): number => {
  try {
    return Number.parseFloat(string_)
  } catch {
    return defaultValue
  }
}

export const tryParseBool = (string_: string, defaultValue = null): boolean | null => {
  try {
    if (['true', 'y', 'yes'].includes(string_.toLowerCase())) {
      return true
    }

    if (['false', 'n', 'no'].includes(string_.toLowerCase())) {
      return false
    }

    return defaultValue
  } catch {
    return defaultValue
  }
}

export const isPhoneNumber = (input: string) => {
  return /^[0-9 +]+$/.test(input.trim())
}

export const isNumericString = (input: string) => {
  return /^[0-9]+$/.test(input.trim())
}

export const removeCharsFromString = (input: string, charsToRemove: string[]): string => {
  // Create a Set for faster lookup of characters to remove
  const charsSet = new Set(charsToRemove)

  // Filter out characters that are in the charsSet
  const result = input
    .split('')
    .filter(char => !charsSet.has(char))
    .join('')

  return result
}
