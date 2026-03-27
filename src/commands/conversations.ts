import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderUI } from '../ui/render.js';
import { DetailView } from '../components/DetailView.js';
import { Table } from '../components/Table.js';

export function registerConversations(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const conversations = program.command('conversations').description('Manage conversations / threads');

  conversations
    .command('get <threadId>')
    .description('Get a conversation thread')
    .action(async (threadId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<Record<string, unknown>>(`/threads/${threadId}`);
        if (opts.json) return outputJSON(data);
        // If there are messages, show them as a table
        const msgs = (data.messages as unknown[] | undefined) ?? [];
        if (msgs.length > 0) {
          renderUI(React.createElement(Table, { data: msgs as Record<string, unknown>[] }));
        } else {
          renderUI(React.createElement(DetailView, { data, title: `Thread: ${threadId}` }));
        }
      } catch (err) { handleError(err); }
    });

  conversations
    .command('reply <threadId>')
    .description('Reply to a conversation')
    .requiredOption('--content <content>', 'Message content')
    .option('--media-asset-id <id>', 'Media asset ID')
    .action(async (threadId: string, cmdOpts: { content: string; mediaAssetId?: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.post<Record<string, unknown>>(`/threads/${threadId}/messages`, {
          content: cmdOpts.content,
          ...(cmdOpts.mediaAssetId && { mediaAssetId: cmdOpts.mediaAssetId }),
        });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Message Sent' }));
      } catch (err) { handleError(err); }
    });

  conversations
    .command('pause <threadId>')
    .description('Pause AI for a conversation')
    .action(async (threadId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.patch<Record<string, unknown>>(`/threads/${threadId}`, { agentPaused: true });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Conversation Paused' }));
      } catch (err) { handleError(err); }
    });

  conversations
    .command('resume <threadId>')
    .description('Resume AI for a conversation')
    .action(async (threadId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.patch<Record<string, unknown>>(`/threads/${threadId}`, { agentPaused: false });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Conversation Resumed' }));
      } catch (err) { handleError(err); }
    });
}
