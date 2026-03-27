import React from 'react';
import { render as inkRender } from 'ink';

export function outputJSON(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  process.exit(0);
}

export function renderUI(component: React.ReactElement): void {
  const { waitUntilExit } = inkRender(component);
  waitUntilExit().then(() => process.exit(0)).catch(() => process.exit(1));
}
