import readline from 'readline';
import { Command } from 'commander';
import { readConfig, writeConfig, clearConfig, maskKey } from '../config.js';

export function registerAuth(program: Command): void {
  const auth = program.command('auth').description('Manage authentication');

  auth
    .command('login')
    .description('Save API key and base URL to ~/.robin/config.json')
    .option('--key <key>', 'API key (non-interactive)')
    .option('--url <url>', 'Base URL (non-interactive)', 'https://api.robin.guide')
    .action(async (opts) => {
      if (opts.key) {
        // Non-interactive
        const config = readConfig();
        config.apiKey = opts.key;
        config.baseUrl = opts.url;
        writeConfig(config);
        console.log(`✓ Logged in. Key: ${maskKey(opts.key)}, URL: ${opts.url}`);
        return;
      }

      // Interactive — use readline
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      const question = (q: string): Promise<string> =>
        new Promise((resolve) => rl.question(q, resolve));

      const config = readConfig();
      const apiKey = await question('API key: ');
      const defaultUrl = config.baseUrl ?? 'https://api.robin.guide';
      const baseUrl = (await question(`Base URL [${defaultUrl}]: `)) || defaultUrl;

      rl.close();

      config.apiKey = apiKey.trim();
      config.baseUrl = baseUrl.trim();
      writeConfig(config);
      console.log(`✓ Logged in. Key: ${maskKey(config.apiKey)}, URL: ${config.baseUrl}`);
    });

  auth
    .command('logout')
    .description('Clear stored credentials')
    .action(() => {
      clearConfig();
      console.log('✓ Logged out. Config cleared.');
    });

  auth
    .command('status')
    .description('Show current auth config and check API reachability')
    .action(async () => {
      const config = readConfig();
      if (!config.apiKey) {
        console.log('Not logged in. Run `robin auth login`.');
        process.exit(1);
      }
      const baseUrl = config.baseUrl ?? 'https://api.robin.guide';
      console.log(`API Key:       ${maskKey(config.apiKey)}`);
      console.log(`Base URL:      ${baseUrl}`);
      console.log(`Default Agent: ${config.defaultAgent ?? '(none)'}`);
      console.log(`Default Team:  ${config.defaultTeam ?? '(none)'}`);

      // Check API reachability
      try {
        const statusUrl = `${baseUrl.replace(/\/$/, '')}/status`;
        const res = await fetch(statusUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          console.log(`API Status:    ✓ reachable (${res.status})`);
        } else {
          console.log(`API Status:    ⚠ ${res.status} ${res.statusText}`);
        }
      } catch {
        console.log(`API Status:    ✗ unreachable`);
      }
    });
}
