import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../components/Header.js';
import { SelectList, SelectItem } from '../components/SelectList.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import { normalizeList } from '../../../utils.js';
import type { RobinClient } from '../../../client.js';
import type { Route } from '../App.js';

interface ThreadRow {
  id?: string;
  externalId?: string;
  status?: string;
  customerName?: string;
  customer?: {
    name?: string | null;
  };
  lastMessage?: unknown;
  updatedAt?: string;
  agentPaused?: boolean;
}

interface ThreadsResponse {
  threads?: ThreadRow[];
  hasMore?: boolean;
  nextCursor?: string | null;
}

interface AgentDetailProps {
  agentId: string;
  agentName: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

export function AgentDetail({ agentId, agentName, client, onNavigate, onBack }: AgentDetailProps): React.ReactElement {
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors[pageIndex];

  return (
    <AsyncView
      key={cursor ?? 'first-page'}
      work={() => client.get<ThreadsResponse>(`/agents/${agentId}/threads`, { cursor })}
      loadingMessage="Fetching threads…"
      onBack={onBack}
    >
      {(data) => (
        <AgentThreadsPage
          data={data}
          agentId={agentId}
          agentName={agentName}
          pageIndex={pageIndex}
          canGoBack={pageIndex > 0}
          onNext={(nextCursor) => {
            setCursors(prev => {
              if (prev[pageIndex + 1]) return prev;
              return [...prev, nextCursor];
            });
            setPageIndex(current => current + 1);
          }}
          onPrevious={() => setPageIndex(current => Math.max(0, current - 1))}
          onNavigate={onNavigate}
          onBack={onBack}
        />
      )}
    </AsyncView>
  );
}

interface AgentThreadsPageProps {
  data: ThreadsResponse;
  agentId: string;
  agentName: string;
  pageIndex: number;
  canGoBack: boolean;
  onNext: (cursor: string) => void;
  onPrevious: () => void;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

function AgentThreadsPage({
  data,
  agentId,
  agentName,
  pageIndex,
  canGoBack,
  onNext,
  onPrevious,
  onNavigate,
  onBack,
}: AgentThreadsPageProps): React.ReactElement {
  const threads = normalizeList(data, 'threads') as ThreadRow[];
  const nextCursor = data.nextCursor ?? undefined;
  const canGoNext = !!data.hasMore && !!nextCursor;
  const { isConfirmingExit } = useExitConfirmation();

  useInput((input) => {
    if (input === 'n' && canGoNext) onNext(nextCursor);
    if (input === 'p' && canGoBack) onPrevious();
  }, { isActive: !isConfirmingExit });

  const items: SelectItem<Route>[] = threads.map(t => {
    const id = t.id ?? t.externalId ?? '';
    const lastMsg = formatLastMessage(t.lastMessage);
    return {
      label: t.customerName ?? t.customer?.name ?? id,
      value: { type: 'conversation-detail', threadId: id, agentId, agentName } as Route,
      description: lastMsg
        ? lastMsg.slice(0, 40) + (lastMsg.length > 40 ? '…' : '')
        : undefined,
      hint: t.agentPaused ? 'paused' : t.status,
    };
  });

  return (
    <Box flexDirection="column">
      <Header title={agentName} subtitle="threads" showBack />
      {threads.length === 0 ? (
        <Text dimColor>No threads found.</Text>
      ) : (
        <SelectList
          items={items}
          onSelect={item => onNavigate(item.value)}
          onCancel={onBack}
        />
      )}
      <Text dimColor>
        Page {pageIndex + 1} · Showing {threads.length} threads
        {canGoNext ? ` · More available after ${nextCursor}` : ''}
      </Text>
      <HelpBar bindings={[
        { key: '↑↓', label: 'navigate' },
        { key: 'Enter', label: 'view thread' },
        ...(canGoBack ? [{ key: 'p', label: 'previous page' }] : []),
        ...(canGoNext ? [{ key: 'n', label: 'next page' }] : []),
        { key: 'q', label: 'back' },
      ]} />
    </Box>
  );
}

function formatLastMessage(lastMessage: unknown): string | undefined {
  if (lastMessage == null) return undefined;
  if (typeof lastMessage === 'string') return lastMessage;
  if (typeof lastMessage === 'object' && 'content' in lastMessage) {
    return String((lastMessage as { content?: unknown }).content ?? '');
  }

  return JSON.stringify(lastMessage);
}
