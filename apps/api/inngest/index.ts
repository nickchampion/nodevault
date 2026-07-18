export { assetFileUploadedEvent as assetUploadedEvent, assetUrlSubmittedEvent, inngest } from './client.js'

import { processFileAsset } from './functions/process-file-asset.js'
import { processUrlAsset } from './functions/process-url-asset.js'

/** Every workflow function must join this array to be served at /api/inngest */
export const functions = [processFileAsset, processUrlAsset]
