import { useId } from 'react';

import type { RetentionResult } from '@/api/eventgrain';
import { formatDate, formatNumber } from './format';
import { heatOpacity, percent } from './scale';

/**
 * The retention matrix as a table with a heat fill behind each cell. The
 * percentage is the cell's text, so the fill is redundant with it, which
 * is the point: the fill helps sighted scanning and carries nothing on
 * its own. Fills are four steps, not a gradient, so adjacent cells that
 * differ are visibly different.
 */
export function RetentionGrid({ result }: { readonly result: RetentionResult }): React.JSX.Element {
  const captionId = useId();
  const periods = result.cohorts[0]?.periods.length ?? 0;
  return (
    <figure className="chart">
      <table className="retention" aria-labelledby={captionId}>
        <caption id={captionId}>
          Weekly retention, {result.cohorts.length} cohort{result.cohorts.length === 1 ? '' : 's'} ({result.timeZone})
        </caption>
        <thead>
          <tr>
            <th scope="col">Cohort week</th>
            <th scope="col">People</th>
            {Array.from({ length: periods }, (_, i) => (
              <th key={i} scope="col">
                Week {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.cohorts.map((cohort) => (
            <tr key={cohort.cohort}>
              <th scope="row">{formatDate(cohort.cohort)}</th>
              <td>{formatNumber(cohort.size)}</td>
              {cohort.periods.map((users, i) => {
                const ratio = cohort.size === 0 ? 0 : users / cohort.size;
                return (
                  <td key={i} className="heat" style={{ '--heat': heatOpacity(ratio) } as React.CSSProperties}>
                    {percent(ratio)}
                    <span className="visually-hidden"> ({formatNumber(users)} {users === 1 ? 'person' : 'people'})</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
