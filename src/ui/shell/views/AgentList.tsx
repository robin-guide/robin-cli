import React from 'react';
import { Box } from 'ink';
import { Header } from '../components/Header.js';
import { SelectList, SelectItem } from '../components/SelectList.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { normalizeList } from '../../../utils.js';
import type { RobinClient } from '../../../client.js';
import type { Route } from '../App.js';

interface AgentRow {
  id?: string;
  externalId?: string;
  name?: string;
  status?: string;
  model?: string;
}

interface AgentListProps {
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
  /** If provided, immediately routes after agent selection (for agent-picker flows). */
  nextView?: 'conversations' | 'customers';
}

export function AgentList({ client, onNavigate, onBack, nextView }: AgentListProps): React.ReactElement {
  return (
    <AsyncView
      work={() => client.get<unknown>('/agents')}
      loadingMessage="Fetching agents…"
      onBack={onBack}
    >
      {(data) => {
        const agents = normalizeList(data, 'agents') as AgentRow[];
        const items: SelectItem<Route>[] = agents.map(a => {
          const id = a.id ?? a.externalId ?? '';
          const name = a.name ?? id;
          const route: Route = nextView === 'conversations'
            ? { type: 'conversations', agentId: id, agentName: name }
            : nextView === 'customers'
              ? { type: 'customers', agentId: id, agentName: name }
              : { type: 'agent-detail', agentId: id, agentName: name };
          return {
            label: name,
            value: route,
            hint: a.status,
          };
        });

        return (
          <Box flexDirection="column">
            <Header
              title={nextView ? `Select agent for ${nextView}` : 'Agents'}
              showBack
            />
            <SelectList
              items={items}
              onSelect={item => onNavigate(item.value)}
              onCancel={onBack}
            />
            <HelpBar bindings={[
              { key: '↑↓', label: 'navigate' },
              { key: 'Enter', label: 'select' },
              { key: 'q', label: 'back' },
            ]} />
          </Box>
        );
      }}
    </AsyncView>
  );
}
