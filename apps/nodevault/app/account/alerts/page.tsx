import type { Metadata } from 'next'
import { AlertsView } from './AlertsView'

export const metadata: Metadata = {
  title: 'Alerts — NodeVault',
  description: 'Follow topics that matter and get notified when new content touches on them.',
}

export default function AlertsPage() {
  return <AlertsView />
}
