import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'

export const metadata: Metadata = {
  title: 'OpenAI setup — NodeVault',
  description: 'How to create an OpenAI API key and connect it to NodeVault.',
}

const Step = ({ number, title, children }: { number: number, title: string, children: ReactNode }) => (
  <section className="flex gap-4">
    <div className="flex items-center justify-center size-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 mt-0.5">
      {number}
    </div>

    <div className="space-y-3 min-w-0">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>

      {children}
    </div>
  </section>
)

const Code = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-[0.85em] rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
    {children}
  </code>
)

export default function OpenAiHelpPage() {
  return (
    <div>
      <PageHero
        eyebrow="Help"
        title="Set up OpenAI for NodeVault"
        description="OpenAI is simpler to connect than Google Cloud — there's no console setup beyond generating a key. Unlike Google Cloud, there's no free trial on this side: connecting an OpenAI key is a one-time, permanent switch away from the Google Cloud trial, and it takes a few minutes to move any existing vault content over."
      />

      <Container className="py-12">
        <div className="max-w-3xl space-y-10 text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 text-sm space-y-2">
            <p className="font-medium text-slate-900 dark:text-slate-100">What NodeVault needs from your OpenAI account</p>

            <ul className="list-disc pl-5 space-y-1">
              <li>
                An
                {' '}
                <strong>API key</strong>
                {' '}
                — used for embeddings, generation and managed retrieval
              </li>

              <li>
                A payment method on file — OpenAI&apos;s API is pay-as-you-go, there&apos;s no
                free tier for API usage
              </li>
            </ul>

            <p>
              That&apos;s it — NodeVault creates its own vector store on your account automatically
              when you connect a key, so there&apos;s nothing to configure by hand the way Google
              Cloud&apos;s data store requires.
            </p>
          </div>

          <Step
            number={1}
            title="Create an OpenAI account and add billing"
          >
            <p>
              Go to
              {' '}
              <a
                href="https://platform.openai.com"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                platform.openai.com
              </a>
              {' '}
              and sign in or create an account. Under
              {' '}
              <strong>Settings → Billing</strong>
              , add a payment method — API usage is billed separately from any ChatGPT
              subscription you might already have. Day-to-day usage for a personal vault is
              typically cents per month; embeddings and the small models NodeVault uses for
              generation are priced per token, and every cost is visible in your own usage
              dashboard.
            </p>
          </Step>

          <Step
            number={2}
            title="Create an API key"
          >
            <p>
              Under
              {' '}
              <strong>Settings → API keys → Create new secret key</strong>
              , give it a name (e.g.
              {' '}
              <Code>nodevault</Code>
              ) and create it. Copy the key immediately — OpenAI only shows it once. It starts
              with
              {' '}
              <Code>sk-</Code>
              .
            </p>
          </Step>

          <Step
            number={3}
            title="Connect it to NodeVault"
          >
            <p>
              Head to
              {' '}
              <Link
                href="/account/settings"
                className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                Account → Settings
              </Link>
              {' '}
              and paste the key. NodeVault verifies it with a live call and creates your vector
              store before saving anything.
            </p>

            <p>
              If this account is still on its Google Cloud trial and hasn&apos;t connected real
              GCP credentials yet, connecting an OpenAI key here is a
              {' '}
              <strong>one-way switch</strong>
              : any vaults, assets and topics created during the trial are automatically
              re-embedded and re-indexed on your new OpenAI account (nothing to re-upload), and
              from then on the account runs on OpenAI permanently — there&apos;s no switching
              back to Google Cloud afterwards. Vaults are briefly unavailable while the move
              happens, usually a few minutes.
            </p>

            <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
              <ShieldCheck className="size-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />

              <span>
                Your key is encrypted (AES-256) before it is stored, decrypted only at the
                moment a request runs against your account, never logged, and never sent back
                to the browser. You can rotate it at any time by pasting a new key, and revoke
                NodeVault&apos;s access entirely by deleting the key in OpenAI.
              </span>
            </p>
          </Step>

          <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Troubleshooting
            </h2>

            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                <strong>&ldquo;OpenAI check failed&rdquo;</strong>
                {' '}
                — the key is wrong, has been revoked, or was pasted with extra whitespace.
                Generate a fresh key and try again.
              </li>

              <li>
                <strong>&ldquo;OpenAI vector store check failed&rdquo;</strong>
                {' '}
                — usually a billing problem (no payment method on file, or a spending limit
                blocking the request). Check
                {' '}
                <strong>Settings → Billing</strong>
                {' '}
                on platform.openai.com.
              </li>

              <li>
                <strong>&ldquo;This account is connected to Google Cloud and can&apos;t switch to OpenAI&rdquo;</strong>
                {' '}
                — real GCP credentials are already connected (not just the trial), which locks
                the account to Google Cloud permanently. There&apos;s no way to switch after that.
              </li>
            </ul>
          </section>
        </div>
      </Container>
    </div>
  )
}
