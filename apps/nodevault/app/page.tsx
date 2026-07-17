import {
  ArrowRight, Check, FileText, Link2, LogIn, ScanSearch, ShieldCheck, Sparkles, Workflow,
} from 'lucide-react'
import { Container } from '../components/ui/Container'
import { LinkButton } from '../components/ui/LinkButton'

const features = [
  {
    title: 'Any Document Format',
    description: 'Upload PDFs, Word documents, plain text and more — NodeVault extracts the content for you.',
    icon: FileText,
  },
  {
    title: 'Ingest From URLs',
    description: 'Paste a link and NodeVault scrapes the page, cleans it up, and indexes the content.',
    icon: Link2,
  },
  {
    title: 'Automated Pipeline',
    description: 'Every upload triggers a durable workflow: parse, chunk, embed — no manual steps.',
    icon: Workflow,
  },
  {
    title: 'Vector Embeddings',
    description: 'Content is converted into high-quality embeddings that capture meaning, not just keywords.',
    icon: Sparkles,
  },
  {
    title: 'pgvector Search',
    description: 'Similarity search runs on Postgres with pgvector — fast, accurate, and battle-tested.',
    icon: ScanSearch,
  },
  {
    title: 'Private By Default',
    description: 'Your documents belong to you. Content is indexed for your account only.',
    icon: ShieldCheck,
  },
]

const steps = [
  {
    title: 'Upload a document or paste a URL',
    description: 'Drop in a PDF, Word document, or text file — or point NodeVault at any web page.',
  },
  {
    title: 'We parse and NodeVault the content',
    description: 'A background workflow extracts the text, splits it into chunks, and generates vector embeddings stored in pgvector.',
  },
  {
    title: 'Search your content by meaning',
    description: 'Use the search UI to ask questions in plain language and find the most relevant passages across everything you have indexed.',
  },
]

const freeFeatures = [
  'Up to 500 documents or URLs',
  'PDF, Word, txt and more',
  'URL ingestion',
  'Semantic search UI',
]

const proFeatures = [
  'Unlimited documents and URLs',
  'Everything in Free',
  'Priority processing',
  'Email support',
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-slate-50 py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(14,165,233,0.08),_transparent_60%)]" />

        <Container className="relative">
          <div className="max-w-3xl">
            <p className="text-sky-600 font-semibold text-sm tracking-wide uppercase mb-4">
              Semantic search for your documents
            </p>

            <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
              Upload anything. Search everything.
            </h1>

            <p className="text-xl sm:text-2xl text-slate-600 font-medium mb-4">
              NodeVault turns your documents and web pages into a searchable knowledge base
            </p>

            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mb-10">
              Upload PDFs, Word documents, text files — or just paste a URL. NodeVault parses the
              content, converts it into vector embeddings, and gives you a search UI that finds
              answers by meaning, powered by pgvector.
            </p>

            <div className="flex flex-wrap gap-3">
              <LinkButton
                href="/auth/register"
                size="lg"
              >
                Start indexing for free
                <ArrowRight className="size-5" />
              </LinkButton>

              <LinkButton
                href="/auth/login"
                size="lg"
                variant="outline"
              >
                Sign in
                <LogIn className="size-5" />
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>

      {/* What it is */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              What is NodeVault?
            </h2>

            <p className="text-slate-600 text-lg leading-relaxed">
              NodeVault is a search engine for your own content. Instead of matching keywords, it
              understands what your documents mean: every file or URL you add is parsed, split into
              chunks, and embedded as vectors in Postgres. When you search, your query is compared
              against those vectors — so you find the right passage even when it uses completely
              different words.
            </p>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Everything you need to make your content searchable
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(feature => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 border border-slate-200 flex gap-4"
              >
                <div className="flex items-center justify-center size-10 rounded-lg bg-sky-50 shrink-0">
                  <feature.icon className="size-5 text-sky-600" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-slate-500 leading-snug">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              How it works
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="bg-white rounded-xl p-6 border border-slate-200 flex gap-5"
              >
                <div className="flex items-center justify-center size-10 rounded-full bg-sky-50 shrink-0 text-sky-600 font-bold">
                  {index + 1}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-1">
                    {step.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Simple pricing
            </h2>

            <p className="text-slate-500">
              Start free. Upgrade when your library grows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl p-8 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-1">
                Free
              </h3>

              <p className="text-4xl font-bold text-slate-900 mb-1">
                £0
              </p>

              <p className="text-sm text-slate-500 mb-6">
                forever
              </p>

              <ul className="space-y-3 mb-8">
                {freeFeatures.map(item => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-slate-600"
                  >
                    <Check className="size-4 text-sky-600 shrink-0" />

                    {item}
                  </li>
                ))}
              </ul>

              <LinkButton
                href="/auth/register"
                variant="outline"
                fullWidth
              >
                Get started
              </LinkButton>
            </div>

            <div className="bg-white rounded-xl p-8 border-2 border-sky-500 relative">
              <span className="absolute -top-3 left-8 bg-sky-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                For growing libraries
              </span>

              <h3 className="font-semibold text-slate-900 mb-1">
                Pro
              </h3>

              <p className="text-4xl font-bold text-slate-900 mb-1">
                £15
                <span className="text-base font-medium text-slate-500"> / month</span>
              </p>

              <p className="text-sm text-slate-500 mb-6">
                one plan, no tiers
              </p>

              <ul className="space-y-3 mb-8">
                {proFeatures.map(item => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-slate-600"
                  >
                    <Check className="size-4 text-sky-600 shrink-0" />

                    {item}
                  </li>
                ))}
              </ul>

              <LinkButton
                href="/auth/register"
                fullWidth
              >
                Go Pro
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Ready to search your own content?
            </h2>

            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              Create your account in under a minute — free for up to 500 documents or URLs,
              no credit card required.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <LinkButton
                href="/auth/register"
                size="lg"
              >
                Get started
                <ArrowRight className="size-5" />
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
    </div>
  )
}
