import React from 'react';
import { Box, Text } from 'ink';

interface TableProps {
  data: Record<string, unknown>[];
  columns?: string[];
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function Table({ data, columns }: TableProps): React.ReactElement {
  if (data.length === 0) {
    return <Text color="gray">No results.</Text>;
  }

  const cols = columns ?? Object.keys(data[0] ?? {});

  // Calculate column widths: max of header length and cell content length
  const widths: Record<string, number> = {};
  for (const col of cols) {
    widths[col] = col.length;
    for (const row of data) {
      const len = formatCell(row[col]).length;
      if (len > widths[col]) widths[col] = len;
    }
    // Cap at 40 chars to avoid runaway columns
    widths[col] = Math.min(widths[col], 40);
  }

  const pad = (s: string, w: number) => s.slice(0, w).padEnd(w);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        {cols.map((col) => (
          <Box key={col} marginRight={2}>
            <Text bold color="cyan">{pad(col, widths[col])}</Text>
          </Box>
        ))}
      </Box>
      {/* Divider */}
      <Box>
        {cols.map((col) => (
          <Box key={col} marginRight={2}>
            <Text color="gray">{'─'.repeat(widths[col])}</Text>
          </Box>
        ))}
      </Box>
      {/* Rows */}
      {data.map((row, i) => (
        <Box key={i}>
          {cols.map((col) => (
            <Box key={col} marginRight={2}>
              <Text>{pad(formatCell(row[col]), widths[col])}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
