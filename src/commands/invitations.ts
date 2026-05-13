import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderCommand } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { SuccessBox } from '../components/SuccessBox.js';
import { readConfig } from '../config.js';
import { normalizeList } from '../utils.js';

export function registerInvitations(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const invitations = program.command('invitations').description('Manage team invitations');

  invitations
    .command('list')
    .description('List pending invitations')
    .action(async () => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>('/invitations')); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>('/invitations');
          return React.createElement(Table, { data: normalizeList(data, 'invitations') });
        },
        'Fetching invitations…',
      );
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
      const body = { teamId, phoneNumber: cmdOpts.phone, name: cmdOpts.name };
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>('/invitations', body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>('/invitations', body);
          return React.createElement(DetailView, { data, title: 'Invitation Created' });
        },
        'Creating invitation…',
      );
    });

  invitations
    .command('revoke <invitationId>')
    .description('Revoke an invitation')
    .action(async (invitationId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.post<unknown>(`/invitations/revoke/${invitationId}`)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          await client.post<unknown>(`/invitations/revoke/${invitationId}`);
          return React.createElement(SuccessBox, { message: `Invitation ${invitationId} revoked.` });
        },
        'Revoking invitation…',
      );
    });
}
