import { Inngest } from 'inngest'
import { serverConfiguration } from '@platform/components.configuration'

// isDev turns off signature verification and targets the local Dev Server
// (pnpm run inngest); in production INNGEST_SIGNING_KEY must be set
export const inngest = new Inngest({ id: 'nodevault', isDev: serverConfiguration.dev })

/** Example function so the endpoint registration can be verified; replace with real ones */
const helloWorld = inngest.createFunction(
  { id: 'hello-world', triggers: [{ event: 'demo/hello.world' }] },
  async ({ event, step }) => {
    console.log('running hello world 1')
    await step.sleep('wait-a-moment', '1s')
    console.log('running hello world 2')
    return { message: `Hello ${event.data?.name ?? 'world'}!` }
  },
)

export const functions = [helloWorld]
