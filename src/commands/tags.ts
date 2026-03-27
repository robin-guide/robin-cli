import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderUI } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { readConfig } from '../config.js';

function resolveAgent(opts: GlobalOpts, cmdOpts: { agent?: string }): string {
  const agentId = cmdOpts.agent ?? opts.agent ?? readConfig().defaultAgent;
  if (!agentId) {
    console.error('Agent ID required. Pass --agent <id> or set a default with `robin config set default-agent`.');
    process.exit(1);
  }
  return agentId;
}

export function registerTags(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const tags = program.command('tags').description('Manage tags');

  tags
    .command('list')
    .description('List tags')
    .option('--agent <agentId>', 'Agent ID')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--limit <limit>', 'Limit')
    .action(async (cmdOpts: { agent?: string; cursor?: string; limit?: string }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      try {
        const data = await client.get<unknown>('/tags', {
          agentId,
          cursor: cmdOpts.cursor,
          limit: cmdOpts.limit,
        });
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : (data as { tags?: unknown[] }).tags ?? [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
    });

  tags
    .command('get <tagId>')
    .description('Get a single tag')
    .action(async (tagId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<Record<string, unknown>>(`/tags/${tagId}`);
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: `Tag: ${tagId}` }));
      } catch (err) { handleError(err); }
    });

  tags
    .command('create')
    .description('Create a tag')
    .option('--agent <agentId>', 'Agent ID')
    .requiredOption('--name <name>', 'Tag name')
    .option('--description <desc>', 'Description')
    .option('--visibility <visibility>', 'Visibility')
    .option('--keywords <keywords...>', 'Keywords')
    .option('--welcome-message <msg>', 'Welcome message')
    .action(async (cmdOpts: {
      agent?: string; name: string; description?: string;
      visibility?: string; keywords?: string[]; welcomeMessage?: string;
    }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      try {
        const data = await client.post<Record<string, unknown>>('/tags', {
          agentId,
          name: cmdOpts.name,
          ...(cmdOpts.description && { description: cmdOpts.description }),
          ...(cmdOpts.visibility && { visibility: cmdOpts.visibility }),
          ...(cmdOpts.keywords && { keywords: cmdOpts.keywords }),
          ...(cmdOpts.welcomeMessage && { welcomeMessage: cmdOpts.welcomeMessage }),
        });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Tag Created' }));
      } catch (err) { handleError(err); }
    });

  tags
    .command('update <tagId>')
    .description('Update a tag')
    .option('--description <desc>', 'New description')
    .option('--visibility <visibility>', 'New visibility')
    .option('--keywords <keywords...>', 'New keywords')
    .option('--welcome-message <msg>', 'New welcome message')
    .action(async (tagId: string, cmdOpts: {
      description?: string; visibility?: string; keywords?: string[]; welcomeMessage?: string;
    }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body: Record<string, unknown> = {};
      if (cmdOpts.description) body.description = cmdOpts.description;
      if (cmdOpts.visibility) body.visibility = cmdOpts.visibility;
      if (cmdOpts.keywords) body.keywords = cmdOpts.keywords;
      if (cmdOpts.welcomeMessage) body.welcomeMessage = cmdOpts.welcomeMessage;
      try {
        const data = await client.patch<Record<string, unknown>>(`/tags/${tagId}`, body);
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Tag Updated' }));
      } catch (err) { handleError(err); }
    });

  tags
    .command('delete <tagId>')
    .description('Delete a tag')
    .action(async (tagId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        await client.delete<unknown>(`/tags/${tagId}`);
        if (opts.json) return outputJSON({ deleted: true, tagId });
        console.log(`✓ Tag ${tagId} deleted.`);
      } catch (err) { handleError(err); }
    });

  tags
    .command('assign <customerId>')
    .description('Assign a tag to a customer')
    .requiredOption('--tag <tagId>', 'Tag ID')
    .action(async (customerId: string, cmdOpts: { tag: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.post<Record<string, unknown>>(`/customers/${customerId}/tags`, {
          tagId: cmdOpts.tag,
        });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Tag Assigned' }));
      } catch (err) { handleError(err); }
    });

  tags
    .command('unassign <customerId> <tagCustomerId>')
    .description('Remove a tag from a customer')
    .action(async (customerId: string, tagCustomerId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        await client.delete<unknown>(`/customers/${customerId}/tags/${tagCustomerId}`);
        if (opts.json) return outputJSON({ unassigned: true });
        console.log(`✓ Tag removed from customer ${customerId}.`);
      } catch (err) { handleError(err); }
    });
}
