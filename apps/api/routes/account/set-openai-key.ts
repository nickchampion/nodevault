import { eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { OpenAiCredentialsStatus, SetOpenAiKeyRequest } from '@platform/components.nodevault.contracts'
import { accounts } from '@platform/components.nodevault.domain'
import { createOpenAiClient } from '@platform/integrations.openai'
import { serverConfiguration } from '@platform/components.configuration.server'
import { encrypt } from '@platform/components.utils.server'
import { invalidateAiAccount } from '../../utils/ai/client.js'
import { toGcpConfig } from '../../utils/ai/gcp.js'
import { accountOpenaiConnectedEvent, inngest } from '../../inngest/index.js'
import { toOpenAiStatusDto } from './mappers.js'

const MESSAGE_LIMIT = 400

const reason = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)

  return message.slice(0, MESSAGE_LIMIT)
}

/**
 * One handler, three states:
 *  - locked: the account already connected real GCP credentials — committed to Gemini,
 *    no switch possible.
 *  - first connection: still on the Gemini trial, no GCP credentials connected yet —
 *    this call IS the one-way switch. The key is probed live, the account's vector
 *    store is created, and migrate-to-openai fires to re-embed/re-mirror any vault
 *    content created during the trial.
 *  - already on OpenAI: key rotation only — probe + replace the stored key, leave the
 *    vector store and migration state untouched.
 */
export const accountSetOpenAiKey: ApiHandler<SetOpenAiKeyRequest, OpenAiCredentialsStatus> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { apiKey } = context.event.payload

  const existing = await context.session.db.query.accounts.findFirst({ where: eq(accounts.id, accountId) })

  if (!existing) return context.event.response.notFound()

  if (existing.aiProvider === 'gemini' && toGcpConfig(existing)) {
    return context.event.response.badRequestCustom(
      'apiKey',
      'This account is connected to Google Cloud and can\'t switch to OpenAI.',
    )
  }

  const client = createOpenAiClient({ apiKey })

  try {
    await client.verifyApiKey()
  } catch (error) {
    context.log.warn('OpenAI credential verification failed (models probe)', { accountId, error })

    return context.event.response.badRequestCustom(
      'apiKey',
      `OpenAI check failed — make sure the key is active and has not been revoked. OpenAI said: ${reason(error)}`,
    )
  }

  const isFirstConnection = existing.aiProvider === 'gemini'

  let vectorStoreId = existing.openaiVectorStoreId

  try {
    if (isFirstConnection || !vectorStoreId) {
      vectorStoreId = await client.ensureVectorStore()
    } else {
      await client.verifyVectorStore(vectorStoreId)
    }
  } catch (error) {
    context.log.warn('OpenAI credential verification failed (vector store probe)', { accountId, error })

    return context.event.response.badRequestCustom(
      'apiKey',
      `OpenAI vector store check failed. OpenAI said: ${reason(error)}`,
    )
  }

  const [account] = await context.session.db
    .update(accounts)
    .set({
      aiProvider: 'openai',
      openaiApiKey: encrypt(apiKey, serverConfiguration.environment.key, serverConfiguration.environment.salt),
      openaiVerifiedAtUTC: new Date(),
      openaiVectorStoreId: vectorStoreId,
      openaiMigratingAtUTC: isFirstConnection ? new Date() : existing.openaiMigratingAtUTC,
      updatedAtUTC: new Date(),
    })
    .where(eq(accounts.id, accountId))
    .returning()

  context.session.on('afterCommit', async () => {
    await invalidateAiAccount(accountId)
  })

  if (isFirstConnection) {
    context.session.on('afterCommit', async () => {
      await inngest.send(accountOpenaiConnectedEvent.create({ accountId }))
    })
  }

  return context.event.response.ok(toOpenAiStatusDto(account))
}
