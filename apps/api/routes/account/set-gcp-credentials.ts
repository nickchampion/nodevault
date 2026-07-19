import { eq } from 'drizzle-orm'
import type { ApiHandler } from '@platform/components.context'
import type { GcpCredentialsStatus, SetGcpCredentialsRequest } from '@platform/components.contracts'
import { accounts } from '@platform/components.domain'
import { createGeminiClient } from '@platform/integrations.gemini'
import { createVertexSearchClient, dataStoreId } from '@platform/integrations.vertexsearch'
import { encryptGcpCredentials } from '../../gcp.js'
import { toGcpStatusDto } from './mappers.js'

const MESSAGE_LIMIT = 400

const reason = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)

  return message.slice(0, MESSAGE_LIMIT)
}

/**
 * Save (and verify) the account's own Google Cloud credentials. The key is probed with
 * two live calls before anything is stored — an embedding request (Vertex AI API +
 * aiplatform permission) and a data store lookup (Discovery Engine API + the
 * `nodevault-assets` store) — so a saved credential is a working credential. Both probes
 * run before the first DB statement, keeping the request transaction from holding a
 * connection across slow external calls. The key is encrypted before it touches the
 * database and is never returned to the client.
 */
export const accountSetGcpCredentials: ApiHandler<SetGcpCredentialsRequest, GcpCredentialsStatus> = async (context) => {
  const accountId = context.user?.accountId

  if (!accountId) return context.event.response.unauthorised()

  const { projectId, location, serviceAccountKey } = context.event.payload
  const config = { project: projectId, location, credentials: serviceAccountKey }

  try {
    await createGeminiClient(config).embedChunks(['NodeVault credential verification'])
  } catch (error) {
    context.log.warn('GCP credential verification failed (Vertex AI probe)', { accountId, error })

    return context.event.response.badRequestCustom(
      'serviceAccountKey',
      `Vertex AI check failed — make sure the Vertex AI API is enabled and the service account has the Vertex AI User role. Google said: ${reason(error)}`,
    )
  }

  try {
    await createVertexSearchClient(config).verifyDataStore()
  } catch (error) {
    context.log.warn('GCP credential verification failed (Vertex AI Search probe)', { accountId, error })

    return context.event.response.badRequestCustom(
      'serviceAccountKey',
      `Vertex AI Search check failed — make sure the Discovery Engine API is enabled, the service account has the Discovery Engine Admin role, and a global data store with ID "${dataStoreId}" exists. Google said: ${reason(error)}`,
    )
  }

  const [account] = await context.session.db
    .update(accounts)
    .set({
      gcpProjectId: projectId,
      gcpLocation: location,
      gcpCredentials: encryptGcpCredentials(serviceAccountKey),
      gcpVerifiedAtUTC: new Date(),
      updatedAtUTC: new Date(),
    })
    .where(eq(accounts.id, accountId))
    .returning()

  if (!account) return context.event.response.notFound()

  return context.event.response.ok(toGcpStatusDto(account))
}
