'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Button, ComboBox, Input, Label, ListBox, Spinner, TextField, ToggleButton, ToggleButtonGroup, Tooltip,
} from '@heroui/react'
import {
  DollarSign, Gift, MessageCirclePlus, Send,
} from 'lucide-react'
import type { SubmitEvent } from 'react'
import type {
  AskMode, CitationDto, ConversationDto, OpenRouterModelDto,
} from '@platform/components.nodevault.contracts'
import { api } from '../../lib/api'
import { streamAsk } from '../../lib/ask'
import { AssetResultCard } from './AssetResultCard'

const askModes: { id: AskMode, label: string, description: string }[] = [
  {
    id: 'local',
    label: 'Your provider',
    description: "We find the most relevant passages in your vault with our own hybrid pgvector search, then hand them to your connected provider's model (Gemini or OpenAI) to write the answer.",
  },
  {
    id: 'managed',
    label: 'Provider search',
    description: "Your connected provider's own managed search (Vertex AI Search for Google Cloud, file search for OpenAI) grounds its answer as it responds. Newly added content can take a few minutes to appear.",
  },
]

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  citations: CitationDto[]
  // still streaming — shows the thinking spinner until the first token lands
  pending?: boolean
}

// OpenRouter flags a free model by pricing both prompt and completion at "0"; an unknown
// (null) price is treated as paid rather than free
const isFreeModel = (model: OpenRouterModelDto): boolean => (
  model.promptPrice !== null && model.completionPrice !== null
  && Number(model.promptPrice) === 0 && Number(model.completionPrice) === 0
)

// one row in the model combo box: name on the left, a free/paid indicator on the right
const ModelOption = ({ model }: { model: OpenRouterModelDto }) => (
  <div className="flex items-center justify-between gap-3 w-full">
    <span className="truncate">{model.name}</span>

    {isFreeModel(model)
      ? (
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
          <Gift className="size-3.5" />
          Free
        </span>
      )
      : <DollarSign className="size-3.5 text-slate-400 shrink-0" />}
  </div>
)

const CitationChips = ({ citations, vaultId }: { citations: CitationDto[], vaultId: number }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {citations.map(citation => (
      <AssetResultCard
        key={citation.ordinal}
        variant="compact"
        vaultId={vaultId}
        assetId={citation.assetId}
        assetName={citation.assetName}
        assetUrl={citation.assetUrl}
        source={citation.source}
        chunkIndex={citation.chunkIndex}
        ordinal={citation.ordinal}
      />
    ))}
  </div>
)

type ConversationChatProperties = {

  /** Vault to ask against — required unless initialConversationId is a conversation id (the vault comes from the loaded conversation). */
  vaultId?: number

  /** 'latest' resumes the vault's most recent conversation, a number opens that conversation, absent starts fresh. */
  initialConversationId?: number | 'latest'

  /** Hide the reset button on pages dedicated to a single conversation. */
  showNewConversation?: boolean

  /**
   * Controls the answer engine externally. When provided, the internal mode toggle is
   * hidden and the parent owns the mode (the unified search page). When absent, the
   * component keeps its own mode state and renders the toggle (the Conversations page).
   */
  mode?: AskMode
  onModeChange?: (mode: AskMode) => void
  onConversationLoadedAction?: (conversation: ConversationDto) => void

  /** Fired when the user resets to a fresh conversation — lets the parent drop any
   * conversation deep-link from the URL. */
  onNewConversationAction?: () => void
}

/**
 * The vault Q&A chat: message history, citation chips, mode toggle and the streaming
 * ask form. Used by the vault Ask tab (resuming the latest conversation) and the
 * account Conversations page (continuing a specific one).
 */
export const ConversationChat = ({
  vaultId, initialConversationId, showNewConversation = true,
  mode: controlledMode, onModeChange, onConversationLoadedAction, onNewConversationAction,
}: ConversationChatProperties) => {
  const [activeVaultId, setActiveVaultId] = useState<number | null>(vaultId ?? null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [internalMode, setInternalMode] = useState<AskMode>('local')
  const controlled = controlledMode !== undefined
  const mode = controlledMode ?? internalMode
  const setMode = onModeChange ?? setInternalMode
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(initialConversationId !== undefined)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // openrouter mode picks the answer model per conversation — the catalogue is fetched
  // lazily the first time this mode is shown (server-cached for 10 min)
  const [models, setModels] = useState<OpenRouterModelDto[] | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialConversationId === undefined) return

    let cancelled = false

    const load = async () => {
      try {
        let targetId: number | null = null

        if (initialConversationId === 'latest') {
          if (!vaultId) return

          const { conversations } = await api.conversations.list.query({ vaultId })

          if (cancelled || conversations.length === 0) return

          targetId = conversations[0].id
        } else {
          targetId = initialConversationId
        }

        const { conversation, messages: loaded } = await api.conversations.get.query({
          conversationId: targetId,
        })

        if (cancelled) return

        setConversationId(conversation.id)
        setActiveVaultId(conversation.vaultId)

        // restore the model the conversation was answered with so follow-ups reuse it
        if (conversation.model) setSelectedModel(conversation.model)

        setMessages(loaded.map(message => ({
          role: message.role,
          content: message.content,
          citations: message.citations,
        })))
        onConversationLoadedAction?.(conversation)
      } catch (error_) {
        // resuming the latest is best-effort — start fresh; opening a specific
        // conversation failing is worth surfacing
        if (!cancelled && initialConversationId !== 'latest') {
          setError((error_ as Error).message || 'Failed to load the conversation')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      abortRef.current?.abort()
    }
    // onConversationLoadedAction is deliberately not a dependency — parents pass inline callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId, initialConversationId])

  // load the OpenRouter catalogue the first time the mode is active; the picker stays empty
  // until the user explicitly chooses (unless a resumed conversation already seeded a model)
  useEffect(() => {
    if (mode !== 'openrouter' || models !== null) return

    let cancelled = false

    const load = async () => {
      try {
        const { models: loaded } = await api.account.openrouterModels.query()

        if (cancelled) return

        setModels(loaded)
      } catch {
        if (!cancelled) setModels([])
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [mode, models])

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

    if (!trimmed || streaming || activeVaultId === null) return

    if (mode === 'openrouter' && !selectedModel) {
      setError('Choose an OpenRouter model first.')

      return
    }

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
        vaultId: activeVaultId,
        conversationId: conversationId ?? undefined,
        question: trimmed,
        mode,
        model: mode === 'openrouter' ? selectedModel ?? undefined : undefined,
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
      // put the question back so it can be re-asked (e.g. after a different model is picked),
      // unless the user has already started typing a new one
      setQuestion(current => current || trimmed)
    }
  }

  const startNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setError(null)
    onNewConversationAction?.()
  }

  return (
    <div>
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
        {mode === 'openrouter'
          ? (
            <ComboBox
              aria-label="OpenRouter model"
              className="w-72 max-w-full"
              // locked once the conversation is under way, but re-enabled while an error is
              // showing so the user can switch models and retry the same question
              isDisabled={models === null || streaming || (messages.length > 0 && !error)}
              selectedKey={selectedModel}
              onSelectionChange={key => setSelectedModel(key === null ? null : String(key))}
            >
              <ComboBox.InputGroup>
                <Input placeholder={models === null ? 'Loading models…' : 'Search models…'} />

                <ComboBox.Trigger />
              </ComboBox.InputGroup>

              <ComboBox.Popover>
                <ListBox>
                  {(models ?? []).map(model => (
                    <ListBox.Item
                      key={model.id}
                      id={model.id}
                      textValue={model.name}
                    >
                      <ModelOption model={model} />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>
          )
          : controlled
            ? <div />
            : (
              <ToggleButtonGroup
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={new Set([mode])}
                onSelectionChange={(keys) => {
                  const [key] = [...keys]

                  if (key) setMode(key as AskMode)
                }}
                aria-label="Answer engine"
              >
                {askModes.map(askMode => (
                  <Tooltip.Root
                    key={askMode.id}
                    delay={200}
                  >
                    <Tooltip.Trigger>
                      <ToggleButton
                        id={askMode.id}
                        className="mr-2"
                      >
                        {askMode.label}
                      </ToggleButton>
                    </Tooltip.Trigger>

                    <Tooltip.Content className="break-normal">
                      {askMode.description}
                    </Tooltip.Content>
                  </Tooltip.Root>
                ))}
              </ToggleButtonGroup>
            )}

        {showNewConversation && (
          <Button
            variant="ghost"
            isDisabled={streaming || messages.length === 0}
            onPress={startNewConversation}
          >
            <MessageCirclePlus className="size-4" />
            New conversation
          </Button>
        )}
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
                  <CitationChips
                    citations={message.citations}
                    vaultId={activeVaultId ?? 0}
                  />
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
            // openrouter mode can't ask until a model has been chosen
            isDisabled={
              !question.trim() || streaming || loading || activeVaultId === null
              || (mode === 'openrouter' && !selectedModel)
            }
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
