import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A confirmation prompt that captures:
 *   y / Y          → confirm
 *   n / N          → cancel
 *   Enter          → cancel (default No)
 *   Escape / q     → cancel
 *   Ctrl+C         → cancel
 */
export function Confirm({ message, onConfirm, onCancel }: ConfirmProps): React.ReactElement {
  const [answered, setAnswered] = useState(false);

  useInput((input: string, key) => {
    if (answered) return;

    if (input === 'y' || input === 'Y') {
      setAnswered(true);
      onConfirm();
      return;
    }

    const isCancel =
      input === 'n' ||
      input === 'N' ||
      input === 'q' ||
      input === '\x03' || // Ctrl+C
      key.escape ||
      key.return;

    if (isCancel) {
      setAnswered(true);
      onCancel();
    }
  });

  return (
    <Box>
      <Text>{message} </Text>
      <Text color="yellow">[y/N] </Text>
      <Text dimColor>(Enter or Esc to cancel)</Text>
    </Box>
  );
}
