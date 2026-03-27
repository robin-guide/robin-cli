import React from 'react';
import { Box, Text } from 'ink';

interface DetailViewProps {
  data: Record<string, unknown>;
  title?: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DetailView({ data, title }: DetailViewProps): React.ReactElement {
  const entries = Object.entries(data);
  const maxKeyLen = Math.max(...entries.map(([k]) => k.length));

  return (
    <Box flexDirection="column" marginBottom={1}>
      {title && (
        <Box marginBottom={1}>
          <Text bold underline>{title}</Text>
        </Box>
      )}
      {entries.map(([key, value]) => (
        <Box key={key}>
          <Text color="gray">{key.padEnd(maxKeyLen + 2)}</Text>
          <Text>{formatValue(value)}</Text>
        </Box>
      ))}
    </Box>
  );
}
