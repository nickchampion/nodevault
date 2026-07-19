import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { PageHero } from '../../components/app/PageHero'
import { Container } from '../../components/ui/Container'

export const metadata: Metadata = {
  title: 'Privacy policy — NodeVault',
  description: 'What NodeVault collects, how your documents are processed, exactly what is sent to Google Cloud, and how to remove your data.',
}

const Section = ({ title, children }: { title: string, children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
      {title}
    </h2>

    {children}
  </section>
)

export default function PrivacyPage() {
  return (
    <div>
      <PageHero
        eyebrow="Privacy"
        title="Privacy policy"
        description="Your library is personal, so this policy is written to be read. It explains what we collect, exactly what happens to your documents — including what is sent to Google Cloud — and how to remove your data."
      />

      <Container className="py-12">
        <div className="max-w-3xl space-y-10 text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last updated: 19 July 2026
          </p>

          <Section title="The short version">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Your documents are processed by Google Cloud&apos;s Vertex AI, which is
                {' '}
                <strong>contractually barred from using your content to train its models</strong>
                .
              </li>

              <li>
                Once you connect your own Google Cloud project, your content is processed and indexed
                {' '}
                <strong>in your own project</strong>
                {' '}
                — not ours.
              </li>

              <li>
                Nothing you add is shared with other users, sold, or used for advertising. Answers only
                ever come from your own content.
              </li>

              <li>
                Deleting a document or vault deletes everything derived from it, including the copies
                held in Google Cloud.
              </li>
            </ul>
          </Section>

          <Section title="What we collect">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account details</strong>
                {' '}
                — your name and email address, used to sign you in and send you transactional email
                (login links, account notifications). We never send marketing email you didn&apos;t ask for.
              </li>

              <li>
                <strong>Content you add</strong>
                {' '}
                — the files you upload and the text of web pages you save, plus everything we derive
                from them: extracted text, chunks, and embeddings (numerical representations used for
                search).
              </li>

              <li>
                <strong>Conversations</strong>
                {' '}
                — the questions you ask and the answers you receive, so you can pick a conversation
                back up where you left off.
              </li>

              <li>
                <strong>Google Cloud credentials</strong>
                {' '}
                — if you connect your own project: your project ID, region, and service account key.
              </li>

              <li>
                <strong>Operational logs</strong>
                {' '}
                — standard request logs (timing, errors) used to keep the service running. Logs never
                contain your document content or your credentials.
              </li>
            </ul>
          </Section>

          <Section title="How your content is processed">
            <p>
              When you add a document or link, NodeVault extracts its text, splits it into passages,
              and sends those passages to Google Cloud&apos;s Vertex AI to be embedded and indexed —
              that is what makes your library searchable and able to answer questions. When you search
              or ask a question, your query and the relevant passages are sent to Google&apos;s Gemini
              models to produce the answer.
            </p>

            <p>
              Your extracted text, chunks, embeddings, and conversations are also stored in
              NodeVault&apos;s own database so the app can show you your library and your conversation
              history.
            </p>
          </Section>

          <Section title="What is sent to Google, and what Google does with it">
            <p>
              All AI processing runs on
              {' '}
              <strong>Vertex AI on Google Cloud</strong>
              {' '}
              — not Google&apos;s consumer Gemini products. That distinction matters, because different
              terms apply:
            </p>

            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Your content is never used to train Google&apos;s models.</strong>
                {' '}
                Under the Google Cloud terms and Cloud Data Processing Addendum, Google acts as a data
                processor and is contractually barred from using customer content — your documents,
                queries, or answers — to train or improve its models.
              </li>

              <li>
                <strong>Embedding and answer requests are transient.</strong>
                {' '}
                Prompts and responses are processed and returned, not retained — Google may cache
                inputs for up to 24 hours to reduce latency, and that&apos;s it.
              </li>

              <li>
                <strong>One copy of your document text is stored in Google Cloud.</strong>
                {' '}
                Each document&apos;s extracted text is indexed in a Vertex AI Search data store — the
                index that grounds answers in your own content. It is encrypted at rest and deleted
                when you delete the document or vault.
              </li>
            </ul>

            <p>
              Google&apos;s own commitments are described in its
              {' '}
              <a
                href="https://cloud.google.com/vertex-ai/generative-ai/docs/data-governance"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
              >
                Generative AI data governance documentation
              </a>
              .
            </p>
          </Section>

          <Section title="Your own Google Cloud project">
            <p>
              NodeVault is designed so that, after a short trial, your content is processed in
              {' '}
              <strong>your own Google Cloud project</strong>
              {' '}
              under your own agreement with Google:
            </p>

            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>During the trial</strong>
                {' '}
                — new accounts run on NodeVault&apos;s Google Cloud project, so your content is
                processed and indexed in our tenancy while you evaluate the product.
              </li>

              <li>
                <strong>Once connected</strong>
                {' '}
                — all processing and indexing happens in your project. Your existing documents are
                migrated into your project&apos;s search index and
                {' '}
                <strong>the copies in ours are deleted</strong>
                . From then on, we never hold your content in our Google tenancy, and you can see and
                revoke NodeVault&apos;s access at any time from your own Google Cloud console.
              </li>
            </ul>

            <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
              <ShieldCheck className="size-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />

              <span>
                Your service account key is encrypted (AES-256) before it is stored, decrypted only at
                the moment a request runs against your project, never logged, and never sent back to
                the browser. See the
                {' '}
                <Link
                  href="/help/gcp"
                  className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
                >
                  Google Cloud setup guide
                </Link>
                {' '}
                for how to connect and revoke access.
              </span>
            </p>
          </Section>

          <Section title="Where your data lives">
            <p>
              Embeddings run in the Vertex AI region you choose when connecting your project. Answer
              generation and the search index use Google&apos;s
              {' '}
              <strong>global</strong>
              {' '}
              infrastructure, which means that content may be processed or stored in any Google Cloud
              region rather than a specific country. If regional residency matters to you, bear this
              in mind when deciding what to add.
            </p>
          </Section>

          <Section title="Other service providers">
            <p>
              Besides Google Cloud, NodeVault relies on a small number of providers to run the
              service:
            </p>

            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Cloudflare</strong>
                {' '}
                — hosts the NodeVault application and serves traffic to your browser.
              </li>

              <li>
                <strong>Resend</strong>
                {' '}
                — delivers transactional email (login links, account notifications), so it processes
                your email address.
              </li>

              <li>
                <strong>Inngest</strong>
                {' '}
                — orchestrates background processing (e.g. reading a newly added document). Events
                carry internal record IDs only, never your document content.
              </li>
            </ul>

            <p>
              We do not sell your data, share it with advertisers, or use third-party analytics that
              track you across sites.
            </p>
          </Section>

          <Section title="Retention and deletion">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Deleting a document or vault</strong>
                {' '}
                removes the content and everything derived from it — extracted text, chunks,
                embeddings, and the corresponding documents in the Google Cloud search index.
              </li>

              <li>
                <strong>Conversations</strong>
                {' '}
                are kept until you delete them.
              </li>

              <li>
                <strong>Your whole account</strong>
                {' '}
                — if you want everything gone, including your account details,
                {' '}
                <Link
                  href="/contact"
                  className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
                >
                  contact us
                </Link>
                {' '}
                and we&apos;ll delete it.
              </li>
            </ul>
          </Section>

          <Section title="Your rights">
            <p>
              You can ask us for a copy of the personal data we hold about you, ask us to correct it,
              or ask us to delete it. Because your content lives in your own vaults (and, once
              connected, your own Google Cloud project), most of this you can do yourself directly in
              the app — for anything else,
              {' '}
              <Link
                href="/contact"
                className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
              >
                get in touch
              </Link>
              .
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              If we change how your data is handled — a new provider, a new kind of processing — we
              will update this page and note the date at the top before the change takes effect.
            </p>
          </Section>
        </div>
      </Container>
    </div>
  )
}
