import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderUI } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { readConfig } from '../config.js';

export function registerInvitations(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const invitations = program.command('invitations').description('Manage team invitations');

  invitations
    .command('list')
    .description('List pending invitations')
    .action(async () => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<unknown>('/invitations');
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : (data as { invitations?: unknown[] }).invitations ?? [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
    });

  invitations
    .command('create')
    .description('Create a team invitation')
    .option('--team <teamId>', 'Team ID')
    .requiredOption('--phone <phone>', 'Phone number')
    .requiredOption('--name <name>', 'Invitee name')
    .action(async (cmdOpts: { team?: string; phone: string; name: string }) => {
      const opts = getGlobalOpts();
      const config = readConfig();
      const teamId = cmdOpts.team ?? opts.team ?? config.defaultTeam;
      if (!teamId) {
        console.error('Team ID required. Pass --team <id> or set a default with `robin config set default-team`.');
        process.exit(1);
      }
      const client = createClient(opts);
      try {
        const data = await client.post<Record<string, unknown>>('/invitations', {
          teamId,
          phone: cmdOpts.phone,
          name: cmdOpts.name,
        });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Invitation Created' }));
      } catch (err) { handleError(err); }
    });

  invitations
    .command('revoke <invitationId>')
    .description('Revoke an invitation')
    .action(async (invitationId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.post<unknown>(`/invitations/revoke/${invitationId}`);
        if (opts.json) return outputJSON(data);
        console.log(`✓ Invitation ${invitationId} revoked.`);
      } catch (err) { handleError(err); }
    });
}
