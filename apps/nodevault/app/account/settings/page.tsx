import type { Metadata } from 'next'
import { SettingsView } from './SettingsView'

export const metadata: Metadata = {
  title: 'Settings — NodeVault',
  description: 'Manage your profile and account settings.',
}

export default function SettingsPage() {
  return <SettingsView />
}
