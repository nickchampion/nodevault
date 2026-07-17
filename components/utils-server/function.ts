/**
 * Check whether a value is a thenable (Promise-like).
 */
export const isPromise = <T = unknown>(value: any): value is Promise<T> => {
  return !!value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function'
}
