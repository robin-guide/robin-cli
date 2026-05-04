import React from 'react';
import { render as inkRender } from 'ink';
import { CommandView } from './command-view.js';

export function outputJSON(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  process.exit(0);
}

export function renderUI(component: React.ReactElement): void {
  const { waitUntilExit } = inkRender(component, { exitOnCtrlC: false });
  waitUntilExit().then(() => process.exit(0)).catch(() => process.exit(1));
}

/**
 * Renders an async command with a loading spinner, success view, or error box.
 * `work` receives no arguments and must return the React element to render on success.
 * This function returns immediately; Ink manages the lifecycle and exits the process.
 */
export function renderCommand(
  work: () => Promise<React.ReactElement>,
  loadingMessage = 'Loading…',
): void {
  renderUI(React.createElement(CommandView, { work, loadingMessage }));
}
