import React from 'react';
import { Box } from 'ink';

interface ScreenProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  centerContent?: boolean;
}

export function Screen({
  children,
  footer,
  centerContent = false,
}: ScreenProps): React.ReactElement {
  const terminalRows = process.stdout.rows;
  const height = terminalRows && terminalRows > 0 ? terminalRows : undefined;

  return (
    <Box flexDirection="column" height={height}>
      <Box
        flexDirection="column"
        flexGrow={1}
        justifyContent={centerContent ? 'center' : 'flex-start'}
        alignItems={centerContent ? 'center' : 'stretch'}
      >
        {children}
      </Box>
      {footer}
    </Box>
  );
}
