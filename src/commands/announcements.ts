import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderUI } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';

export function registerAnnouncements(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const announcements = program.command('announcements').description('Manage announcements');

  announcements
    .command('list <agentId>')
    .description('List announcements for an agent')
    .action(async (agentId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<unknown>(`/announcements/${agentId}`);
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : (data as { announcements?: unknown[] }).announcements ?? [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
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
      try {
        const data = await client.post<Record<string, unknown>>(`/announcements/${agentId}`, {
          title: cmdOpts.title,
          content: cmdOpts.content,
          sendAt: cmdOpts.sendAt,
          ...(cmdOpts.tagIds && { tagIds: cmdOpts.tagIds }),
          ...(cmdOpts.phoneNumbers && { phoneNumbers: cmdOpts.phoneNumbers }),
          ...(cmdOpts.mediaAssetId && { mediaAssetId: cmdOpts.mediaAssetId }),
        });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Announcement Created' }));
      } catch (err) { handleError(err); }
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
      try {
        const data = await client.patch<Record<string, unknown>>(`/announcements/${announcementId}`, body);
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Announcement Updated' }));
      } catch (err) { handleError(err); }
    });

  announcements
    .command('delete <announcementId>')
    .description('Delete an announcement')
    .action(async (announcementId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.delete<unknown>(`/announcements/${announcementId}`);
        if (opts.json) return outputJSON(data);
        console.log(`✓ Announcement ${announcementId} deleted.`);
      } catch (err) { handleError(err); }
    });

  announcements
    .command('tag-counts <agentId>')
    .description('Get tag counts for announcements')
    .option('--tag-ids <ids...>', 'Tag IDs to filter')
    .action(async (agentId: string, cmdOpts: { tagIds?: string[] }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<unknown>(`/announcements/${agentId}/tag-counts`, {
          tagIds: cmdOpts.tagIds,
        });
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
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
      try {
        const data = await client.post<Record<string, unknown>>(`/announcements/${agentId}/singleton/`, {
          customerId: cmdOpts.customer,
          content: cmdOpts.content,
          sendAt: cmdOpts.sendAt,
          ...(cmdOpts.mediaAssetId && { mediaAssetId: cmdOpts.mediaAssetId }),
        });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Message Scheduled' }));
      } catch (err) { handleError(err); }
    });
}
