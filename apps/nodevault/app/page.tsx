import {
  ArrowRight, BellRing, BookOpenText, Cloud, FileText, Gift, Link2, LogIn, MessageCircleQuestion,
  Router, ScanSearch, ShieldCheck, Sparkles,
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
    description: 'Instead of a list of results, ask a question and get a clear answer drawn from your own documents — with sources you can check. Ask a follow-up and the conversation carries on where you left off.',
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

export default function HomePage() {
  return (
    <div>
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
              will point out when something new you save is relevant. It runs entirely on the AI
              provider you choose — Google Cloud or OpenAI — so it&apos;s never locked to one vendor.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/40">
        <Container>
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Runs on your AI provider
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
              NodeVault doesn&apos;t lock you into one AI vendor. Choose Google Cloud or OpenAI
              when you connect your account, and every embedding, search and answer runs on
              your own credentials from there on — or bring an OpenRouter key to answer with any
              model you like.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
                <Cloud className="size-5 text-sky-600 dark:text-sky-400" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                  Google Cloud
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                  Gemini and Vertex AI Search. Free for your first 7 days before you connect
                  your own project.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 shrink-0">
                <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                  OpenAI
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                  Bring your own OpenAI API key — no trial required, and nothing to migrate
                  away from later.
                </p>
              </div>
            </div>
          </div>

          {/* additive OpenRouter option — answers only, retrieval stays on the base provider */}
          <div className="max-w-2xl mx-auto mt-5">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-indigo-200/70 dark:border-indigo-900/50 flex items-start gap-4">
              <div className="flex items-center justify-center size-10 rounded-lg bg-indigo-500/10 shrink-0">
                <Router className="size-5 text-indigo-600 dark:text-indigo-400" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    Answer with any model — powered by OpenRouter
                  </h3>

                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    <Sparkles className="size-3" />
                    New
                  </span>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                  Add your own OpenRouter key and pick any model — Claude, GPT, Llama, Gemini and
                  hundreds more, including
                  {' '}
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <Gift className="size-3.5" />
                    free
                  </span>
                  {' '}
                  ones — to write your answers. Your provider still handles the search over your
                  documents; OpenRouter only changes the model that writes the reply, chosen per
                  conversation with a searchable picker.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center max-w-5xl mx-auto">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide mb-4">
                <Sparkles className="size-3.5" />
                New
              </span>

              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                Have a conversation with your library
              </h2>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Ask a question in your own words and watch the answer stream in — drawn only
                from what you&apos;ve saved, never the open internet, with the sources listed
                right under the answer.
              </p>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                And because NodeVault remembers the conversation, you can just keep asking —
                &quot;how much would that cost?&quot; works, because it knows what
                &quot;that&quot; is.
              </p>

              <LinkButton
                href="/auth/register"
                variant="outline"
              >
                Try it with your own documents
                <ArrowRight className="size-4" />
              </LinkButton>
            </div>

            <div
              aria-hidden="true"
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm"
            >
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-lg bg-sky-600 text-white px-3.5 py-2 text-sm">
                  What do my saved articles say about rising energy bills?
                </p>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-sm">
                  <p>
                    Two of your articles cover this. Proposed reforms would cut average household
                    bills by around £130 a year, mainly by moving policy levies off electricity
                    and reforming how gas is charged.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium">[1]</span>

                      <Link2 className="size-3.5 shrink-0" />

                      <span className="max-w-40 truncate">Radical shake-up to cut energy bills</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium">[2]</span>

                      <FileText className="size-3.5 shrink-0" />

                      <span className="max-w-40 truncate">UK risks repeat of surging bills</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-lg bg-sky-600 text-white px-3.5 py-2 text-sm">
                  How much would that cost taxpayers?
                </p>
              </div>

              <div className="flex justify-start">
                <p className="max-w-[90%] rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-sm">
                  About £3.2 billion a year, according to the same analysis&hellip;
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

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
