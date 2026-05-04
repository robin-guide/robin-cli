import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../components/Header.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
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
  const msgWidth = Math.max(40, termWidth - 6);

  return (
    <Box flexDirection="column">
      <Header
        title={title}
        subtitle={[agentName, isPaused ? 'AI paused' : undefined].filter(Boolean).join(' · ')}
        showBack
      />

      {/* Messages */}
      {messages.length === 0 ? (
        <Text dimColor>No messages in this thread.</Text>
      ) : (
        <Box flexDirection="column">
          {messages.slice(-12).map((msg, i) => {
            const isUser = msg.role === 'user' || msg.role === 'customer';
            const author = msg.authorName ?? msg.role ?? 'unknown';
            const content = msg.content ?? '';
            const truncated = content.length > msgWidth
              ? content.slice(0, msgWidth - 1) + '…'
              : content;
            const absoluteIndex = messages.length - Math.min(messages.length, 12) + i;
            return (
              <Box key={messageKey(msg, absoluteIndex)} flexDirection="column" marginBottom={1}>
                <Text bold color={isUser ? 'white' : 'cyan'}>{author}</Text>
                <Box marginLeft={2}>
                  <Text wrap="wrap">{truncated}</Text>
                </Box>
              </Box>
            );
          })}
          {messages.length > 12 && (
            <Text dimColor>  ↑ {messages.length - 12} earlier messages not shown</Text>
          )}
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

      {actionState.type === 'idle' && (
        <HelpBar bindings={[
          { key: 'p', label: isPaused ? 'resume AI' : 'pause AI' },
          { key: 'q', label: 'back' },
        ]} />
      )}
    </Box>
  );
}

function messageKey(message: Message, index: number): string {
  return `${message.id ?? message.externalId ?? message.createdAt ?? message.role ?? 'message'}:${index}`;
}
