'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@heroui/react'
import { ArrowLeft } from 'lucide-react'
import type { ConversationDto } from '@platform/components.contracts'
import { getSession, isSessionValid, useAuth } from '../../../../lib/auth'
import { PageHero } from '../../../../components/app/PageHero'
import { Container } from '../../../../components/ui/Container'
import { ConversationChat } from '../../../../components/app/ConversationChat'

export const ConversationView = ({ conversationId }: { conversationId: number }) => {
  const router = useRouter()
  const { session } = useAuth()
  const [conversation, setConversation] = useState<ConversationDto | null>(null)

  // authenticated-only page
  useEffect(() => {
    if (!isSessionValid(getSession())) {
      router.replace('/auth/login')
    }
  }, [router])

  if (!session) return null

  return (
    <div>
      <PageHero
        eyebrow="Conversation"
        title={conversation?.title ?? 'Conversation'}
        description={conversation
          ? `Continue this conversation with the "${conversation.vaultName}" vault.`
          : 'Review the answers or keep asking.'}
      />

      <Container className="py-12">
        <div className="space-y-6">
          <Link
            href="/account/conversations"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to conversations
          </Link>

          <Card>
            <Card.Content>
              <ConversationChat
                initialConversationId={conversationId}
                showNewConversation={false}
                onConversationLoadedAction={setConversation}
              />
            </Card.Content>
          </Card>
        </div>
      </Container>
    </div>
  )
}
