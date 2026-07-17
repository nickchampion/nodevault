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
  <section className="bg-gradient-to-br from-sky-50 via-white to-slate-50 border-b border-slate-200 py-12 sm:py-16">
    <Container>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sky-600 font-semibold text-sm tracking-wide uppercase mb-3">
            {eyebrow}
          </p>

          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
            {title}
          </h1>

          <p className="text-lg text-slate-500 leading-relaxed">
            {description}
          </p>
        </div>

        {aside}
      </div>
    </Container>
  </section>
)
