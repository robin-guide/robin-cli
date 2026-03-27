import React from 'react';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  message?: string;
}

export function Spinner({ message = 'Loading...' }: SpinnerProps): React.ReactElement {
  return (
    <Text>
      <InkSpinner type="dots" />
      {' '}{message}
    </Text>
  );
}
