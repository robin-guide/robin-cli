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
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import { formatError } from '../../../client.js';
import type { RobinClient } from '../../../client.js';
import type { Route } from '../App.js';

type TagEditorProps =
  | {
    mode: 'create';
    agentId: string;
    agentName: string;
    client: RobinClient;
    onNavigate: (route: Route) => void;
    onBack: () => void;
  }
  | {
    mode: 'edit';
    tagId: string;
    tagName?: string;
    agentId: string;
    agentName?: string;
    client: RobinClient;
    onNavigate: (route: Route) => void;
    onBack: () => void;
  };

type TagVisibility = 'PRIVATE' | 'CONTEXTUAL' | 'PUBLIC';
type FieldKey = 'name' | 'description' | 'visibility' | 'additionalKeywords' | 'welcomeMessage';

interface FieldConfig {
  key: FieldKey;
  label: string;
  placeholder: string;
  required?: boolean;
  input: 'text' | 'visibility';
}

type Values = Record<FieldKey, string>;
type SubmitState =
  | { status: 'editing' }
  | { status: 'submitting' }
  | { status: 'success'; tagId?: string }
  | { status: 'error'; message: string; detail?: string };

const CREATE_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', placeholder: 'VIP Customers', required: true, input: 'text' },
  { key: 'visibility', label: 'Tag type', placeholder: 'PUBLIC', required: true, input: 'visibility' },
  { key: 'welcomeMessage', label: 'Welcome message', placeholder: 'Optional welcome message', input: 'text' },
  { key: 'additionalKeywords', label: 'Subscribe keywords', placeholder: 'Comma-separated keywords', input: 'text' },
  { key: 'description', label: 'Instructions', placeholder: 'Optional instructions', input: 'text' },
];

const EDIT_FIELDS = CREATE_FIELDS.filter(field => field.key !== 'name');

const EMPTY_VALUES: Values = {
  name: '',
  description: '',
  visibility: 'PUBLIC',
  additionalKeywords: '',
  welcomeMessage: '',
};

const TAG_VISIBILITIES: TagVisibility[] = ['PUBLIC', 'PRIVATE', 'CONTEXTUAL'];
const VISIBILITY_DETAILS: Record<TagVisibility, { label: string; description: string; isDefault?: boolean }> = {
  PUBLIC: {
    label: 'Public',
    description: 'Customers can text the tag name, or any subscribe keyword, to opt in.',
    isDefault: true,
  },
  PRIVATE: {
    label: 'Private',
    description: 'Internal-only list or segment for organizing contacts and targeting announcements.',
  },
  CONTEXTUAL: {
    label: 'Contextual',
    description: 'Robin can apply this automatically from conversation context; instructions are required.',
  },
};

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

function valueAsString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function valuesFromTag(raw: Record<string, unknown>): Values {
  const data = normalizeTagData(raw);
  return {
    name: valueAsString(data.name),
    description: valueAsString(data.description),
    visibility: isTagVisibility(data.visibility) ? data.visibility : 'PUBLIC',
    additionalKeywords: Array.isArray(data.additionalKeywords)
      ? data.additionalKeywords.map(item => String(item)).join(', ')
      : '',
    welcomeMessage: valueAsString(data.welcomeMessage),
  };
}

function isTagVisibility(value: unknown): value is TagVisibility {
  return TAG_VISIBILITIES.includes(value as TagVisibility);
}

function parseVisibility(value: string): TagVisibility {
  const normalized = value.trim().toUpperCase();
  return isTagVisibility(normalized) ? normalized : 'PUBLIC';
}

function parseAdditionalKeywords(value: string, visibility: TagVisibility): string[] {
  if (visibility !== 'PUBLIC') return [];
  return value
    .split(',')
    .map(item => item.trim().toUpperCase())
    .filter(Boolean);
}

function responseTagId(raw: Record<string, unknown>): string | undefined {
  const data = normalizeTagData(raw);
  const id = data.id ?? data.externalId;
  return typeof id === 'string' ? id : undefined;
}

function buildCreateBody(agentId: string, values: Values): Record<string, unknown> {
  const visibility = parseVisibility(values.visibility);
  return {
    agentId,
    name: values.name.trim(),
    description: values.description.trim() || null,
    visibility,
    additionalKeywords: parseAdditionalKeywords(values.additionalKeywords, visibility),
    welcomeMessage: values.welcomeMessage.trim() || null,
  };
}

function buildUpdateBody(values: Values): Record<string, unknown> {
  const visibility = parseVisibility(values.visibility);
  return {
    description: values.description.trim() || null,
    visibility,
    additionalKeywords: parseAdditionalKeywords(values.additionalKeywords, visibility),
    welcomeMessage: values.welcomeMessage.trim() || null,
  };
}

export function TagEditor(props: TagEditorProps): React.ReactElement {
  if (props.mode === 'edit') {
    return (
      <AsyncView
        work={() => props.client.get<Record<string, unknown>>(`/tags/${props.tagId}`)}
        loadingMessage="Loading tag…"
        onBack={props.onBack}
      >
        {(raw) => {
          const initialValues = valuesFromTag(raw);
          return (
            <TagForm
              mode="edit"
              initialValues={initialValues}
              title={(props.tagName ?? initialValues.name) || props.tagId}
              tagId={props.tagId}
              agentId={props.agentId}
              agentName={props.agentName}
              client={props.client}
              onNavigate={props.onNavigate}
              onBack={props.onBack}
            />
          );
        }}
      </AsyncView>
    );
  }

  return (
    <TagForm
      mode="create"
      initialValues={EMPTY_VALUES}
      title="Create Tag"
      agentId={props.agentId}
      agentName={props.agentName}
      client={props.client}
      onNavigate={props.onNavigate}
      onBack={props.onBack}
    />
  );
}

interface TagFormProps {
  mode: 'create' | 'edit';
  initialValues: Values;
  title: string;
  tagId?: string;
  agentId: string;
  agentName?: string;
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

function TagForm({
  mode,
  initialValues,
  title,
  tagId,
  agentId,
  agentName,
  client,
  onNavigate,
  onBack,
}: TagFormProps): React.ReactElement {
  const fields = mode === 'create' ? CREATE_FIELDS : EDIT_FIELDS;
  const [values, setValues] = useState<Values>(initialValues);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'editing' });
  const [validation, setValidation] = useState<string | null>(null);
  const { isConfirmingExit } = useExitConfirmation();
  const currentField = fields[fieldIndex];

  async function submitTag() {
    setSubmitState({ status: 'submitting' });
    setValidation(null);

    try {
      if (mode === 'create') {
        const data = await client.post<Record<string, unknown>>('/tags', buildCreateBody(agentId, values));
        setSubmitState({ status: 'success', tagId: responseTagId(data) });
        return;
      }

      if (!tagId) {
        setSubmitState({ status: 'error', message: 'No tag ID was provided for editing.' });
        return;
      }

      await client.patch<Record<string, unknown>>(`/tags/${tagId}`, buildUpdateBody(values));
      setSubmitState({ status: 'success' });
    } catch (err) {
      setSubmitState({ status: 'error', ...formatError(err) });
    }
  }

  function handleSubmit() {
    if (submitState.status !== 'editing') return;
    const currentValue = values[currentField.key].trim();
    if (currentField.required && !currentValue) {
      setValidation(`${currentField.label} is required.`);
      return;
    }
    if (currentField.key === 'description' && parseVisibility(values.visibility) === 'CONTEXTUAL' && !currentValue) {
      setValidation('Instructions are required for Contextual tags.');
      return;
    }

    setValidation(null);
    if (fieldIndex < fields.length - 1) {
      setFieldIndex(current => current + 1);
      return;
    }

    submitTag();
  }

  useInput((input, key) => {
    if (isConfirmingExit) return;

    if (submitState.status === 'success') {
      if (input === 'v' && submitState.tagId) {
        onNavigate({
          type: 'tag-detail',
          tagId: submitState.tagId,
          tagName: values.name,
          agentId,
          agentName,
        });
        return;
      }
      if (key.return || key.escape || input === 'q') onBack();
      return;
    }

    if (submitState.status === 'error') {
      if (key.escape || input === 'q') setSubmitState({ status: 'editing' });
      return;
    }

    if (submitState.status === 'editing' && key.escape) onBack();

    if (submitState.status === 'editing' && currentField.input === 'visibility') {
      const currentVisibility = parseVisibility(values.visibility);
      const currentIndex = TAG_VISIBILITIES.indexOf(currentVisibility);
      if (key.leftArrow || key.upArrow) {
        const next = TAG_VISIBILITIES[Math.max(0, currentIndex - 1)];
        setValues(current => ({ ...current, visibility: next }));
      }
      if (key.rightArrow || key.downArrow) {
        const next = TAG_VISIBILITIES[Math.min(TAG_VISIBILITIES.length - 1, currentIndex + 1)];
        setValues(current => ({ ...current, visibility: next }));
      }
      if (input === '1') setValues(current => ({ ...current, visibility: 'PUBLIC' }));
      if (input === '2') setValues(current => ({ ...current, visibility: 'PRIVATE' }));
      if (input === '3') setValues(current => ({ ...current, visibility: 'CONTEXTUAL' }));
      if (key.return) handleSubmit();
    }
  }, { isActive: !isConfirmingExit });

  if (submitState.status === 'submitting') {
    return (
      <Screen>
        <Spinner message={mode === 'create' ? 'Creating tag…' : 'Updating tag…'} />
      </Screen>
    );
  }

  if (submitState.status === 'success') {
    return (
      <Screen footer={(
        <HelpBar bindings={[
          ...(submitState.tagId ? [{ key: 'v', label: 'view tag' }] : []),
          { key: 'Enter/q', label: 'back' },
        ]} />
      )}>
        <Header title={mode === 'create' ? 'Tag Created' : 'Tag Updated'} subtitle={agentName} showBack />
        <SuccessBox message={mode === 'create' ? 'Tag created.' : 'Tag updated.'} />
      </Screen>
    );
  }

  if (submitState.status === 'error') {
    return (
      <Screen footer={<HelpBar bindings={[{ key: 'q', label: 'back to form' }]} />}>
        <Header title={title} subtitle={agentName} showBack />
        <ErrorBox message={submitState.message} detail={submitState.detail} />
      </Screen>
    );
  }

  return (
    <Screen footer={(
      <HelpBar bindings={[
        { key: 'Enter', label: fieldIndex < fields.length - 1 ? 'next field' : 'save' },
        { key: 'Esc', label: 'cancel' },
      ]} />
    )}>
      <Header
        title={mode === 'create' ? title : `Edit Tag: ${title}`}
        subtitle={agentName}
        showBack
      />
      <Box flexDirection="column">
        <Text dimColor>
          Field {fieldIndex + 1} of {fields.length}
        </Text>
        <Box marginTop={1}>
          <Box width={18} marginRight={2}>
            <Text color={currentField.required ? 'yellow' : 'cyan'}>{currentField.label}</Text>
          </Box>
          {currentField.input === 'visibility' ? (
            <Text color="cyan" bold>
              {VISIBILITY_DETAILS[parseVisibility(values.visibility)].label}
              {VISIBILITY_DETAILS[parseVisibility(values.visibility)].isDefault ? ' (default)' : ''}
            </Text>
          ) : (
            <TextInput
              value={values[currentField.key]}
              onChange={(value) => {
                setValues(current => ({ ...current, [currentField.key]: value }));
                setValidation(null);
              }}
              onSubmit={handleSubmit}
              placeholder={currentField.placeholder}
              focus={!isConfirmingExit}
            />
          )}
        </Box>
        {currentField.input === 'visibility' && (
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            <Text dimColor>Choose what kind of tag this is:</Text>
            {TAG_VISIBILITIES.map((visibility, index) => {
              const detail = VISIBILITY_DETAILS[visibility];
              const selected = visibility === parseVisibility(values.visibility);
              return (
                <Box key={visibility}>
                  <Text color={selected ? 'cyan' : 'gray'} bold={selected}>
                    {selected ? '>> ' : '   '}
                    {index + 1}. {detail.label}
                    {detail.isDefault ? ' (default)' : ''}
                  </Text>
                  <Text color={selected ? 'cyan' : 'gray'} bold={selected}>
                    {' - ' + detail.description}
                  </Text>
                </Box>
              );
            })}
            <Text dimColor>Use ↑/↓, ←/→, or 1-3. Press Enter to continue.</Text>
          </Box>
        )}
        {validation && (
          <Box marginTop={1}>
            <Text color="red">{validation}</Text>
          </Box>
        )}
        {fields
          .slice(0, fieldIndex)
          .map(field => (
            <Box key={field.key}>
              <Box width={18} marginRight={2}>
                <Text dimColor>{field.label}</Text>
              </Box>
              <Text dimColor>{values[field.key] || '-'}</Text>
            </Box>
          ))}
      </Box>
    </Screen>
  );
}
