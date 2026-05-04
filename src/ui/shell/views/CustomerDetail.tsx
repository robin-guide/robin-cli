import React from 'react';
import { Box, useInput } from 'ink';
import { Header } from '../components/Header.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { DetailView } from '../../../components/DetailView.js';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import type { RobinClient } from '../../../client.js';

interface CustomerDetailProps {
  customerId: string;
  customerName?: string;
  agentId: string;
  client: RobinClient;
  onBack: () => void;
}

function CustomerDetailView({
  data,
  title,
  onBack,
}: {
  data: Record<string, unknown>;
  title: string;
  onBack: () => void;
}): React.ReactElement {
  const { isConfirmingExit } = useExitConfirmation();

  useInput((input, key) => {
    if (key.escape || input === 'q') onBack();
  }, { isActive: !isConfirmingExit });

  return (
    <Box flexDirection="column">
      <Header title={title} showBack />
      {React.createElement(DetailView, { data })}
      <HelpBar bindings={[{ key: 'q', label: 'back' }]} />
    </Box>
  );
}

export function CustomerDetail({
  customerId,
  customerName,
  agentId,
  client,
  onBack,
}: CustomerDetailProps): React.ReactElement {
  return (
    <AsyncView
      work={() => client.get<Record<string, unknown>>(`/customers/${customerId}`, { agentId })}
      loadingMessage="Fetching customer…"
      onBack={onBack}
    >
      {(data) => (
        <CustomerDetailView
          data={data}
          title={customerName ?? customerId}
          onBack={onBack}
        />
      )}
    </AsyncView>
  );
}
