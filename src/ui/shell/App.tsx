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
import { ExitConfirmation } from '../components/ExitConfirmation.js';

/** All possible routes in the interactive shell. */
export type Route =
  | { type: 'menu' }
  | { type: 'agents' }
  | { type: 'agent-detail'; agentId: string; agentName: string }
  /** Agent picker before navigating to a resource that requires an agent. */
  | { type: 'agent-picker'; next: 'conversations' | 'customers' }
  | { type: 'conversations'; agentId: string; agentName: string }
  | { type: 'conversation-detail'; threadId: string; agentId?: string; agentName?: string }
  | { type: 'customers'; agentId: string; agentName: string }
  | { type: 'customer-detail'; customerId: string; customerName?: string; agentId: string };

interface AppProps {
  apiKey: string;
  baseUrl: string;
}

/**
 * Root shell component. Manages a navigation stack and renders the current route.
 * All views share the same API client instance.
 */
export function App({ apiKey, baseUrl }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [stack, setStack] = useState<Route[]>([{ type: 'menu' }]);

  const client: RobinClient = createClient({ apiKey, baseUrl });

  const current = stack[stack.length - 1];

  const push = (route: Route) => setStack(s => [...s, route]);

  const pop = () => {
    setStack(s => {
      if (s.length <= 1) { exit(); return s; }
      return s.slice(0, -1);
    });
  };

  let view: React.ReactElement;

  switch (current.type) {
    case 'menu':
      view = <MainMenu onNavigate={push} />;
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

    case 'conversations':
      view = (
        <ConversationList
          agentId={current.agentId}
          agentName={current.agentName}
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
