import { Inngest, eventType } from 'inngest'
import { serverConfiguration } from '@platform/components.configuration.server'
import {
  accountGcpConnectedEventSchema, assetFileUploadedEventSchema, assetUrlSubmittedEventSchema,
} from '@platform/components.nodevault.contracts'

/**
 * The Inngest client lives in its own module so functions can import it without
 * creating a cycle through index.ts (which imports the functions).
 *
 * isDev turns off signature verification and targets the local Dev Server
 * (pnpm run inngest); in production INNGEST_SIGNING_KEY must be set.
 */
export const inngest = new Inngest({ id: 'nodevault', isDev: serverConfiguration.dev })

/**
 * Typed event definitions: used directly as function triggers and to build validated
 * events for sending (`inngest.send(assetUploadedEvent.create({ assetId }))`).
 */
export const assetFileUploadedEvent = eventType('assets/file.uploaded', { schema: assetFileUploadedEventSchema })
export const assetUrlSubmittedEvent = eventType('assets/url.submitted', { schema: assetUrlSubmittedEventSchema })
export const accountGcpConnectedEvent = eventType('account/gcp.connected', { schema: accountGcpConnectedEventSchema })
