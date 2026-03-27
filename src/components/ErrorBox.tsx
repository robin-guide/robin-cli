import React from 'react';
import { Box, Text } from 'ink';

interface ErrorBoxProps {
  message: string;
  detail?: string;
}

export function ErrorBox({ message, detail }: ErrorBoxProps): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
      <Text color="red" bold>✗ Error</Text>
      <Text>{message}</Text>
      {detail && <Text color="gray">{detail}</Text>}
    </Box>
  );
}
