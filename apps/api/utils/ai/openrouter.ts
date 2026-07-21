import { serverConfiguration } from '@platform/components.configuration.server'
import { decrypt } from '@platform/components.utils.server'
import { AppError } from '@platform/components.nodevault.domain'
import type { Account } from '@platform/components.nodevault.domain'
import { createOpenRouterClient } from '@platform/integrations.openrouter'

/**
 * OpenRouter is an *additive* generation override, not a full AiProviderAdapter: the base
 * provider (Gemini/OpenAI) still owns embeddings, ingestion and retrieval. This module only
 * decrypts the account's OpenRouter key and streams the answer from a user-chosen model,
 * substituting for AiClient.generateAnswerStream in the local RAG path.
 */
export type OpenRouterCredentials = Pick<Account, 'openrouterApiKey' | 'openrouterVerifiedAtUTC'>

export const hasOpenRouterAccess = (account: OpenRouterCredentials): boolean => (
  Boolean(account.openrouterApiKey && account.openrouterVerifiedAtUTC)
)

const openRouterApiKey = (account: OpenRouterCredentials): string => {
  if (!account.openrouterApiKey) throw new AppError('validation', 'OpenRouter is not configured for this account')

  const apiKey = decrypt(account.openrouterApiKey, serverConfiguration.environment.key, serverConfiguration.environment.salt)

  if (!apiKey) throw new AppError('internal', 'Failed to decrypt the OpenRouter API key')

  return apiKey
}

export const generateOpenRouterAnswerStream = (
  account: OpenRouterCredentials,
  model: string,
): (systemInstruction: string, prompt: string, signal?: AbortSignal) => AsyncGenerator<string> => {
  const client = createOpenRouterClient({ apiKey: openRouterApiKey(account) })

  return (systemInstruction, prompt, signal) => client.generateAnswerStream(model, systemInstruction, prompt, signal)
}
