import type { Metadata } from 'next'
import { AccountView } from './AccountView'

export const metadata: Metadata = {
  title: 'Your account — NodeVault',
  description: 'Manage your NodeVault account.',
}

export default function AccountPage() {
  return <AccountView />
}
