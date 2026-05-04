import React from 'react';
import { Box, Text } from 'ink';
import fs from 'fs';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderCommand } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { resolveAgent, normalizeList } from '../utils.js';

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

export function registerCustomers(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const customers = program.command('customers').description('Manage customers');

  customers
    .command('list')
    .description('List customers')
    .option('--agent <agentId>', 'Agent ID')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--page-size <size>', 'Page size')
    .option('--sort-by <field>', 'Sort field')
    .option('--sort-order <order>', 'Sort order (asc|desc)')
    .option('--tag-id <tagId...>', 'Filter by tag IDs')
    .option('--name <name>', 'Filter by name')
    .option('--phone <phone>', 'Filter by phone')
    .action(async (cmdOpts: {
      agent?: string; cursor?: string; pageSize?: string; sortBy?: string;
      sortOrder?: string; tagId?: string[]; name?: string; phone?: string;
    }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      const query = {
        agentId,
        cursor: cmdOpts.cursor,
        pageSize: cmdOpts.pageSize,
        sortBy: cmdOpts.sortBy,
        sortOrder: cmdOpts.sortOrder,
        tagId: cmdOpts.tagId,
        name: cmdOpts.name,
        phone: cmdOpts.phone,
      };
      if (opts.json) {
        try { outputJSON(await client.get<unknown>('/customers', query)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>('/customers', query);
          return paginatedTable(data, 'customers', '--cursor');
        },
        'Fetching customers…',
      );
    });

  customers
    .command('get <customerId>')
    .description('Get a single customer')
    .option('--agent <agentId>', 'Agent ID')
    .action(async (customerId: string, cmdOpts: { agent?: string }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<Record<string, unknown>>(`/customers/${customerId}`, { agentId })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<Record<string, unknown>>(`/customers/${customerId}`, { agentId });
          return React.createElement(DetailView, { data, title: `Customer: ${customerId}` });
        },
        'Fetching customer…',
      );
    });

  customers
    .command('create')
    .description('Create a customer')
    .option('--agent <agentId>', 'Agent ID')
    .requiredOption('--phone <phone>', 'Phone number')
    .requiredOption('--name <name>', 'Customer name')
    .option('--opted-in', 'Mark as opted in')
    .option('--notes <notes>', 'Notes')
    .option('--welcome-message <msg>', 'Welcome message')
    .action(async (cmdOpts: {
      agent?: string; phone: string; name: string;
      optedIn?: boolean; notes?: string; welcomeMessage?: string;
    }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      const body = {
        agentId,
        phone: cmdOpts.phone,
        name: cmdOpts.name,
        ...(cmdOpts.optedIn !== undefined && { optedIn: cmdOpts.optedIn }),
        ...(cmdOpts.notes && { notes: cmdOpts.notes }),
        ...(cmdOpts.welcomeMessage && { welcomeMessage: cmdOpts.welcomeMessage }),
      };
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>('/customers', body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>('/customers', body);
          return React.createElement(DetailView, { data, title: 'Customer Created' });
        },
        'Creating customer…',
      );
    });

  customers
    .command('update <customerId>')
    .description('Update a customer')
    .option('--agent <agentId>', 'Agent ID')
    .option('--name <name>', 'New name')
    .option('--notes <notes>', 'New notes')
    .option('--opted-in <bool>', 'Opted in status (true|false)')
    .action(async (customerId: string, cmdOpts: {
      agent?: string; name?: string; notes?: string; optedIn?: string;
    }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      const body: Record<string, unknown> = {};
      if (cmdOpts.name) body.name = cmdOpts.name;
      if (cmdOpts.notes) body.notes = cmdOpts.notes;
      if (cmdOpts.optedIn !== undefined) body.optedIn = cmdOpts.optedIn === 'true';
      if (opts.json) {
        try { outputJSON(await client.patch<Record<string, unknown>>(`/customers/${customerId}?agentId=${encodeURIComponent(agentId)}`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.patch<Record<string, unknown>>(
            `/customers/${customerId}?agentId=${encodeURIComponent(agentId)}`,
            body,
          );
          return React.createElement(DetailView, { data, title: 'Customer Updated' });
        },
        'Updating customer…',
      );
    });

  customers
    .command('bulk-import')
    .description('Bulk import customers from a JSON file')
    .option('--agent <agentId>', 'Agent ID')
    .requiredOption('--file <path>', 'Path to contacts JSON file')
    .option('--tag-ids <ids...>', 'Tag IDs to assign')
    .action(async (cmdOpts: { agent?: string; file: string; tagIds?: string[] }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      let contacts: unknown;
      try {
        contacts = JSON.parse(fs.readFileSync(cmdOpts.file, 'utf-8'));
      } catch {
        console.error(`Could not read file: ${cmdOpts.file}`);
        process.exit(1);
      }
      const body = {
        agentId,
        contacts,
        ...(cmdOpts.tagIds && { tagIds: cmdOpts.tagIds }),
      };
      if (opts.json) {
        try { outputJSON(await client.post<unknown>('/customers/bulk', body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>('/customers/bulk', body);
          return React.createElement(DetailView, { data, title: 'Bulk Import Result' });
        },
        'Importing customers…',
      );
    });

  customers
    .command('announcements <customerId>')
    .description('Get announcements for a customer')
    .option('--agent <agentId>', 'Agent ID')
    .action(async (customerId: string, cmdOpts: { agent?: string }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>(`/customers/${customerId}/announcements`, { agentId })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>(`/customers/${customerId}/announcements`, { agentId });
          return React.createElement(Table, { data: normalizeList(data) });
        },
        'Fetching customer announcements…',
      );
    });
}
