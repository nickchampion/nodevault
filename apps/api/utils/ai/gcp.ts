import type { Content } from '@google/genai'
import { serverConfiguration } from '@platform/components.configuration.server'
import { decrypt } from '@platform/components.utils.server'
import type { Account } from '@platform/components.nodevault.domain'
import { createGeminiClient } from '@platform/integrations.gemini'
import type { GcpClientConfig } from '@platform/integrations.gemini'
import { assetIdFromDocumentPath, createVertexSearchClient, vaultFilter as vertexVaultFilter } from '@platform/integrations.vertexsearch'
import type { AiClient, AiProviderAdapter } from './client.js'

export const GCP_TRIAL_DAYS = 7

export const GCP_TRIAL_EXPIRED_MESSAGE = 'Your 7-day free trial has ended — connect your own Google Cloud project in Settings to keep using vaults'

export type GcpColumns = Pick<Account, 'gcpProjectId' | 'gcpLocation' | 'gcpCredentials' | 'gcpVerifiedAtUTC' | 'createdAtUTC'>

export const trialEndsAt = (account: Pick<Account, 'createdAtUTC'>): Date => (
  new Date(account.createdAtUTC.getTime() + GCP_TRIAL_DAYS * 24 * 60 * 60 * 1000)
)

const trialActive = (account: Pick<Account, 'createdAtUTC'>): boolean => Date.now() < trialEndsAt(account).getTime()

/** Decrypted GCP config for an account row, or null until credentials are set and verified. */
export const toGcpConfig = (account: GcpColumns): GcpClientConfig | null => {
  if (!account.gcpProjectId || !account.gcpLocation || !account.gcpCredentials || !account.gcpVerifiedAtUTC) return null

  const credentials = decrypt(account.gcpCredentials, serverConfiguration.environment.key, serverConfiguration.environment.salt)

  if (!credentials) return null

  return { project: account.gcpProjectId, location: account.gcpLocation, credentials }
}

export const hasGcpAccess = (account: GcpColumns): boolean => Boolean(toGcpConfig(account)) || trialActive(account)

export const gcpConfig = (account: GcpColumns): GcpClientConfig => toGcpConfig(account) ?? serverConfiguration.gemini

const buildGeminiClient = (gcp: GcpClientConfig): AiClient => {
  const gemini = createGeminiClient(gcp)
  const vertex = createVertexSearchClient(gcp)

  return {
    embedChunks: gemini.embedChunks,
    embedQuery: gemini.embedQuery,
    generateText: gemini.generateText,
    generateAnswerStream: gemini.generateAnswerStream,

    generateManagedAnswerStream: async function* (systemInstruction, history, question, vaultId, signal) {
      const contents: Content[] = [
        ...history.map(message => ({
          role: message.role === 'user' ? 'user' : 'model',
          parts: [{ text: message.content }],
        })),
        { role: 'user', parts: [{ text: question }] },
      ]

      const stream = gemini.generateGroundedAnswerStream(systemInstruction, contents, vertex.dataStorePath, vertexVaultFilter(vaultId), signal)

      for await (const part of stream) {
        const groundedAssetIds = (part.grounding?.groundingChunks ?? [])
          .map(chunk => assetIdFromDocumentPath(chunk.retrievedContext?.documentName))
          .filter((id): id is number => id !== undefined)

        yield { text: part.text, groundedAssetIds: groundedAssetIds.length > 0 ? groundedAssetIds : undefined }
      }
    },

    mirrorAsset: async asset => vertex.upsertAssetDocument(asset),

    deleteAssetMirror: async assetId => vertex.deleteAssetDocument(assetId),
  }
}

export const geminiProvider: AiProviderAdapter<GcpColumns> = {
  hasAccess: hasGcpAccess,
  deniedMessage: () => GCP_TRIAL_EXPIRED_MESSAGE,
  buildClient: (_db, account) => buildGeminiClient(gcpConfig(account)),
}
