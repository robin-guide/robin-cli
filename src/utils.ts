import { GlobalOpts } from './client.js';
import { readConfig } from './config.js';

/**
 * Resolve a Robin ID from (in priority order):
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
      'Robin ID required. Pass --agent <id> or set a default with `robin config set default-agent`.',
    );
    process.exit(1);
  }
  return agentId;
}

/**
 * Normalize a variety of API response shapes into a flat array of row objects.
 * Handles: raw arrays, paginated envelopes ({ [key]: T[] }), and scalar objects.
 */
export function normalizeList(
  data: unknown,
  envelopeKey?: string,
): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (
    envelopeKey &&
    typeof data === 'object' &&
    data !== null &&
    envelopeKey in data
  ) {
    const val = (data as Record<string, unknown>)[envelopeKey];
    if (Array.isArray(val)) return val as Record<string, unknown>[];
  }
  if (
    typeof data === 'object' &&
    data !== null &&
    'data' in data
  ) {
    const val = (data as Record<string, unknown>).data;
    if (Array.isArray(val)) return val as Record<string, unknown>[];
  }
  return [data as Record<string, unknown>];
}
