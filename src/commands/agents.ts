import React from 'react';
import { Command } from 'commander';
import { createClient, handleError, GlobalOpts } from '../client.js';
import { outputJSON, renderUI } from '../ui/render.js';
import { Table } from '../components/Table.js';
import { DetailView } from '../components/DetailView.js';

export function registerAgents(program: Command, getGlobalOpts: () => GlobalOpts): void {
  const agents = program.command('agents').description('Manage Robin agents');

  agents
    .command('list')
    .description('List all agents')
    .action(async () => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<unknown>('/agents');
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : (data as { agents?: unknown[] }).agents ?? [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
    });

  agents
    .command('get <agentId>')
    .description('Get a single agent')
    .action(async (agentId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<Record<string, unknown>>(`/agents/${agentId}`);
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: `Agent: ${agentId}` }));
      } catch (err) { handleError(err); }
    });

  agents
    .command('create')
    .description('Create a new agent')
    .requiredOption('--name <name>', 'Agent name')
    .option('--team <teamId>', 'Team ID')
    .option('--goal-instructions <text>', 'Goal instructions — tell the agent HOW to act')
    .option('--user-instructions <text>', 'User instructions — background knowledge for the agent')
    .option('--model <model>', 'Model override (e.g. gpt-4o-mini)')
    .option('--time-zone <tz>', 'Agent time zone (e.g. America/New_York)')
    .action(async (cmdOpts: {
      name: string;
      team?: string;
      goalInstructions?: string;
      userInstructions?: string;
      model?: string;
      timeZone?: string;
    }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const teamId = cmdOpts.team ?? opts.team;
      try {
        const data = await client.post<Record<string, unknown>>('/agents', {
          name: cmdOpts.name,
          ...(teamId && { teamExternalId: teamId }),
          ...(cmdOpts.goalInstructions && { goalInstructions: cmdOpts.goalInstructions }),
          ...(cmdOpts.userInstructions && { userInstructions: cmdOpts.userInstructions }),
          ...(cmdOpts.model && { model: cmdOpts.model }),
          ...(cmdOpts.timeZone && { timeZone: cmdOpts.timeZone }),
        });
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Agent Created' }));
      } catch (err) { handleError(err); }
    });

  agents
    .command('update <agentId>')
    .description('Update an agent')
    .option('--name <name>', 'New name')
    .option('--goal-instructions <text>', 'Goal instructions — tell the agent HOW to act')
    .option('--user-instructions <text>', 'User instructions — background knowledge for the agent')
    .option('--model <model>', 'Model override (e.g. gpt-4o-mini)')
    .option('--time-zone <tz>', 'Agent time zone (e.g. America/New_York)')
    .option('--commit-message <msg>', 'Commit message for this config change')
    .action(async (agentId: string, cmdOpts: {
      name?: string;
      goalInstructions?: string;
      userInstructions?: string;
      model?: string;
      timeZone?: string;
      commitMessage?: string;
    }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      const body: Record<string, unknown> = {};
      if (cmdOpts.name) body.name = cmdOpts.name;
      if (cmdOpts.goalInstructions) body.goalInstructions = cmdOpts.goalInstructions;
      if (cmdOpts.userInstructions) body.userInstructions = cmdOpts.userInstructions;
      if (cmdOpts.model) body.model = cmdOpts.model;
      if (cmdOpts.timeZone) body.timeZone = cmdOpts.timeZone;
      if (cmdOpts.commitMessage) body.commitMessage = cmdOpts.commitMessage;
      try {
        const data = await client.post<Record<string, unknown>>(`/agents/${agentId}`, body);
        if (opts.json) return outputJSON(data);
        renderUI(React.createElement(DetailView, { data, title: 'Agent Updated' }));
      } catch (err) { handleError(err); }
    });

  agents
    .command('threads <agentId>')
    .description("List agent's threads")
    .option('--cursor <cursor>', 'Pagination cursor')
    .option('--page-size <size>', 'Page size')
    .action(async (agentId: string, cmdOpts: { cursor?: string; pageSize?: string }) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<unknown>(`/agents/${agentId}/threads`, {
          cursor: cmdOpts.cursor,
          pageSize: cmdOpts.pageSize,
        });
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : (data as { threads?: unknown[] }).threads ?? [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
    });

  agents
    .command('metadata <agentId>')
    .description('Get agent customer metadata')
    .action(async (agentId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<unknown>(`/agents/${agentId}/metadata/customers`);
        if (opts.json) return outputJSON(data);
        const d = data as Record<string, unknown>;
        renderUI(React.createElement(DetailView, { data: d, title: 'Agent Metadata' }));
      } catch (err) { handleError(err); }
    });

  agents
    .command('configs <agentId>')
    .description('Get agent configurations')
    .action(async (agentId: string) => {
      const opts = getGlobalOpts();
      const client = createClient(opts);
      try {
        const data = await client.get<unknown>(`/agents/${agentId}/configurations`);
        if (opts.json) return outputJSON(data);
        const items = Array.isArray(data) ? data : [data];
        renderUI(React.createElement(Table, { data: items as Record<string, unknown>[] }));
      } catch (err) { handleError(err); }
    });
}
