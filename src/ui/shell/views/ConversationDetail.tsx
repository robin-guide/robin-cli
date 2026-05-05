import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
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
  const [messageOffsetFromEnd, setMessageOffsetFromEnd] = useState(0);
  const { isConfirmingExit } = useExitConfirmation();

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

  useInput((input, key) => {
    if (actionState.type !== 'idle') return;
    if (key.upArrow) {
      const amount = key.shift ? Math.max(4, Math.floor((process.stdout.rows ?? 30) / 3)) : 1;
      setMessageOffsetFromEnd(current => current + amount);
      return;
    }
    if (key.downArrow) {
      const amount = key.shift ? Math.max(4, Math.floor((process.stdout.rows ?? 30) / 3)) : 1;
      setMessageOffsetFromEnd(current => Math.max(0, current - amount));
      return;
    }
    if (input === 'e') { setMessageOffsetFromEnd(0); return; }
    if (key.escape || input === 'q') { onBack(); return; }
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

  const messages = thread.messages ?? [];
  const title = thread.customerName ?? threadId;

  const termWidth = process.stdout.columns ?? 80;
  const termRows = process.stdout.rows ?? 30;
  const transcriptWidth = Math.min(Math.max(48, termWidth - 6), 84);
  const bubbleWidth = Math.min(Math.max(28, Math.floor(transcriptWidth * 0.72)), 58);
  const visibleLines = Math.max(8, termRows - 8);
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
    <Screen footer={actionState.type === 'idle' ? (
      <HelpBar bindings={[
        { key: 'p', label: isPaused ? 'resume AI' : 'pause AI' },
        ...(canScrollOlder ? [{ key: '↑/Shift+↑', label: 'older' }] : []),
        ...(canScrollNewer ? [{ key: '↓/Shift+↓', label: 'newer' }, { key: 'e', label: 'latest' }] : []),
        { key: 'q', label: 'back' },
      ]} />
    ) : undefined}>
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
