import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useWindowSize } from '../../../hooks/useWindowSize.js';
import TextInput from 'ink-text-input';
import { Header } from '../components/Header.js';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { Screen } from '../components/Screen.js';
import { SelectList, SelectItem } from '../components/SelectList.js';
import { Confirm } from '../../../components/Confirm.js';
import { ErrorBox } from '../../../components/ErrorBox.js';
import { SuccessBox } from '../../../components/SuccessBox.js';
import { Spinner } from '../../../components/Spinner.js';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import { formatError } from '../../../client.js';
import type { RobinClient } from '../../../client.js';
import { normalizeList } from '../../../utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnnouncementDTO {
  id?: string;
  externalId?: string;
  title?: string;
  content?: string;
  sendAt?: string;
  status?: string;
  tagIds?: string[];
  tags?: Array<{ id?: string; name?: string }>;
  recipientCount?: number;
  creator?: { id?: string; name?: string | null };
}

interface TagRow {
  id?: string;
  externalId?: string;
  name?: string;
  description?: string;
}

interface AnnouncementsListResponse {
  announcements?: AnnouncementDTO[];
  data?: AnnouncementDTO[];
}

interface TagsResponse {
  data?: TagRow[];
  tags?: TagRow[];
}

interface TagCountResponse {
  totalCount?: number;
  tagBreakdown?: Array<{ tagId: string; count: number }>;
}

export interface AnnouncementScreenProps {
  agentId: string;
  agentName: string;
  client: RobinClient;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function announcementId(a: AnnouncementDTO): string {
  return a.id ?? a.externalId ?? '';
}

function formatSendAt(sendAt: string | undefined): string {
  if (!sendAt) return '—';
  try {
    return new Date(sendAt).toLocaleString();
  } catch {
    return sendAt;
  }
}

function statusLabel(status: string | undefined): string {
  if (!status) return '?';
  const lower = status.toLowerCase();
  if (lower === 'sent') return 'Sent';
  if (lower === 'scheduled') return 'Scheduled';
  return status;
}

function statusColor(status: string | undefined): string {
  const lower = (status ?? '').toLowerCase();
  if (lower === 'sent') return 'green';
  if (lower === 'scheduled') return 'cyan';
  return 'yellow';
}

function isSent(a: AnnouncementDTO): boolean {
  return (a.status ?? '').toLowerCase() === 'sent';
}

// ---------------------------------------------------------------------------
// Screen mode
// ---------------------------------------------------------------------------

type TabMode = 'scheduled' | 'history';

type ScreenMode =
  | { type: 'list'; tab: TabMode }
  | { type: 'create' }
  | { type: 'edit'; announcement: AnnouncementDTO }
  | { type: 'confirm-delete'; announcement: AnnouncementDTO };

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function AnnouncementScreen({
  agentId,
  agentName,
  client,
  onBack,
}: AnnouncementScreenProps): React.ReactElement {
  return (
    <AsyncView
      work={async () => {
        const [announcementsRaw, tagsRaw] = await Promise.all([
          client.get<AnnouncementsListResponse>(`/announcements/${agentId}`),
          client.get<TagsResponse>('/tags', { agentId }).catch(() => ({ tags: [] })),
        ]);
        const announcements = (
          normalizeList(announcementsRaw, 'announcements') as AnnouncementDTO[]
        );
        const tags = normalizeList(tagsRaw, 'tags') as TagRow[];
        return { announcements, tags };
      }}
      loadingMessage="Fetching announcements…"
      onBack={onBack}
    >
      {({ announcements, tags }) => (
        <AnnouncementManager
          initialAnnouncements={announcements}
          availableTags={tags}
          agentId={agentId}
          agentName={agentName}
          client={client}
          onBack={onBack}
        />
      )}
    </AsyncView>
  );
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

function AnnouncementManager({
  initialAnnouncements,
  availableTags,
  agentId,
  agentName,
  client,
  onBack,
}: {
  initialAnnouncements: AnnouncementDTO[];
  availableTags: TagRow[];
  agentId: string;
  agentName: string;
  client: RobinClient;
  onBack: () => void;
}): React.ReactElement {
  const [announcements, setAnnouncements] = useState<AnnouncementDTO[]>(initialAnnouncements);
  const [mode, setMode] = useState<ScreenMode>({ type: 'list', tab: 'scheduled' });

  const handleCreated = useCallback((created: AnnouncementDTO) => {
    setAnnouncements(prev => [created, ...prev]);
    setMode({ type: 'list', tab: 'scheduled' });
  }, []);

  const handleUpdated = useCallback((updated: AnnouncementDTO) => {
    const id = announcementId(updated);
    setAnnouncements(prev => prev.map(a => announcementId(a) === id ? updated : a));
    setMode({ type: 'list', tab: 'scheduled' });
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setAnnouncements(prev => prev.filter(a => announcementId(a) !== id));
    setMode({ type: 'list', tab: 'scheduled' });
  }, []);

  if (mode.type === 'list') {
    return (
      <AnnouncementList
        announcements={announcements}
        tab={mode.tab}
        agentName={agentName}
        onSwitchTab={(tab) => setMode({ type: 'list', tab })}
        onCreate={() => setMode({ type: 'create' })}
        onEdit={(a) => setMode({ type: 'edit', announcement: a })}
        onDeleteRequest={(a) => setMode({ type: 'confirm-delete', announcement: a })}
        onBack={onBack}
      />
    );
  }

  if (mode.type === 'confirm-delete') {
    const target = mode.announcement;
    return (
      <DeleteConfirm
        announcement={target}
        agentName={agentName}
        client={client}
        onDeleted={() => handleDeleted(announcementId(target))}
        onCancel={() => setMode({ type: 'list', tab: 'scheduled' })}
      />
    );
  }

  return (
    <AnnouncementForm
      mode={mode.type}
      editingAnnouncement={mode.type === 'edit' ? mode.announcement : undefined}
      availableTags={availableTags}
      agentId={agentId}
      agentName={agentName}
      client={client}
      onCreated={handleCreated}
      onUpdated={handleUpdated}
      onBack={() => setMode({ type: 'list', tab: mode.type === 'edit' ? 'scheduled' : 'scheduled' })}
    />
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function AnnouncementList({
  announcements,
  tab,
  agentName,
  onSwitchTab,
  onCreate,
  onEdit,
  onDeleteRequest,
  onBack,
}: {
  announcements: AnnouncementDTO[];
  tab: TabMode;
  agentName: string;
  onSwitchTab: (tab: TabMode) => void;
  onCreate: () => void;
  onEdit: (a: AnnouncementDTO) => void;
  onDeleteRequest: (a: AnnouncementDTO) => void;
  onBack: () => void;
}): React.ReactElement {
  const [cursor, setCursor] = useState(0);
  const { isConfirmingExit } = useExitConfirmation();
  const { columns } = useWindowSize();

  const filtered = announcements.filter(a =>
    tab === 'history' ? isSent(a) : !isSent(a),
  );

  const clampedCursor = Math.min(cursor, Math.max(0, filtered.length - 1));

  useEffect(() => {
    setCursor(0);
  }, [tab]);

  useInput((input, key) => {
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(Math.max(0, filtered.length - 1), c + 1));
    if (input === 'c') { onCreate(); return; }
    if (input === 's') { onSwitchTab('scheduled'); return; }
    if (input === 'h') { onSwitchTab('history'); return; }
    if (key.escape || input === 'q') { onBack(); return; }

    const selected = filtered[clampedCursor];
    if (!selected) return;

    if (input === 'e' && !isSent(selected)) { onEdit(selected); return; }
    if (input === 'd' && !isSent(selected)) { onDeleteRequest(selected); return; }
  }, { isActive: !isConfirmingExit });

  const scheduledCount = announcements.filter(a => !isSent(a)).length;
  const historyCount = announcements.filter(a => isSent(a)).length;

  const tabLabel = (t: TabMode, count: number, key: string): string =>
    `${key}:${t === tab ? '[' : ' '}${t === 'scheduled' ? 'Scheduled' : 'History'}(${count})${t === tab ? ']' : ' '}`;

  const listWidth = Math.min(Math.max(60, columns - 4), 88);

  const selected = filtered[clampedCursor];

  return (
    <Screen footer={(
      <HelpBar bindings={[
        { key: 'c', label: 'create' },
        ...(tab === 'scheduled' ? [{ key: 'h', label: 'history' }] : [{ key: 's', label: 'scheduled' }]),
        ...(selected && !isSent(selected) ? [{ key: 'e', label: 'edit' }, { key: 'd', label: 'delete' }] : []),
        { key: '↑↓', label: 'navigate' },
        { key: 'q', label: 'back' },
      ]} />
    )}>
      <Box flexDirection="column" width={listWidth}>
        <Header title="Announcements" subtitle={agentName} showBack />

        {/* Tab bar */}
        <Box marginBottom={1}>
          <Text color={tab === 'scheduled' ? 'cyan' : 'gray'} bold={tab === 'scheduled'}>
            {tabLabel('scheduled', scheduledCount, 's')}
          </Text>
          <Text>  </Text>
          <Text color={tab === 'history' ? 'cyan' : 'gray'} bold={tab === 'history'}>
            {tabLabel('history', historyCount, 'h')}
          </Text>
        </Box>

        {filtered.length === 0 ? (
          <Box flexDirection="column">
            <Text dimColor>
              {tab === 'scheduled'
                ? 'No announcements scheduled. Press c to create one.'
                : 'No announcements have been sent yet.'}
            </Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {/* Column headers */}
            <Box marginBottom={0}>
              <Box width={Math.max(20, listWidth - 48)}><Text dimColor bold>Title</Text></Box>
              <Box width={18}><Text dimColor bold>Send time</Text></Box>
              <Box width={12}><Text dimColor bold>Status</Text></Box>
              <Box width={10}><Text dimColor bold>Recipients</Text></Box>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>{'─'.repeat(listWidth - 2)}</Text>
            </Box>

            {filtered.map((a, i) => {
              const isActive = i === clampedCursor;
              const id = announcementId(a);
              const title = a.title ?? a.content?.slice(0, 30) ?? id;
              const tagNames = (a.tags ?? []).map(t => t.name ?? '').filter(Boolean);
              const titleDisplay = title.length > (listWidth - 48)
                ? title.slice(0, listWidth - 51) + '…'
                : title;
              const titleWidth = Math.max(20, listWidth - 48);

              return (
                <Box key={id || i} flexDirection="column">
                  <Box>
                    <Box width={titleWidth}>
                      <Text bold={isActive} color={isActive ? 'cyan' : undefined}>
                        {isActive ? '> ' : '  '}{titleDisplay}
                      </Text>
                    </Box>
                    <Box width={18}>
                      <Text dimColor={!isActive}>{formatSendAt(a.sendAt)}</Text>
                    </Box>
                    <Box width={12}>
                      <Text color={statusColor(a.status)} bold={isActive}>
                        {statusLabel(a.status)}
                      </Text>
                    </Box>
                    <Box width={10}>
                      <Text dimColor={!isActive}>
                        {a.recipientCount !== undefined ? String(a.recipientCount) : '—'}
                      </Text>
                    </Box>
                  </Box>
                  {isActive && tagNames.length > 0 && (
                    <Box marginLeft={2}>
                      <Text dimColor>Tags: {tagNames.join(', ')}</Text>
                    </Box>
                  )}
                  {isActive && a.content && (
                    <Box marginLeft={2} width={listWidth - 4}>
                      <Text dimColor wrap="wrap">
                        {a.content.length > 120 ? a.content.slice(0, 117) + '…' : a.content}
                      </Text>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm
// ---------------------------------------------------------------------------

function DeleteConfirm({
  announcement,
  agentName,
  client,
  onDeleted,
  onCancel,
}: {
  announcement: AnnouncementDTO;
  agentName: string;
  client: RobinClient;
  onDeleted: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const [phase, setPhase] = useState<'confirm' | 'deleting' | 'error'>('confirm');
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);

  async function doDelete() {
    setPhase('deleting');
    try {
      await client.delete(`/announcements/${announcementId(announcement)}`);
      onDeleted();
    } catch (err) {
      setError(formatError(err));
      setPhase('error');
    }
  }

  const title = announcement.title ?? 'this announcement';

  if (phase === 'deleting') {
    return (
      <Screen>
        <Spinner message="Deleting announcement…" />
      </Screen>
    );
  }

  if (phase === 'error') {
    return (
      <Screen footer={<HelpBar bindings={[{ key: 'q', label: 'back' }]} />}>
        <Header title="Delete Announcement" subtitle={agentName} showBack />
        <ErrorBox message={error?.message ?? 'Delete failed'} detail={error?.detail} />
      </Screen>
    );
  }

  return (
    <Screen footer={<HelpBar bindings={[{ key: 'y/n', label: 'confirm' }]} />}>
      <Header title="Delete Announcement" subtitle={agentName} showBack />
      <Confirm
        message={`Delete "${title}"?`}
        onConfirm={doDelete}
        onCancel={onCancel}
      />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Create / edit form
// ---------------------------------------------------------------------------

type FormStep =
  | 'audience'
  | 'content'
  | 'send-mode'
  | 'send-time'
  | 'confirm';

type SendMode = 'now' | 'schedule';

type SubmitPhase = 'idle' | 'submitting' | 'success' | 'error';

function AnnouncementForm({
  mode,
  editingAnnouncement,
  availableTags,
  agentId,
  agentName,
  client,
  onCreated,
  onUpdated,
  onBack,
}: {
  mode: 'create' | 'edit';
  editingAnnouncement?: AnnouncementDTO;
  availableTags: TagRow[];
  agentId: string;
  agentName: string;
  client: RobinClient;
  onCreated: (a: AnnouncementDTO) => void;
  onUpdated: (a: AnnouncementDTO) => void;
  onBack: () => void;
}): React.ReactElement {
  const isEdit = mode === 'edit' && !!editingAnnouncement;

  // Derive initial values from the editing announcement when present
  const initialContent = isEdit ? (editingAnnouncement?.content ?? '') : '';
  const initialSendAt = isEdit && editingAnnouncement?.sendAt
    ? editingAnnouncement.sendAt
    : '';
  const initialSendMode: SendMode = isEdit && editingAnnouncement?.sendAt
    ? (new Date(editingAnnouncement.sendAt) > new Date() ? 'schedule' : 'now')
    : 'now';
  const initialTagIds = isEdit ? (editingAnnouncement?.tagIds ?? []) : [];

  const [step, setStep] = useState<FormStep>('audience');
  const [content, setContent] = useState(initialContent);
  const [sendMode, setSendMode] = useState<SendMode>(initialSendMode);
  // ISO string input for scheduled send
  const [sendTimeInput, setSendTimeInput] = useState(
    initialSendMode === 'schedule' && initialSendAt
      ? formatLocalDateTimeForInput(initialSendAt)
      : getDefaultScheduleTime(),
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [tagSearchInput, setTagSearchInput] = useState('');

  const [tagCount, setTagCount] = useState<number | null>(null);
  const [isLoadingTagCount, setIsLoadingTagCount] = useState(false);

  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [submitError, setSubmitError] = useState<{ message: string; detail?: string } | null>(null);

  const { isConfirmingExit } = useExitConfirmation();

  // Fetch tag counts when tags change
  useEffect(() => {
    if (selectedTagIds.length === 0) {
      setTagCount(null);
      return;
    }
    setIsLoadingTagCount(true);
    client
      .get<TagCountResponse>(`/announcements/${agentId}/tag-counts`, {
        tagIds: selectedTagIds,
      })
      .then(res => {
        if (res?.tagBreakdown && res.tagBreakdown.length > 0) {
          const total = res.tagBreakdown
            .filter(b => selectedTagIds.includes(b.tagId))
            .reduce((sum, b) => sum + b.count, 0);
          setTagCount(total);
        } else {
          setTagCount(res?.totalCount ?? null);
        }
      })
      .catch(() => setTagCount(null))
      .finally(() => setIsLoadingTagCount(false));
  }, [selectedTagIds, agentId, client]);

  const resolvedSendAt = sendMode === 'now'
    ? new Date().toISOString()
    : parseLocalDateTimeInput(sendTimeInput);

  const selectedTagObjects = availableTags.filter(t =>
    selectedTagIds.includes(t.id ?? t.externalId ?? ''),
  );

  async function submit() {
    setSubmitPhase('submitting');
    setSubmitError(null);
    try {
      const sendAt = resolvedSendAt;
      if (isEdit && editingAnnouncement) {
        const updated = await client.patch<AnnouncementDTO>(
          `/announcements/${announcementId(editingAnnouncement)}`,
          {
            content: content.trim(),
            sendAt,
            tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          },
        );
        setSubmitPhase('success');
        setTimeout(() => onUpdated(updated), 1000);
      } else {
        const title = deriveTitle(content);
        const created = await client.post<AnnouncementDTO>(`/announcements/${agentId}`, {
          title,
          content: content.trim(),
          sendAt,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        });
        setSubmitPhase('success');
        setTimeout(() => onCreated(created), 1000);
      }
    } catch (err) {
      setSubmitError(formatError(err));
      setSubmitPhase('error');
    }
  }

  // Navigation between steps
  function advance() {
    switch (step) {
      case 'audience':
        setStep('content');
        break;
      case 'content':
        if (!content.trim()) return;
        setStep('send-mode');
        break;
      case 'send-mode':
        setStep(sendMode === 'schedule' ? 'send-time' : 'confirm');
        break;
      case 'send-time':
        if (!parseLocalDateTimeInput(sendTimeInput)) return;
        setStep('confirm');
        break;
      case 'confirm':
        submit();
        break;
    }
  }

  function goBack() {
    switch (step) {
      case 'audience': onBack(); break;
      case 'content': setStep('audience'); break;
      case 'send-mode': setStep('content'); break;
      case 'send-time': setStep('send-mode'); break;
      case 'confirm': setStep(sendMode === 'schedule' ? 'send-time' : 'send-mode'); break;
    }
  }

  if (submitPhase === 'submitting') {
    return (
      <Screen>
        <Spinner message={isEdit ? 'Updating announcement…' : 'Creating announcement…'} />
      </Screen>
    );
  }

  if (submitPhase === 'success') {
    return (
      <Screen>
        <SuccessBox message={isEdit ? 'Announcement updated.' : 'Announcement scheduled.'} />
      </Screen>
    );
  }

  if (submitPhase === 'error') {
    return (
      <Screen footer={<HelpBar bindings={[{ key: 'q', label: 'back to form' }]} />}>
        <Header
          title={isEdit ? 'Edit Announcement' : 'Create Announcement'}
          subtitle={agentName}
          showBack
        />
        <ErrorBox
          message={submitError?.message ?? 'Failed'}
          detail={submitError?.detail}
        />
        <Box marginTop={1}>
          <Text dimColor>Press q to go back to the form.</Text>
        </Box>
      </Screen>
    );
  }

  const formTitle = isEdit ? 'Edit Announcement' : 'Create Announcement';

  return (
    <Screen footer={(
      <HelpBar bindings={[
        ...(step !== 'audience' ? [{ key: 'Enter', label: step === 'confirm' ? 'send' : 'next' }] : []),
        { key: 'Esc', label: step === 'audience' ? 'cancel' : 'back' },
      ]} />
    )}>
      <Header title={formTitle} subtitle={agentName} showBack />
      <FormStep
        step={step}
        content={content}
        sendMode={sendMode}
        sendTimeInput={sendTimeInput}
        selectedTagIds={selectedTagIds}
        selectedTagObjects={selectedTagObjects}
        tagSearchInput={tagSearchInput}
        availableTags={availableTags}
        tagCount={tagCount}
        isLoadingTagCount={isLoadingTagCount}
        resolvedSendAt={resolvedSendAt}
        isConfirmingExit={isConfirmingExit}
        isEdit={isEdit}
        onContentChange={setContent}
        onSendModeChange={setSendMode}
        onSendTimeInputChange={setSendTimeInput}
        onTagSearchChange={setTagSearchInput}
        onTagAdd={(id) => {
          setSelectedTagIds(prev => prev.includes(id) ? prev : [...prev, id]);
          setTagSearchInput('');
        }}
        onTagRemove={(id) => setSelectedTagIds(prev => prev.filter(t => t !== id))}
        onClearTags={() => setSelectedTagIds([])}
        onAdvance={advance}
        onBack={goBack}
      />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Form step renderer
// ---------------------------------------------------------------------------

function FormStep({
  step,
  content,
  sendMode,
  sendTimeInput,
  selectedTagIds,
  selectedTagObjects,
  tagSearchInput,
  availableTags,
  tagCount,
  isLoadingTagCount,
  resolvedSendAt,
  isConfirmingExit,
  isEdit,
  onContentChange,
  onSendModeChange,
  onSendTimeInputChange,
  onTagSearchChange,
  onTagAdd,
  onTagRemove,
  onClearTags,
  onAdvance,
  onBack,
}: {
  step: FormStep;
  content: string;
  sendMode: SendMode;
  sendTimeInput: string;
  selectedTagIds: string[];
  selectedTagObjects: TagRow[];
  tagSearchInput: string;
  availableTags: TagRow[];
  tagCount: number | null;
  isLoadingTagCount: boolean;
  resolvedSendAt: string | null;
  isConfirmingExit: boolean;
  isEdit: boolean;
  onContentChange: (v: string) => void;
  onSendModeChange: (v: SendMode) => void;
  onSendTimeInputChange: (v: string) => void;
  onTagSearchChange: (v: string) => void;
  onTagAdd: (id: string) => void;
  onTagRemove: (id: string) => void;
  onClearTags: () => void;
  onAdvance: () => void;
  onBack: () => void;
}): React.ReactElement {
  const { columns } = useWindowSize();
  const panelWidth = Math.min(Math.max(56, columns - 6), 84);

  if (step === 'audience') {
    return (
      <AudienceStep
        selectedTagIds={selectedTagIds}
        selectedTagObjects={selectedTagObjects}
        tagSearchInput={tagSearchInput}
        availableTags={availableTags}
        tagCount={tagCount}
        isLoadingTagCount={isLoadingTagCount}
        isConfirmingExit={isConfirmingExit}
        onSearchChange={onTagSearchChange}
        onTagAdd={onTagAdd}
        onTagRemove={onTagRemove}
        onClearTags={onClearTags}
        onAdvance={onAdvance}
        onBack={onBack}
      />
    );
  }

  if (step === 'content') {
    return (
      <ContentStep
        content={content}
        panelWidth={panelWidth}
        isConfirmingExit={isConfirmingExit}
        onChange={onContentChange}
        onAdvance={onAdvance}
        onBack={onBack}
      />
    );
  }

  if (step === 'send-mode') {
    return (
      <SendModeStep
        sendMode={sendMode}
        isConfirmingExit={isConfirmingExit}
        onChange={onSendModeChange}
        onAdvance={onAdvance}
        onBack={onBack}
      />
    );
  }

  if (step === 'send-time') {
    return (
      <SendTimeStep
        sendTimeInput={sendTimeInput}
        isConfirmingExit={isConfirmingExit}
        onChange={onSendTimeInputChange}
        onAdvance={onAdvance}
        onBack={onBack}
      />
    );
  }

  // Confirm step
  return (
    <ConfirmStep
      content={content}
      sendMode={sendMode}
      resolvedSendAt={resolvedSendAt}
      selectedTagObjects={selectedTagObjects}
      tagCount={tagCount}
      isLoadingTagCount={isLoadingTagCount}
      isEdit={isEdit}
      isConfirmingExit={isConfirmingExit}
      panelWidth={panelWidth}
      onAdvance={onAdvance}
      onBack={onBack}
    />
  );
}

// ---------------------------------------------------------------------------
// Step: content
// ---------------------------------------------------------------------------

function ContentStep({
  content,
  panelWidth,
  isConfirmingExit,
  onChange,
  onAdvance,
  onBack,
}: {
  content: string;
  panelWidth: number;
  isConfirmingExit: boolean;
  onChange: (v: string) => void;
  onAdvance: () => void;
  onBack: () => void;
}): React.ReactElement {
  const charCount = content.length;
  const tooLong = charCount > 1600;

  useInput((_input, key) => {
    if (key.escape) { onBack(); return; }
  }, { isActive: !isConfirmingExit });

  return (
    <Box flexDirection="column" width={panelWidth}>
      <StepLabel label="Step 1 of 4" />
      <Box marginBottom={1}>
        <Text bold color="cyan">Message</Text>
        <Text dimColor> · SMS announcement text</Text>
      </Box>
      <Box
        borderStyle="round"
        borderColor={tooLong ? 'red' : 'cyan'}
        paddingX={1}
        paddingY={0}
        width={panelWidth}
      >
        <Box flexDirection="column" width={panelWidth - 4}>
          <TextInput
            value={content}
            onChange={onChange}
            onSubmit={onAdvance}
            placeholder="Enter announcement message…"
            focus={!isConfirmingExit}
          />
        </Box>
      </Box>
      <Box justifyContent="flex-end" marginTop={0}>
        <Text color={tooLong ? 'red' : 'gray'}>{charCount} chars</Text>
        {tooLong && <Text color="red"> (exceeds 1600)</Text>}
      </Box>
      {!content.trim() && (
        <Text dimColor>Message is required. Type your announcement and press Enter.</Text>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Step: send mode
// ---------------------------------------------------------------------------

const SEND_MODES: SendMode[] = ['now', 'schedule'];
const SEND_MODE_LABELS: Record<SendMode, { label: string; description: string }> = {
  now: { label: 'Send now', description: 'Send immediately to opted-in contacts.' },
  schedule: { label: 'Schedule', description: 'Pick a future date and time to send.' },
};

function SendModeStep({
  sendMode,
  isConfirmingExit,
  onChange,
  onAdvance,
  onBack,
}: {
  sendMode: SendMode;
  isConfirmingExit: boolean;
  onChange: (v: SendMode) => void;
  onAdvance: () => void;
  onBack: () => void;
}): React.ReactElement {
  const items: SelectItem<SendMode>[] = SEND_MODES.map(m => ({
    id: m,
    label: SEND_MODE_LABELS[m].label,
    description: SEND_MODE_LABELS[m].description,
    value: m,
  }));

  return (
    <Box flexDirection="column">
      <StepLabel label="Step 2 of 4" />
      <Box marginBottom={1}>
        <Text bold color="cyan">Timing</Text>
        <Text dimColor> · When should this send?</Text>
      </Box>
      <SelectList
        items={items}
        onSelect={(item) => {
          onChange(item.value);
          onAdvance();
        }}
        onCancel={onBack}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Step: send time input
// ---------------------------------------------------------------------------

function SendTimeStep({
  sendTimeInput,
  isConfirmingExit,
  onChange,
  onAdvance,
  onBack,
}: {
  sendTimeInput: string;
  isConfirmingExit: boolean;
  onChange: (v: string) => void;
  onAdvance: () => void;
  onBack: () => void;
}): React.ReactElement {
  const parsed = parseLocalDateTimeInput(sendTimeInput);
  const isValid = !!parsed && new Date(parsed) > new Date();
  const isPast = !!parsed && new Date(parsed) <= new Date();

  useInput((_input, key) => {
    if (key.escape) { onBack(); return; }
  }, { isActive: !isConfirmingExit });

  return (
    <Box flexDirection="column">
      <StepLabel label="Step 3 of 4" />
      <Box marginBottom={1}>
        <Text bold color="cyan">Send time</Text>
        <Text dimColor> · Enter a future date and time</Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>Format: </Text>
        <Text color="yellow">YYYY-MM-DD HH:MM</Text>
        <Text dimColor> (local time, 24h)</Text>
      </Box>
      <Box>
        <Text color="cyan" bold>{'> '}</Text>
        <TextInput
          value={sendTimeInput}
          onChange={onChange}
          onSubmit={() => { if (isValid) onAdvance(); }}
          placeholder="2026-05-10 09:00"
          focus={!isConfirmingExit}
        />
      </Box>
      {sendTimeInput && !parsed && (
        <Text color="red">Invalid format. Use YYYY-MM-DD HH:MM</Text>
      )}
      {isPast && (
        <Text color="red">Send time must be in the future.</Text>
      )}
      {isValid && parsed && (
        <Box marginTop={1}>
          <Text dimColor>ISO: </Text>
          <Text color="green">{parsed}</Text>
        </Box>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Step: audience (step 1)
// ---------------------------------------------------------------------------

// The list items the cursor can move over: a special "everyone" sentinel,
// a "continue" item (shown when tags are selected), and one item per tag.
type AudienceItem =
  | { kind: 'everyone' }
  | { kind: 'continue'; count: number }
  | { kind: 'tag'; tag: TagRow };

function AudienceStep({
  selectedTagIds,
  selectedTagObjects,
  tagSearchInput,
  availableTags,
  tagCount,
  isLoadingTagCount,
  isConfirmingExit,
  onSearchChange,
  onTagAdd,
  onTagRemove,
  onClearTags,
  onAdvance,
  onBack,
}: {
  selectedTagIds: string[];
  selectedTagObjects: TagRow[];
  tagSearchInput: string;
  availableTags: TagRow[];
  tagCount: number | null;
  isLoadingTagCount: boolean;
  isConfirmingExit: boolean;
  onSearchChange: (v: string) => void;
  onTagAdd: (id: string) => void;
  onTagRemove: (id: string) => void;
  onClearTags: () => void;
  onAdvance: () => void;
  onBack: () => void;
}): React.ReactElement {
  // Build the browseable list: "Everyone" first, then a "Continue" shortcut
  // when tags are selected, then filtered/all tags.
  const filteredTags = tagSearchInput.trim()
    ? availableTags.filter(t =>
        (t.name ?? '').toLowerCase().includes(tagSearchInput.toLowerCase()),
      )
    : availableTags;

  const items: AudienceItem[] = [
    { kind: 'everyone' },
    ...(selectedTagIds.length > 0
      ? [{ kind: 'continue' as const, count: selectedTagIds.length }]
      : []),
    ...filteredTags.map(tag => ({ kind: 'tag' as const, tag })),
  ];

  const [cursor, setCursor] = useState(0);
  const clampedCursor = Math.min(cursor, Math.max(0, items.length - 1));

  // Reset cursor to 0 when search text changes
  useEffect(() => { setCursor(0); }, [tagSearchInput]);

  useInput((_input, key) => {
    if (key.escape) { onBack(); return; }
    if (key.upArrow) { setCursor(c => Math.max(0, c - 1)); return; }
    if (key.downArrow) { setCursor(c => Math.min(items.length - 1, c + 1)); return; }
    if (key.return) {
      const item = items[clampedCursor];
      if (!item) return;
      if (item.kind === 'everyone') {
        onClearTags();
        onAdvance();
        return;
      }
      if (item.kind === 'continue') {
        onAdvance();
        return;
      }
      // Tag item: toggle selection
      const id = item.tag.id ?? item.tag.externalId ?? '';
      if (selectedTagIds.includes(id)) {
        onTagRemove(id);
      } else {
        onTagAdd(id);
      }
      return;
    }
  }, { isActive: !isConfirmingExit });

  const audienceText = isLoadingTagCount
    ? 'counting…'
    : selectedTagIds.length === 0
      ? 'all opted-in subscribers'
      : tagCount !== null
        ? `~${tagCount} recipients`
        : `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selected`;

  return (
    <Box flexDirection="column">
      <StepLabel label="Step 1 of 4" />
      <Box marginBottom={1}>
        <Text bold color="cyan">Who should receive this?</Text>
      </Box>


      {/* Search filter */}
      <Box marginBottom={1}>
        <Text dimColor>Filter: </Text>
        <TextInput
          value={tagSearchInput}
          onChange={(v) => { onSearchChange(v); }}
          onSubmit={() => {
            const item = items[clampedCursor];
            if (!item) return;
            if (item.kind === 'everyone') {
              onClearTags();
              onAdvance();
            } else if (item.kind === 'continue') {
              onAdvance();
            } else {
              const id = item.tag.id ?? item.tag.externalId ?? '';
              if (selectedTagIds.includes(id)) {
                onTagRemove(id);
              } else {
                onTagAdd(id);
              }
            }
          }}
          placeholder="type to filter tags…"
          focus={!isConfirmingExit}
        />
      </Box>

      {/* Audience list */}
      <Box flexDirection="column">
        {items.map((item, i) => {
          const isActive = i === clampedCursor;
          if (item.kind === 'everyone') {
            const everyoneSelected = selectedTagIds.length === 0;
            return (
              <Box key="everyone">
                <Text color={isActive ? 'cyan' : everyoneSelected ? 'green' : 'gray'} bold={isActive || everyoneSelected}>
                  {isActive ? '> ' : '  '}
                  {everyoneSelected ? '● ' : '○ '}
                  Everyone
                </Text>
                <Text dimColor> · send to all opted-in subscribers</Text>
              </Box>
            );
          }
          if (item.kind === 'continue') {
            return (
              <Box key="continue" marginTop={0}>
                <Text color={isActive ? 'yellow' : 'gray'} bold={isActive}>
                  {isActive ? '> ' : '  '}
                  {'→ '}Continue with {item.count} tag{item.count > 1 ? 's' : ''}
                </Text>
              </Box>
            );
          }
          const id = item.tag.id ?? item.tag.externalId ?? '';
          const isSelected = selectedTagIds.includes(id);
          return (
            <Box key={id}>
              <Text color={isActive ? 'cyan' : isSelected ? 'green' : 'gray'} bold={isActive || isSelected}>
                {isActive ? '> ' : '  '}
                {isSelected ? '● ' : '○ '}
                {item.tag.name ?? id}
              </Text>
              {(item.tag.description) && (
                <Text dimColor> · {item.tag.description}</Text>
              )}
            </Box>
          );
        })}
        {filteredTags.length === 0 && tagSearchInput.trim() && (
          <Text dimColor>  No tags match "{tagSearchInput}"</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Audience: </Text>
        <Text color={isLoadingTagCount ? 'yellow' : selectedTagIds.length > 0 ? 'cyan' : 'green'}>
          {audienceText}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>↑↓: navigate · Enter: select/deselect · Esc: back</Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Step: confirm
// ---------------------------------------------------------------------------

function ConfirmStep({
  content,
  sendMode,
  resolvedSendAt,
  selectedTagObjects,
  tagCount,
  isLoadingTagCount,
  isEdit,
  isConfirmingExit,
  panelWidth,
  onAdvance,
  onBack,
}: {
  content: string;
  sendMode: SendMode;
  resolvedSendAt: string | null;
  selectedTagObjects: TagRow[];
  tagCount: number | null;
  isLoadingTagCount: boolean;
  isEdit: boolean;
  isConfirmingExit: boolean;
  panelWidth: number;
  onAdvance: () => void;
  onBack: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.escape) { onBack(); return; }
    if (key.return) { onAdvance(); return; }
  }, { isActive: !isConfirmingExit });

  const audienceDesc = selectedTagObjects.length > 0
    ? selectedTagObjects.map(t => t.name ?? t.id ?? '').join(', ')
    : 'all opted-in subscribers';

  const recipientText = isLoadingTagCount
    ? 'counting…'
    : tagCount !== null
      ? `~${tagCount}`
      : selectedTagObjects.length === 0
        ? 'all opted-in'
        : 'unknown';

  const sendAtDisplay = sendMode === 'now'
    ? 'Immediately'
    : resolvedSendAt
      ? `${new Date(resolvedSendAt).toLocaleString()} · ISO: ${resolvedSendAt}`
      : '—';

  return (
    <Box flexDirection="column" width={panelWidth}>
      <StepLabel label="Confirm — press Enter to schedule" />
      <Box
        borderStyle="round"
        borderColor="yellow"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={panelWidth}
      >
        <Box marginBottom={1}>
          <Text bold color="yellow">Review before scheduling</Text>
        </Box>

        <FieldRow label="Audience" value={audienceDesc} />
        <FieldRow label="Recipients" value={recipientText} color="green" />
        <FieldRow label="Send time" value={sendAtDisplay} color="cyan" />

        <Box marginTop={1}>
          <Text bold color="yellow">Message</Text>
        </Box>
        <Box marginLeft={2} width={panelWidth - 6}>
          <Text wrap="wrap">{content}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {isEdit ? 'Press Enter to update · Esc to go back.' : 'Press Enter to schedule · Esc to go back.'}
        </Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Shared small components
// ---------------------------------------------------------------------------

function StepLabel({ label }: { label: string }): React.ReactElement {
  return (
    <Box marginBottom={1}>
      <Text dimColor>{label}</Text>
    </Box>
  );
}

function FieldRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}): React.ReactElement {
  return (
    <Box>
      <Box width={14} marginRight={1}><Text dimColor>{label}</Text></Box>
      <Text color={color}>{value}</Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Date/time helpers
// ---------------------------------------------------------------------------

/** Returns a default schedule time: tomorrow at 09:00 local */
function getDefaultScheduleTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return formatLocalDateTimeForInput(d.toISOString());
}

/** Format an ISO string to local YYYY-MM-DD HH:MM for display in the input */
function formatLocalDateTimeForInput(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

/** Parse a "YYYY-MM-DD HH:MM" local time string to an ISO string, or null if invalid */
function parseLocalDateTimeInput(value: string): string | null {
  const trimmed = value.trim();
  // Accept "YYYY-MM-DD HH:MM" or "YYYY-MM-DDTHH:MM"
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const d = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Derive a short title from the message content (first 40 chars of first sentence) */
function deriveTitle(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return 'Announcement';
  const firstSentence = trimmed.split(/[.!?\n]/)[0].trim();
  if (firstSentence.length <= 40) return firstSentence;
  return firstSentence.slice(0, 37) + '…';
}
