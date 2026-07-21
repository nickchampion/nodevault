import { eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { OpenRouterCredentialsStatus, SetOpenRouterKeyRequest } from '@platform/components.nodevault.contracts'
import { accounts } from '@platform/components.nodevault.domain'
import { createOpenRouterClient } from '@platform/integrations.openrouter'
import { serverConfiguration } from '@platform/components.configuration.server'
import { encrypt } from '@platform/components.utils.server'
import { hasAiAccess, invalidateAiAccount } from '../../utils/ai/client.js'
import { toOpenRouterStatusDto } from './mappers.js'

const MESSAGE_LIMIT = 400

const reason = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)

  return message.slice(0, MESSAGE_LIMIT)
}

/**
 * Connect (or rotate) the account's OpenRouter key. Unlike the GCP/OpenAI switches this is
 * *additive* — it never touches aiProvider. Retrieval still runs on the base provider, so a
 * usable base provider is required first; the key is probed live, then encrypted at rest and
 * only ever decrypted server-side to stream answers. Re-calling it simply replaces the key.
 */
export const accountSetOpenRouterKey: ApiHandler<SetOpenRouterKeyRequest, OpenRouterCredentialsStatus> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { apiKey } = context.event.payload

  const existing = await context.session.db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })

  if (!existing) return context.event.response.notFound()

  if (!hasAiAccess(existing)) {
    return context.event.response.badRequestCustom(
      'apiKey',
      'Connect a Google Cloud or OpenAI provider first — OpenRouter only replaces the answer model, retrieval still runs on your base provider.',
    )
  }

  try {
    await createOpenRouterClient({ apiKey }).verifyApiKey()
  } catch (error) {
    context.log.warn('OpenRouter credential verification failed', { accountId, error })

    return context.event.response.badRequestCustom(
      'apiKey',
      `OpenRouter check failed — make sure the key is active. OpenRouter said: ${reason(error)}`,
    )
  }

  const [account] = await context.session.db
    .update(accounts)
    .set({
      openrouterApiKey: encrypt(apiKey, serverConfiguration.environment.key, serverConfiguration.environment.salt),
      openrouterVerifiedAtUTC: new Date(),
      updatedAtUTC: new Date(),
    })
    .where(eq(accounts.id, accountId))
    .returning()

  context.session.on('afterCommit', async () => {
    await invalidateAiAccount(accountId)
  })

  return context.event.response.ok(toOpenRouterStatusDto(account))
}
