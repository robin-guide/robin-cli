import { GlobalOpts } from './client.js';
import { readConfig } from './config.js';

/**
 * Resolve an agent ID from (in priority order):
 * 1. Command-level --agent flag
 * 2. Global --agent flag
 * 3. Stored default-agent in config
 *
 * Exits with a helpful message if none is found.
 */
export function resolveAgent(opts: GlobalOpts, cmdOpts: { agent?: string }): string {
  const agentId = cmdOpts.agent ?? opts.agent ?? readConfig().defaultAgent;
  if (!agentId) {
    console.error(
      'Agent ID required. Pass --agent <id> or set a default with `robin config set default-agent`.',
    );
    process.exit(1);
  }
  return agentId;
}
