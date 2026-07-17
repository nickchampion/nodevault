import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'
import { EditProfileForm } from './EditProfileForm'

export const metadata: Metadata = {
  title: 'Edit profile — NodeVault',
  description: 'Update your NodeVault profile details.',
}

export default function EditProfilePage() {
  return (
    <div>
      <PageHero
        eyebrow="Account"
        title="Edit your profile"
        description="Update your name, email and phone number."
      />

      <Container className="py-12">
        <div className="max-w-md">
          <Link
            href="/account"
            className="mb-6 mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to account home
          </Link>

          <EditProfileForm />
        </div>
      </Container>
    </div>
  )
}
