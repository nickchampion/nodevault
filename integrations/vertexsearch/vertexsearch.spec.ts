import { assetIdFromDocumentPath, vaultFilter } from './vertexsearch.js'

describe('assetIdFromDocumentPath', () => {
  test('parses the asset id from a full document resource name', () => {
    const path = 'projects/220880562266/locations/global/collections/default_collection/dataStores/nodevault-assets/branches/0/documents/asset-36'

    expect(assetIdFromDocumentPath(path)).toBe(36)
  })

  test('returns undefined for documents that are not assets', () => {
    const path = 'projects/p/locations/global/collections/c/dataStores/d/branches/0/documents/smoke-vault13'

    expect(assetIdFromDocumentPath(path)).toBeUndefined()
  })

  test('returns undefined for a missing path', () => {
    expect(assetIdFromDocumentPath(undefined)).toBeUndefined()
  })
})

describe('vaultFilter', () => {
  test('builds the structData filter expression', () => {
    expect(vaultFilter(13)).toBe('vaultId: ANY("13")')
  })
})
