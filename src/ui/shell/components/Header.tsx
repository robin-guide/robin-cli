import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  /** The current section or screen name. */
  title: string;
  /** The selected Robin name, when this screen is scoped to a Robin. */
  subtitle?: string;
  showBack?: boolean;
}

const ALBUMEN = '#ffffff';
const GOLD = '#dba76d';

export function Header({ title, subtitle, showBack }: HeaderProps): React.ReactElement {
  const width = Math.min(process.stdout.columns ?? 80, 72);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        {showBack && (
          <Text color="gray">{'<- '}</Text>
        )}
        {subtitle && (
          <>
            <Text bold color={ALBUMEN}>{subtitle}</Text>
            <Text color="gray">{' / '}</Text>
          </>
        )}
        <Text bold color={GOLD}>{title}</Text>
      </Box>
      <Text color="gray">{'='.repeat(width)}</Text>
    </Box>
  );
}
