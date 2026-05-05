import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { HelpBar } from '../components/HelpBar.js';
import { Screen } from '../components/Screen.js';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';
import type { Route } from '../App.js';

interface AgentDetailProps {
  agentId: string;
  agentName: string;
  onNavigate: (route: Route) => void;
  onBack: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  description: string;
  route: Route;
}

const CARD_WIDTH = 52;

export function AgentDetail({ agentId, agentName, onNavigate, onBack }: AgentDetailProps): React.ReactElement {
  const [cursor, setCursor] = useState(0);
  const { isConfirmingExit } = useExitConfirmation();

  const items: MenuItem[] = [
    {
      id: 'chat',
      label: 'Owner Chat',
      description: 'Open a full-screen chat with this Robin',
      route: { type: 'chat', agentId, agentName },
    },
    {
      id: 'conversations',
      label: 'Conversations',
      description: 'Triage and reply to conversation threads',
      route: { type: 'conversations', agentId, agentName },
    },
    {
      id: 'customers',
      label: 'Customers',
      description: 'Find a customer and review their context',
      route: { type: 'customers', agentId, agentName },
    },
    {
      id: 'tags',
      label: 'Tags',
      description: 'Create and tune audience tags',
      route: { type: 'tags', agentId, agentName },
    },
  ];

  useInput((input, key) => {
    if (isConfirmingExit) return;
    if (key.upArrow || key.leftArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow || key.rightArrow) setCursor(c => Math.min(items.length - 1, c + 1));
    if (key.return) onNavigate(items[cursor].route);
    if (key.escape || input === 'q') onBack();
  });

  return (
    <Screen
      centerContent
      footer={(
        <HelpBar bindings={[
          { key: '↑↓', label: 'navigate' },
          { key: 'Enter', label: 'select' },
          { key: 'q', label: 'back to Robins' },
        ]} />
      )}
    >
      <Box flexDirection="column" alignItems="center">

        {/* Agent identity badge */}
        <Box
          borderStyle="round"
          borderColor="yellow"
          paddingX={2}
          marginBottom={1}
        >
          <Box flexDirection="column" alignItems="center">
            <Text bold color="yellow">{agentName}</Text>
            <Text dimColor>robin</Text>
          </Box>
        </Box>

        {/* Section cards */}
        <Box flexDirection="column" width={CARD_WIDTH}>
          {items.map((item, i) => {
            const isSelected = i === cursor;
            return (
              <Box
                key={item.id}
                borderStyle={isSelected ? 'round' : 'single'}
                borderColor={isSelected ? 'cyan' : 'gray'}
                flexDirection="column"
                paddingX={1}
                width={CARD_WIDTH}
              >
                <Text bold={isSelected} color={isSelected ? 'cyan' : undefined} dimColor={!isSelected}>
                  {item.label}
                </Text>
                {isSelected && (
                  <Text dimColor>{item.description}</Text>
                )}
              </Box>
            );
          })}
        </Box>

      </Box>
    </Screen>
  );
}
