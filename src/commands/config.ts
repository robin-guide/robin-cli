import { Command } from 'commander';
import { readConfig, writeConfig } from '../config.js';

const VALID_KEYS = ['default-agent', 'default-team', 'base-url'];

export function registerConfig(program: Command): void {
  const config = program.command('config').description('Manage CLI configuration');

  config
    .command('set <key> <value>')
    .description(`Set a config value. Valid keys: ${VALID_KEYS.join(', ')}`)
    .action((key: string, value: string) => {
      const cfg = readConfig();
      switch (key) {
        case 'default-agent':
          cfg.defaultAgent = value;
          break;
        case 'default-team':
          cfg.defaultTeam = value;
          break;
        case 'base-url':
          cfg.baseUrl = value;
          break;
        default:
          console.error(`Unknown config key: ${key}. Valid keys: ${VALID_KEYS.join(', ')}`);
          process.exit(1);
      }
      writeConfig(cfg);
      console.log(`✓ Set ${key} = ${value}`);
    });

  config
    .command('get <key>')
    .description('Get a config value')
    .action((key: string) => {
      const cfg = readConfig();
      switch (key) {
        case 'default-agent':
          console.log(cfg.defaultAgent ?? '(not set)');
          break;
        case 'default-team':
          console.log(cfg.defaultTeam ?? '(not set)');
          break;
        case 'base-url':
          console.log(cfg.baseUrl ?? 'https://api.robinai.com');
          break;
        default:
          console.error(`Unknown config key: ${key}`);
          process.exit(1);
      }
    });

  config
    .command('list')
    .description('List all config values')
    .action(() => {
      const cfg = readConfig();
      console.log(`default-agent  ${cfg.defaultAgent ?? '(not set)'}`);
      console.log(`default-team   ${cfg.defaultTeam ?? '(not set)'}`);
      console.log(`base-url       ${cfg.baseUrl ?? 'https://api.robinai.com'}`);
    });
}
