export {
  accountGcpConnectedEvent, assetFileUploadedEvent as assetUploadedEvent, assetUrlSubmittedEvent, inngest,
  topicCreatedEvent,
} from './client.js'

import { embedTopic } from './functions/embed-topic.js'
import { migrateVertexDocuments } from './functions/migrate-vertex-documents.js'
import { processFileAsset } from './functions/process-file-asset.js'
import { processUrlAsset } from './functions/process-url-asset.js'

/** Every workflow function must join this array to be served at /api/inngest */
export const functions = [embedTopic, migrateVertexDocuments, processFileAsset, processUrlAsset]
