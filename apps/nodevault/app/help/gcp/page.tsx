import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'

export const metadata: Metadata = {
  title: 'Google Cloud setup — NodeVault',
  description: 'Step-by-step guide to creating a Google Cloud account, enabling the required APIs and generating the credentials NodeVault needs.',
}

const Step = ({ number, title, children }: { number: number, title: string, children: ReactNode }) => (
  <section className="flex gap-4">
    <div className="flex items-center justify-center size-8 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold shrink-0 mt-0.5">
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

const CommandBlock = ({ children }: { children: string }) => (
  <pre className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
    {children}
  </pre>
)

export default function GcpHelpPage() {
  return (
    <div>
      <PageHero
        eyebrow="Help"
        title="Set up Google Cloud for NodeVault"
        description="NodeVault runs entirely on your own Google Cloud project — your documents are embedded, indexed and answered with your own Gemini and Vertex AI quota. This guide walks you from a brand-new Google Cloud account to working credentials."
      />

      <Container className="py-12">
        <div className="max-w-3xl space-y-10 text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 text-sm space-y-2">
            <p className="font-medium text-slate-900 dark:text-slate-100">What NodeVault needs from your project</p>

            <ul className="list-disc pl-5 space-y-1">
              <li>
                <Code>Vertex AI API</Code>
                {' '}
                — Gemini embeddings and answer generation
              </li>

              <li>
                <Code>Discovery Engine API</Code>
                {' '}
                — Vertex AI Search, the managed retrieval index
              </li>

              <li>
                A global Vertex AI Search data store with the ID
                {' '}
                <Code>nodevault-assets</Code>
              </li>

              <li>
                A service account key with the
                {' '}
                <Code>Vertex AI User</Code>
                {' '}
                and
                {' '}
                <Code>Discovery Engine Admin</Code>
                {' '}
                roles
              </li>
            </ul>
          </div>

          <Step
            number={1}
            title="Create a Google Cloud account"
          >
            <p>
              Go to
              {' '}
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
              >
                console.cloud.google.com
              </a>
              {' '}
              and sign in with a Google account. New accounts get free trial credit; you will still need to
              add a billing method, because Vertex AI requires billing to be enabled. Day-to-day usage for a
              personal vault is typically pennies — embeddings and Gemini Flash calls are billed per token to
              your project, so you can see every cost in your own billing console.
            </p>
          </Step>

          <Step
            number={2}
            title="Create a project"
          >
            <p>
              From the project picker in the top bar choose
              {' '}
              <strong>New project</strong>
              . Give it any name — then note the
              {' '}
              <strong>project ID</strong>
              {' '}
              (e.g.
              {' '}
              <Code>my-nodevault-123456</Code>
              ). The ID, not the display name, is what you will paste into NodeVault. Make sure billing is
              linked to the project under
              {' '}
              <strong>Billing → Link a billing account</strong>
              .
            </p>
          </Step>

          <Step
            number={3}
            title="Enable the two APIs"
          >
            <p>
              In
              {' '}
              <strong>APIs &amp; Services → Library</strong>
              , search for and enable both of these (or run the
              {' '}
              <Code>gcloud</Code>
              {' '}
              command below):
            </p>

            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Vertex AI API</strong>
                {' '}
                (
                <Code>aiplatform.googleapis.com</Code>
                )
              </li>

              <li>
                <strong>Discovery Engine API</strong>
                {' '}
                (
                <Code>discoveryengine.googleapis.com</Code>
                )
              </li>
            </ul>

            <CommandBlock>
              {'gcloud services enable aiplatform.googleapis.com discoveryengine.googleapis.com \\\n  --project=YOUR_PROJECT_ID'}
            </CommandBlock>
          </Step>

          <Step
            number={4}
            title="Create the Vertex AI Search data store"
          >
            <p>
              NodeVault mirrors every document into a Vertex AI Search data store in your project — it must
              use the exact ID
              {' '}
              <Code>nodevault-assets</Code>
              {' '}
              and live in the
              {' '}
              <strong>global</strong>
              {' '}
              multi-region.
            </p>

            <ol className="list-decimal pl-5 space-y-1">
              <li>
                In the console open
                {' '}
                <strong>AI Applications</strong>
                {' '}
                (previously Agent Builder / Vertex AI Search) and accept the terms if prompted
              </li>

              <li>
                Go to
                {' '}
                <strong>Data stores → Create data store</strong>
              </li>

              <li>
                Choose
                {' '}
                <strong>Cloud Storage</strong>
                {' '}
                as the source, then skip importing data (NodeVault imports documents itself), or pick the
                “unstructured documents” option if offered
              </li>

              <li>
                Set the location to
                {' '}
                <strong>global</strong>
              </li>

              <li>
                Set the
                {' '}
                <strong>data store ID</strong>
                {' '}
                to
                {' '}
                <Code>nodevault-assets</Code>
                {' '}
                — the name can be anything, the ID must match exactly
              </li>
            </ol>
          </Step>

          <Step
            number={5}
            title="Create a service account with the right roles"
          >
            <p>
              Under
              {' '}
              <strong>IAM &amp; Admin → Service accounts → Create service account</strong>
              {' '}
              create an account (e.g.
              {' '}
              <Code>nodevault</Code>
              ) and grant it exactly these two roles:
            </p>

            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Vertex AI User</strong>
                {' '}
                (
                <Code>roles/aiplatform.user</Code>
                ) — embeddings and Gemini generation
              </li>

              <li>
                <strong>Discovery Engine Admin</strong>
                {' '}
                (
                <Code>roles/discoveryengine.admin</Code>
                ) — importing and deleting search documents
              </li>
            </ul>

            <CommandBlock>
              {'gcloud iam service-accounts create nodevault --project=YOUR_PROJECT_ID\n\n'
                + 'gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \\\n'
                + '  --member="serviceAccount:nodevault@YOUR_PROJECT_ID.iam.gserviceaccount.com" \\\n'
                + '  --role="roles/aiplatform.user"\n\n'
                + 'gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \\\n'
                + '  --member="serviceAccount:nodevault@YOUR_PROJECT_ID.iam.gserviceaccount.com" \\\n'
                + '  --role="roles/discoveryengine.admin"'}
            </CommandBlock>
          </Step>

          <Step
            number={6}
            title="Download a JSON key"
          >
            <p>
              Open the service account, switch to the
              {' '}
              <strong>Keys</strong>
              {' '}
              tab and choose
              {' '}
              <strong>Add key → Create new key → JSON</strong>
              . A
              {' '}
              <Code>.json</Code>
              {' '}
              file downloads — this is the credential NodeVault uses. Treat it like a password.
            </p>

            <CommandBlock>
              {'gcloud iam service-accounts keys create nodevault-key.json \\\n'
                + '  --iam-account=nodevault@YOUR_PROJECT_ID.iam.gserviceaccount.com'}
            </CommandBlock>
          </Step>

          <Step
            number={7}
            title="Connect it to NodeVault"
          >
            <p>
              Head to
              {' '}
              <Link
                href="/account/settings"
                className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
              >
                Account → Settings
              </Link>
              , enter your project ID, pick the Vertex AI region you want embeddings to run in (e.g.
              {' '}
              <Code>europe-west2</Code>
              {' '}
              or
              {' '}
              <Code>us-central1</Code>
              ) and paste the full contents of the JSON key file. NodeVault verifies the key with a live
              Vertex AI call before saving it — if anything in the steps above is missing, the error message
              will tell you which check failed.
            </p>

            <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
              <ShieldCheck className="size-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />

              <span>
                Your key is encrypted (AES-256) before it is stored, decrypted only at the moment a request
                runs against your project, never logged, and never sent back to the browser. You can rotate
                it at any time by pasting a new key, and revoke NodeVault&apos;s access entirely by deleting
                the key in Google Cloud.
              </span>
            </p>
          </Step>

          <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Troubleshooting
            </h2>

            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                <strong>“Vertex AI check failed … API has not been used or is disabled”</strong>
                {' '}
                — the Vertex AI API isn&apos;t enabled (step 3), or it was enabled seconds ago; propagation
                can take a minute or two.
              </li>

              <li>
                <strong>“Permission denied”</strong>
                {' '}
                — the service account is missing one of the two roles from step 5, or the key belongs to a
                different project than the ID you entered.
              </li>

              <li>
                <strong>“Vertex AI Search check failed … not found”</strong>
                {' '}
                — the data store is missing, in the wrong location (it must be
                {' '}
                <strong>global</strong>
                ), or its ID isn&apos;t exactly
                {' '}
                <Code>nodevault-assets</Code>
                {' '}
                (step 4).
              </li>

              <li>
                <strong>“Billing account … is disabled”</strong>
                {' '}
                — link an active billing account to the project (step 2).
              </li>
            </ul>
          </section>
        </div>
      </Container>
    </div>
  )
}
