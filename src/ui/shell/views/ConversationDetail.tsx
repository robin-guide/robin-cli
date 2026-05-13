import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useWindowSize } from '../../../hooks/useWindowSize.js';
import TextInput from 'ink-text-input';
import { Header } from '../components/Header.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import {
  ConversationTranscript,
  getMaxTranscriptScrollOffset,
  type TranscriptMessage,
} from '../components/ConversationTranscript.js';
import { Screen } from '../components/Screen.js';
import { Spinner } from '../../../components/Spinner.js';
import { ErrorBox } from '../../../components/ErrorBox.js';
import { SuccessBox } from '../../../components/SuccessBox.js';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import { formatError, type RobinClient } from '../../../client.js';

interface Message {
  id?: string;
  externalId?: string;
  role?: string;
  content?: string;
  createdAt?: string;
  authorName?: string;
}

interface ThreadData {
  id?: string;
  status?: string;
  agentPaused?: boolean;
  customerName?: string;
  messages?: Message[];
}

interface ThreadResponse {
  thread?: {
    id?: string;
    agentPaused?: boolean;
    customer?: {
      name?: string | null;
    };
    messages?: Message[];
  };
}

interface SendMessageResponse {
  message?: Message;
}

type ActionState =
  | { type: 'idle' }
  | { type: 'working'; label: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; detail?: string };

interface ConversationDetailProps {
  threadId: string;
  agentId?: string;
  agentName?: string;
  client: RobinClient;
  onBack: () => void;
}

export function ConversationDetail({
  threadId,
  agentName,
  client,
  onBack,
}: ConversationDetailProps): React.ReactElement {
  return (
    <AsyncView
      work={() => client.get<ThreadResponse>(`/threads/${threadId}`)}
      loadingMessage="Fetching conversation…"
      onBack={onBack}
    >
      {(data) => (
        <ConversationView
          thread={normalizeThreadData(data, threadId)}
          threadId={threadId}
          agentName={agentName}
          client={client}
          onBack={onBack}
        />
      )}
    </AsyncView>
  );
}

function normalizeThreadData(data: ThreadResponse & ThreadData, threadId: string): ThreadData {
  if (data.thread) {
    return {
      id: data.thread.id ?? threadId,
      agentPaused: data.thread.agentPaused,
      customerName: data.thread.customer?.name ?? undefined,
      messages: data.thread.messages ?? [],
    };
  }

  return data;
}

interface ConversationViewProps {
  thread: ThreadData;
  threadId: string;
  agentName?: string;
  client: RobinClient;
  onBack: () => void;
}

function ConversationView({ thread, threadId, agentName, client, onBack }: ConversationViewProps): React.ReactElement {
  const [actionState, setActionState] = useState<ActionState>({ type: 'idle' });
  const [isPaused, setIsPaused] = useState(!!thread.agentPaused);
  const [messages, setMessages] = useState<Message[]>(thread.messages ?? []);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageOffsetFromEnd, setMessageOffsetFromEnd] = useState(0);
  const { isConfirmingExit } = useExitConfirmation();
  const { columns: termWidth, rows: termRows } = useWindowSize();

  const runAction = async (label: string, work: () => Promise<unknown>, successMsg: string) => {
    setActionState({ type: 'working', label });
    try {
      await work();
      setActionState({ type: 'success', message: successMsg });
      setTimeout(() => setActionState({ type: 'idle' }), 2000);
    } catch (err) {
      const { message, detail } = formatError(err);
      setActionState({ type: 'error', message, detail });
      setTimeout(() => setActionState({ type: 'idle' }), 3000);
    }
  };

  async function sendDirectMessage(content: string) {
    setIsSending(true);
    setActionState({ type: 'idle' });
    try {
      const data = await client.post<SendMessageResponse>(`/threads/${threadId}/messages`, { content });
      const sentMessage = data.message ?? {
        id: `local-${Date.now()}`,
        role: 'agent',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, sentMessage]);
      setMessageOffsetFromEnd(0);
    } catch (err) {
      const { message, detail } = formatError(err);
      setActionState({ type: 'error', message, detail });
      setTimeout(() => setActionState({ type: 'idle' }), 3000);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;

    setInput('');

    if (trimmed === '/back') { onBack(); return; }
    if (trimmed === '/end' || trimmed === '/latest') { setMessageOffsetFromEnd(0); return; }
    if (trimmed === '/resume') {
      runAction(
        'Resuming AI…',
        async () => {
          await client.patch(`/threads/${threadId}`, { agentPaused: false });
          setIsPaused(false);
        },
        'AI resumed for this conversation.',
      );
      return;
    }

    sendDirectMessage(trimmed);
  }

  useInput((input, key) => {
    if (actionState.type !== 'idle' || isSending) return;
    if (key.upArrow) {
      const amount = key.shift ? Math.max(4, Math.floor(termRows / 3)) : 1;
      setMessageOffsetFromEnd(current => current + amount);
      return;
    }
    if (key.downArrow) {
      const amount = key.shift ? Math.max(4, Math.floor(termRows / 3)) : 1;
      setMessageOffsetFromEnd(current => Math.max(0, current - amount));
      return;
    }
    if (key.escape || (!isPaused && input === 'q')) { onBack(); return; }
    if (isPaused) return;
    if (input === 'e') { setMessageOffsetFromEnd(0); return; }
    if (input === 'p') {
      const willPause = !isPaused;
      runAction(
        willPause ? 'Pausing AI…' : 'Resuming AI…',
        async () => {
          await client.patch(`/threads/${threadId}`, { agentPaused: willPause });
          setIsPaused(willPause);
        },
        willPause ? 'AI paused for this conversation.' : 'AI resumed for this conversation.',
      );
    }
  }, { isActive: !isConfirmingExit });

  const title = thread.customerName ?? threadId;

  const transcriptWidth = Math.min(Math.max(48, termWidth - 6), 84);
  const bubbleWidth = Math.min(Math.max(28, Math.floor(transcriptWidth * 0.72)), 58);
  const visibleLines = Math.max(8, termRows - (isPaused ? 14 : 8));
  const transcriptMessages: TranscriptMessage[] = messages.map((msg, index) => {
    const isCustomer = msg.role === 'user' || msg.role === 'customer';
    return {
      id: messageKey(msg, index),
      author: msg.authorName ?? (isCustomer ? thread.customerName : agentName) ?? msg.role ?? 'unknown',
      content: msg.content ?? '',
      align: isCustomer ? 'left' : 'right',
    };
  });
  const maxScrollOffset = getMaxTranscriptScrollOffset(transcriptMessages, bubbleWidth, visibleLines);
  const clampedScrollOffset = Math.min(messageOffsetFromEnd, maxScrollOffset);
  const canScrollOlder = maxScrollOffset > clampedScrollOffset;
  const canScrollNewer = clampedScrollOffset > 0;

  return (
    <Screen footer={(
      <>
        {isPaused && actionState.type === 'idle' && (
          <Box marginTop={1} alignItems="center" flexDirection="column">
            <Box width={transcriptWidth} flexDirection="column">
              <Box justifyContent="flex-end">
                <Text color="green" bold>you</Text>
              </Box>
              <Box
                borderStyle="round"
                borderColor="green"
                paddingX={1}
                paddingY={1}
                width={bubbleWidth}
                alignSelf="flex-end"
                flexDirection="column"
              >
                <Box width={Math.max(10, bubbleWidth - 6)}>
                  <Text color="green" bold>{'> '}</Text>
                  <TextInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSubmit}
                    placeholder="Type a direct message… (/resume to resume AI)"
                    focus={!isSending && !isConfirmingExit}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        <HelpBar bindings={[
          ...(isPaused ? [{ key: 'Enter', label: 'send' }, { key: '/resume', label: 'resume AI' }] : [{ key: 'p', label: 'pause AI' }]),
          ...(canScrollOlder ? [{ key: '↑/Shift+↑', label: 'older' }] : []),
          ...(canScrollNewer ? [{ key: '↓/Shift+↓', label: 'newer' }, { key: isPaused ? '/end' : 'e', label: 'latest' }] : []),
          { key: isPaused ? 'Esc' : 'q', label: 'back' },
        ]} />
      </>
    )}>
      <Header
        title={title}
        subtitle={[agentName, isPaused ? 'AI paused' : undefined].filter(Boolean).join(' · ')}
        showBack
      />

      <Box flexDirection="column" alignItems="center">
        {messages.length === 0 ? (
          <Box width={transcriptWidth}>
            <Text dimColor>No messages in this thread.</Text>
          </Box>
        ) : (
          <Box flexDirection="column" width={transcriptWidth}>
            {messages.length > 0 && (
              <Box justifyContent="center" marginBottom={1}>
                <Text dimColor>
                  {canScrollNewer ? 'Viewing history' : 'Latest messages'}
                  {canScrollOlder ? ' · ↑ older · Shift+↑ faster' : ''}
                  {canScrollNewer ? ' · ↓ newer · Shift+↓ faster · e latest' : ''}
                </Text>
              </Box>
            )}
            <ConversationTranscript
              messages={transcriptMessages}
              transcriptWidth={transcriptWidth}
              bubbleWidth={bubbleWidth}
              visibleLines={visibleLines}
              scrollOffsetFromBottom={clampedScrollOffset}
            />
          </Box>
        )}
      </Box>

      {isSending && (
        <Box marginTop={1}>
          {React.createElement(Spinner, { message: 'Sending direct message…' })}
        </Box>
      )}

      {/* Action feedback */}
      {actionState.type === 'working' && (
        <Box marginTop={1}>
          {React.createElement(Spinner, { message: actionState.label })}
        </Box>
      )}
      {actionState.type === 'success' && (
        <Box marginTop={1}>
          {React.createElement(SuccessBox, { message: actionState.message })}
        </Box>
      )}
      {actionState.type === 'error' && (
        <Box marginTop={1}>
          {React.createElement(ErrorBox, { message: actionState.message, detail: actionState.detail })}
        </Box>
      )}
    </Screen>
  );
}

function messageKey(message: Message, index: number): string {
  return `${message.id ?? message.externalId ?? message.createdAt ?? message.role ?? 'message'}:${index}`;
}
