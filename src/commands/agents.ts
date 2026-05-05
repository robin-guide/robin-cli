import React from 'react';
import { Box, Text } from 'ink';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderCommand } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { normalizeList } from '../utils.js';

function paginatedTable(
  data: unknown,
  envelopeKey: string,
  nextCursorFlag: string,
): React.ReactElement {
  const rows = normalizeList(data, envelopeKey);
  const envelope = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const hasMore = envelope.hasMore === true;
  const nextCursor = envelope.nextCursor ?? envelope.cursor;

  const children: React.ReactElement[] = [
    React.createElement(Table, { data: rows, key: 'table' }),
  ];

  if (hasMore && nextCursor) {
    children.push(
      React.createElement(
        Text,
        { dimColor: true, key: 'pagination' },
        `Showing ${rows.length} results. More available; rerun with ${nextCursorFlag} ${String(nextCursor)}.`,
      ),
    );
  }

  return React.createElement(Box, { flexDirection: 'column' }, children);
}

export function registerAgents(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const agents = program.command('agents').description('Manage Robins');

  agents
    .command('list')
    .description('List all Robins')
    .action(async () => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>('/agents')); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>('/agents');
          return React.createElement(Table, { data: normalizeList(data, 'agents') });
        },
        'Fetching Robins…',
      );
    });

  agents
    .command('get <agentId>')
    .description('Get a single Robin')
    .action(async (agentId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<Record<string, unknown>>(`/agents/${agentId}`)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<Record<string, unknown>>(`/agents/${agentId}`);
          return React.createElement(DetailView, { data, title: `Robin: ${agentId}` });
        },
        'Fetching Robin…',
      );
    });

  agents
    .command('create')
    .description('Create a new Robin')
    .requiredOption('--name <name>', 'Robin name')
    .option('--team <teamId>', 'Team ID')
    .option('--goal-instructions <text>', 'Goal instructions — tell the Robin HOW to act')
    .option('--user-instructions <text>', 'User instructions — background knowledge for the Robin')
    .option('--model <model>', 'Model override (e.g. gpt-4o-mini)')
    .option('--time-zone <tz>', 'Robin time zone (e.g. America/New_York)')
    .action(async (cmdOpts: {
      name: string;
      team?: string;
      goalInstructions?: string;
      userInstructions?: string;
      model?: string;
      timeZone?: string;
    }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const teamId = cmdOpts.team ?? opts.team;
      const body = {
        name: cmdOpts.name,
        ...(teamId && { teamExternalId: teamId }),
        ...(cmdOpts.goalInstructions && { goalInstructions: cmdOpts.goalInstructions }),
        ...(cmdOpts.userInstructions && { userInstructions: cmdOpts.userInstructions }),
        ...(cmdOpts.model && { model: cmdOpts.model }),
        ...(cmdOpts.timeZone && { timeZone: cmdOpts.timeZone }),
      };
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>('/agents', body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>('/agents', body);
          return React.createElement(DetailView, { data, title: 'Robin Created' });
        },
        'Creating Robin…',
      );
    });

  agents
    .command('update <agentId>')
    .description('Update a Robin')
    .option('--name <name>', 'New name')
    .option('--goal-instructions <text>', 'Goal instructions — tell the Robin HOW to act')
    .option('--user-instructions <text>', 'User instructions — background knowledge for the Robin')
    .option('--model <model>', 'Model override (e.g. gpt-4o-mini)')
    .option('--time-zone <tz>', 'Robin time zone (e.g. America/New_York)')
    .option('--commit-message <msg>', 'Commit message for this config change')
    .action(async (agentId: string, cmdOpts: {
      name?: string;
      goalInstructions?: string;
      userInstructions?: string;
      model?: string;
      timeZone?: string;
      commitMessage?: string;
    }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body: Record<string, unknown> = {};
      if (cmdOpts.name) body.name = cmdOpts.name;
      if (cmdOpts.goalInstructions) body.goalInstructions = cmdOpts.goalInstructions;
      if (cmdOpts.userInstructions) body.userInstructions = cmdOpts.userInstructions;
      if (cmdOpts.model) body.model = cmdOpts.model;
      if (cmdOpts.timeZone) body.timeZone = cmdOpts.timeZone;
      if (cmdOpts.commitMessage) body.commitMessage = cmdOpts.commitMessage;
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>(`/agents/${agentId}`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>(`/agents/${agentId}`, body);
          return React.createElement(DetailView, { data, title: 'Robin Updated' });
        },
        'Updating Robin…',
      );
    });

  agents
    .command('threads <agentId>')
    .description("List a Robin's threads")
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--page-size <size>', 'Page size')
    .action(async (agentId: string, cmdOpts: { cursor?: string; pageSize?: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>(`/agents/${agentId}/threads`, { cursor: cmdOpts.cursor, pageSize: cmdOpts.pageSize })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>(`/agents/${agentId}/threads`, {
            cursor: cmdOpts.cursor,
            pageSize: cmdOpts.pageSize,
          });
          return paginatedTable(data, 'threads', '--cursor');
        },
        'Fetching threads…',
      );
    });

  agents
    .command('metadata <agentId>')
    .description('Get Robin customer metadata')
    .action(async (agentId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>(`/agents/${agentId}/metadata/customers`)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<Record<string, unknown>>(`/agents/${agentId}/metadata/customers`);
          return React.createElement(DetailView, { data, title: 'Robin Metadata' });
        },
        'Fetching metadata…',
      );
    });

  agents
    .command('configs <agentId>')
    .description('Get Robin configurations')
    .action(async (agentId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>(`/agents/${agentId}/configurations`)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>(`/agents/${agentId}/configurations`);
          return React.createElement(Table, { data: normalizeList(data) });
        },
        'Fetching configurations…',
      );
    });
}
