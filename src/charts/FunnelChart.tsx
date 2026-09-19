import { useId } from 'react';

import type { FunnelResult } from '@/api/eventgrain';
import { formatNumber } from './format';
import { percent } from './scale';

/**
 * A funnel is a small table with a bar in each row. Here it *is* a table:
 * the bar is decoration inside the cell, and the numbers are the content.
 * No SVG, nothing to describe, nothing to toggle.
 */
export function FunnelChart({ result }: { readonly result: FunnelResult }): React.JSX.Element {
  const captionId = useId();
  const entered = result.steps[0]?.count ?? 0;
  return (
    <figure className="chart">
      <table className="funnel" aria-labelledby={captionId}>
        <caption id={captionId}>
          Funnel over {result.windowDays} day{result.windowDays === 1 ? '' : 's'}: {formatNumber(entered)} entered
        </caption>
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">Event</th>
            <th scope="col">People</th>
            <th scope="col">Of step 1</th>
            <th scope="col">Of previous</th>
          </tr>
        </thead>
        <tbody>
          {result.steps.map((step, i) => {
            const previous = result.steps[i - 1]?.count ?? step.count;
            const ofPrevious = previous === 0 ? 0 : step.count / previous;
            return (
              <tr key={step.event}>
                <th scope="row">{i + 1}</th>
                <td>{step.event}</td>
                <td className="bar-cell">
                  <span className="bar" style={{ width: `${Math.round(step.conversion * 100)}%` }} aria-hidden="true" />
                  <span className="bar-value">{formatNumber(step.count)}</span>
                </td>
                <td>{percent(step.conversion)}</td>
                <td>{i === 0 ? '—' : percent(ofPrevious)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}
