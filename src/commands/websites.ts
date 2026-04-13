import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderCommand, renderUI } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { DeleteFlow } from '../components/DeleteFlow.js';
import { normalizeList } from '../utils.js';

export function registerWebsites(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const websites = program.command('websites').description('Manage web crawler websites');

  websites
    .command('list <agentId>')
    .description('List websites for an agent')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--limit <limit>', 'Limit')
    .action(async (agentId: string, cmdOpts: { cursor?: string; limit?: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>(`/agents/${agentId}/tools/web-crawler/websites`, { cursor: cmdOpts.cursor, limit: cmdOpts.limit })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>(`/agents/${agentId}/tools/web-crawler/websites`, {
            cursor: cmdOpts.cursor,
            limit: cmdOpts.limit,
          });
          return React.createElement(Table, { data: normalizeList(data, 'websites') });
        },
        'Fetching websites…',
      );
    });

  websites
    .command('add <agentId>')
    .description('Add a website')
    .requiredOption('--url <url>', 'Website URL')
    .requiredOption('--description <desc>', 'Description')
    .action(async (agentId: string, cmdOpts: { url: string; description: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body = { url: cmdOpts.url, description: cmdOpts.description };
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>(`/agents/${agentId}/tools/web-crawler/websites`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>(
            `/agents/${agentId}/tools/web-crawler/websites`,
            body,
          );
          return React.createElement(DetailView, { data, title: 'Website Added' });
        },
        'Adding website…',
      );
    });

  websites
    .command('update <agentId> <websiteId>')
    .description('Update a website')
    .option('--url <url>', 'New URL')
    .option('--description <desc>', 'New description')
    .action(async (agentId: string, websiteId: string, cmdOpts: { url?: string; description?: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body: Record<string, unknown> = {};
      if (cmdOpts.url) body.url = cmdOpts.url;
      if (cmdOpts.description) body.description = cmdOpts.description;
      if (opts.json) {
        try { outputJSON(await client.patch<Record<string, unknown>>(`/agents/${agentId}/tools/web-crawler/websites/${websiteId}`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.patch<Record<string, unknown>>(
            `/agents/${agentId}/tools/web-crawler/websites/${websiteId}`,
            body,
          );
          return React.createElement(DetailView, { data, title: 'Website Updated' });
        },
        'Updating website…',
      );
    });

  websites
    .command('remove <agentId> <websiteId>')
    .description('Remove a website')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (agentId: string, websiteId: string, cmdOpts: { yes?: boolean }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);

      if (opts.json || cmdOpts.yes) {
        try {
          await client.delete<unknown>(`/agents/${agentId}/tools/web-crawler/websites/${websiteId}`);
          outputJSON({ removed: true, websiteId });
        }
        catch (err) { handleError(err); }
        return;
      }

      renderUI(
        React.createElement(DeleteFlow, {
          entityLabel: `website ${websiteId}`,
          doDelete: () => client.delete<unknown>(`/agents/${agentId}/tools/web-crawler/websites/${websiteId}`),
        }),
      );
    });

  websites
    .command('configure <agentId>')
    .description('Enable or disable the web crawler for an agent')
    .option('--enable', 'Enable web crawler')
    .option('--disable', 'Disable web crawler')
    .option('--system-instructions <instructions>', 'System instructions for the crawler')
    .action(async (agentId: string, cmdOpts: { enable?: boolean; disable?: boolean; systemInstructions?: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (!cmdOpts.enable && !cmdOpts.disable) {
        console.error('Pass --enable or --disable');
        process.exit(1);
      }
      const body: Record<string, unknown> = { enabled: !!cmdOpts.enable };
      if (cmdOpts.systemInstructions) body.systemInstructions = cmdOpts.systemInstructions;
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>(`/agents/${agentId}/tools/web-crawler`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>(
            `/agents/${agentId}/tools/web-crawler`,
            body,
          );
          return React.createElement(DetailView, {
            data,
            title: `Web Crawler ${cmdOpts.enable ? 'Enabled' : 'Disabled'}`,
          });
        },
        cmdOpts.enable ? 'Enabling web crawler…' : 'Disabling web crawler…',
      );
    });
}
