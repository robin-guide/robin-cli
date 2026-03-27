import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderUI } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';

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
      try {
        const data = await client.get<unknown>(`/agents/${agentId}/tools/web-crawler/websites`, {
          cursor: cmdOpts.cursor,
          limit: cmdOpts.limit,
        });
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : (data as { websites?: unknown[] }).websites ?? [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
    });

  websites
    .command('add <agentId>')
    .description('Add a website')
    .requiredOption('--url <url>', 'Website URL')
    .requiredOption('--description <desc>', 'Description')
    .action(async (agentId: string, cmdOpts: { url: string; description: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.post<Record<string, unknown>>(
          `/agents/${agentId}/tools/web-crawler/websites`,
          { url: cmdOpts.url, description: cmdOpts.description },
        );
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Website Added' }));
      } catch (err) { handleError(err); }
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
      try {
        const data = await client.patch<Record<string, unknown>>(
          `/agents/${agentId}/tools/web-crawler/websites/${websiteId}`,
          body,
        );
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Website Updated' }));
      } catch (err) { handleError(err); }
    });

  websites
    .command('remove <agentId> <websiteId>')
    .description('Remove a website')
    .action(async (agentId: string, websiteId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        await client.delete<unknown>(`/agents/${agentId}/tools/web-crawler/websites/${websiteId}`);
        if (opts.json) return outputJSON({ removed: true, websiteId });
        console.log(`✓ Website ${websiteId} removed.`);
      } catch (err) { handleError(err); }
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
      try {
        const data = await client.post<Record<string, unknown>>(
          `/agents/${agentId}/tools/web-crawler`,
          body,
        );
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: `Web Crawler ${cmdOpts.enable ? 'Enabled' : 'Disabled'}` }));
      } catch (err) { handleError(err); }
    });
}
