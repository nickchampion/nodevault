import type { Metadata } from 'next'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'
import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = {
  title: 'Create an account — NodeVault',
  description: 'Create your NodeVault account and start orchestrating AI for your business.',
}

export default function RegisterPage() {
  return (
    <div>
      <PageHero
        eyebrow="Get started"
        title="Create your account"
        description="Set up your NodeVault account in under a minute. No password to remember — you'll sign in with secure email links."
      />

      <Container className="py-12">
        <div className="max-w-md">
          <RegisterForm />
        </div>
      </Container>
    </div>
  )
}
