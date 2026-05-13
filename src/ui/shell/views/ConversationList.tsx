import React, { useState } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { Header } from '../components/Header.js';
import { SelectList, SelectItem } from '../components/SelectList.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { Screen } from '../components/Screen.js';
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

interface ConversationListProps {
  agentId: string;
  agentName: string;
  customerId?: string;
  customerName?: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

export function ConversationList({
  agentId,
  agentName,
  customerId,
  customerName,
  client,
  onNavigate,
  onBack,
}: ConversationListProps): React.ReactElement {
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors[pageIndex];
  const query = { cursor, customerId };

  return (
    <AsyncView
      key={`${customerId ?? 'all'}:${cursor ?? 'first-page'}`}
      work={() => client.get<ThreadsResponse>(`/agents/${agentId}/threads`, query)}
      loadingMessage="Fetching conversations…"
      onBack={onBack}
    >
      {(data) => (
        <ConversationListPage
          data={data}
          agentId={agentId}
          agentName={agentName}
          customerName={customerName}
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

interface ConversationListPageProps {
  data: ThreadsResponse;
  agentId: string;
  agentName: string;
  customerName?: string;
  pageIndex: number;
  canGoBack: boolean;
  onNext: (cursor: string) => void;
  onPrevious: () => void;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

function ConversationListPage({
  data,
  agentId,
  agentName,
  customerName,
  pageIndex,
  canGoBack,
  onNext,
  onPrevious,
  onNavigate,
  onBack,
}: ConversationListPageProps): React.ReactElement {
  const threads = normalizeList(data, 'threads') as ThreadRow[];
  const nextCursor = data.nextCursor ?? undefined;
  const canGoNext = !!data.hasMore && !!nextCursor;
  const { isConfirmingExit } = useExitConfirmation();
  const { columns } = useWindowSize();
  const title = customerName ? `Conversations: ${customerName}` : 'Conversations';

  useInput((input, key) => {
    if (key.escape || input === 'q') { onBack(); return; }
    if (input === 'n' && canGoNext) onNext(nextCursor);
    if (input === 'p' && canGoBack) onPrevious();
  }, { isActive: !isConfirmingExit });

  const items: SelectItem<Route>[] = threads.map(t => {
    const id = t.id ?? t.externalId ?? '';
    const lastMsg = formatLastMessage(t.lastMessage);
    return {
      id,
      label: t.customerName ?? t.customer?.name ?? id,
      value: { type: 'conversation-detail', threadId: id, agentId, agentName } as Route,
      description: lastMsg
        ? lastMsg.slice(0, 50) + (lastMsg.length > 50 ? '…' : '')
        : undefined,
      hint: t.agentPaused ? 'paused' : t.status,
    };
  });

  return (
    <Screen centerContent footer={(
      <HelpBar bindings={[
        { key: '↑↓', label: 'navigate' },
        { key: 'Enter', label: 'open' },
        ...(canGoBack ? [{ key: 'p', label: 'previous page' }] : []),
        ...(canGoNext ? [{ key: 'n', label: 'next page' }] : []),
        { key: 'q', label: 'back' },
      ]} />
    )}>
      <Box flexDirection="column" width={Math.min(columns, 72)}>
        <Header title={title} subtitle={agentName} showBack />
        {threads.length === 0 ? (
          <Text dimColor>{customerName ? 'No conversations found for this customer.' : 'No conversations found.'}</Text>
        ) : (
          <SelectList
            items={items}
            onSelect={item => onNavigate(item.value)}
            onCancel={onBack}
          />
        )}
        <Text dimColor>
          Page {pageIndex + 1} · {threads.length} conversation{threads.length !== 1 ? 's' : ''}
          {canGoNext ? ' · more on next page' : ''}
        </Text>
      </Box>
    </Screen>
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
