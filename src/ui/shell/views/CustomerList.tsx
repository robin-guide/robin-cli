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

interface CustomerRow {
  id?: string;
  externalId?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string | null;
  optedIn?: boolean;
  tags?: unknown[];
}

interface CustomersResponse {
  customers?: CustomerRow[];
  hasMore?: boolean;
  cursor?: string;
  nextCursor?: string;
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
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors[pageIndex];

  return (
    <AsyncView
      key={cursor ?? 'first-page'}
      work={() => client.get<CustomersResponse>('/customers', { agentId, cursor })}
      loadingMessage="Fetching customers…"
      onBack={onBack}
    >
      {(data) => (
        <CustomerListPage
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

interface CustomerListPageProps {
  data: CustomersResponse;
  agentId: string;
  agentName: string;
  pageIndex: number;
  canGoBack: boolean;
  onNext: (cursor: string) => void;
  onPrevious: () => void;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

function CustomerListPage({
  data,
  agentId,
  agentName,
  pageIndex,
  canGoBack,
  onNext,
  onPrevious,
  onNavigate,
  onBack,
}: CustomerListPageProps): React.ReactElement {
  const customers = normalizeList(data, 'customers') as CustomerRow[];
  const nextCursor = data.cursor ?? data.nextCursor;
  const canGoNext = !!data.hasMore && !!nextCursor;
  const { isConfirmingExit } = useExitConfirmation();

  useInput((input) => {
    if (input === 'n' && canGoNext) onNext(nextCursor);
    if (input === 'p' && canGoBack) onPrevious();
  }, { isActive: !isConfirmingExit });

  const items: SelectItem<Route>[] = customers.map(c => {
    const id = c.id ?? c.externalId ?? '';
    return {
      id,
      label: c.name ?? id,
      value: { type: 'customer-detail', customerId: id, customerName: c.name, agentId } as Route,
      hint: c.phone ?? c.phoneNumber ?? undefined,
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
      <Text dimColor>
        Page {pageIndex + 1} · Showing {customers.length} customers
        {canGoNext ? ` · More available after ${nextCursor}` : ''}
      </Text>
      <HelpBar bindings={[
        { key: '↑↓', label: 'navigate' },
        { key: 'Enter', label: 'view customer' },
        ...(canGoBack ? [{ key: 'p', label: 'previous page' }] : []),
        ...(canGoNext ? [{ key: 'n', label: 'next page' }] : []),
        { key: 'q', label: 'back' },
      ]} />
    </Box>
  );
}
