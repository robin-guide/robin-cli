import React, { useEffect, useState } from 'react';
import { useApp } from 'ink';
import { Confirm } from './Confirm.js';
import { Spinner } from './Spinner.js';
import { SuccessBox } from './SuccessBox.js';
import { ErrorBox } from './ErrorBox.js';
import { formatError } from '../client.js';

interface DeleteFlowProps {
  /** Human-readable name of what is being deleted, e.g. "tag abc-123". */
  entityLabel: string;
  /** Async function that performs the delete. Should throw on failure. */
  doDelete: () => Promise<unknown>;
}

type Phase = 'confirm' | 'deleting' | 'done' | 'error';

/**
 * A self-contained delete confirmation lifecycle entirely within Ink:
 *   confirm → deleting (spinner) → done (success) or error
 *
 * Exits the Ink app automatically after showing the result, with the correct
 * exit code. No console.log or process.exit calls leak outside Ink.
 */
export function DeleteFlow({ entityLabel, doDelete }: DeleteFlowProps): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [errorMsg, setErrorMsg] = useState<{ message: string; detail?: string } | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    if (phase === 'done' || phase === 'error') {
      const t = setTimeout(() => {
        exit(phase === 'error' ? new Error(errorMsg?.message ?? 'Delete failed') : undefined);
      }, 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, exit, errorMsg]);

  const handleConfirm = () => {
    setPhase('deleting');
    doDelete()
      .then(() => setPhase('done'))
      .catch(err => {
        setErrorMsg(formatError(err));
        setPhase('error');
      });
  };

  const handleCancel = () => {
    exit();
  };

  if (phase === 'confirm') {
    return React.createElement(Confirm, {
      message: `Delete ${entityLabel}?`,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    });
  }

  if (phase === 'deleting') {
    return React.createElement(Spinner, { message: `Deleting ${entityLabel}…` });
  }

  if (phase === 'error') {
    return React.createElement(ErrorBox, {
      message: errorMsg?.message ?? 'Delete failed',
      detail: errorMsg?.detail,
    });
  }

  return React.createElement(SuccessBox, { message: `${entityLabel} deleted.` });
}
