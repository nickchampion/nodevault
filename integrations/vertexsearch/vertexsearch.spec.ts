import { serverConfiguration } from '@platform/components.configuration.server'
import { assetIdFromDocumentPath, vaultFilter } from './vertexsearch.js'

const env = serverConfiguration.environment.environment

describe('assetIdFromDocumentPath', () => {
  test('parses the asset id from a full document resource name', () => {
    const path = `projects/220880562266/locations/global/collections/default_collection/dataStores/nodevault-assets/branches/0/documents/${env}-asset-36`

    expect(assetIdFromDocumentPath(path)).toBe(36)
  })

  test('parses a legacy (unprefixed) document id from before environment-scoping', () => {
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
  test('builds the structData filter expression, scoped to the current environment', () => {
    expect(vaultFilter(13)).toBe(`vaultId: ANY("${env}-13")`)
  })
})
