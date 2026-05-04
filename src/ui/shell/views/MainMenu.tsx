import React from 'react';
import { Box, Text, useApp } from 'ink';
import { Header } from '../components/Header.js';
import { SelectList, SelectItem } from '../components/SelectList.js';
import { HelpBar } from '../components/HelpBar.js';
import type { Route } from '../App.js';

interface MainMenuProps {
  onNavigate: (route: Route) => void;
}

const MENU_ITEMS: SelectItem<Route>[] = [
  {
    id: 'agents',
    label: 'Agents',
    value: { type: 'agents' },
    description: 'Browse agents and their conversation threads',
  },
  {
    id: 'conversations',
    label: 'Conversations',
    value: { type: 'agent-picker', next: 'conversations' },
    description: 'Triage and reply to conversation threads',
  },
  {
    id: 'customers',
    label: 'Customers',
    value: { type: 'agent-picker', next: 'customers' },
    description: 'Look up and manage customers',
  },
];

const ROBIN_BANNER = [
  '  ██████╗  ██████╗ ██████╗ ██╗███╗  ██╗ ██╗',
  '  ██╔══██╗██╔═══██╗██╔══██╗██║████╗ ██║ ██║',
  '  ██████╔╝██║   ██║██████╔╝██║██╔██╗██║ ██║',
  '  ██╔══██╗██║   ██║██╔══██╗██║██║╚████║ ╚═╝',
  '  ██║  ██║╚██████╔╝██████╔╝██║██║ ╚███║ ██╗',
  '  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚══╝ ╚═╝',
].join('\n');

export function MainMenu({ onNavigate }: MainMenuProps): React.ReactElement {
  const { exit } = useApp();

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan">{ROBIN_BANNER}</Text>
      </Box>
      <Header title="Robin" subtitle="interactive mode" />
      <SelectList
        items={MENU_ITEMS}
        onSelect={item => onNavigate(item.value)}
        onCancel={() => exit()}
      />
      <HelpBar bindings={[
        { key: '↑↓', label: 'navigate' },
        { key: 'Enter', label: 'select' },
        { key: 'q', label: 'quit' },
      ]} />
    </Box>
  );
}
