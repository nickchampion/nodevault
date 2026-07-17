/**
 * Convert an array into an object keyed by `keySelector`. When `multi` is true, values are arrays
 * of items sharing the same key. When `valueSelector` is provided, the stored value is its result;
 * otherwise the original element is stored.
 */
export function toObject<T>(array: T[], keySelector: (item: T) => string, multi: true): Record<string, T[]>
export function toObject<T, V>(array: T[], keySelector: (item: T) => string, multi: true, valueSelector: (item: T) => V): Record<string, V[]>
export function toObject<T>(array: T[], keySelector: (item: T) => string, multi?: false): Record<string, T>
export function toObject<T, V>(array: T[], keySelector: (item: T) => string, multi: false, valueSelector: (item: T) => V): Record<string, V>
export function toObject<T, V = T>(
  array: T[],
  keySelector: (item: T) => string,
  multi: boolean = false,
  valueSelector?: (item: T) => V,
): Record<string, V | V[]> {
  const result: Record<string, any> = {}

  if (!array) return result

  for (const item of array) {
    const key = keySelector(item)
    const value = valueSelector ? valueSelector(item) : (item as unknown as V)

    if (multi) {
      if (!result[key]) result[key] = []

      result[key].push(value)
    } else {
      result[key] = value
    }
  }

  return result
}

export const groupBy = <T = any>(array: T[], field: string): Record<string, T[]> => {
  return array.reduce<Record<string, T[]>>((result, currentValue: any) => {
    (result[currentValue[field]] = result[currentValue[field]] || []).push(currentValue)
    return result
  }, {})
}

export const groupByFn = <T>(array: T[], fieldSelector: (object: T) => string | string[]): Record<string, T[]> => {
  const results: Record<string, T[]> = {}

  for (const e of array) {
    const value = fieldSelector(e)
    const values = Array.isArray(value) ? value : [value]

    values.forEach((v) => {
      if (results[v]) {
        results[v].push(e)
      } else {
        results[v] = [e]
      }
    })
  }

  return results
}

export const uniqueValues = <T, K extends keyof T>(array: T[], key: K): T[K][] => {
  return [...new Set(array.map(item => item[key]))]
}

export const uniqueBy = <T, K extends keyof T>(array: T[], key: K): T[] => {
  return [...new Map(array.map(item => [item[key], item])).values()]
}

export const uniqueByMany = <T extends Record<string, any>>(array: T[], fields: string[]): T[] => {
  return Object.values(
    array.reduce<Record<string, T>>((uniqueMap, entry) => {
      const key = fields.map(k => entry[k]).join('|')

      if (!(key in uniqueMap)) uniqueMap[key] = entry

      return uniqueMap
    }, {}),
  )
}

export const uniqueObjects = <T>(array: T[]): T[] => {
  return Array.from(new Set(array.map(<any>JSON.stringify))).map(<any>JSON.parse)
}

export const nextId = (array: { id: number }[]): number => {
  if (!array?.length) return 1

  return array.map(a => a.id).sort((a, b) => b - a)[0] + 1
}

export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)]
}

export const last = <T>(array: T[]): T | null => {
  return array?.at(-1) ?? null
}

export const first = <T>(array: T[]): T | null => {
  return array?.slice(0)[0] ?? null
}

export function arraysEqual<T>(array1: T[], array2: T[]) {
  return array1.length == array2.length && array1.filter(e => array2.includes(e)).length == array1.length
}

export function arraysHaveCommonElement<T>(array1: T[], array2: T[]) {
  return array1.some(item => array2.includes(item))
}

export const mergeBy = <T, K extends keyof T>(array1: T[], array2: T[], key: K) => array1.map(itm => ({
  ...array2.find(item => item[key] === itm[key] && item),
  ...itm,
}))

export const sortByString = <T>(array: T[], keySelector: (o: T) => string) => {
  array.sort((a, b) => {
    const keyA = keySelector(a).toUpperCase()
    const keyB = keySelector(b).toUpperCase()

    if (keyA < keyB) return -1

    if (keyA > keyB) return 1

    return 0
  })
  return array
}

/**
 * Partition an array into chunks
 */
export const partition = <T>(array: T[], size: number): T[][] => array.reduce<T[][]>((accumulator, _, index) => {
  if (index % size === 0) accumulator.push(array.slice(index, index + size))

  return accumulator
}, [])

/**
 * Add elements from arr2 into arr1 if it does not currently exist
 * @param arr1
 * @param arr2
 * @param key
 * @returns
 */
export const combineBy = <T extends Record<string, any>>(arr1: T[], arr2: T[], key: string | ((index: T) => string)): T[] => {
  if (!arr2?.length) return arr1

  for (const item2 of arr2) {
    const selector = (item: T) => (typeof key == 'string' ? item[key] : key(item))

    if (arr1.every(item1 => selector(item1) !== selector(item2))) {
      arr1.push(item2)
    }
  }

  return arr1
}
