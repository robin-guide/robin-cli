import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput, useWindowSize } from 'ink';
import TextInput from 'ink-text-input';
import {
  ConversationTranscript,
  getMaxTranscriptScrollOffset,
  type TranscriptMessage,
} from '../shell/components/ConversationTranscript.js';
import { Header } from '../shell/components/Header.js';
import { HelpBar } from '../shell/components/HelpBar.js';
import { Screen } from '../shell/components/Screen.js';
import { useExitConfirmation } from '../components/ExitConfirmation.js';
import { Spinner } from '../../components/Spinner.js';
import { ErrorBox } from '../../components/ErrorBox.js';
import type { RobinClient } from '../../client.js';
import { formatError } from '../../client.js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

interface MessagesResponse {
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

interface SendResponse {
  response: string;
  bootstrapComplete?: boolean;
}

interface ChatWindowProps {
  agentId: string;
  agentName: string;
  client: RobinClient;
  onBack: () => void;
}

const GOLD = '#dba76d';

export function ChatWindow({ agentId, agentName, client, onBack }: ChatWindowProps): React.ReactElement {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [messageOffsetFromEnd, setMessageOffsetFromEnd] = useState(0);
  const { isConfirmingExit } = useExitConfirmation();
  const { columns: termWidth, rows: termRows } = useWindowSize();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadMessages();
    return () => { mountedRef.current = false; };
  }, [agentId]);

  async function loadMessages() {
    setLoadingInitial(true);
    setError(null);
    try {
      const data = await client.get<MessagesResponse>(`/channels/web/messages/${agentId}`);
      if (!mountedRef.current) return;
      setMessages(
        (data.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role === 'user' || m.role === 'customer' ? 'user' : 'assistant',
          content: m.content,
          createdAt: new Date(m.createdAt).getTime(),
        })),
      );
      setMessageOffsetFromEnd(0);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(formatError(err).message);
    } finally {
      if (mountedRef.current) setLoadingInitial(false);
    }
  }

  async function sendMessage(content: string) {
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    setError(null);

    try {
      const data = await client.post<SendResponse>(`/channels/web/messages/${agentId}`, {
        message: content,
        agentExternalId: agentId,
      });
      if (!mountedRef.current) return;
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setMessageOffsetFromEnd(0);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(formatError(err).message);
    } finally {
      if (mountedRef.current) setIsSending(false);
    }
  }

  async function resetThread() {
    setIsResetting(true);
    setError(null);
    try {
      await client.post(`/channels/web/messages/${agentId}/reset`, {});
      if (!mountedRef.current) return;
      setMessages([]);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(formatError(err).message);
    } finally {
      if (mountedRef.current) setIsResetting(false);
    }
  }

  useInput((_input, key) => {
    if (isConfirmingExit) return;
    if (isSending || isResetting) return;
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
    if (key.escape) {
      onBack();
    }
  }, { isActive: !isConfirmingExit });

  function handleSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;

    setInput('');

    if (trimmed === '/quit') { exit(); return; }
    if (trimmed === '/back') { onBack(); return; }
    if (trimmed === '/reset') { resetThread(); return; }
    if (trimmed === '/end' || trimmed === '/latest') { setMessageOffsetFromEnd(0); return; }

    sendMessage(trimmed);
  }

  const transcriptWidth = Math.min(Math.max(48, termWidth - 6), 84);
  const bubbleWidth = Math.min(Math.max(28, Math.floor(transcriptWidth * 0.72)), 58);
  const visibleLines = Math.max(8, termRows - 13);
  const transcriptMessages: TranscriptMessage[] = messages.map((msg) => {
    const isUser = msg.role === 'user';
    return {
      id: msg.id,
      author: isUser ? 'you' : agentName,
      content: msg.content,
      align: isUser ? 'right' : 'left',
    };
  });
  const maxScrollOffset = getMaxTranscriptScrollOffset(transcriptMessages, bubbleWidth, visibleLines);
  const clampedScrollOffset = Math.min(messageOffsetFromEnd, maxScrollOffset);
  const canScrollOlder = maxScrollOffset > clampedScrollOffset;
  const canScrollNewer = clampedScrollOffset > 0;

  return (
    <Screen footer={(
      <>
        {isResetting && (
          <Box marginTop={1}>
            <Spinner message="Resetting chat…" />
          </Box>
        )}

        {!loadingInitial && (
          <Box marginTop={1} alignItems="center" flexDirection="column">
            <Box width={transcriptWidth} flexDirection="column">
              <Box justifyContent="flex-end">
                <Text color={GOLD} bold>you</Text>
              </Box>
              <Box
                borderStyle="round"
                borderColor={GOLD}
                paddingX={1}
                paddingY={1}
                width={bubbleWidth}
                alignSelf="flex-end"
                flexDirection="column"
              >
                <Box width={Math.max(10, bubbleWidth - 6)}>
                  <Text color={GOLD} bold>{'> '}</Text>
                  <TextInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSubmit}
                    placeholder="Type a message… (/reset to clear, /quit to exit)"
                    focus={!isSending && !isResetting && !isConfirmingExit}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        <HelpBar bindings={[
          { key: 'Enter', label: 'send' },
          ...(canScrollOlder ? [{ key: '↑/Shift+↑', label: 'older' }] : []),
          ...(canScrollNewer ? [{ key: '↓/Shift+↓', label: 'newer' }, { key: '/end', label: 'latest' }] : []),
          { key: 'Esc', label: 'back' },
          { key: '/reset', label: 'clear chat' },
        ]} />
      </>
    )}>
      <Header title="Chat · web channel" subtitle={agentName} showBack />

      <Box flexDirection="column" flexGrow={1} alignItems="center">
        {loadingInitial ? (
          <Spinner message="Loading chat history…" />
        ) : (
          <Box flexDirection="column" width={transcriptWidth}>
            {transcriptMessages.length > 0 && (
              <Box justifyContent="center" marginBottom={1}>
                <Text dimColor>
                  {canScrollNewer ? 'Viewing history' : 'Latest messages'}
                  {canScrollOlder ? ' · ↑ older · Shift+↑ faster' : ''}
                  {canScrollNewer ? ' · ↓ newer · Shift+↓ faster · /end latest' : ''}
                </Text>
              </Box>
            )}
            {transcriptMessages.length === 0 && !isSending && (
              <Text dimColor>No messages yet. Say hello!</Text>
            )}
            <ConversationTranscript
              messages={transcriptMessages}
              transcriptWidth={transcriptWidth}
              bubbleWidth={bubbleWidth}
              visibleLines={visibleLines}
              scrollOffsetFromBottom={clampedScrollOffset}
            />
            {isSending && <Spinner message={`${agentName} is typing…`} />}
          </Box>
        )}
      </Box>

      {/* Error */}
      {error && (
        <Box marginTop={1}>
          <ErrorBox message={error} />
        </Box>
      )}
    </Screen>
  );
}
