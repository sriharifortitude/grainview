/**
 * The eventgrain API, as the dashboard sees it. Shapes mirror the server's
 * `QueryResult` union one to one; nothing is transformed on the way in so
 * that a discrepancy between the two repositories shows up as a type
 * error here rather than a blank chart.
 */

export type Bucket = 'hour' | 'day' | 'week' | 'month';

export interface RangeInput {
  from: string;
  to: string;
}

export type QuerySpec =
  | { metric: 'count' | 'unique'; event: string; range: RangeInput; bucket: Bucket; filter: Record<string, string>; groupBy?: string }
  | { metric: 'funnel'; steps: string[]; range: RangeInput; windowDays: number; filter: Record<string, string> }
  | { metric: 'retention'; start: string; returning: string; range: RangeInput; periods: number };

export interface SeriesResult {
  metric: 'count' | 'unique';
  event: string;
  bucket: Bucket;
  timeZone: string;
  range: { from: string; to: string };
  source: 'rollup' | 'raw';
  series: Array<{ bucket: string; group?: string | null; value: number }>;
}

export interface FunnelResult {
  metric: 'funnel';
  range: { from: string; to: string };
  windowDays: number;
  steps: Array<{ event: string; count: number; conversion: number }>;
}

export interface RetentionResult {
  metric: 'retention';
  range: { from: string; to: string };
  timeZone: string;
  cohorts: Array<{ cohort: string; size: number; periods: number[] }>;
}

export type QueryResult = SeriesResult | FunnelResult | RetentionResult;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
  }
}

export interface Client {
  eventNames(): Promise<string[]>;
  query(spec: QuerySpec): Promise<QueryResult>;
}

/**
 * `base` is "" in development (Vite proxies /api) and in production when
 * the dashboard is served from the same origin as the API, which is the
 * deployment the README describes. There is no CORS story because there
 * is no cross-origin request.
 */
export function createClient(apiKey: string, base = ''): Client {
  const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(base + path, {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string; issues?: string[] };
      const message = response.status === 401 ? 'The API key was not accepted.' : (body.error ?? `Request failed (${response.status})`);
      throw new ApiError(response.status, message, body.issues ?? []);
    }
    return response.json() as Promise<T>;
  };
  return {
    eventNames: async () => (await call<{ names: string[] }>('/api/event-names')).names,
    query: (spec) => call<QueryResult>('/api/query', { method: 'POST', body: JSON.stringify(spec) }),
  };
}
