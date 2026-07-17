export { fileUploadedEvent, inngest } from './client.js'

import { processFile } from './functions/process-file.js'

/** Every workflow function must join this array to be served at /api/inngest */
export const functions = [processFile]
