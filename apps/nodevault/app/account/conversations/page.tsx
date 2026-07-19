import type { Metadata } from 'next'
import { ConversationsView } from './ConversationsView'

export const metadata: Metadata = {
  title: 'Conversations — NodeVault',
  description: 'Review and continue your past vault conversations.',
}

export default function ConversationsPage() {
  return <ConversationsView />
}
