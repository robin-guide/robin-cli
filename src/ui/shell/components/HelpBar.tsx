import React from 'react';
import { Box, Text } from 'ink';

interface Binding {
  key: string;
  label: string;
}

interface HelpBarProps {
  bindings: Binding[];
}

export function HelpBar({ bindings }: HelpBarProps): React.ReactElement {
  return (
    <Box marginTop={1}>
      {bindings.map((b, i) => (
        <Box key={b.key} marginRight={i < bindings.length - 1 ? 2 : 0}>
          <Text bold color="cyan">{b.key}</Text>
          <Text dimColor>{' ' + b.label}</Text>
        </Box>
      ))}
    </Box>
  );
}
