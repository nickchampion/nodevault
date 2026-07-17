export const accurateSizeInBytes = <T>(data: T): number => {
  const jsonString = JSON.stringify(data)

  return new TextEncoder().encode(jsonString).length
}

export const clone = <T>(value: T): T => {
  if (value === null || value === undefined) return value

  return structuredClone(value)
}

/**
 * Attempt a deep clone, returning the original value if cloning fails (e.g. unserializable types).
 */
export const tryClone = <T>(value: T): T => {
  if (value === null || value === undefined) return value

  try {
    return structuredClone(value)
  } catch {
    return value
  }
}

/**
 * Merge enumerable own properties from source into target, mutating target. Returns target.
 */
export const mergeInTo = <T extends Record<string, any>, U extends Record<string, any>>(target: T, source: U): T & U => {
  if (!source) return target as T & U

  Object.keys(source).forEach((key) => {
    (target as Record<string, any>)[key] = source[key]
  })
  return target as T & U
}

/**
 * Recursively transform every key of an object (and nested objects/arrays) using the provided
 * transformer. Useful for converting between casing conventions (camel <-> snake).
 */
export const convertKeys = <T = any>(input: any, keyTransform: (key: string) => string): T => {
  if (Array.isArray(input)) {
    return input.map(item => convertKeys(item, keyTransform)) as unknown as T
  }

  if (input && typeof input === 'object' && input.constructor === Object) {
    const result: Record<string, any> = {}

    Object.keys(input).forEach((key) => {
      result[keyTransform(key)] = convertKeys(input[key], keyTransform)
    })
    return result as T
  }

  return input as T
}

export const copyFields = (object: Record<string, any>, ignore: unknown[] = []) => {
  const result: Record<string, any> = {}

  Object.keys(object).forEach((k) => {
    if (!ignore.includes(k)) result[k] = object[k]
  })
  return result
}

export const removeFields = <T extends Record<string, any>>(object: T, fields: string[]): Partial<T> | null => {
  if (!object) return null

  const result = { ...object }

  for (const field of fields) {
    delete result[field]
  }

  return result
}

export const filter = <T>(record: Record<string, T>, function_: (e: T) => boolean): Record<string, T> => {
  const result: Record<string, T> = {}

  Object.keys(record)
    .filter(k => function_(record[k]))
    .forEach(k => (result[k] = record[k]))
  return result
}

export const transform = <T, T2>(record: Record<string, T>, function_: (e: T) => T2): Record<string, T2> => {
  const result: Record<string, T2> = {}

  Object.keys(record).forEach(k => (result[k] = function_(record[k])))
  return result
}

/**
 * Returns the object value at the given path, path should be period separated,
 * i.e. record.storage.id to return the id field from storage object
 * @param obj
 * @param path
 * @returns
 */

export const getValueByPath = (object: any, path: string): any => {
  return path
    .replaceAll(/\[|\]\.?/g, '.')
    .split('.')
    .filter(Boolean)
    .reduce((accumulator, value) => accumulator && accumulator[value], object)
}

/**
 * As above but sets a value at the given path.
 * @param obj
 * @param path
 * @param value
 */

export const setValueByPath = (object: any, path: string, value: any): void => {
  if (!object) return

  let index: number
  const parts = path.split('.')

  for (index = 0; index < parts.length - 1; index++) {
    if (!object[parts[index]]) object[parts[index]] = {}

    object = object[parts[index]]
  }
  object[parts[index]] = value
}
