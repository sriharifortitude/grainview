import { useId, useState, type FormEvent } from 'react';

import type { Draft } from './QueryForm';

export interface SavedView {
  name: string;
  draft: Draft;
}

const KEY = 'grainview.views';

/**
 * Saved views live in this browser's localStorage: they are a per-person
 * convenience, not shared state, and the API key is deliberately not part
 * of them. Reads are guarded because storage can be absent or throw.
 */
export function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedView[]).filter((v) => typeof v.name === 'string' && typeof v.draft === 'object') : [];
  } catch {
    return [];
  }
}

export function storeViews(views: SavedView[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(views));
  } catch {
    // Storage unavailable: the view still works for this session.
  }
}

export interface SavedViewsProps {
  readonly views: readonly SavedView[];
  readonly current: Draft;
  readonly onChange: (views: SavedView[]) => void;
  readonly onLoad: (draft: Draft) => void;
}

export function SavedViews({ views, current, onChange, onLoad }: SavedViewsProps): React.JSX.Element {
  const id = useId();
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');

  const save = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = [...views.filter((v) => v.name !== trimmed), { name: trimmed, draft: current }];
    onChange(next);
    setStatus(`Saved "${trimmed}".`);
    setName('');
  };

  return (
    <section aria-labelledby={`${id}-title`} className="saved-views">
      <h2 id={`${id}-title`}>Saved views</h2>
      <form onSubmit={save} className="row">
        <div className="field">
          <label htmlFor={`${id}-name`}>Save the current query as</label>
          <input id={`${id}-name`} type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" disabled={!name.trim()}>
          Save
        </button>
      </form>
      <p role="status" className="hint">
        {status}
      </p>
      {views.length > 0 && (
        <ul className="view-list">
          {views.map((view) => (
            <li key={view.name}>
              <button type="button" onClick={() => onLoad(view.draft)}>
                {view.name}
              </button>
              <button
                type="button"
                aria-label={`Delete saved view ${view.name}`}
                onClick={() => {
                  onChange(views.filter((v) => v.name !== view.name));
                  setStatus(`Deleted "${view.name}".`);
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
