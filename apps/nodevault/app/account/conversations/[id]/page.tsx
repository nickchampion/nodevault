import type { Metadata } from 'next'
import { ConversationView } from './ConversationView'

export const metadata: Metadata = {
  title: 'Conversation — NodeVault',
  description: 'Review and continue a vault conversation.',
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <ConversationView conversationId={Number(id)} />
}
