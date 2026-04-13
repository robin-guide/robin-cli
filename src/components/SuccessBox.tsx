import React from 'react';
import { Box, Text } from 'ink';

interface SuccessBoxProps {
  message: string;
  detail?: string;
}

export function SuccessBox({ message, detail }: SuccessBoxProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="green" bold>✓ </Text>
        <Text bold>{message}</Text>
      </Box>
      {detail && (
        <Box marginLeft={2}>
          <Text color="gray">{detail}</Text>
        </Box>
      )}
    </Box>
  );
}
