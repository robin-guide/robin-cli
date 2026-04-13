import React, { useEffect, useState } from 'react';
import { useApp } from 'ink';
import { Spinner } from '../components/Spinner.js';
import { ErrorBox } from '../components/ErrorBox.js';
import { formatError } from '../client.js';

interface CommandViewProps {
  work: () => Promise<React.ReactElement>;
  loadingMessage: string;
}

/**
 * Wraps async command work with a loading spinner → result → auto-exit lifecycle.
 * On error, renders ErrorBox then exits with a non-zero code.
 * On success, renders the returned element then exits cleanly after one render flush.
 */
export function CommandView({ work, loadingMessage }: CommandViewProps): React.ReactElement {
  type Phase =
    | { status: 'loading' }
    | { status: 'done'; view: React.ReactElement }
    | { status: 'error'; err: unknown };

  const [phase, setPhase] = useState<Phase>({ status: 'loading' });
  const { exit } = useApp();

  useEffect(() => {
    work()
      .then(view => setPhase({ status: 'done', view }))
      .catch(err => setPhase({ status: 'error', err }));
  }, []);

  useEffect(() => {
    if (phase.status === 'done' || phase.status === 'error') {
      // A short delay ensures Ink flushes the final frame before the process exits.
      const t = setTimeout(() => {
        exit(
          phase.status === 'error'
            ? phase.err instanceof Error
              ? phase.err
              : new Error(formatError(phase.err).message)
            : undefined,
        );
      }, 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase.status, exit]);

  if (phase.status === 'loading') {
    return React.createElement(Spinner, { message: loadingMessage });
  }

  if (phase.status === 'error') {
    const { message, detail } = formatError(phase.err);
    return React.createElement(ErrorBox, { message, detail });
  }

  return phase.view;
}
