import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderCommand } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { normalizeList } from '../utils.js';

export function registerTeams(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const teams = program.command('teams').description('Manage teams');

  teams
    .command('list')
    .description('List all teams')
    .action(async () => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>('/teams')); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>('/teams');
          return React.createElement(Table, { data: normalizeList(data, 'teams') });
        },
        'Fetching teams…',
      );
    });

  teams
    .command('get <teamId>')
    .description('Get a single team')
    .action(async (teamId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<Record<string, unknown>>(`/teams/${teamId}`)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<Record<string, unknown>>(`/teams/${teamId}`);
          return React.createElement(DetailView, { data, title: `Team: ${teamId}` });
        },
        'Fetching team…',
      );
    });
}
