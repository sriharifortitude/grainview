import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError, type Client, type QueryResult, type QuerySpec } from '@/api/eventgrain';
import { App } from '@/App';
import { violations } from './axe';

interface FakeClient extends Client {
  readonly calls: QuerySpec[];
}

function fakeClient(overrides: Partial<Client> = {}): FakeClient {
  const calls: QuerySpec[] = [];
  const answer = (spec: QuerySpec): QueryResult => {
    if (spec.metric === 'funnel') return { metric: 'funnel', range: { from: '', to: '' }, windowDays: spec.windowDays, steps: spec.steps.map((event, i) => ({ event, count: 10 - i, conversion: (10 - i) / 10 })) };
    if (spec.metric === 'retention') return { metric: 'retention', range: { from: '', to: '' }, timeZone: 'UTC', cohorts: [] };
    return { metric: spec.metric, event: spec.event, bucket: spec.bucket, timeZone: 'Europe/Berlin', range: { from: '', to: '' }, source: 'raw', series: [{ bucket: '2026-09-17T00:00:00', value: 5 }] };
  };
  return {
    calls,
    eventNames: () => Promise.resolve(['signup', 'pageview']),
    query: (spec) => {
      calls.push(spec);
      return Promise.resolve(answer(spec));
    },
    ...overrides,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('App', () => {
  it('gates on an API key, keeps it in sessionStorage, and has no axe violations either side', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    const { container } = render(<App makeClient={() => client} />);
    expect(await violations(container)).toEqual([]);
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
    await user.type(screen.getByLabelText('Project API key'), 'eg_test');
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    expect(sessionStorage.getItem('grainview.apiKey')).toBe('eg_test');
    expect(localStorage.getItem('grainview.apiKey')).toBeNull();
    await screen.findByRole('form', { name: 'Query' });
    expect(await violations(container)).toEqual([]);
  });

  it('runs a query, renders the chart, moves focus to the results and reports the source', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    sessionStorage.setItem('grainview.apiKey', 'eg_test');
    render(<App makeClient={() => client} />);
    const event = await screen.findByLabelText('Event');
    await user.type(event, 'signup');
    await user.click(screen.getByRole('button', { name: 'Run query' }));

    await screen.findByRole('img', { name: 'signup: count per day' });
    expect(client.calls[0]).toMatchObject({ metric: 'count', event: 'signup', bucket: 'day', filter: {} });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Results' })));
    expect(screen.getByText('answered from raw events')).toBeInTheDocument();
  });

  it('shows validation errors in an alert and focuses the first invalid field, without calling the API', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    sessionStorage.setItem('grainview.apiKey', 'eg_test');
    render(<App makeClient={() => client} />);
    await screen.findByLabelText('Event');
    await user.click(screen.getByRole('button', { name: 'Run query' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an event.');
    expect(document.activeElement).toBe(screen.getByLabelText('Event'));
    expect(client.calls).toHaveLength(0);
  });

  it('switches to funnel fields and can add a step', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    sessionStorage.setItem('grainview.apiKey', 'eg_test');
    render(<App makeClient={() => client} />);
    await user.click(await screen.findByLabelText('Funnel'));
    expect(screen.getByLabelText('Step 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add step' }));
    await user.type(screen.getByLabelText('Step 1'), 'view');
    await user.type(screen.getByLabelText('Step 2'), 'cart');
    await user.type(screen.getByLabelText('Step 3'), 'purchase');
    await user.click(screen.getByRole('button', { name: 'Run query' }));
    await screen.findByRole('table', { name: /Funnel over 7 days/ });
    expect(client.calls[0]).toMatchObject({ metric: 'funnel', steps: ['view', 'cart', 'purchase'] });
  });

  it('saves and reloads a view without the API key in it', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('grainview.apiKey', 'eg_test');
    render(<App makeClient={() => fakeClient()} />);
    await user.type(await screen.findByLabelText('Event'), 'pageview');
    await user.type(screen.getByLabelText('Save the current query as'), 'Daily pageviews');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved "Daily pageviews".');
    const stored = localStorage.getItem('grainview.views') ?? '';
    expect(stored).toContain('pageview');
    expect(stored).not.toContain('eg_test');

    await user.clear(screen.getByLabelText('Event'));
    await user.click(screen.getByRole('button', { name: 'Daily pageviews' }));
    expect(screen.getByLabelText('Event')).toHaveValue('pageview');
  });

  it('a rejected key returns to the gate with a message', async () => {
    sessionStorage.setItem('grainview.apiKey', 'eg_bad');
    render(<App makeClient={() => fakeClient({ eventNames: () => Promise.reject(new ApiError(401, 'The API key was not accepted.')) })} />);
    expect(await screen.findByLabelText('Project API key')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The API key was not accepted.');
  });
});
