import { serverConfiguration } from '@platform/components.configuration.server'
import { createPool } from '@platform/components.postgres'

// one pool per process, shared by the request lifecycle and Inngest functions
export const pool = createPool(serverConfiguration.postgres)
