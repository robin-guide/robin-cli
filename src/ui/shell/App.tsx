import React, { useState } from 'react';
import { useApp } from 'ink';
import { createClient, type RobinClient } from '../../client.js';
import { MainMenu } from './views/MainMenu.js';
import { AgentList } from './views/AgentList.js';
import { AgentDetail } from './views/AgentDetail.js';
import { ConversationList } from './views/ConversationList.js';
import { ConversationDetail } from './views/ConversationDetail.js';
import { CustomerList } from './views/CustomerList.js';
import { CustomerDetail } from './views/CustomerDetail.js';
import { TagList } from './views/TagList.js';
import { TagDetail } from './views/TagDetail.js';
import { TagEditor } from './views/TagEditor.js';
import { AnnouncementScreen } from './views/AnnouncementScreen.js';
import { ExitConfirmation } from '../components/ExitConfirmation.js';
import { ChatWindow } from '../chat/ChatWindow.js';
import { AsyncView } from './components/AsyncView.js';
import { normalizeList } from '../../utils.js';

/** All possible routes in the interactive shell. */
export type Route =
  | { type: 'menu' }
  | { type: 'agents' }
  | { type: 'agent-detail'; agentId: string; agentName: string }
  /** Agent picker used only when Owner Chat is opened with no Robin selected yet. */
  | { type: 'agent-picker'; next: 'chat' }
  | { type: 'chat'; agentId: string; agentName?: string }
  | { type: 'conversations'; agentId: string; agentName: string; customerId?: string; customerName?: string }
  | { type: 'conversation-detail'; threadId: string; agentId?: string; agentName?: string }
  | { type: 'customers'; agentId: string; agentName: string }
  | { type: 'customer-detail'; customerId: string; customerName?: string; agentId: string; agentName?: string }
  | { type: 'tags'; agentId: string; agentName: string }
  | { type: 'tag-detail'; tagId: string; tagName?: string; agentId: string; agentName?: string }
  | { type: 'tag-create'; agentId: string; agentName: string }
  | { type: 'tag-edit'; tagId: string; tagName?: string; agentId: string; agentName?: string }
  | { type: 'announcements'; agentId: string; agentName: string };

interface AppProps {
  apiKey: string;
  baseUrl: string;
  agentId?: string;
}

interface SelectedAgent {
  agentId: string;
  agentName?: string;
}

interface AgentRow {
  id?: string;
  externalId?: string;
  name?: string;
}

/**
 * Root shell component. Manages a navigation stack and renders the current route.
 * All views share the same API client instance.
 */
export function App({ apiKey, baseUrl, agentId: initialAgentId }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [stack, setStack] = useState<Route[]>([{ type: 'menu' }]);
  const [selectedAgent, setSelectedAgent] = useState<SelectedAgent | undefined>(
    initialAgentId ? { agentId: initialAgentId } : undefined,
  );

  const client: RobinClient = createClient({ apiKey, baseUrl });

  const current = stack[stack.length - 1];

  const push = (route: Route) => {
    if ('agentId' in route && route.agentId) {
      setSelectedAgent({
        agentId: route.agentId,
        agentName: 'agentName' in route ? route.agentName : undefined,
      });
    }
    setStack(s => [...s, route]);
  };

  const openChat = () => {
    if (selectedAgent) {
      push({ type: 'chat', ...selectedAgent });
      return;
    }

    push({ type: 'agent-picker', next: 'chat' });
  };

  const pop = () => {
    setStack(s => {
      if (s.length <= 1) { exit(); return s; }
      return s.slice(0, -1);
    });
  };

  let view: React.ReactElement;

  switch (current.type) {
    case 'menu':
      view = <MainMenu onNavigate={push} onOpenChat={openChat} />;
      break;

    case 'agents':
      view = (
        <AgentList
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );
      break;

    case 'agent-picker':
      view = (
        <AgentList
          client={client}
          onNavigate={push}
          onBack={pop}
          nextView={current.next}
        />
      );
      break;

    case 'agent-detail':
      view = (
        <AgentDetail
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );
      break;

    case 'chat':
      if (current.agentName !== undefined) {
        view = (
          <ChatWindow
            agentId={current.agentId}
            agentName={current.agentName}
            client={client}
            onBack={pop}
          />
        );
        break;
      }

      view = (
        <AsyncView
          work={() => client.get<unknown>('/agents')}
          loadingMessage="Loading Robin…"
          onBack={pop}
        >
          {(data) => {
            const agents = normalizeList(data, 'agents') as AgentRow[];
            const match = agents.find(a => (a.id ?? a.externalId) === current.agentId);
            const agentName = match?.name ?? current.agentId;
            return (
              <ChatWindow
                agentId={current.agentId}
                agentName={agentName}
                client={client}
                onBack={pop}
              />
            );
          }}
        </AsyncView>
      );
      break;

    case 'conversations':
      view = (
        <ConversationList
          agentId={current.agentId}
          agentName={current.agentName}
          customerId={current.customerId}
          customerName={current.customerName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );
      break;

    case 'conversation-detail':
      view = (
        <ConversationDetail
          threadId={current.threadId}
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onBack={pop}
        />
      );
      break;

    case 'customers':
      view = (
        <CustomerList
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );
      break;

    case 'customer-detail':
      view = (
        <CustomerDetail
          customerId={current.customerId}
          customerName={current.customerName}
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );
      break;

    case 'tags':
      view = (
        <TagList
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );
      break;

    case 'tag-detail':
      view = (
        <TagDetail
          tagId={current.tagId}
          tagName={current.tagName}
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );
      break;

    case 'tag-create':
      view = (
        <TagEditor
          mode="create"
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );
      break;

    case 'tag-edit':
      view = (
        <TagEditor
          mode="edit"
          tagId={current.tagId}
          tagName={current.tagName}
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );
      break;

    case 'announcements':
      view = (
        <AnnouncementScreen
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onBack={pop}
        />
      );
      break;

    default: {
      // Type-safe exhaustive check
      const _exhaustive: never = current;
      return _exhaustive;
    }
  }

  return <ExitConfirmation>{view}</ExitConfirmation>;
}
