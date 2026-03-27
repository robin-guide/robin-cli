import { readConfig } from './config.js';

export interface GlobalOpts {
  json?: boolean;
  apiKey?: string;
  baseUrl?: string;
  agent?: string;
  team?: string;
  verbose?: boolean;
}

export class RobinAPIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'RobinAPIError';
  }
}

export function createClient(opts: GlobalOpts) {
  const config = readConfig();
  const resolvedApiKey = opts.apiKey ?? config.apiKey;
  const baseUrl = (opts.baseUrl ?? config.baseUrl ?? 'https://api.robin.guide').replace(/\/$/, '');

  if (!resolvedApiKey) {
    console.error('No API key configured. Run `robin auth login` or pass --api-key.');
    process.exit(1);
  }

  const apiKey: string = resolvedApiKey;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | string[] | number | boolean | undefined>,
  ): Promise<T> {
    let url = `${baseUrl}${path}`;

    if (queryParams) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(queryParams)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          v.forEach((item) => params.append(k, String(item)));
        } else {
          params.append(k, String(v));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (opts.verbose) {
      console.error(`→ ${method} ${url}`);
      console.error(`  Headers: x-api-key: ${apiKey.slice(0, 8)}****`);
      if (body) console.error(`  Body: ${JSON.stringify(body, null, 2)}`);
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let responseBody: unknown;
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      responseBody = await res.json();
    } else {
      responseBody = await res.text();
    }

    if (opts.verbose) {
      console.error(`← ${res.status} ${res.statusText}`);
      console.error(`  Body: ${JSON.stringify(responseBody, null, 2)}`);
    }

    if (!res.ok) {
      throw new RobinAPIError(res.status, res.statusText, responseBody);
    }

    return responseBody as T;
  }

  return {
    get: <T>(path: string, query?: Record<string, string | string[] | number | boolean | undefined>) =>
      request<T>('GET', path, undefined, query),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  };
}

export function handleError(err: unknown): never {
  if (err instanceof RobinAPIError) {
    console.error(`Error ${err.status}: ${err.statusText}`);
    if (err.body) {
      const msg =
        typeof err.body === 'object' && err.body !== null && 'message' in err.body
          ? (err.body as { message: string }).message
          : JSON.stringify(err.body);
      console.error(msg);
    }
  } else if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error('Unknown error', err);
  }
  process.exit(1);
}
