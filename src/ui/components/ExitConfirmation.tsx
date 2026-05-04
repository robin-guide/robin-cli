import React, { createContext, useContext, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

interface ExitConfirmationContextValue {
  isConfirmingExit: boolean;
}

const ExitConfirmationContext = createContext<ExitConfirmationContextValue>({
  isConfirmingExit: false,
});

export function useExitConfirmation(): ExitConfirmationContextValue {
  return useContext(ExitConfirmationContext);
}

interface ExitConfirmationProps {
  children: React.ReactNode;
}

export function ExitConfirmation({ children }: ExitConfirmationProps): React.ReactElement {
  const { exit } = useApp();
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);

  useInput((input, key) => {
    const isCtrlC = input === '\x03' || (key.ctrl && input.toLowerCase() === 'c');

    if (isCtrlC) {
      if (isConfirmingExit) {
        exit();
        return;
      }

      setIsConfirmingExit(true);
      return;
    }

    if (!isConfirmingExit) return;

    if (input === 'y' || input === 'Y') {
      exit();
      return;
    }

    if (input === 'n' || input === 'N' || input === 'q' || key.escape || key.return) {
      setIsConfirmingExit(false);
    }
  });

  return (
    <ExitConfirmationContext.Provider value={{ isConfirmingExit }}>
      <Box flexDirection="column">
        {children}
        {isConfirmingExit && (
          <Box marginTop={1}>
            <Text color="yellow">Exit Robin? </Text>
            <Text color="yellow" bold>[y/N]</Text>
            <Text dimColor> (Ctrl-C again to exit)</Text>
          </Box>
        )}
      </Box>
    </ExitConfirmationContext.Provider>
  );
}
