import React, { useEffect, useState } from 'react';
import { useInput } from 'ink';
import { Spinner } from '../../../components/Spinner.js';
import { ErrorBox } from '../../../components/ErrorBox.js';
import { formatError } from '../../../client.js';
import { HelpBar } from './HelpBar.js';

interface AsyncViewProps<T> {
  work: () => Promise<T>;
  loadingMessage?: string;
  children: (data: T) => React.ReactElement;
  onBack: () => void;
}

/**
 * Manages async data loading within the interactive shell.
 * Shows a spinner while loading, an error box on failure (with back navigation),
 * or calls children(data) on success — keeping the shell alive in all cases.
 */
export function AsyncView<T>({
  work,
  loadingMessage = 'Loading…',
  children,
  onBack,
}: AsyncViewProps<T>): React.ReactElement {
  type State =
    | { status: 'loading' }
    | { status: 'done'; data: T }
    | { status: 'error'; message: string; detail?: string };

  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    work()
      .then(data => { if (!cancelled) setState({ status: 'done', data }); })
      .catch(err => {
        if (!cancelled) {
          const { message, detail } = formatError(err);
          setState({ status: 'error', message, detail });
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (state.status === 'loading') {
    return React.createElement(Spinner, { message: loadingMessage });
  }

  if (state.status === 'error') {
    return <ErrorView message={state.message} detail={state.detail} onBack={onBack} />;
  }

  return children(state.data);
}

function ErrorView({
  message,
  detail,
  onBack,
}: {
  message: string;
  detail?: string;
  onBack: () => void;
}): React.ReactElement {
  useInput((input, key) => {
    if (key.escape || input === 'q') onBack();
  });

  return (
    <>
      {React.createElement(ErrorBox, { message, detail })}
      {React.createElement(HelpBar, { bindings: [{ key: 'q', label: 'back' }] })}
    </> as React.ReactElement
  );
}
