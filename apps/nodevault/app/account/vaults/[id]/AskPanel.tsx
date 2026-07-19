'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Button, Input, Label, Spinner, TextField,
} from '@heroui/react'
import {
  ExternalLink, FileText, Link2, MessageCirclePlus, Send,
} from 'lucide-react'
import type { SubmitEvent } from 'react'
import type { CitationDto } from '@platform/components.contracts'
import { api } from '../../../../lib/api'
import { streamAsk } from '../../../../lib/ask'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations: CitationDto[]
  // still streaming — shows the thinking spinner until the first token lands
  pending?: boolean
}

const CitationChips = ({ citations }: { citations: CitationDto[] }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {citations.map(citation => (
      <span
        key={citation.ordinal}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300"
      >
        <span className="font-medium">
          [
          {citation.ordinal}
          ]
        </span>

        {citation.source === 'file'
          ? <FileText className="size-3.5 shrink-0" />
          : <Link2 className="size-3.5 shrink-0" />}

        <span className="max-w-48 truncate">
          {citation.assetName ?? citation.assetUrl ?? 'Untitled'}
        </span>

        {citation.source === 'url' && citation.assetUrl && (
          <a
            href={citation.assetUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open source in a new tab"
            className="hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </span>
    ))}
  </div>
)

export const AskPanel = ({ vaultId }: { vaultId: number }) => {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // resume the most recent conversation for this vault, if there is one
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { conversations } = await api.conversations.list.query({ vaultId })

        if (cancelled || conversations.length === 0) return

        const { conversation, messages: loaded } = await api.conversations.get.query({
          vaultId,
          conversationId: conversations[0].id,
        })

        if (cancelled) return

        setConversationId(conversation.id)
        setMessages(loaded.map(message => ({
          role: message.role,
          content: message.content,
          citations: message.citations,
        })))
      } catch {
        // no conversation to resume — start fresh
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      abortRef.current?.abort()
    }
  }, [vaultId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages])

  const updatePending = (update: (message: ChatMessage) => ChatMessage) => {
    setMessages(current => current.map((message, index) => (
      index === current.length - 1 && message.role === 'assistant' ? update(message) : message
    )))
  }

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()

    const trimmed = question.trim()

    if (!trimmed || streaming) return

    setQuestion('')
    setError(null)
    setStreaming(true)
    setMessages(current => [
      ...current,
      { role: 'user', content: trimmed, citations: [] },
      {
        role: 'assistant', content: '', citations: [], pending: true,
      },
    ])

    const abort = new AbortController()

    abortRef.current = abort

    let failed: string | null = null

    try {
      await streamAsk({
        vaultId,
        conversationId: conversationId ?? undefined,
        question: trimmed,
        signal: abort.signal,
        onEvent: (streamEvent) => {
          switch (streamEvent.type) {
            case 'conversation': {
              setConversationId(streamEvent.conversationId)
              break
            }

            case 'citations': {
              updatePending(message => ({ ...message, citations: streamEvent.citations }))
              break
            }

            case 'token': {
              updatePending(message => ({ ...message, content: message.content + streamEvent.text }))
              break
            }

            case 'done': {
              updatePending(message => ({ ...message, pending: false }))
              break
            }

            case 'error': {
              failed = streamEvent.message
              break
            }
          }
        },
      })
    } catch (error_) {
      if (!abort.signal.aborted) failed = (error_ as Error).message || 'Failed to ask the question'
    } finally {
      setStreaming(false)
    }

    if (failed) {
      setError(failed)
      // drop the assistant bubble if nothing arrived; otherwise keep the partial answer
      setMessages(current => current.filter((message, index) => (
        index !== current.length - 1 || message.role !== 'assistant' || message.content.length > 0
      )))
    }
  }

  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setError(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ask questions about the documents and URLs in this vault.
        </p>

        <Button
          variant="ghost"
          isDisabled={streaming || messages.length === 0}
          onPress={startNewConversation}
        >
          <MessageCirclePlus className="size-4" />
          New conversation
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      )}

      {!loading && messages.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400 py-8 text-center">
          Ask a question below — answers come from this vault&apos;s content, with sources.
        </p>
      )}

      {!loading && messages.length > 0 && (
        <div className="max-h-96 overflow-y-auto pr-1 space-y-3 py-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={message.role === 'user'
                  ? 'max-w-[85%] rounded-lg bg-sky-600 text-white px-3.5 py-2 text-sm whitespace-pre-wrap'
                  : 'max-w-[85%] rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-sm whitespace-pre-wrap'}
              >
                {message.pending && message.content.length === 0
                  ? <Spinner size="sm" />
                  : message.content}

                {message.role === 'assistant' && !message.pending && message.citations.length > 0 && (
                  <CitationChips citations={message.citations} />
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      )}

      <form
        className="pt-3 border-t border-slate-200 dark:border-slate-800"
        onSubmit={submit}
      >
        <div className="flex items-start gap-3">
          <TextField
            value={question}
            onChange={setQuestion}
            className="flex-1"
            aria-label="Ask your vault"
          >
            <Label className="sr-only">Ask your vault</Label>

            <Input placeholder="Ask a question about this vault…" />
          </TextField>

          <Button
            type="submit"
            isDisabled={!question.trim() || streaming || loading}
            isPending={streaming}
          >
            <Send className="size-4" />
            {streaming ? 'Thinking…' : 'Ask'}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
