import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderUI } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { resolveAgent } from '../utils.js';

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
      try {
        const data = await client.get<unknown>('/customers', {
          agentId,
          cursor: cmdOpts.cursor,
          pageSize: cmdOpts.pageSize,
          sortBy: cmdOpts.sortBy,
          sortOrder: cmdOpts.sortOrder,
          tagId: cmdOpts.tagId,
          name: cmdOpts.name,
          phone: cmdOpts.phone,
        });
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : (data as { customers?: unknown[] }).customers ?? [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
    });

  customers
    .command('get <customerId>')
    .description('Get a single customer')
    .option('--agent <agentId>', 'Agent ID')
    .action(async (customerId: string, cmdOpts: { agent?: string }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      try {
        const data = await client.get<Record<string, unknown>>(`/customers/${customerId}`, { agentId });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: `Customer: ${customerId}` }));
      } catch (err) { handleError(err); }
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
      try {
        const data = await client.post<Record<string, unknown>>('/customers', {
          agentId,
          phone: cmdOpts.phone,
          name: cmdOpts.name,
          ...(cmdOpts.optedIn !== undefined && { optedIn: cmdOpts.optedIn }),
          ...(cmdOpts.notes && { notes: cmdOpts.notes }),
          ...(cmdOpts.welcomeMessage && { welcomeMessage: cmdOpts.welcomeMessage }),
        });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Customer Created' }));
      } catch (err) { handleError(err); }
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
      try {
        // agentId goes as a query param, not in the PATCH body
        const data = await client.patch<Record<string, unknown>>(
          `/customers/${customerId}?agentId=${encodeURIComponent(agentId)}`,
          body,
        );
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Customer Updated' }));
      } catch (err) { handleError(err); }
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
      const fs = await import('fs');
      let contacts: unknown;
      try {
        contacts = JSON.parse(fs.readFileSync(cmdOpts.file, 'utf-8'));
      } catch {
        console.error(`Could not read file: ${cmdOpts.file}`);
        process.exit(1);
      }
      try {
        const data = await client.post<unknown>('/customers/bulk', {
          agentId,
          contacts,
          ...(cmdOpts.tagIds && { tagIds: cmdOpts.tagIds }),
        });
        if (opts.json) return outputJSON(data);
        const d = data as Record<string, unknown>;
        renderUI(React.createElement(DetailView, { data: d, title: 'Bulk Import Result' }));
      } catch (err) { handleError(err); }
    });

  customers
    .command('announcements <customerId>')
    .description('Get announcements for a customer')
    .option('--agent <agentId>', 'Agent ID')
    .action(async (customerId: string, cmdOpts: { agent?: string }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      try {
        const data = await client.get<unknown>(`/customers/${customerId}/announcements`, { agentId });
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
    });
}
