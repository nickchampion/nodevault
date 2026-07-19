'use client'

import { Button, Card } from '@heroui/react'
import { Cloud, Sparkles } from 'lucide-react'
import type { AiProvider } from '@platform/components.nodevault.contracts'

type ProviderChoiceProperties = {
  onChooseAction: (provider: AiProvider) => void
}

/**
 * Shown once, before an account has connected anything: NodeVault needs to know which
 * AI provider to run on before either credentials form makes sense. The choice made
 * here is purely local (nothing is written until the chosen card's form is actually
 * submitted) — so it's freely reversible up until then, and a page reload just asks again.
 */
export const ProviderChoice = ({ onChooseAction }: ProviderChoiceProperties) => (
  <div className="space-y-4">
    <Card>
      <Card.Header>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-sky-500/10 shrink-0">
            <Cloud className="size-5 text-sky-600 dark:text-sky-400" />
          </div>

          <div>
            <Card.Title>Google Cloud</Card.Title>

            <Card.Description>
              Gemini for embeddings and generation, Vertex AI Search for managed retrieval
            </Card.Description>
          </div>
        </div>
      </Card.Header>

      <Card.Content className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Free for your first 7 days on our Google Cloud project — connect your own project
          afterwards to keep going.
        </p>

        <Button
          fullWidth
          onPress={() => onChooseAction('gemini')}
        >
          Use Google Cloud
        </Button>
      </Card.Content>
    </Card>

    <Card>
      <Card.Header>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 shrink-0">
            <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div>
            <Card.Title>OpenAI</Card.Title>

            <Card.Description>
              OpenAI models for embeddings and generation, with vector-store file search for
              managed retrieval
            </Card.Description>
          </div>
        </div>
      </Card.Header>

      <Card.Content className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Bring your own OpenAI API key — no trial, but nothing to migrate away from later.
        </p>

        <Button
          fullWidth
          variant="outline"
          onPress={() => onChooseAction('openai')}
        >
          Use OpenAI
        </Button>
      </Card.Content>
    </Card>
  </div>
)
