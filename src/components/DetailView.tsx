import React from 'react';
import { Box, Text } from 'ink';

interface DetailViewProps {
  data: Record<string, unknown>;
  title?: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function DetailView({ data, title }: DetailViewProps): React.ReactElement {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        {title && (
          <Box marginBottom={1}>
            <Text bold underline>{title}</Text>
          </Box>
        )}
        <Text color="gray">—</Text>
      </Box>
    );
  }

  const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
  // Reserve space: key column + 2-char gap + at least some value space
  const terminalWidth = process.stdout.columns ?? 80;
  const valueWidth = Math.max(20, terminalWidth - maxKeyLen - 4);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {title && (
        <Box marginBottom={1}>
          <Text bold underline>{title}</Text>
        </Box>
      )}
      {entries.map(([key, value]) => {
        const formatted = formatValue(value);
        // Multi-line values (e.g. pretty-printed JSON) render on their own indented block
        const isMultiLine = formatted.includes('\n');
        return (
          <Box key={key} flexDirection={isMultiLine ? 'column' : 'row'}>
            <Text color="gray">{key.padEnd(maxKeyLen + 2)}</Text>
            {isMultiLine ? (
              <Box marginLeft={maxKeyLen + 2} flexDirection="column">
                {formatted.split('\n').map((line, i) => (
                  <Text key={i} wrap="wrap">{line}</Text>
                ))}
              </Box>
            ) : (
              <Text wrap="wrap">
                {formatted.length > valueWidth
                  ? formatted.slice(0, valueWidth - 1) + '…'
                  : formatted}
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
