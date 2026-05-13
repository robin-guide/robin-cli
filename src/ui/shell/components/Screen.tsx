import React from 'react';
import { Box, useWindowSize } from 'ink';

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
  const { rows } = useWindowSize();
  const height = rows > 0 ? rows : undefined;

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
