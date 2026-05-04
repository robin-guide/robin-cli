import React from 'react';
import { Command } from 'commander';
import { readConfig } from '../config.js';
import { renderUI } from '../ui/render.js';
import { App } from '../ui/shell/App.js';

export function registerUI(program: Command): void {
  program
    .command('ui')
    .description('Launch the interactive terminal UI (keyboard-driven shell)')
    .option('--api-key <key>', 'API key (overrides stored config)')
    .option('--base-url <url>', 'Base URL (overrides stored config)')
    .action((cmdOpts: { apiKey?: string; baseUrl?: string }) => {
      const config = readConfig();
      const apiKey = cmdOpts.apiKey ?? config.apiKey;
      const baseUrl = cmdOpts.baseUrl ?? config.baseUrl ?? 'https://api.robin.guide';

      if (!apiKey) {
        console.error('No API key configured. Run `robin auth login` or pass --api-key.');
        process.exit(1);
      }

      renderUI(React.createElement(App, { apiKey, baseUrl }));
    });
}
