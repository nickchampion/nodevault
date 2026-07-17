import type { ReactNode } from 'react'
import { Container } from '../ui/Container'

type PageHeroProperties = {
  eyebrow: string
  title: string
  description: string
  aside?: ReactNode
}

export const PageHero = ({
  eyebrow, title, description, aside,
}: PageHeroProperties) => (
  <section className="bg-gradient-to-br from-sky-100/60 via-white to-white dark:from-sky-950/60 dark:via-slate-950 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 py-12 sm:py-16">
    <Container>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sky-600 dark:text-sky-400 font-semibold text-sm tracking-wide uppercase mb-3">
            {eyebrow}
          </p>

          <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
            {title}
          </h1>

          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>

        {aside}
      </div>
    </Container>
  </section>
)
