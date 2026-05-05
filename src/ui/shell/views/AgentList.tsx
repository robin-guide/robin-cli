import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { AsyncView } from '../components/AsyncView.js';
import { HelpBar } from '../components/HelpBar.js';
import { Screen } from '../components/Screen.js';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import { normalizeList } from '../../../utils.js';
import type { RobinClient } from '../../../client.js';
import type { Route } from '../App.js';

interface AgentRow {
  id?: string;
  externalId?: string;
  name?: string;
  status?: string;
  model?: string;
}

interface AgentListProps {
  client: RobinClient;
  onNavigate: (route: Route) => void;
  onBack: () => void;
  /** When 'chat', selecting a Robin immediately opens Owner Chat (used when no Robin is pre-selected). */
  nextView?: 'chat';
}

export function AgentList({ client, onNavigate, onBack, nextView }: AgentListProps): React.ReactElement {
  return (
    <AsyncView
      work={() => client.get<unknown>('/agents')}
      loadingMessage="Fetching Robins…"
      onBack={onBack}
    >
      {(data) => {
        const agents = normalizeList(data, 'agents') as AgentRow[];
        return (
          <AgentPicker
            agents={agents}
            nextView={nextView}
            onNavigate={onNavigate}
            onBack={onBack}
          />
        );
      }}
    </AsyncView>
  );
}

interface AgentPickerProps {
  agents: AgentRow[];
  nextView?: 'chat';
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

const CARD_WIDTH = 52;
const VISIBLE_LIMIT = 7;

function buildRoute(agent: AgentRow, nextView?: 'chat'): Route {
  const id = agent.id ?? agent.externalId ?? '';
  const name = agent.name ?? id;
  if (nextView === 'chat') return { type: 'chat', agentId: id, agentName: name };
  return { type: 'agent-detail', agentId: id, agentName: name };
}

function AgentPicker({ agents, nextView, onNavigate, onBack }: AgentPickerProps): React.ReactElement {
  const [cursor, setCursor] = useState(0);
  const [offset, setOffset] = useState(0);
  const { isConfirmingExit } = useExitConfirmation();

  const moveCursor = (direction: -1 | 1) => {
    const next = direction === -1
      ? Math.max(0, cursor - 1)
      : Math.min(agents.length - 1, cursor + 1);
    setCursor(next);
    if (next < offset) setOffset(next);
    if (next >= offset + VISIBLE_LIMIT) setOffset(next - VISIBLE_LIMIT + 1);
  };

  useInput((input, key) => {
    if (isConfirmingExit) return;

    if (key.upArrow || key.leftArrow) {
      moveCursor(-1);
    }
    if (key.downArrow || key.rightArrow) {
      moveCursor(1);
    }
    if (key.return && agents[cursor]) {
      onNavigate(buildRoute(agents[cursor], nextView));
    }
    if (key.escape || input === 'q') onBack();
  });

  const visible = agents.slice(offset, offset + VISIBLE_LIMIT);
  const hasAbove = offset > 0;
  const hasBelow = offset + VISIBLE_LIMIT < agents.length;

  const title = nextView === 'chat' ? 'Select Robin  ·  for Owner Chat' : 'Robins';
  const enterLabel = nextView === 'chat' ? 'open chat' : 'open';

  return (
    <Screen
      centerContent
      footer={(
        <HelpBar bindings={[
          { key: '↑↓', label: 'navigate' },
          { key: 'Enter', label: enterLabel },
          { key: 'q', label: 'back' },
        ]} />
      )}
    >
      <Box flexDirection="column" alignItems="center">

        {/* Title */}
        <Box marginBottom={1}>
          <Text bold color="yellow">{title}</Text>
        </Box>

        {agents.length === 0 ? (
          <Box width={CARD_WIDTH} justifyContent="center">
            <Text dimColor>No Robins found.</Text>
          </Box>
        ) : (
          <Box flexDirection="column" width={CARD_WIDTH}>
            {hasAbove && (
              <Box paddingX={2}>
                <Text dimColor>↑  {offset} more above</Text>
              </Box>
            )}

            {visible.map((agent, i) => {
              const globalIndex = offset + i;
              const isSelected = globalIndex === cursor;
              const id = agent.id ?? agent.externalId ?? '';
              const name = agent.name ?? id;
              const status = agent.status;
              const model = agent.model;

              if (isSelected) {
                return (
                  <Box
                    key={id}
                    borderStyle="round"
                    borderColor="cyan"
                    flexDirection="column"
                    paddingX={1}
                    width={CARD_WIDTH}
                  >
                    <Box justifyContent="space-between">
                      <Text bold color="cyan">{name}</Text>
                      {status && (
                        <Text color="green">{status}</Text>
                      )}
                    </Box>
                    {model && (
                      <Text dimColor>{model}</Text>
                    )}
                  </Box>
                );
              }

              return (
                <Box
                  key={id}
                  borderStyle="single"
                  borderColor="gray"
                  paddingX={1}
                  width={CARD_WIDTH}
                >
                  <Box flexGrow={1}>
                    <Text dimColor>{name}</Text>
                  </Box>
                  {status && (
                    <Text dimColor>{status}</Text>
                  )}
                </Box>
              );
            })}

            {hasBelow && (
              <Box paddingX={2}>
                <Text dimColor>↓  {agents.length - offset - VISIBLE_LIMIT} more below</Text>
              </Box>
            )}
          </Box>
        )}

      </Box>
    </Screen>
  );
}
