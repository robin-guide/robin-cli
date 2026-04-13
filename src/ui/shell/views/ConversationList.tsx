import React from 'react';
import { Box, Text } from 'ink';
import { Header } from '../components/Header.js';
import { SelectList, SelectItem } from '../components/SelectList.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { normalizeList } from '../../../utils.js';
import type { RobinClient } from '../../../client.js';
import type { Route } from '../App.js';

interface ThreadRow {
  id?: string;
  externalId?: string;
  status?: string;
  customerName?: string;
  lastMessage?: unknown;
  updatedAt?: string;
  agentPaused?: boolean;
}

interface ConversationListProps {
  agentId: string;
  agentName: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

export function ConversationList({
  agentId,
  agentName,
  client,
  onNavigate,
  onBack,
}: ConversationListProps): React.ReactElement {
  return (
    <AsyncView
      work={() => client.get<unknown>(`/agents/${agentId}/threads`)}
      loadingMessage="Fetching conversations…"
      onBack={onBack}
    >
      {(data) => {
        const threads = normalizeList(data, 'threads') as ThreadRow[];

        const items: SelectItem<Route>[] = threads.map(t => {
          const id = t.id ?? t.externalId ?? '';
          const lastMsg = t.lastMessage != null
            ? typeof t.lastMessage === 'string'
              ? t.lastMessage
              : JSON.stringify(t.lastMessage)
            : undefined;
          return {
            label: t.customerName ?? id,
            value: { type: 'conversation-detail', threadId: id, agentId, agentName } as Route,
            description: lastMsg
              ? lastMsg.slice(0, 50) + (lastMsg.length > 50 ? '…' : '')
              : undefined,
            hint: t.agentPaused ? 'paused' : t.status,
          };
        });

        return (
          <Box flexDirection="column">
            <Header title="Conversations" subtitle={agentName} showBack />
            {threads.length === 0 ? (
              <Text dimColor>No conversations found.</Text>
            ) : (
              <SelectList
                items={items}
                onSelect={item => onNavigate(item.value)}
                onCancel={onBack}
              />
            )}
            <HelpBar bindings={[
              { key: '↑↓', label: 'navigate' },
              { key: 'Enter', label: 'open' },
              { key: 'q', label: 'back' },
            ]} />
          </Box>
        );
      }}
    </AsyncView>
  );
}
