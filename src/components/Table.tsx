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

function truncate(s: string, width: number): string {
  if (s.length <= width) return s.padEnd(width);
  return s.slice(0, width - 1) + '…';
}

export function Table({ data, columns }: TableProps): React.ReactElement {
  if (data.length === 0) {
    return <Text color="gray">No results.</Text>;
  }

  const terminalWidth = process.stdout.columns ?? 80;
  const cols = columns ?? Object.keys(data[0] ?? {});

  // Natural column widths: max of header and cell content, capped at 40
  const naturalWidths: Record<string, number> = {};
  for (const col of cols) {
    naturalWidths[col] = col.length;
    for (const row of data) {
      const len = formatCell(row[col]).length;
      if (len > naturalWidths[col]) naturalWidths[col] = len;
    }
    naturalWidths[col] = Math.min(naturalWidths[col], 40);
  }

  // Total space needed: sum of column widths + 2-char gap between each column
  const gapWidth = 2;
  const totalNatural = cols.reduce((sum, col) => sum + naturalWidths[col], 0)
    + gapWidth * (cols.length - 1);

  // If content fits, use natural widths; otherwise scale down proportionally
  const widths: Record<string, number> = {};
  if (totalNatural <= terminalWidth - 2) {
    for (const col of cols) widths[col] = naturalWidths[col];
  } else {
    const available = Math.max(terminalWidth - 2 - gapWidth * (cols.length - 1), cols.length * 4);
    const totalNaturalSum = cols.reduce((s, c) => s + naturalWidths[c], 0);
    for (const col of cols) {
      widths[col] = Math.max(
        4,
        Math.floor((naturalWidths[col] / totalNaturalSum) * available),
      );
    }
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        {cols.map((col, i) => (
          <Box key={col} marginRight={i < cols.length - 1 ? gapWidth : 0}>
            <Text bold color="cyan">{truncate(col, widths[col])}</Text>
          </Box>
        ))}
      </Box>
      {/* Divider */}
      <Box>
        {cols.map((col, i) => (
          <Box key={col} marginRight={i < cols.length - 1 ? gapWidth : 0}>
            <Text color="gray">{'─'.repeat(widths[col])}</Text>
          </Box>
        ))}
      </Box>
      {/* Rows */}
      {data.map((row, ri) => (
        <Box key={ri}>
          {cols.map((col, i) => (
            <Box key={col} marginRight={i < cols.length - 1 ? gapWidth : 0}>
              <Text>{truncate(formatCell(row[col]), widths[col])}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
