import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderCommand, renderUI } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';
import { DeleteFlow } from '../components/DeleteFlow.js';
import { normalizeList } from '../utils.js';

export function registerAnnouncements(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const announcements = program.command('announcements').description('Manage announcements');

  announcements
    .command('list <agentId>')
    .description('List announcements for an agent')
    .action(async (agentId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>(`/announcements/${agentId}`)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>(`/announcements/${agentId}`);
          return React.createElement(Table, { data: normalizeList(data, 'announcements') });
        },
        'Fetching announcements…',
      );
    });

  announcements
    .command('create <agentId>')
    .description('Create an announcement')
    .requiredOption('--title <title>', 'Title')
    .requiredOption('--content <content>', 'Content')
    .requiredOption('--send-at <iso>', 'Send time (ISO 8601)')
    .option('--tag-ids <ids...>', 'Tag IDs')
    .option('--phone-numbers <phones...>', 'Phone numbers')
    .option('--media-asset-id <id>', 'Media asset ID')
    .action(async (agentId: string, cmdOpts: {
      title: string; content: string; sendAt: string;
      tagIds?: string[]; phoneNumbers?: string[]; mediaAssetId?: string;
    }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body = {
        title: cmdOpts.title,
        content: cmdOpts.content,
        sendAt: cmdOpts.sendAt,
        ...(cmdOpts.tagIds && { tagIds: cmdOpts.tagIds }),
        ...(cmdOpts.phoneNumbers && { phoneNumbers: cmdOpts.phoneNumbers }),
        ...(cmdOpts.mediaAssetId && { mediaAssetId: cmdOpts.mediaAssetId }),
      };
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>(`/announcements/${agentId}`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>(`/announcements/${agentId}`, body);
          return React.createElement(DetailView, { data, title: 'Announcement Created' });
        },
        'Creating announcement…',
      );
    });

  announcements
    .command('update <announcementId>')
    .description('Update an announcement')
    .option('--title <title>', 'New title')
    .option('--content <content>', 'New content')
    .option('--send-at <iso>', 'New send time (ISO 8601)')
    .option('--tag-ids <ids...>', 'New tag IDs')
    .action(async (announcementId: string, cmdOpts: {
      title?: string; content?: string; sendAt?: string; tagIds?: string[];
    }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body: Record<string, unknown> = {};
      if (cmdOpts.title) body.title = cmdOpts.title;
      if (cmdOpts.content) body.content = cmdOpts.content;
      if (cmdOpts.sendAt) body.sendAt = cmdOpts.sendAt;
      if (cmdOpts.tagIds) body.tagIds = cmdOpts.tagIds;
      if (opts.json) {
        try { outputJSON(await client.patch<Record<string, unknown>>(`/announcements/${announcementId}`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.patch<Record<string, unknown>>(`/announcements/${announcementId}`, body);
          return React.createElement(DetailView, { data, title: 'Announcement Updated' });
        },
        'Updating announcement…',
      );
    });

  announcements
    .command('delete <announcementId>')
    .description('Delete an announcement')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (announcementId: string, cmdOpts: { yes?: boolean }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);

      if (opts.json || cmdOpts.yes) {
        try { outputJSON(await client.delete<unknown>(`/announcements/${announcementId}`)); }
        catch (err) { handleError(err); }
        return;
      }

      renderUI(
        React.createElement(DeleteFlow, {
          entityLabel: `announcement ${announcementId}`,
          doDelete: () => client.delete<unknown>(`/announcements/${announcementId}`),
        }),
      );
    });

  announcements
    .command('tag-counts <agentId>')
    .description('Get tag counts for announcements')
    .option('--tag-ids <ids...>', 'Tag IDs to filter')
    .action(async (agentId: string, cmdOpts: { tagIds?: string[] }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      if (opts.json) {
        try { outputJSON(await client.get<unknown>(`/announcements/${agentId}/tag-counts`, { tagIds: cmdOpts.tagIds })); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.get<unknown>(`/announcements/${agentId}/tag-counts`, {
            tagIds: cmdOpts.tagIds,
          });
          return React.createElement(Table, { data: normalizeList(data) });
        },
        'Fetching tag counts…',
      );
    });

  announcements
    .command('schedule-message <agentId>')
    .description('Schedule a one-off message to a customer')
    .requiredOption('--customer <customerId>', 'Customer ID')
    .requiredOption('--content <content>', 'Message content')
    .requiredOption('--send-at <iso>', 'Send time (ISO 8601)')
    .option('--media-asset-id <id>', 'Media asset ID')
    .action(async (agentId: string, cmdOpts: {
      customer: string; content: string; sendAt: string; mediaAssetId?: string;
    }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body = {
        customerId: cmdOpts.customer,
        content: cmdOpts.content,
        sendAt: cmdOpts.sendAt,
        ...(cmdOpts.mediaAssetId && { mediaAssetId: cmdOpts.mediaAssetId }),
      };
      if (opts.json) {
        try { outputJSON(await client.post<Record<string, unknown>>(`/announcements/${agentId}/singleton/`, body)); }
        catch (err) { handleError(err); }
        return;
      }
      renderCommand(
        async () => {
          const data = await client.post<Record<string, unknown>>(`/announcements/${agentId}/singleton/`, body);
          return React.createElement(DetailView, { data, title: 'Message Scheduled' });
        },
        'Scheduling message…',
      );
    });
}
