import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useWindowSize } from '../../../hooks/useWindowSize.js';
import { Confirm } from '../../../components/Confirm.js';
import { ErrorBox } from '../../../components/ErrorBox.js';
import { Spinner } from '../../../components/Spinner.js';
import { Header } from '../components/Header.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { Screen } from '../components/Screen.js';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import { formatError } from '../../../client.js';
import type { RobinClient } from '../../../client.js';
import type { Route } from '../App.js';

const HANDLED_KEYS = new Set([
  'id', 'externalId', 'name', 'description', 'visibility', 'additionalKeywords', 'keywords',
  'welcomeMessage', 'createdAt', 'updatedAt',
]);

interface TagDetailProps {
  tagId: string;
  tagName?: string;
  agentId: string;
  agentName?: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

interface TagCountResponse {
  totalCount?: number;
  tagBreakdown?: Array<{ tagId: string; count: number }>;
}

interface TagDetailData {
  tag: Record<string, unknown>;
  customerCount?: number;
}

function formatTimestamp(value: unknown): string {
  if (!value || typeof value !== 'string') return '-';
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

function normalizeTagData(raw: Record<string, unknown>): Record<string, unknown> {
  if (
    raw.tag &&
    typeof raw.tag === 'object' &&
    !Array.isArray(raw.tag)
  ) {
    return raw.tag as Record<string, unknown>;
  }
  return raw;
}

function formatKeywords(value: unknown, fallback?: unknown): string {
  const keywordsValue = Array.isArray(value) ? value : fallback;
  if (!Array.isArray(keywordsValue)) return '-';
  const keywords = keywordsValue.map(item => String(item)).filter(Boolean);
  return keywords.length > 0 ? keywords.join(', ') : '-';
}

type DeletePhase = 'view' | 'confirm' | 'deleting' | 'error';

function TagDossier({
  data,
  title,
  tagId,
  customerCount,
  agentId,
  agentName,
  client,
  onNavigate,
  onBack,
}: {
  data: Record<string, unknown>;
  title: string;
  tagId: string;
  customerCount?: number;
  agentId: string;
  agentName?: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}): React.ReactElement {
  const [deletePhase, setDeletePhase] = useState<DeletePhase>('view');
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const { isConfirmingExit } = useExitConfirmation();
  const { columns } = useWindowSize();
  const valueWidth = Math.max(20, columns - 22);

  async function deleteTag() {
    setDeletePhase('deleting');
    setError(null);

    try {
      await client.delete<unknown>(`/tags/${tagId}`);
      onBack();
    } catch (err) {
      setError(formatError(err));
      setDeletePhase('error');
    }
  }

  useInput((input, key) => {
    if (isConfirmingExit || deletePhase !== 'view') return;
    if (key.escape || input === 'q') { onBack(); return; }
    if (input === 'e') {
      onNavigate({ type: 'tag-edit', tagId, tagName: title, agentId, agentName });
      return;
    }
    if (input === 'd') setDeletePhase('confirm');
  }, { isActive: !isConfirmingExit });

  useInput((input, key) => {
    if (deletePhase !== 'error') return;
    if (key.escape || input === 'q') setDeletePhase('view');
  }, { isActive: !isConfirmingExit });

  if (deletePhase === 'confirm') {
    return (
      <Screen footer={<HelpBar bindings={[{ key: 'y/n', label: 'confirm' }]} />}>
        <Header title={title} subtitle={agentName} showBack />
        <Confirm
          message={`Delete tag ${title}?`}
          onConfirm={deleteTag}
          onCancel={() => setDeletePhase('view')}
        />
      </Screen>
    );
  }

  if (deletePhase === 'deleting') {
    return (
      <Screen>
        <Spinner message="Deleting tag…" />
      </Screen>
    );
  }

  if (deletePhase === 'error') {
    return (
      <Screen footer={<HelpBar bindings={[{ key: 'q', label: 'back to tag' }]} />}>
        <Header title={title} subtitle={agentName} showBack />
        <ErrorBox message={error?.message ?? 'Delete failed'} detail={error?.detail} />
      </Screen>
    );
  }

  const description = typeof data.description === 'string' ? data.description : null;
  const welcomeMessage = typeof data.welcomeMessage === 'string' ? data.welcomeMessage : null;
  const extras = Object.entries(data).filter(([key]) => !HANDLED_KEYS.has(key));

  return (
    <Screen footer={(
      <HelpBar bindings={[
        { key: 'e', label: 'edit' },
        { key: 'd', label: 'delete' },
        { key: 'q', label: 'back' },
      ]} />
    )}>
      <Header title={title} subtitle={agentName} showBack />

      <SectionLabel label="Tag" />
      <FieldRow label="ID" value={String(data.id ?? data.externalId ?? tagId)} />
      <FieldRow label="Tag type" value={String(data.visibility ?? '-')} color="cyan" />
      <FieldRow label="Subscribe keywords" value={formatKeywords(data.additionalKeywords, data.keywords)} />
      <FieldRow
        label="Customers tagged"
        value={customerCount === undefined ? 'Unavailable' : String(customerCount)}
        color={customerCount && customerCount > 0 ? 'green' : undefined}
      />

      {(description || welcomeMessage) && (
        <>
          <SectionLabel label="Content" />
          {description && (
            <Box flexDirection="column">
              <Text dimColor>Description</Text>
              <Box marginLeft={2} marginBottom={1}>
                <Text wrap="wrap">
                  {description.length > valueWidth * 3
                    ? description.slice(0, valueWidth * 3 - 1) + '...'
                    : description}
                </Text>
              </Box>
            </Box>
          )}
          {welcomeMessage && (
            <Box flexDirection="column">
              <Text dimColor>Welcome message</Text>
              <Box marginLeft={2} marginBottom={1}>
                <Text wrap="wrap">
                  {welcomeMessage.length > valueWidth * 3
                    ? welcomeMessage.slice(0, valueWidth * 3 - 1) + '...'
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
              ? '-'
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
            const display = raw.length > valueWidth ? raw.slice(0, valueWidth - 1) + '...' : raw;
            return <FieldRow key={key} label={key} value={display} />;
          })}
        </>
      )}
    </Screen>
  );
}

export function TagDetail({
  tagId,
  tagName,
  agentId,
  agentName,
  client,
  onNavigate,
  onBack,
}: TagDetailProps): React.ReactElement {
  return (
    <AsyncView
      work={async (): Promise<TagDetailData> => {
        const [tag, counts] = await Promise.all([
          client.get<Record<string, unknown>>(`/tags/${tagId}`),
          client
            .get<TagCountResponse>(`/announcements/${agentId}/tag-counts`, { tagIds: [tagId] })
            .catch(() => undefined),
        ]);
        const customerCount = counts?.tagBreakdown?.find(item => item.tagId === tagId)?.count
          ?? counts?.totalCount;
        return { tag, customerCount };
      }}
      loadingMessage="Fetching tag…"
      onBack={onBack}
    >
      {({ tag: raw, customerCount }) => {
        const data = normalizeTagData(raw);
        const title = (data.name as string | undefined)
          ?? tagName
          ?? tagId;
        return (
          <TagDossier
            data={data}
            title={title}
            tagId={tagId}
            customerCount={customerCount}
            agentId={agentId}
            agentName={agentName}
            client={client}
            onNavigate={onNavigate}
            onBack={onBack}
          />
        );
      }}
    </AsyncView>
  );
}
