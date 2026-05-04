import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useExitConfirmation } from '../../components/ExitConfirmation.js';

export interface SelectItem<V = string> {
  label: string;
  value: V;
  description?: string;
  hint?: string;
}

interface SelectListProps<V> {
  items: SelectItem<V>[];
  onSelect: (item: SelectItem<V>) => void;
  onCancel: () => void;
  /** Maximum number of items to show at once. Defaults to 10. */
  limit?: number;
  isFocused?: boolean;
}

export function SelectList<V>({
  items,
  onSelect,
  onCancel,
  limit = 10,
  isFocused = true,
}: SelectListProps<V>): React.ReactElement {
  const [cursor, setCursor] = useState(0);
  const [offset, setOffset] = useState(0);
  const { isConfirmingExit } = useExitConfirmation();
  const isActive = isFocused && !isConfirmingExit;

  useInput((input, key) => {
    if (!isActive) return;

    if (key.upArrow) {
      const next = Math.max(0, cursor - 1);
      setCursor(next);
      if (next < offset) setOffset(next);
    }

    if (key.downArrow) {
      const next = Math.min(items.length - 1, cursor + 1);
      setCursor(next);
      if (next >= offset + limit) setOffset(next - limit + 1);
    }

    if (key.return) {
      if (items[cursor]) onSelect(items[cursor]);
    }

    if (key.escape || input === 'q') {
      onCancel();
    }
  }, { isActive });

  if (items.length === 0) {
    return <Text dimColor>No items.</Text>;
  }

  const visible = items.slice(offset, offset + limit);
  const hasMore = items.length > limit;

  return (
    <Box flexDirection="column">
      {offset > 0 && (
        <Text dimColor>  ↑ {offset} more above</Text>
      )}
      {visible.map((item, i) => {
        const index = offset + i;
        const isSelected = index === cursor;
        return (
          <Box key={item.label}>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {isSelected ? '▶ ' : '  '}
            </Text>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {item.label}
            </Text>
            {item.description && (
              <Text dimColor>{' — ' + item.description}</Text>
            )}
            {item.hint && (
              <Text color="gray">{' [' + item.hint + ']'}</Text>
            )}
          </Box>
        );
      })}
      {hasMore && offset + limit < items.length && (
        <Text dimColor>  ↓ {items.length - offset - limit} more below</Text>
      )}
    </Box>
  );
}
