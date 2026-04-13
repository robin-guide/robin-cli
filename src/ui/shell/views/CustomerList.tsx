import React from 'react';
import { Box, Text } from 'ink';
import { Header } from '../components/Header.js';
import { SelectList, SelectItem } from '../components/SelectList.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { normalizeList } from '../../../utils.js';
import type { RobinClient } from '../../../client.js';
import type { Route } from '../App.js';

interface CustomerRow {
  id?: string;
  externalId?: string;
  name?: string;
  phone?: string;
  optedIn?: boolean;
  tags?: unknown[];
}

interface CustomerListProps {
  agentId: string;
  agentName: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

export function CustomerList({
  agentId,
  agentName,
  client,
  onNavigate,
  onBack,
}: CustomerListProps): React.ReactElement {
  return (
    <AsyncView
      work={() => client.get<unknown>('/customers', { agentId })}
      loadingMessage="Fetching customers…"
      onBack={onBack}
    >
      {(data) => {
        const customers = normalizeList(data, 'customers') as CustomerRow[];

        const items: SelectItem<Route>[] = customers.map(c => {
          const id = c.id ?? c.externalId ?? '';
          return {
            label: c.name ?? id,
            value: { type: 'customer-detail', customerId: id, customerName: c.name, agentId } as Route,
            hint: c.phone,
          };
        });

        return (
          <Box flexDirection="column">
            <Header title="Customers" subtitle={agentName} showBack />
            {customers.length === 0 ? (
              <Text dimColor>No customers found.</Text>
            ) : (
              <SelectList
                items={items}
                onSelect={item => onNavigate(item.value)}
                onCancel={onBack}
              />
            )}
            <HelpBar bindings={[
              { key: '↑↓', label: 'navigate' },
              { key: 'Enter', label: 'view customer' },
              { key: 'q', label: 'back' },
            ]} />
          </Box>
        );
      }}
    </AsyncView>
  );
}
