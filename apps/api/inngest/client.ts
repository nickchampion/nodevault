import { Inngest, eventType } from 'inngest'
import { serverConfiguration } from '@platform/components.configuration.server'
import {
  accountGcpConnectedEventSchema, accountOpenaiConnectedEventSchema, assetFileUploadedEventSchema, assetUrlSubmittedEventSchema, rssVaultSyncRequestedEventSchema, topicCreatedEventSchema,
} from '@platform/components.nodevault.contracts'

export const inngest = new Inngest({ id: 'nodevault', isDev: serverConfiguration.dev })

export const assetFileUploadedEvent = eventType('assets/file.uploaded', { schema: assetFileUploadedEventSchema })
export const assetUrlSubmittedEvent = eventType('assets/url.submitted', { schema: assetUrlSubmittedEventSchema })
export const accountGcpConnectedEvent = eventType('account/gcp.connected', { schema: accountGcpConnectedEventSchema })
export const accountOpenaiConnectedEvent = eventType('account/openai.connected', { schema: accountOpenaiConnectedEventSchema })
export const topicCreatedEvent = eventType('topics/topic.created', { schema: topicCreatedEventSchema })
export const rssVaultSyncRequestedEvent = eventType('vaults/rss.sync-requested', { schema: rssVaultSyncRequestedEventSchema })
