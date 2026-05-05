import React, { useState } from 'react';
import { useApp } from 'ink';
import { createClient, type RobinClient } from '../../client.js';
import { ChatWindow } from './ChatWindow.js';
import { AsyncView } from '../shell/components/AsyncView.js';
import { Header } from '../shell/components/Header.js';
import { SelectList, SelectItem } from '../shell/components/SelectList.js';
import { HelpBar } from '../shell/components/HelpBar.js';
import { Screen } from '../shell/components/Screen.js';
import { ExitConfirmation } from '../components/ExitConfirmation.js';
import { normalizeList } from '../../utils.js';

interface AgentRow {
  id?: string;
  externalId?: string;
  name?: string;
  status?: string;
}

interface ChatAppProps {
  apiKey: string;
  baseUrl: string;
  /** Pre-resolved Robin ID, if provided via flag or config. */
  agentId?: string;
}

export function ChatApp({ apiKey, baseUrl, agentId: initialAgentId }: ChatAppProps): React.ReactElement {
  return (
    <ExitConfirmation>
      <ChatAppContent apiKey={apiKey} baseUrl={baseUrl} agentId={initialAgentId} />
    </ExitConfirmation>
  );
}

function ChatAppContent({ apiKey, baseUrl, agentId: initialAgentId }: ChatAppProps): React.ReactElement {
  const { exit } = useApp();
  const client: RobinClient = createClient({ apiKey, baseUrl });

  const [agentId, setAgentId] = useState<string | undefined>(initialAgentId);
  const [agentName, setAgentName] = useState<string | undefined>(undefined);

  if (agentId && agentName !== undefined) {
    return (
      <ChatWindow
        agentId={agentId}
        agentName={agentName}
        client={client}
        onBack={() => exit()}
      />
    );
  }

  if (agentId && agentName === undefined) {
    return (
      <AsyncView
        work={() => client.get<unknown>('/agents')}
        loadingMessage="Loading Robin…"
        onBack={() => exit()}
      >
        {(data) => {
          const agents = normalizeList(data, 'agents') as AgentRow[];
          const match = agents.find(a => (a.id ?? a.externalId) === agentId);
          const name = match?.name ?? agentId;
          return (
            <ChatWindow
              agentId={agentId}
              agentName={name}
              client={client}
              onBack={() => exit()}
            />
          );
        }}
      </AsyncView>
    );
  }

  return (
    <AgentPicker
      client={client}
      onSelect={(id, name) => {
        setAgentId(id);
        setAgentName(name);
      }}
      onCancel={() => exit()}
    />
  );
}

interface AgentPickerProps {
  client: RobinClient;
  onSelect: (agentId: string, agentName: string) => void;
  onCancel: () => void;
}

function AgentPicker({ client, onSelect, onCancel }: AgentPickerProps): React.ReactElement {
  return (
    <AsyncView
      work={() => client.get<unknown>('/agents')}
      loadingMessage="Fetching Robins…"
      onBack={onCancel}
    >
      {(data) => {
        const agents = normalizeList(data, 'agents') as AgentRow[];
        const items: SelectItem<{ id: string; name: string }>[] = agents.map(a => {
          const id = a.id ?? a.externalId ?? '';
          const name = a.name ?? id;
          return { id, label: name, value: { id, name }, hint: a.status };
        });

        return (
          <Screen footer={(
            <HelpBar bindings={[
              { key: '↑↓', label: 'navigate' },
              { key: 'Enter', label: 'open chat' },
              { key: 'q', label: 'quit' },
            ]} />
          )}>
            <Header title="Chat — select a Robin" />
            <SelectList
              items={items}
              onSelect={item => onSelect(item.value.id, item.value.name)}
              onCancel={onCancel}
            />
          </Screen>
        );
      }}
    </AsyncView>
  );
}
