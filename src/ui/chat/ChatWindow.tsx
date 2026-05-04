import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { Header } from '../shell/components/Header.js';
import { HelpBar } from '../shell/components/HelpBar.js';
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


export function ChatWindow({ agentId, agentName, client, onBack }: ChatWindowProps): React.ReactElement {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const { isConfirmingExit } = useExitConfirmation();
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

    sendMessage(trimmed);
  }

  const displayedMessages = messages;

  return (
    <Box flexDirection="column">
      <Header title={agentName} subtitle="chat · web channel" showBack />

      {/* Message history */}
      <Box flexDirection="column" flexGrow={1}>
        {loadingInitial ? (
          <Spinner message="Loading chat history…" />
        ) : (
          <>
            {displayedMessages.length === 0 && !isSending && (
              <Text dimColor>No messages yet. Say hello!</Text>
            )}
            {displayedMessages.map((msg) => {
              const isUser = msg.role === 'user';
              const label = isUser ? 'you' : agentName;
              return (
                <Box key={msg.id} flexDirection="column" marginBottom={1}>
                  <Text bold color={isUser ? 'white' : 'cyan'}>{label}</Text>
                  <Box marginLeft={2}>
                    <Text wrap="wrap">{msg.content}</Text>
                  </Box>
                </Box>
              );
            })}
            {isSending && <Spinner message={`${agentName} is typing…`} />}
          </>
        )}
      </Box>

      {/* Error */}
      {error && (
        <Box marginTop={1}>
          <ErrorBox message={error} />
        </Box>
      )}

      {/* Reset status */}
      {isResetting && (
        <Box marginTop={1}>
          <Spinner message="Resetting chat…" />
        </Box>
      )}

      {/* Input */}
      {!loadingInitial && (
        <Box marginTop={1} borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text color="cyan" bold>{'> '}</Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Type a message… (/reset to clear, /quit to exit)"
            focus={!isSending && !isResetting && !isConfirmingExit}
          />
        </Box>
      )}

      <HelpBar bindings={[
        { key: 'Enter', label: 'send' },
        { key: 'Esc', label: 'back' },
        { key: '/reset', label: 'clear chat' },
        { key: '/quit', label: 'exit' },
      ]} />
    </Box>
  );
}
