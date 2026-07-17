import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageHero } from '../../../components/app/PageHero'
import { Container } from '../../../components/ui/Container'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign in — NodeVault',
  description: 'Sign in to your NodeVault account with a secure email link.',
}

export default function LoginPage() {
  return (
    <div>
      <PageHero
        eyebrow="Sign in"
        title="Welcome back"
        description="Enter your email address and we'll send you a secure sign-in link — no password required."
      />

      <Container className="py-12">
        <div className="max-w-md">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </Container>
    </div>
  )
}
