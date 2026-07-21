import type { Metadata } from 'next'
import { VaultsView } from './VaultsView'

export const metadata: Metadata = {
  title: 'Your vaults — NodeVault',
  description: 'Manage the documents and web pages in your NodeVault vaults.',
}

export default function VaultsPage() {
  return <VaultsView />
}
