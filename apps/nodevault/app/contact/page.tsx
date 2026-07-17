import type { Metadata } from 'next'
import { PageHero } from '../../components/app/PageHero'
import { Container } from '../../components/ui/Container'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact — NodeVault',
  description: 'Get in touch with us.',
}

export default function ContactPage() {
  return (
    <div>
      <PageHero
        eyebrow="Contact"
        title="Get in touch"
        description="If you have any questions about NodeVault, we'd love to hear from you. Complete the form below and we'll be in touch shortly."
      />

      <Container className="py-12">
        <div className="max-w-2xl">
          <ContactForm />
        </div>
      </Container>
    </div>
  )
}
