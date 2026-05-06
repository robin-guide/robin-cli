import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { ErrorBox } from '../../../components/ErrorBox.js';
import { Spinner } from '../../../components/Spinner.js';
import { SuccessBox } from '../../../components/SuccessBox.js';
import { Header } from '../components/Header.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { Screen } from '../components/Screen.js';
import { SelectItem, SelectList } from '../components/SelectList.js';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import { formatError } from '../../../client.js';
import type { RobinClient } from '../../../client.js';
import type { Route } from '../App.js';

// Fields handled in named sections — excluded from the Details remainder
const HANDLED_KEYS = new Set([
  'id', 'name', 'phone', 'phoneNumber', 'externalId', 'optedIn', 'tags',
  'notes', 'welcomeMessage', 'createdAt', 'updatedAt',
]);

interface CustomerDetailProps {
  customerId: string;
  customerName?: string;
  agentId: string;
  agentName?: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

interface CustomerTagAssignment {
  id?: string;
  tag?: {
    id?: string;
    name?: string;
    agentId?: string;
    visibility?: string;
  };
}

interface CustomerTagsResponse {
  data?: CustomerTagAssignment[];
  tags?: CustomerTagAssignment[];
}

interface TagRow {
  id?: string;
  externalId?: string;
  name?: string;
  visibility?: string;
  description?: string | null;
}

interface TagsResponse {
  data?: TagRow[];
  tags?: TagRow[];
}

interface CustomerDetailData {
  customer: Record<string, unknown>;
  customerTags: CustomerTagAssignment[];
  availableTags: TagRow[];
}

type CustomerMode =
  | { type: 'view' }
  | { type: 'edit-name'; value: string }
  | { type: 'edit-notes'; value: string }
  | { type: 'tag-picker' }
  | { type: 'working'; label: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; detail?: string };

function formatTimestamp(value: unknown): string {
  if (!value || typeof value !== 'string') return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function FieldRow({
  label,
  value,
  color,
  width = 18,
}: {
  label: string;
  value: string;
  color?: string;
  width?: number;
}): React.ReactElement {
  return (
    <Box>
      <Box width={width} marginRight={2}><Text dimColor>{label}</Text></Box>
      <Text color={color}>{value}</Text>
    </Box>
  );
}

function SectionLabel({ label }: { label: string }): React.ReactElement {
  return (
    <Box marginTop={1}>
      <Text bold color="yellow">{label}</Text>
    </Box>
  );
}

function CustomerDossier({
  initialData,
  initialCustomerTags,
  availableTags,
  title,
  agentId,
  agentName,
  customerId,
  client,
  onNavigate,
  onBack,
}: {
  initialData: Record<string, unknown>;
  initialCustomerTags: CustomerTagAssignment[];
  availableTags: TagRow[];
  title: string;
  agentId: string;
  agentName?: string;
  customerId: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}): React.ReactElement {
  const [data, setData] = useState(initialData);
  const [customerTags, setCustomerTags] = useState(initialCustomerTags);
  const [mode, setMode] = useState<CustomerMode>({ type: 'view' });
  const { isConfirmingExit } = useExitConfirmation();

  async function updateCustomer(body: Record<string, unknown>, successMessage: string) {
    setMode({ type: 'working', label: 'Updating customer…' });
    try {
      const updated = await client.patch<Record<string, unknown>>(
        `/customers/${customerId}?agentId=${encodeURIComponent(agentId)}`,
        body,
      );
      setData(current => ({ ...current, ...normalizeCustomerData(updated), ...body }));
      setMode({ type: 'success', message: successMessage });
      setTimeout(() => setMode({ type: 'view' }), 1600);
    } catch (err) {
      setMode({ type: 'error', ...formatError(err) });
    }
  }

  async function applyTag(tag: TagRow) {
    const tagId = tag.id ?? tag.externalId;
    if (!tagId) return;

    setMode({ type: 'working', label: 'Applying tag…' });
    try {
      const assignment = await client.post<CustomerTagAssignment>(`/customers/${customerId}/tags`, { tagId });
      setCustomerTags(current => [...current, assignment]);
      setMode({ type: 'success', message: `Applied tag ${tag.name ?? tagId}.` });
      setTimeout(() => setMode({ type: 'view' }), 1600);
    } catch (err) {
      setMode({ type: 'error', ...formatError(err) });
    }
  }

  useInput((input, key) => {
    if (isConfirmingExit) return;

    if (mode.type === 'error' || mode.type === 'success') {
      if (key.escape || input === 'q' || key.return) setMode({ type: 'view' });
      return;
    }

    if (mode.type === 'tag-picker') {
      return;
    }

    if (mode.type !== 'view') {
      if (key.escape) setMode({ type: 'view' });
      return;
    }

    if (key.escape || input === 'q') { onBack(); return; }
    if (input === 'c') {
      onNavigate({
        type: 'conversations',
        agentId,
        agentName: agentName ?? agentId,
        customerId,
        customerName: displayTitle,
      });
      return;
    }
    if (input === 't') {
      setMode({ type: 'tag-picker' });
      return;
    }
    if (input === 'e') {
      setMode({ type: 'edit-name', value: String(data.name ?? '') });
      return;
    }
    if (input === 'n') {
      setMode({ type: 'edit-notes', value: String(data.notes ?? '') });
      return;
    }
    if (input === 'o') {
      updateCustomer({ optedIn: data.optedIn !== true }, 'Updated opt-in status.');
    }
  }, { isActive: !isConfirmingExit });

  // Identity
  const phone = String(data.phone ?? data.phoneNumber ?? '—');
  const externalId = data.externalId ? String(data.externalId) : '—';
  const optedIn = data.optedIn;
  const optInText = optedIn === true ? 'yes' : optedIn === false ? 'no' : '—';
  const optInColor = optedIn === true ? 'green' : optedIn === false ? 'red' : undefined;

  const tagsFromCustomer: string[] = Array.isArray(data.tags)
    ? (data.tags as Array<{ name?: string; id?: string } | string>)
        .map(t => (typeof t === 'string' ? t : (t.name ?? t.id ?? '?')))
        .filter(Boolean)
    : [];
  const tagsFromAssignments = customerTags
    .filter(assignment => !assignment.tag?.agentId || assignment.tag.agentId === agentId)
    .map(assignment => assignment.tag?.name ?? assignment.tag?.id)
    .filter((tag): tag is string => !!tag);
  const tags = Array.from(new Set([...tagsFromCustomer, ...tagsFromAssignments]));

  // Context
  const notes = typeof data.notes === 'string' ? data.notes : null;
  const welcomeMessage = typeof data.welcomeMessage === 'string' ? data.welcomeMessage : null;

  // Remaining unknown fields
  const extras = Object.entries(data).filter(([k]) => !HANDLED_KEYS.has(k));

  const termWidth = process.stdout.columns ?? 80;
  const valueWidth = Math.max(20, termWidth - 22);
  const displayTitle = String(data.name ?? title);
  const appliedTagIds = new Set(customerTags.map(assignment => assignment.tag?.id).filter(Boolean));
  const tagOptions: SelectItem<TagRow>[] = availableTags
    .filter(tag => {
      const tagId = tag.id ?? tag.externalId;
      return !!tagId && !appliedTagIds.has(tagId);
    })
    .map(tag => ({
      id: tag.id ?? tag.externalId,
      label: tag.name ?? tag.id ?? tag.externalId ?? 'Untitled tag',
      value: tag,
      description: tag.description ?? undefined,
      hint: tag.visibility,
    }));

  if (mode.type === 'tag-picker') {
    return (
      <Screen centerContent footer={(
        <HelpBar bindings={[
          { key: '↑↓', label: 'navigate' },
          { key: 'Enter', label: 'apply tag' },
          { key: 'q', label: 'back to customer' },
        ]} />
      )}>
        <Box flexDirection="column" width={Math.min(process.stdout.columns ?? 80, 72)}>
          <Header title={`Apply Tag: ${displayTitle}`} subtitle={agentName} showBack />
          {tagOptions.length > 0 ? (
            <SelectList
              items={tagOptions}
              onSelect={item => applyTag(item.value)}
              onCancel={() => setMode({ type: 'view' })}
            />
          ) : (
            <Text dimColor>No unapplied tags found for this Robin.</Text>
          )}
        </Box>
      </Screen>
    );
  }

  if (mode.type === 'edit-name' || mode.type === 'edit-notes') {
    const isName = mode.type === 'edit-name';
    return (
      <Screen footer={(
        <HelpBar bindings={[
          { key: 'Enter', label: 'save' },
          { key: 'Esc', label: 'cancel' },
        ]} />
      )}>
        <Header title={isName ? `Edit Name: ${displayTitle}` : `Edit Notes: ${displayTitle}`} subtitle={agentName} showBack />
        <Box marginTop={1}>
          <Box width={18} marginRight={2}>
            <Text color="cyan">{isName ? 'Name' : 'Notes'}</Text>
          </Box>
          <TextInput
            value={mode.value}
            onChange={value => setMode({ type: mode.type, value })}
            onSubmit={value => {
              const trimmed = value.trim();
              updateCustomer(
                isName ? { name: trimmed || displayTitle } : { notes: trimmed },
                isName ? 'Updated customer name.' : 'Updated customer notes.',
              );
            }}
            placeholder={isName ? 'Customer name' : 'Notes about this customer'}
            focus={!isConfirmingExit}
          />
        </Box>
      </Screen>
    );
  }

  if (mode.type === 'working') {
    return (
      <Screen>
        <Spinner message={mode.label} />
      </Screen>
    );
  }

  if (mode.type === 'success') {
    return (
      <Screen footer={<HelpBar bindings={[{ key: 'Enter/q', label: 'back to customer' }]} />}>
        <Header title={displayTitle} subtitle={agentName} showBack />
        <SuccessBox message={mode.message} />
      </Screen>
    );
  }

  if (mode.type === 'error') {
    return (
      <Screen footer={<HelpBar bindings={[{ key: 'q', label: 'back to customer' }]} />}>
        <Header title={displayTitle} subtitle={agentName} showBack />
        <ErrorBox message={mode.message} detail={mode.detail} />
      </Screen>
    );
  }

  return (
    <Screen footer={(
      <HelpBar bindings={[
        { key: 'c', label: 'conversations' },
        { key: 't', label: 'apply tag' },
        { key: 'e', label: 'edit name' },
        { key: 'n', label: 'edit notes' },
        { key: 'o', label: optedIn === true ? 'opt out' : 'opt in' },
        { key: 'q', label: 'back' },
      ]} />
    )}>
      <Header title={displayTitle} subtitle={agentName} showBack />

      <SectionLabel label="Identity" />
      <FieldRow label="Phone" value={phone} />
      <FieldRow label="External ID" value={externalId} />
      <FieldRow label="Opt-in" value={optInText} color={optInColor} />

      <SectionLabel label="Tags" />
      {tags.length > 0 ? (
        <FieldRow label="Applied" value={tags.join(', ')} />
      ) : (
        <Text dimColor>No tags applied.</Text>
      )}

      {(notes || welcomeMessage) && (
        <>
          <SectionLabel label="Context" />
          {notes && (
            <Box flexDirection="column">
              <Text dimColor>Notes</Text>
              <Box marginLeft={2} marginBottom={1}>
                <Text wrap="wrap">
                  {notes.length > valueWidth * 3
                    ? notes.slice(0, valueWidth * 3 - 1) + '…'
                    : notes}
                </Text>
              </Box>
            </Box>
          )}
          {welcomeMessage && (
            <Box flexDirection="column">
              <Text dimColor>Welcome message</Text>
              <Box marginLeft={2} marginBottom={1}>
                <Text wrap="wrap">
                  {welcomeMessage.length > valueWidth * 2
                    ? welcomeMessage.slice(0, valueWidth * 2 - 1) + '…'
                    : welcomeMessage}
                </Text>
              </Box>
            </Box>
          )}
        </>
      )}

      {!!(data.createdAt || data.updatedAt) && (
        <>
          <SectionLabel label="Timeline" />
          {!!data.createdAt && (
            <FieldRow label="Created" value={formatTimestamp(data.createdAt)} />
          )}
          {!!data.updatedAt && (
            <FieldRow label="Updated" value={formatTimestamp(data.updatedAt)} />
          )}
        </>
      )}

      {extras.length > 0 && (
        <>
          <SectionLabel label="Details" />
          {extras.map(([key, value]) => {
            const raw = value === null || value === undefined
              ? '—'
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
            const display = raw.length > valueWidth ? raw.slice(0, valueWidth - 1) + '…' : raw;
            return <FieldRow key={key} label={key} value={display} />;
          })}
        </>
      )}
    </Screen>
  );
}

function normalizeCustomerData(raw: Record<string, unknown>): Record<string, unknown> {
  // Unwrap { customer: { ... } } envelope if present
  if (
    raw.customer &&
    typeof raw.customer === 'object' &&
    !Array.isArray(raw.customer)
  ) {
    return raw.customer as Record<string, unknown>;
  }
  return raw;
}

export function CustomerDetail({
  customerId,
  customerName,
  agentId,
  agentName,
  client,
  onNavigate,
  onBack,
}: CustomerDetailProps): React.ReactElement {
  return (
    <AsyncView
      work={async (): Promise<CustomerDetailData> => {
        const [customer, tagResponse, tagsResponse] = await Promise.all([
          client.get<Record<string, unknown>>(`/customers/${customerId}`, { agentId }),
          client
            .get<CustomerTagsResponse>(`/customers/${customerId}/tags`, { agentId, limit: 100 })
            .catch((): CustomerTagsResponse => ({ data: [] })),
          client
            .get<TagsResponse>('/tags', { agentId, limit: 100 })
            .catch((): TagsResponse => ({ data: [] })),
        ]);
        const customerTags = Array.isArray(tagResponse.data)
          ? tagResponse.data
          : Array.isArray(tagResponse.tags)
            ? tagResponse.tags
            : [];
        const availableTags = Array.isArray(tagsResponse.data)
          ? tagsResponse.data
          : Array.isArray(tagsResponse.tags)
            ? tagsResponse.tags
            : [];
        return { customer, customerTags, availableTags };
      }}
      loadingMessage="Fetching customer…"
      onBack={onBack}
    >
      {({ customer: raw, customerTags, availableTags }) => {
        const data = normalizeCustomerData(raw);
        const title = (data.name as string | undefined)
          ?? customerName
          ?? customerId;
        return (
          <CustomerDossier
            initialData={data}
            initialCustomerTags={customerTags}
            availableTags={availableTags}
            title={title}
            agentId={agentId}
            agentName={agentName}
            customerId={customerId}
            client={client}
            onNavigate={onNavigate}
            onBack={onBack}
          />
        );
      }}
    </AsyncView>
  );
}
