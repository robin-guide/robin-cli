import React from 'react';
import { Command } from 'commander';
import { readConfig } from '../config.js';
import { renderUI } from '../ui/render.js';
import { ChatApp } from '../ui/chat/ChatApp.js';
import type { GlobalOpts } from '../client.js';

export function registerChat(program: Command, getGlobalOpts: () => GlobalOpts): void {
  program
    .command('chat [agentId]')
    .description('Open a full-screen chat with a Robin agent (web channel)')
    .option('--api-key <key>', 'API key (overrides stored config)')
    .option('--base-url <url>', 'Base URL (overrides stored config)')
    .action((agentIdArg: string | undefined, cmdOpts: { apiKey?: string; baseUrl?: string }) => {
      const globalOpts = getGlobalOpts();
      const config = readConfig();

      const apiKey = cmdOpts.apiKey ?? globalOpts.apiKey ?? config.apiKey;
      const baseUrl = cmdOpts.baseUrl ?? globalOpts.baseUrl ?? config.baseUrl ?? 'https://api.robin.guide';

      if (!apiKey) {
        console.error('No API key configured. Run `robin auth login` or pass --api-key.');
        process.exit(1);
      }

      const agentId = agentIdArg ?? globalOpts.agent ?? config.defaultAgent;

      renderUI(React.createElement(ChatApp, { apiKey, baseUrl, agentId }));
    });
}
