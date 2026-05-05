import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header } from '../components/Header.js';
import { SelectList, SelectItem } from '../components/SelectList.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { Screen } from '../components/Screen.js';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import { normalizeList } from '../../../utils.js';
import type { RobinClient } from '../../../client.js';
import type { Route } from '../App.js';

interface TagRow {
  id?: string;
  externalId?: string;
  name?: string;
  description?: string;
  visibility?: string;
  additionalKeywords?: unknown[];
  keywords?: unknown[];
}

interface TagsResponse {
  data?: TagRow[];
  tags?: TagRow[];
  hasMore?: boolean;
  cursor?: string;
  nextCursor?: string;
}

interface TagListProps {
  agentId: string;
  agentName: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

export function TagList({
  agentId,
  agentName,
  client,
  onNavigate,
  onBack,
}: TagListProps): React.ReactElement {
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors[pageIndex];

  return (
    <AsyncView
      key={cursor ?? 'first-page'}
      work={() => client.get<TagsResponse>('/tags', { agentId, startAfter: cursor })}
      loadingMessage="Fetching tags…"
      onBack={onBack}
    >
      {(data) => (
        <TagListPage
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

interface TagListPageProps {
  data: TagsResponse;
  agentId: string;
  agentName: string;
  pageIndex: number;
  canGoBack: boolean;
  onNext: (cursor: string) => void;
  onPrevious: () => void;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

function TagListPage({
  data,
  agentId,
  agentName,
  pageIndex,
  canGoBack,
  onNext,
  onPrevious,
  onNavigate,
  onBack,
}: TagListPageProps): React.ReactElement {
  const tags = normalizeList(data, 'tags') as TagRow[];
  const lastTag = tags[tags.length - 1];
  const nextCursor = data.cursor ?? data.nextCursor ?? lastTag?.id ?? lastTag?.externalId;
  const canGoNext = !!data.hasMore && !!nextCursor;
  const { isConfirmingExit } = useExitConfirmation();

  useInput((input, key) => {
    if (tags.length === 0 && (key.escape || input === 'q')) onBack();
    if (input === 'c') onNavigate({ type: 'tag-create', agentId, agentName });
    if (input === 'n' && canGoNext) onNext(nextCursor);
    if (input === 'p' && canGoBack) onPrevious();
  }, { isActive: !isConfirmingExit });

  const items: SelectItem<Route>[] = tags.map(tag => {
    const id = tag.id ?? tag.externalId ?? '';
    const keywords = Array.isArray(tag.additionalKeywords) ? tag.additionalKeywords : tag.keywords;
    const keywordCount = Array.isArray(keywords) ? keywords.length : 0;
    const hintParts: string[] = [];
    if (tag.visibility) hintParts.push(tag.visibility);
    if (keywordCount > 0) hintParts.push(`${keywordCount} keyword${keywordCount > 1 ? 's' : ''}`);

    return {
      id,
      label: tag.name ?? id,
      value: { type: 'tag-detail', tagId: id, tagName: tag.name, agentId, agentName } as Route,
      description: tag.description,
      hint: hintParts.length > 0 ? hintParts.join(' · ') : undefined,
    };
  });

  return (
    <Screen centerContent footer={(
      <HelpBar bindings={[
        { key: '↑↓', label: 'navigate' },
        { key: 'Enter', label: 'view tag' },
        { key: 'c', label: 'create tag' },
        ...(canGoBack ? [{ key: 'p', label: 'previous page' }] : []),
        ...(canGoNext ? [{ key: 'n', label: 'next page' }] : []),
        { key: 'q', label: 'back' },
      ]} />
    )}>
      <Box flexDirection="column" width={Math.min(process.stdout.columns ?? 80, 72)}>
        <Header title="Tags" subtitle={agentName} showBack />
        {tags.length === 0 ? (
          <Text dimColor>No tags found. Press c to create one.</Text>
        ) : (
          <SelectList
            items={items}
            onSelect={item => onNavigate(item.value)}
            onCancel={onBack}
          />
        )}
        <Text dimColor>
          Page {pageIndex + 1} · {tags.length} tag{tags.length !== 1 ? 's' : ''}
          {canGoNext ? ' · more on next page' : ''}
        </Text>
      </Box>
    </Screen>
  );
}
