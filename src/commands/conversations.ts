import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderCommand } from '../ui/render.js';
import { DetailView } from '../components/DetailView.js';
import { Table } from '../components/Table.js';
import { normalizeList } from '../utils.js';

export function registerConversations(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const conversations = program.command('conversations').description('Manage conversations / threads');

  conversations
    .command('get <threadId>')
    .description('Get a conversation thread')
    .action(async (threadId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<Record<string, unknown>>(`/threads/${threadId}`)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<Record<string, unknown>>(`/threads/${threadId}`);
          const msgs = (data.messages as unknown[] | undefined) ?? [];
          if (msgs.length > 0) {
            return React.createElement(Table, { data: normalizeList(msgs) });
          }
          return React.createElement(DetailView, { data, title: `Thread: ${threadId}` });
        },
        'Fetching conversation…',
      );
    });

  conversations
    .command('reply <threadId>')
    .description('Reply to a conversation')
    .requiredOption('--content <content>', 'Message content')
    .option('--media-asset-id <id>', 'Media asset ID')
    .action(async (threadId: string, cmdOpts: { content: string; mediaAssetId?: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body = {
        content: cmdOpts.content,
        ...(cmdOpts.mediaAssetId && { mediaAssetId: cmdOpts.mediaAssetId }),
      };
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>(`/threads/${threadId}/messages`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>(`/threads/${threadId}/messages`, body);
          return React.createElement(DetailView, { data, title: 'Message Sent' });
        },
        'Sending reply…',
      );
    });

  conversations
    .command('pause <threadId>')
    .description('Pause AI for a conversation')
    .action(async (threadId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.patch<Record<string, unknown>>(`/threads/${threadId}`, { agentPaused: true })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.patch<Record<string, unknown>>(`/threads/${threadId}`, { agentPaused: true });
          return React.createElement(DetailView, { data, title: 'Conversation Paused' });
        },
        'Pausing conversation…',
      );
    });

  conversations
    .command('resume <threadId>')
    .description('Resume AI for a conversation')
    .action(async (threadId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.patch<Record<string, unknown>>(`/threads/${threadId}`, { agentPaused: false })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.patch<Record<string, unknown>>(`/threads/${threadId}`, { agentPaused: false });
          return React.createElement(DetailView, { data, title: 'Conversation Resumed' });
        },
        'Resuming conversation…',
      );
    });
}
