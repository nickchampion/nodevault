import { DataStoreServiceClient, DocumentServiceClient } from '@google-cloud/discoveryengine'
import { serverConfiguration } from '@platform/components.configuration.server'

// Vertex AI Search data stores live in multi-regions (global/us/eu), separate from the
// regional Vertex endpoint used for embeddings. Every account's own GCP project must
// contain a data store with this exact id (see the in-app GCP setup guide).
export const dataStoreLocation = 'global'
export const dataStoreId = 'nodevault-assets'

export type VertexSearchConfig = {
  project: string
  credentials: string
}

export type VertexSearchClient = ReturnType<typeof createVertexSearchClient>

export type AssetDocument = {
  assetId: number
  vaultId: number
  source: 'file' | 'url'
  name: string | null
  url: string | null
  text: string
}

const environmentPrefix = () => serverConfiguration.environment.environment

const documentId = (assetId: number) => `${environmentPrefix()}-asset-${assetId}`
const environmentVaultId = (vaultId: number) => `${environmentPrefix()}-${vaultId}`

/** Parses an assetId back out of a Vertex document resource name (grounding metadata round-trip). */
export const assetIdFromDocumentPath = (path: string | undefined): number | undefined => {
  const match = path?.match(/\/documents\/(?:\w+-)?asset-(\d+)$/)

  return match ? Number(match[1]) : undefined
}

/** Search filter isolating a single vault's documents, scoped to the current environment. */
export const vaultFilter = (vaultId: number): string => `vaultId: ANY("${environmentVaultId(vaultId)}")`

/**
 * Client for the Vertex AI Search (Discovery Engine) data store that mirrors vault
 * assets as documents — the retrieval source for grounded ask answers. One document per
 * asset; imports are INCREMENTAL upserts keyed on the document id, so re-ingestion is
 * idempotent. Newly imported documents take a few minutes to become searchable.
 */
export const createVertexSearchClient = ({ project, credentials }: VertexSearchConfig) => {
  const credentialsJson = JSON.parse(credentials)

  const client = new DocumentServiceClient({ credentials: credentialsJson })

  const dataStorePath = `projects/${project}/locations/${dataStoreLocation}/collections/default_collection/dataStores/${dataStoreId}`
  const branch = `${dataStorePath}/branches/default_branch`

  return {
    dataStorePath,

    /**
     * Credential verification probe: fetches the data store, which exercises the
     * Discovery Engine API being enabled, the service account's permission, and the
     * `nodevault-assets` store existing — the three setup steps users get wrong.
     */
    verifyDataStore: async (): Promise<void> => {
      const dataStores = new DataStoreServiceClient({ credentials: credentialsJson })

      try {
        await dataStores.getDataStore({ name: dataStorePath })
      } finally {
        await dataStores.close()
      }
    },

    upsertAssetDocument: async (asset: AssetDocument): Promise<void> => {
      const [operation] = await client.importDocuments({
        parent: branch,
        reconciliationMode: 'INCREMENTAL',
        inlineSource: {
          documents: [{
            id: documentId(asset.assetId),
            structData: {
              fields: {
                vaultId: { stringValue: environmentVaultId(asset.vaultId) },
                assetId: { stringValue: String(asset.assetId) },
                source: { stringValue: asset.source },
                ...(asset.name && { name: { stringValue: asset.name } }),
                ...(asset.url && { url: { stringValue: asset.url } }),
              },
            },
            content: {
              mimeType: 'text/plain',
              rawBytes: Buffer.from(asset.text).toString('base64'),
            },
          }],
        },
      })

      const [result] = await operation.promise()

      if (result.errorSamples?.length) {
        throw new Error(`Vertex document import failed: ${result.errorSamples[0].message}`)
      }
    },

    deleteAssetDocument: async (assetId: number): Promise<void> => {
      try {
        await client.deleteDocument({ name: `${branch}/documents/${documentId(assetId)}` })
      } catch (error) {
        // already gone (never indexed, or deleted twice) — deletion is idempotent
        if ((error as { code?: number }).code === 5) return

        throw error
      }
    },
  }
}
