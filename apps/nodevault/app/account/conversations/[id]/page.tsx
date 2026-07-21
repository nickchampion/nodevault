import { redirect } from 'next/navigation'

// conversations now open in the unified search UI, which loads the conversation on its
// originating Q&A tab from the ?conversationId query param
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  redirect(`/account?conversationId=${id}`)
}
