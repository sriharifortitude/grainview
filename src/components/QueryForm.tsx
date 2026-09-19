import { useId, useState, type FormEvent } from 'react';
import { Temporal } from 'temporal-polyfill';

import type { Bucket, QuerySpec } from '@/api/eventgrain';

export type Metric = QuerySpec['metric'];

/** Everything the form holds, flat, so a saved view is one JSON object. */
export interface Draft {
  metric: Metric;
  preset: '7' | '30' | '90' | 'custom';
  from: string;
  to: string;
  event: string;
  bucket: Bucket;
  filterKey: string;
  filterValue: string;
  groupBy: string;
  steps: string[];
  windowDays: number;
  start: string;
  returning: string;
  periods: number;
}

export function emptyDraft(today = Temporal.Now.plainDateISO()): Draft {
  return {
    metric: 'count',
    preset: '30',
    from: today.subtract({ days: 29 }).toString(),
    to: today.toString(),
    event: '',
    bucket: 'day',
    filterKey: '',
    filterValue: '',
    groupBy: '',
    steps: ['', ''],
    windowDays: 7,
    start: '',
    returning: '',
    periods: 8,
  };
}

const PROPERTY_KEY = /^[A-Za-z0-9_.-]{1,64}$/;

/** Validate and convert. Returns field errors keyed by input id suffix, or the spec. */
export function toSpec(draft: Draft): { spec: QuerySpec } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!draft.from) errors['from'] = 'Choose a start date.';
  if (!draft.to) errors['to'] = 'Choose an end date.';
  if (draft.from && draft.to && draft.from > draft.to) errors['to'] = 'The end date is before the start date.';
  const range = { from: draft.from, to: draft.to };

  if (draft.metric === 'count' || draft.metric === 'unique') {
    if (!draft.event.trim()) errors['event'] = 'Choose an event.';
    if (draft.filterKey && !PROPERTY_KEY.test(draft.filterKey)) errors['filterKey'] = 'Property keys are letters, digits, _ . and - only.';
    if (draft.filterKey && !draft.filterValue) errors['filterValue'] = 'Give the value to match.';
    if (draft.groupBy && !PROPERTY_KEY.test(draft.groupBy)) errors['groupBy'] = 'Property keys are letters, digits, _ . and - only.';
    if (Object.keys(errors).length > 0) return { errors };
    const filter = draft.filterKey ? { [draft.filterKey]: draft.filterValue } : {};
    return { spec: { metric: draft.metric, event: draft.event.trim(), range, bucket: draft.bucket, filter, ...(draft.groupBy ? { groupBy: draft.groupBy } : {}) } };
  }
  if (draft.metric === 'funnel') {
    draft.steps.forEach((step, i) => {
      if (!step.trim()) errors[`step${i}`] = `Choose the event for step ${i + 1}.`;
    });
    if (!Number.isInteger(draft.windowDays) || draft.windowDays < 1 || draft.windowDays > 90) errors['windowDays'] = 'Window is 1 to 90 days.';
    if (Object.keys(errors).length > 0) return { errors };
    return { spec: { metric: 'funnel', steps: draft.steps.map((s) => s.trim()), range, windowDays: draft.windowDays, filter: {} } };
  }
  if (!draft.start.trim()) errors['start'] = 'Choose the event that starts a cohort.';
  if (!draft.returning.trim()) errors['returning'] = 'Choose the event that counts as returning.';
  if (!Number.isInteger(draft.periods) || draft.periods < 1 || draft.periods > 26) errors['periods'] = 'Periods is 1 to 26 weeks.';
  if (Object.keys(errors).length > 0) return { errors };
  return { spec: { metric: 'retention', start: draft.start.trim(), returning: draft.returning.trim(), range, periods: draft.periods } };
}

export interface QueryFormProps {
  readonly draft: Draft;
  readonly onChange: (draft: Draft) => void;
  readonly onRun: (spec: QuerySpec) => void;
  readonly eventNames: readonly string[];
  readonly running: boolean;
}

export function QueryForm({ draft, onChange, onRun, eventNames, running }: QueryFormProps): React.JSX.Element {
  const id = useId();
  const listId = `${id}-events`;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void => onChange({ ...draft, [key]: value });

  const applyPreset = (preset: Draft['preset']): void => {
    if (preset === 'custom') return set('preset', preset);
    const today = Temporal.Now.plainDateISO();
    onChange({ ...draft, preset, from: today.subtract({ days: Number(preset) - 1 }).toString(), to: today.toString() });
  };

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const result = toSpec(draft);
    if ('errors' in result) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      if (first !== undefined) document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    setErrors({});
    onRun(result.spec);
  };

  const field = (key: string, label: string, input: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined }) => React.JSX.Element): React.JSX.Element => {
    const fieldId = `${id}-${key}`;
    const error = errors[key];
    return (
      <div className="field">
        <label htmlFor={fieldId}>{label}</label>
        {input({ id: fieldId, 'aria-invalid': error !== undefined, 'aria-describedby': error === undefined ? undefined : `${fieldId}-error` })}
        {error !== undefined && (
          <p id={`${fieldId}-error`} className="field-error">
            {error}
          </p>
        )}
      </div>
    );
  };

  const eventInput = (key: string, label: string, value: string, onValue: (v: string) => void): React.JSX.Element =>
    field(key, label, (props) => <input {...props} type="text" list={listId} value={value} autoComplete="off" onChange={(e) => onValue(e.target.value)} />);

  const errorEntries = Object.entries(errors);

  return (
    <form onSubmit={submit} noValidate aria-labelledby={`${id}-title`} className="query-form">
      <h2 id={`${id}-title`}>Query</h2>
      <datalist id={listId}>
        {eventNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div role="alert" className={errorEntries.length > 0 ? 'form-errors' : 'visually-hidden'}>
        {errorEntries.length > 0 && (
          <>
            <p>Fix the following before running:</p>
            <ul>
              {errorEntries.map(([key, message]) => (
                <li key={key}>
                  <a href={`#${id}-${key}`}>{message}</a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <fieldset>
        <legend>Metric</legend>
        {(
          [
            ['count', 'Event count'],
            ['unique', 'Unique people'],
            ['funnel', 'Funnel'],
            ['retention', 'Retention'],
          ] as const
        ).map(([value, label]) => (
          <div key={value} className="radio">
            <input type="radio" id={`${id}-metric-${value}`} name="metric" value={value} checked={draft.metric === value} onChange={() => set('metric', value)} />
            <label htmlFor={`${id}-metric-${value}`}>{label}</label>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>Date range</legend>
        {field('preset', 'Preset', (props) => (
          <select {...props} value={draft.preset} onChange={(e) => applyPreset(e.target.value as Draft['preset'])}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom</option>
          </select>
        ))}
        <div className="row">
          {field('from', 'From', (props) => <input {...props} type="date" value={draft.from} onChange={(e) => onChange({ ...draft, preset: 'custom', from: e.target.value })} />)}
          {field('to', 'To', (props) => <input {...props} type="date" value={draft.to} onChange={(e) => onChange({ ...draft, preset: 'custom', to: e.target.value })} />)}
        </div>
        <p className="hint">Dates are whole days in the project&rsquo;s time zone.</p>
      </fieldset>

      {(draft.metric === 'count' || draft.metric === 'unique') && (
        <fieldset>
          <legend>Series</legend>
          {eventInput('event', 'Event', draft.event, (v) => set('event', v))}
          {field('bucket', 'Bucket', (props) => (
            <select {...props} value={draft.bucket} onChange={(e) => set('bucket', e.target.value as Bucket)}>
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          ))}
          <div className="row">
            {field('filterKey', 'Filter property (optional)', (props) => <input {...props} type="text" value={draft.filterKey} onChange={(e) => set('filterKey', e.target.value)} />)}
            {field('filterValue', 'equals', (props) => <input {...props} type="text" value={draft.filterValue} onChange={(e) => set('filterValue', e.target.value)} />)}
          </div>
          {field('groupBy', 'Group by property (optional)', (props) => <input {...props} type="text" value={draft.groupBy} onChange={(e) => set('groupBy', e.target.value)} />)}
        </fieldset>
      )}

      {draft.metric === 'funnel' && (
        <fieldset>
          <legend>Steps, in order</legend>
          {draft.steps.map((step, i) =>
            eventInput(`step${i}`, `Step ${i + 1}`, step, (v) =>
              set(
                'steps',
                draft.steps.map((s, j) => (j === i ? v : s)),
              ),
            ),
          )}
          <p className="row">
            <button type="button" onClick={() => set('steps', [...draft.steps, ''])} disabled={draft.steps.length >= 10}>
              Add step
            </button>
            <button type="button" onClick={() => set('steps', draft.steps.slice(0, -1))} disabled={draft.steps.length <= 2}>
              Remove last step
            </button>
          </p>
          {field('windowDays', 'Window (days after step 1)', (props) => <input {...props} type="number" min={1} max={90} value={draft.windowDays} onChange={(e) => set('windowDays', Number(e.target.value))} />)}
        </fieldset>
      )}

      {draft.metric === 'retention' && (
        <fieldset>
          <legend>Cohorts</legend>
          {eventInput('start', 'Cohort by first', draft.start, (v) => set('start', v))}
          {eventInput('returning', 'Returning when they do', draft.returning, (v) => set('returning', v))}
          {field('periods', 'Weeks to follow', (props) => <input {...props} type="number" min={1} max={26} value={draft.periods} onChange={(e) => set('periods', Number(e.target.value))} />)}
        </fieldset>
      )}

      <button type="submit" disabled={running} aria-busy={running}>
        {running ? 'Running…' : 'Run query'}
      </button>
    </form>
  );
}
