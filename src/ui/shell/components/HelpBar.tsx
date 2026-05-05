import React from 'react';
import { Box, Text } from 'ink';

interface Binding {
  key: string;
  label: string;
}

interface HelpBarProps {
  bindings: Binding[];
}

const GOLD = '#dba76d';

export function HelpBar({ bindings }: HelpBarProps): React.ReactElement {
  return (
    <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
      <Box marginRight={2}>
        <Text color="gray">Controls</Text>
      </Box>
      {bindings.map((b, i) => (
        <Box key={b.key} marginRight={i < bindings.length - 1 ? 2 : 0}>
          <Text color="gray">[</Text>
          <Text bold color={GOLD}>{formatKey(b.key)}</Text>
          <Text color="gray">]</Text>
          <Text color="white">{' ' + b.label}</Text>
        </Box>
      ))}
    </Box>
  );
}

function formatKey(key: string): string {
  return key === '↑↓' ? '↑↓/←→' : key;
}
