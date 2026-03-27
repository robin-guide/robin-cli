import fs from 'fs';
import os from 'os';
import path from 'path';

export interface RobinConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultAgent?: string;
  defaultTeam?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.robin');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function readConfig(): RobinConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as RobinConfig;
  } catch {
    return {};
  }
}

export function writeConfig(config: RobinConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function clearConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 8) + '****' + key.slice(-4);
}
