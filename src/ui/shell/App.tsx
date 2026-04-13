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

  switch (current.type) {
    case 'menu':
      return <MainMenu onNavigate={push} />;

    case 'agents':
      return (
        <AgentList
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );

    case 'agent-picker':
      return (
        <AgentList
          client={client}
          onNavigate={push}
          onBack={pop}
          nextView={current.next}
        />
      );

    case 'agent-detail':
      return (
        <AgentDetail
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );

    case 'conversations':
      return (
        <ConversationList
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );

    case 'conversation-detail':
      return (
        <ConversationDetail
          threadId={current.threadId}
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onBack={pop}
        />
      );

    case 'customers':
      return (
        <CustomerList
          agentId={current.agentId}
          agentName={current.agentName}
          client={client}
          onNavigate={push}
          onBack={pop}
        />
      );

    case 'customer-detail':
      return (
        <CustomerDetail
          customerId={current.customerId}
          customerName={current.customerName}
          agentId={current.agentId}
          client={client}
          onBack={pop}
        />
      );

    default: {
      // Type-safe exhaustive check
      const _exhaustive: never = current;
      return _exhaustive;
    }
  }
}
