import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export function Header({ title, subtitle, showBack }: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        {showBack && (
          <Text dimColor>{'← '}</Text>
        )}
        <Text bold color="cyan">{title}</Text>
        {subtitle && (
          <>
            <Text dimColor>{' · '}</Text>
            <Text dimColor>{subtitle}</Text>
          </>
        )}
      </Box>
      <Text dimColor>{'─'.repeat(Math.min(process.stdout.columns ?? 80, 60))}</Text>
    </Box>
  );
}
