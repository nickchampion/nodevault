import type { Metadata } from 'next'
import { AccountView } from './AccountView'

export const metadata: Metadata = {
  title: 'Your account — nodevault',
  description: 'Manage your nodevault account.',
}

export default function AccountPage() {
  return <AccountView />
}
