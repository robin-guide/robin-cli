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
    .option('--agent <agentId>', 'Robin ID')
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--limit <limit>', 'Limit')
    .action(async (cmdOpts: { agent?: string; cursor?: string; limit?: string }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>('/tags', { agentId, startAfter: cmdOpts.cursor, limit: cmdOpts.limit })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>('/tags', {
            agentId,
            startAfter: cmdOpts.cursor,
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
    .option('--agent <agentId>', 'Robin ID')
    .requiredOption('--name <name>', 'Tag name')
    .option('--description <desc>', 'Description')
    .option('--visibility <visibility>', 'Visibility (PRIVATE | CONTEXTUAL | PUBLIC)')
    .option('--additional-keywords <keywords...>', 'Additional subscribe keywords (PUBLIC tags only)')
    .option('--welcome-message <msg>', 'Welcome message')
    .action(async (cmdOpts: {
      agent?: string; name: string; description?: string;
      visibility?: string; additionalKeywords?: string[]; welcomeMessage?: string;
    }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      const body = {
        agentId,
        name: cmdOpts.name,
        ...(cmdOpts.description && { description: cmdOpts.description }),
        ...(cmdOpts.visibility && { visibility: cmdOpts.visibility }),
        ...(cmdOpts.additionalKeywords && { additionalKeywords: cmdOpts.additionalKeywords }),
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
    .option('--visibility <visibility>', 'New visibility (PRIVATE | CONTEXTUAL | PUBLIC)')
    .option('--additional-keywords <keywords...>', 'New additional subscribe keywords')
    .option('--welcome-message <msg>', 'New welcome message')
    .action(async (tagId: string, cmdOpts: {
      description?: string; visibility?: string; additionalKeywords?: string[]; welcomeMessage?: string;
    }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body: Record<string, unknown> = {};
      if (cmdOpts.description) body.description = cmdOpts.description;
      if (cmdOpts.visibility) body.visibility = cmdOpts.visibility;
      if (cmdOpts.additionalKeywords) body.additionalKeywords = cmdOpts.additionalKeywords;
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
    .option('--agent <agentId>', 'Robin ID')
    .action(async (customerId: string, tagCustomerId: string, cmdOpts: { agent?: string }) => {
      const opts = getGlobalOpts();
      const agentId = resolveAgent(opts, cmdOpts);
      const client = createClient(opts);
      const path = `/customers/${customerId}/tags/${tagCustomerId}?agentId=${encodeURIComponent(agentId)}`;
      if (opts.json) {
        try {
          await client.delete<unknown>(path);
          outputJSON({ unassigned: true });
        }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          await client.delete<unknown>(path);
          return React.createElement(SuccessBox, { message: `Tag removed from customer ${customerId}.` });
        },
        'Removing tag…',
      );
    });
}
