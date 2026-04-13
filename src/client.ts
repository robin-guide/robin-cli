import { readConfig } from './config.js';

export interface GlobalOpts {
  json?: boolean;
  apiKey?: string;
  baseUrl?: string;
  agent?: string;
  team?: string;
  verbose?: boolean;
}

/** The query-param value types accepted by the client. */
export type QueryValue = string | string[] | number | boolean | undefined;

/** Minimal interface for components that only need to call the API. */
export interface RobinClient {
  get: <T>(path: string, query?: Record<string, QueryValue>) => Promise<T>;
  post: <T>(path: string, body?: unknown) => Promise<T>;
  patch: <T>(path: string, body?: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
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
  } as RobinClient;
}

export interface FormattedError {
  message: string;
  detail?: string;
}

export function formatError(err: unknown): FormattedError {
  if (err instanceof RobinAPIError) {
    const detail = err.body
      ? typeof err.body === 'object' && err.body !== null && 'message' in err.body
        ? String((err.body as { message: string }).message)
        : JSON.stringify(err.body)
      : undefined;
    return { message: `Error ${err.status}: ${err.statusText}`, detail };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: 'An unknown error occurred' };
}

export function handleError(err: unknown): never {
  const { message, detail } = formatError(err);
  console.error(message);
  if (detail) console.error(detail);
  process.exit(1);
}
