import { useEffect, useId, useState } from 'react';

import { ApiError, createClient, type Client, type QueryResult, type QuerySpec } from '@/api/eventgrain';
import { FunnelChart } from '@/charts/FunnelChart';
import { RetentionGrid } from '@/charts/RetentionGrid';
import { SeriesChart } from '@/charts/SeriesChart';
import { resultToCsv } from '@/csv';
import { emptyDraft, QueryForm, type Draft } from './components/QueryForm';
import { loadViews, SavedViews, storeViews, type SavedView } from './components/SavedViews';

const KEY_STORAGE = 'grainview.apiKey';

/**
 * The API key is kept in sessionStorage: it survives a reload, not a
 * closed tab, and never reaches localStorage where it would outlive the
 * person's intent. The gate explains that in one sentence.
 */
function readKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function App({ makeClient = createClient }: { readonly makeClient?: (key: string) => Client }): React.JSX.Element {
  const [apiKey, setApiKey] = useState(readKey);
  const [client, setClient] = useState<Client | null>(() => (apiKey ? makeClient(apiKey) : null));
  const [eventNames, setEventNames] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [views, setViews] = useState<SavedView[]>(loadViews);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [lastSpec, setLastSpec] = useState<QuerySpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = { key: useId(), results: useId() };

  useEffect(() => {
    if (client === null) return;
    client
      .eventNames()
      .then(setEventNames)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setClient(null);
          setError('The API key was not accepted.');
        }
      });
  }, [client]);

  const connect = (): void => {
    const key = apiKey.trim();
    if (!key) return;
    try {
      sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      // fine: the key lives in memory for this page only
    }
    setError(null);
    setClient(makeClient(key));
  };

  const disconnect = (): void => {
    try {
      sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      // nothing to remove
    }
    setApiKey('');
    setClient(null);
    setResult(null);
    setEventNames([]);
  };

  const run = async (spec: QuerySpec): Promise<void> => {
    if (client === null) return;
    setRunning(true);
    setError(null);
    try {
      const next = await client.query(spec);
      setResult(next);
      setLastSpec(spec);
      // Move attention to the results so a keyboard or screen reader user is not left on the button.
      queueMicrotask(() => document.getElementById(ids.results)?.focus());
    } catch (e) {
      setError(e instanceof ApiError ? [e.message, ...e.issues].join(' ') : 'The request failed. Check that the API is reachable.');
    } finally {
      setRunning(false);
    }
  };

  const download = (): void => {
    if (result === null) return;
    const blob = new Blob([resultToCsv(result)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.metric}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <h1>grainview</h1>
        {client !== null && (
          <button type="button" onClick={disconnect}>
            Disconnect
          </button>
        )}
      </header>
      <main id="main">
        {client === null ? (
          <form
            className="gate"
            onSubmit={(e) => {
              e.preventDefault();
              connect();
            }}
          >
            <h2>Connect to eventgrain</h2>
            <div className="field">
              <label htmlFor={ids.key}>Project API key</label>
              <input id={ids.key} type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} aria-describedby={`${ids.key}-hint`} />
              <p id={`${ids.key}-hint`} className="hint">
                Kept in this tab&rsquo;s session storage only; closing the tab forgets it.
              </p>
            </div>
            {error !== null && <p role="alert" className="form-errors">{error}</p>}
            <button type="submit" disabled={!apiKey.trim()}>
              Connect
            </button>
          </form>
        ) : (
          <div className="layout">
            <aside>
              <QueryForm draft={draft} onChange={setDraft} onRun={(spec) => void run(spec)} eventNames={eventNames} running={running} />
              <SavedViews
                views={views}
                current={draft}
                onChange={(next) => {
                  setViews(next);
                  storeViews(next);
                }}
                onLoad={setDraft}
              />
            </aside>
            <section id={ids.results} tabIndex={-1} aria-labelledby={`${ids.results}-title`} aria-busy={running} className="results">
              <h2 id={`${ids.results}-title`}>Results</h2>
              {error !== null && (
                <p role="alert" className="form-errors">
                  {error}
                </p>
              )}
              {result === null && error === null && <p className="hint">Run a query to see a chart here.</p>}
              {result !== null && (
                <>
                  <p className="result-meta">
                    {lastSpec !== null && <code>{JSON.stringify(lastSpec)}</code>}
                    {'source' in result && <span className="badge">answered from {result.source === 'rollup' ? 'daily rollups' : 'raw events'}</span>}
                  </p>
                  {result.metric === 'funnel' ? <FunnelChart result={result} /> : result.metric === 'retention' ? <RetentionGrid result={result} /> : <SeriesChart result={result} />}
                  <p>
                    <button type="button" onClick={download}>
                      Download CSV
                    </button>
                  </p>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}
