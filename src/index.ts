#!/usr/bin/env node
import './proxy.js';
import { createRequire } from 'module';
import { Command } from 'commander';

import { registerAuth } from './commands/auth.js';
import { registerAgents } from './commands/agents.js';
import { registerCustomers } from './commands/customers.js';
import { registerConversations } from './commands/conversations.js';
import { registerAnnouncements } from './commands/announcements.js';
import { registerTags } from './commands/tags.js';
import { registerWebsites } from './commands/websites.js';
import { registerInvitations } from './commands/invitations.js';
import { registerTeams } from './commands/teams.js';
import { registerConfig } from './commands/config.js';
import { registerUI } from './commands/ui.js';
import { registerChat } from './commands/chat.js';
import { GlobalOpts, formatError } from './client.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const program = new Command();

program
  .name('robin')
  .description('Robin API CLI — scriptable access to the Robin platform')
  .version(version)
  // Global flags
  .option('--json', 'Output raw JSON (machine-readable)')
  .option('--api-key <key>', 'Override stored API key')
  .option('--base-url <url>', 'Override stored base URL')
  .option('--agent <id>', 'Override default Robin ID')
  .option('--team <id>', 'Override default team ID')
  .option('--verbose', 'Show request/response details');

// Accessor for global opts — must be called after parsing
const getGlobalOpts = (): GlobalOpts => program.opts<GlobalOpts>();

registerAuth(program);
registerConfig(program);
registerAgents(program, getGlobalOpts);
registerCustomers(program, getGlobalOpts);
registerConversations(program, getGlobalOpts);
registerAnnouncements(program, getGlobalOpts);
registerTags(program, getGlobalOpts);
registerWebsites(program, getGlobalOpts);
registerInvitations(program, getGlobalOpts);
registerTeams(program, getGlobalOpts);
registerUI(program);
registerChat(program, getGlobalOpts);

program.parseAsync(process.argv).catch((err) => {
  const { message, detail } = formatError(err);
  console.error(message);
  if (detail) console.error(detail);
  process.exit(1);
});
