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

interface CustomerRow {
  id?: string;
  externalId?: string;
  name?: string;
  internalName?: string;
  phone?: string;
  phoneNumber?: string | null;
  isOptedIn?: boolean;
  optedIn?: boolean;
  messageCount?: number;
  lastMessageAt?: string;
  tags?: unknown[];
}

interface CustomersResponse {
  customers?: CustomerRow[];
  hasMore?: boolean;
  cursor?: string;
  nextCursor?: string;
  totalCount?: number;
  total?: number;
  count?: number;
  subscriberCount?: number;
  optedInCount?: number;
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
  const { columns } = useWindowSize();
  const pageSubscriberCount = customers.filter(customer => getOptedIn(customer) === true).length;
  const totalCount = data.totalCount ?? data.total ?? data.count;
  const subscriberCount = data.subscriberCount ?? data.optedInCount;

  useInput((input) => {
    if (input === 'n' && canGoNext) onNext(nextCursor);
    if (input === 'p' && canGoBack) onPrevious();
  }, { isActive: !isConfirmingExit });

  const items: SelectItem<Route>[] = customers.map(c => {
    const id = c.id ?? c.externalId ?? '';
    const phone = c.phone ?? c.phoneNumber ?? undefined;
    const tagCount = Array.isArray(c.tags) ? c.tags.length : 0;
    const optedIn = getOptedIn(c);
    const hintParts: string[] = [];
    if (phone) hintParts.push(formatPhone(phone));
    if (optedIn === true) hintParts.push('subscriber');
    if (optedIn === false) hintParts.push('not subscribed');
    if (tagCount > 0) hintParts.push(`${tagCount} tag${tagCount > 1 ? 's' : ''}`);
    if (typeof c.messageCount === 'number') {
      hintParts.push(`${c.messageCount} msg${c.messageCount === 1 ? '' : 's'}`);
    }
    if (c.lastMessageAt) hintParts.push(`last ${formatDate(c.lastMessageAt)}`);
    return {
      id,
      label: c.name ?? c.internalName ?? id,
      value: { type: 'customer-detail', customerId: id, customerName: c.name, agentId, agentName } as Route,
      hint: hintParts.length > 0 ? hintParts.join(' · ') : undefined,
    };
  });

  return (
    <Screen centerContent footer={(
      <HelpBar bindings={[
        { key: '↑↓', label: 'navigate' },
        { key: 'Enter', label: 'view customer' },
        ...(canGoBack ? [{ key: 'p', label: 'previous page' }] : []),
        ...(canGoNext ? [{ key: 'n', label: 'next page' }] : []),
        { key: 'q', label: 'back' },
      ]} />
    )}>
      <Box flexDirection="column" width={Math.min(columns, 72)}>
        <Header title="Customers" subtitle={agentName} showBack />
        <Text dimColor>
          {totalCount !== undefined ? `${totalCount} total customer${totalCount === 1 ? '' : 's'} · ` : ''}
          {subscriberCount !== undefined
            ? `${subscriberCount} subscriber${subscriberCount === 1 ? '' : 's'}`
            : `${pageSubscriberCount}/${customers.length} visible subscriber${pageSubscriberCount === 1 ? '' : 's'}`}
        </Text>
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
          Page {pageIndex + 1} · {customers.length} customer{customers.length !== 1 ? 's' : ''}
          {canGoNext ? ' · more on next page' : ''}
        </Text>
      </Box>
    </Screen>
  );
}

function getOptedIn(customer: CustomerRow): boolean | undefined {
  return customer.isOptedIn ?? customer.optedIn;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (value.startsWith('+')) return value;
  return value;
}

function formatDate(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;

  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(value).toLocaleDateString();
}
