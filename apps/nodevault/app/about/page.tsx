import type { Metadata } from 'next'
import { ArrowRight, Eye, KeyRound, Lock } from 'lucide-react'
import { PageHero } from '../../components/app/PageHero'
import { Container } from '../../components/ui/Container'
import { LinkButton } from '../../components/ui/LinkButton'

export const metadata: Metadata = {
  title: 'About us — NodeVault',
  description: 'Who we are, why we built NodeVault, and the principles behind a private library you can question.',
}

const principles = [
  {
    title: 'Private by default',
    description: 'Your library is yours alone. Nothing you add is shared with other users, sold, or used for advertising — and answers only ever come from your own content, never the open internet.',
    icon: Lock,
  },
  {
    title: 'You own the infrastructure',
    description: 'NodeVault runs against your own Google Cloud project, so your documents are processed and indexed in a tenancy you control, on quota you pay Google for directly — and you can revoke our access at any time.',
    icon: KeyRound,
  },
  {
    title: 'Nothing hidden',
    description: 'We tell you exactly what happens to your data — what is stored, what is sent to Google, and what Google is allowed to do with it. Read it in plain language in our privacy policy.',
    icon: Eye,
  },
]

export default function AboutPage() {
  return (
    <div>
      <PageHero
        eyebrow="About us"
        title="A library that answers back"
        description="NodeVault exists because the things you save should work for you — findable by describing them, questionable in plain language, and private the whole way through."
      />

      <Container className="py-12">
        <div className="max-w-3xl space-y-10 text-slate-600 dark:text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Why we built NodeVault
            </h2>

            <p>
              Everyone has one: the folder of PDFs, the notes app, the fifty open tabs of articles
              you meant to come back to. The saving part is easy — it&apos;s getting anything back
              out that fails. Keyword search only works if you remember the exact words, and the
              tools that do understand meaning usually want your documents on someone else&apos;s
              terms.
            </p>

            <p>
              NodeVault is our answer: a private library that reads what you save and organises it by
              meaning, so you can find things by describing them, ask questions and get answers with
              sources, and keep a conversation going with your own content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              The company
            </h2>

            <p>
              NodeVault is a small, independent software company. We&apos;re not backed by an
              advertising business and we don&apos;t monetise your data — we build the product, and
              the product is the business. Staying small is deliberate: it keeps us close to the
              people using NodeVault and free to make decisions — like running on your own cloud
              project — that a data-hungry business never would.
            </p>

            <p>
              We&apos;re engineers first, and it shows in the architecture: your documents are
              processed by Google Cloud&apos;s Vertex AI under terms that forbid training on your
              content, and once you connect your own Google Cloud project, your library&apos;s index
              lives in your tenancy — not ours.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              What we believe
            </h2>

            <div className="space-y-4">
              {principles.map(principle => (
                <div
                  key={principle.title}
                  className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex gap-4"
                >
                  <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
                    <principle.icon className="size-5 text-sky-600 dark:text-sky-400" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                      {principle.title}
                    </h3>

                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {principle.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Talk to us
            </h2>

            <p>
              Questions, ideas, or something not working the way it should? We read everything —
              get in touch and a person will reply.
            </p>

            <div className="flex flex-wrap gap-3">
              <LinkButton href="/contact">
                Contact us
                <ArrowRight className="size-4" />
              </LinkButton>

              <LinkButton
                href="/privacy"
                variant="outline"
              >
                Read our privacy policy
              </LinkButton>
            </div>
          </section>
        </div>
      </Container>
    </div>
  )
}
