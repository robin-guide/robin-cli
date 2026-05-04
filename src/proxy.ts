import { ProxyAgent, setGlobalDispatcher } from 'undici';

const proxyEnvVar = 'ROBIN_PROXY';

function normalizeProxyUrl(name: string, value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Warn below.
  }

  console.error(`Ignoring ${name}: expected an http:// or https:// proxy URL.`);
  return undefined;
}

export function getProxyUrlFromEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[proxyEnvVar];
  if (!value) return undefined;

  return normalizeProxyUrl(proxyEnvVar, value);
}

export function configureFetchProxy(env: NodeJS.ProcessEnv = process.env): void {
  const proxyUrl = getProxyUrlFromEnv(env);
  if (!proxyUrl) return;

  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

configureFetchProxy();
