import {
  ArrowRight, BellRing, BookOpenText, Check, FileText, LogIn, MessageCircleQuestion,
  ScanSearch, ShieldCheck,
} from 'lucide-react'
import { Container } from '../components/ui/Container'
import { LinkButton } from '../components/ui/LinkButton'

const features = [
  {
    title: 'Save Anything',
    description: 'Upload PDFs, Word documents and notes — or paste a link and NodeVault reads the page for you.',
    icon: FileText,
  },
  {
    title: 'Find Things By Describing Them',
    description: 'Search in your own words. NodeVault understands what you mean, so you find the right passage even when it uses completely different words.',
    icon: ScanSearch,
  },
  {
    title: 'Ask Questions, Get Answers',
    description: 'Instead of a list of results, ask a question and get a clear answer drawn from your own documents — with sources you can check.',
    icon: MessageCircleQuestion,
  },
  {
    title: 'See The Big Picture',
    description: 'Get summaries across everything you have saved: what your documents say about a topic, where they agree, and where they differ.',
    icon: BookOpenText,
  },
  {
    title: 'Follow Topics That Matter',
    description: 'Save a topic you care about and NodeVault lets you know whenever something you add touches on it.',
    icon: BellRing,
  },
  {
    title: 'Private By Default',
    description: 'Your library is yours alone. Nothing you add is shared, and answers only ever come from your own content.',
    icon: ShieldCheck,
  },
]

const steps = [
  {
    title: 'Add a document or paste a link',
    description: 'Drop in a PDF, Word document, or text file — or point NodeVault at any web page.',
  },
  {
    title: 'NodeVault reads and organises it',
    description: 'Behind the scenes, NodeVault reads the content and organises it by what it means — automatically, with no manual steps.',
  },
  {
    title: 'Search, ask, and stay informed',
    description: 'Find anything by describing it, ask questions and get answers with sources, see summaries across your documents, and get a nudge when new content matches a topic you follow.',
  },
]

const freeFeatures = [
  'Up to 100 documents or links',
  'PDF, Word, txt and more',
  'Save web pages by link',
  'Search, questions and summaries',
]

const proFeatures = [
  'Unlimited documents and links',
  'Everything in Free',
  'Priority processing',
  'Email support',
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-100/60 via-white to-white dark:from-sky-950/60 dark:via-slate-950 dark:to-slate-950 py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(14,165,233,0.15),_transparent_60%)]" />

        <Container className="relative">
          <div className="max-w-3xl">
            <p className="text-sky-600 dark:text-sky-400 font-semibold text-sm tracking-wide uppercase mb-4">
              A library that answers back
            </p>

            <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
              Save anything. Ask everything.
            </h1>

            <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 font-medium mb-4">
              NodeVault turns your documents and web pages into a private library you can question
            </p>

            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mb-10">
              Upload PDFs, Word documents, text files — or just paste a link. NodeVault reads and
              understands the content, so you can find things by describing them, ask questions and
              get answers with sources, and stay on top of the topics you care about.
            </p>

            <div className="flex flex-wrap gap-3">
              <LinkButton
                href="/auth/register"
                size="lg"
              >
                Start your library for free
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
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              What is NodeVault?
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
              NodeVault is a private library that actually understands what&apos;s in it. Every
              document or link you add is read and organised by meaning — not just filed away.
              That means you can find things by describing them in your own words, ask questions
              and get straight answers drawn from your own content, and see what your whole
              library says about a topic. Follow the subjects that matter to you, and NodeVault
              will point out when something new you save is relevant.
            </p>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/40">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              One place to save, find, and understand your content
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(feature => (
              <div
                key={feature.title}
                className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex gap-4"
              >
                <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
                  <feature.icon className="size-5 text-sky-600 dark:text-sky-400" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
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
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              How it works
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex gap-5"
              >
                <div className="flex items-center justify-center size-10 rounded-full bg-sky-500/10 shrink-0 text-sky-600 dark:text-sky-400 font-bold">
                  {index + 1}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                    {step.title}
                  </h3>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/40">
        <Container>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Simple pricing
            </h2>

            <p className="text-slate-500 dark:text-slate-400">
              Start free. Upgrade when your library grows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                Free
              </h3>

              <p className="text-4xl font-bold text-slate-900 dark:text-white mb-1">
                £0
              </p>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                forever
              </p>

              <ul className="space-y-3 mb-8">
                {freeFeatures.map(item => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <Check className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />

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

            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 border-2 border-sky-500 relative">
              <span className="absolute -top-3 left-8 bg-sky-500/100 text-white text-xs font-semibold px-3 py-1 rounded-full">
                For growing libraries
              </span>

              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                Pro
              </h3>

              <p className="text-4xl font-bold text-slate-900 dark:text-white mb-1">
                £15
                <span className="text-base font-medium text-slate-500 dark:text-slate-400"> / month</span>
              </p>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                one plan, no tiers
              </p>

              <ul className="space-y-3 mb-8">
                {proFeatures.map(item => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <Check className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />

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
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Ready to put your content to work?
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-8">
              Create your account in under a minute — free for up to 100 documents or links,
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
