import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderCommand, renderUI } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { DeleteFlow } from '../components/DeleteFlow.js';
import { SuccessBox } from '../components/SuccessBox.js';
import { resolveAgent, normalizeList } from '../utils.js';

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
      if (opts.json) {
        try { outputJSON(await client.get<unknown>('/tags', { agentId, cursor: cmdOpts.cursor, limit: cmdOpts.limit })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>('/tags', {
            agentId,
            cursor: cmdOpts.cursor,
            limit: cmdOpts.limit,
          });
          return React.createElement(Table, { data: normalizeList(data, 'tags') });
        },
        'Fetching tags…',
      );
    });

  tags
    .command('get <tagId>')
    .description('Get a single tag')
    .action(async (tagId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<Record<string, unknown>>(`/tags/${tagId}`)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<Record<string, unknown>>(`/tags/${tagId}`);
          return React.createElement(DetailView, { data, title: `Tag: ${tagId}` });
        },
        'Fetching tag…',
      );
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
      const body = {
        agentId,
        name: cmdOpts.name,
        ...(cmdOpts.description && { description: cmdOpts.description }),
        ...(cmdOpts.visibility && { visibility: cmdOpts.visibility }),
        ...(cmdOpts.keywords && { keywords: cmdOpts.keywords }),
        ...(cmdOpts.welcomeMessage && { welcomeMessage: cmdOpts.welcomeMessage }),
      };
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>('/tags', body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>('/tags', body);
          return React.createElement(DetailView, { data, title: 'Tag Created' });
        },
        'Creating tag…',
      );
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
      if (opts.json) {
        try { outputJSON(await client.patch<Record<string, unknown>>(`/tags/${tagId}`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.patch<Record<string, unknown>>(`/tags/${tagId}`, body);
          return React.createElement(DetailView, { data, title: 'Tag Updated' });
        },
        'Updating tag…',
      );
    });

  tags
    .command('delete <tagId>')
    .description('Delete a tag')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (tagId: string, cmdOpts: { yes?: boolean }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);

      if (opts.json || cmdOpts.yes) {
        try { outputJSON(await client.delete<unknown>(`/tags/${tagId}`)); }
        catch (err) { handleError(err); }
        return;
      }

      renderUI(
        React.createElement(DeleteFlow, {
          entityLabel: `tag ${tagId}`,
          doDelete: () => client.delete<unknown>(`/tags/${tagId}`),
        }),
      );
    });

  tags
    .command('assign <customerId>')
    .description('Assign a tag to a customer')
    .requiredOption('--tag <tagId>', 'Tag ID')
    .action(async (customerId: string, cmdOpts: { tag: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>(`/customers/${customerId}/tags`, { tagId: cmdOpts.tag })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>(`/customers/${customerId}/tags`, {
            tagId: cmdOpts.tag,
          });
          return React.createElement(DetailView, { data, title: 'Tag Assigned' });
        },
        'Assigning tag…',
      );
    });

  tags
    .command('unassign <customerId> <tagCustomerId>')
    .description('Remove a tag from a customer')
    .action(async (customerId: string, tagCustomerId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try {
          await client.delete<unknown>(`/customers/${customerId}/tags/${tagCustomerId}`);
          outputJSON({ unassigned: true });
        }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          await client.delete<unknown>(`/customers/${customerId}/tags/${tagCustomerId}`);
          return React.createElement(SuccessBox, { message: `Tag removed from customer ${customerId}.` });
        },
        'Removing tag…',
      );
    });
}
