import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Confirm({ message, onConfirm, onCancel }: ConfirmProps): React.ReactElement {
  const [answered, setAnswered] = useState(false);

  useInput((input: string) => {
    if (answered) return;
    if (input === 'y' || input === 'Y') {
      setAnswered(true);
      onConfirm();
    } else if (input === 'n' || input === 'N' || input === '\x03') {
      setAnswered(true);
      onCancel();
    }
  });

  return (
    <Box>
      <Text>{message} </Text>
      <Text color="yellow">[y/N] </Text>
    </Box>
  );
}
