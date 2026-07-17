export const isCloudflareWorker = () => {
  return typeof globalThis !== 'undefined'
    && typeof fetch === 'function'
    && globalThis.document === undefined
    && globalThis.WorkerGlobalScope !== undefined
}
