export {
  accountGcpConnectedEvent, accountOpenaiConnectedEvent, assetFileUploadedEvent as assetUploadedEvent, assetUrlSubmittedEvent, inngest,
  topicCreatedEvent,
} from './client.js'

import { embedTopic } from './functions/embed-topic.js'
import { migrateToOpenai } from './functions/migrate-to-openai.js'
import { migrateVertexDocuments } from './functions/migrate-vertex-documents.js'
import { processFileAsset } from './functions/process-file-asset.js'
import { processUrlAsset } from './functions/process-url-asset.js'
import { queueRssVaultSyncs } from './functions/queue-rss-vault-syncs.js'
import { syncRssVault } from './functions/sync-rss-vault.js'

/** Every workflow function must join this array to be served at /api/inngest */
export const functions = [
  embedTopic, migrateToOpenai, migrateVertexDocuments, processFileAsset, processUrlAsset, queueRssVaultSyncs, syncRssVault,
]
