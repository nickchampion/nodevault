import type { Metadata } from 'next'
import { VaultView } from './VaultView'

export const metadata: Metadata = {
  title: 'Vault — NodeVault',
  description: 'Browse the documents and web pages in this vault.',
}

export default async function VaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <VaultView vaultId={Number(id)} />
}
